import cron from 'node-cron'
import Interaction from '../models/Interaction.model.js'
import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import Settings from '../models/Settings.model.js'
import VndTransaction from '../models/VndTransaction.model.js'

/**
 * Hàm thực hiện quyết toán doanh thu lượt xem cho toàn bộ creator
 */
export const runDailySettlement = async () => {
  console.log('[Settlement Job] Starting daily views payout settlement...')
  const start = Date.now()

  try {
    const settings = await Settings.getSingleton()
    const ratePerView = settings.payoutRatePerView || 10 // Đơn giá VNĐ trên mỗi view

    // 1. Lấy tất cả interaction views chưa quyết toán
    const unsettledViews = await Interaction.find({
      type: 'view',
      settled: false,
    }).lean()

    if (unsettledViews.length === 0) {
      console.log('[Settlement Job] No unsettled views found. Finished.')
      return { status: 'success', settledCount: 0, totalAmount: 0 }
    }

    // 2. Nhóm các views theo postId
    const postViewMap = {}
    unsettledViews.forEach((view) => {
      const pid = view.postId.toString()
      postViewMap[pid] = (postViewMap[pid] || 0) + 1
    })

    // 3. Tra cứu tác giả (authorId) của các bài đăng này
    const postIds = Object.keys(postViewMap)
    const posts = await Post.find({ _id: { $in: postIds } })
      .select('authorId')
      .lean()

    const postAuthorMap = {}
    posts.forEach((post) => {
      postAuthorMap[post._id.toString()] = post.authorId.toString()
    })

    // 4. Gom tổng số view và số tiền kiếm được theo tác giả (creator)
    const creatorEarnings = {}
    // Cấu trúc: { [authorId]: { views: number, amount: number } }

    Object.entries(postViewMap).forEach(([pid, views]) => {
      const authorId = postAuthorMap[pid]
      if (authorId) {
        if (!creatorEarnings[authorId]) {
          creatorEarnings[authorId] = { views: 0, amount: 0 }
        }
        creatorEarnings[authorId].views += views
        creatorEarnings[authorId].amount += views * ratePerView
      }
    })

    let totalAmountDisbursed = 0

    // 5. Cộng tiền vào ví VNĐ của từng creator và lưu giao dịch
    for (const [creatorId, stats] of Object.entries(creatorEarnings)) {
      const creator = await User.findById(creatorId)
      if (!creator) continue

      const balanceBefore = creator.vndBalance || 0
      const balanceAfter = balanceBefore + stats.amount

      // Cập nhật ví creator
      await User.findByIdAndUpdate(creatorId, {
        vndBalance: balanceAfter,
        $inc: { totalEarned: stats.amount }
      })

      // Ghi log giao dịch VNĐ
      await VndTransaction.create({
        userId: creatorId,
        type: 'earn_views',
        amount: stats.amount,
        balanceBefore,
        balanceAfter,
        description: `Quyết toán lượt xem ngày: ${stats.views.toLocaleString()} lượt xem x ${ratePerView}đ`,
      }).catch((err) => console.error(`[Settlement Job] Error logging transaction for creator ${creatorId}:`, err))

      totalAmountDisbursed += stats.amount
    }

    // 6. Đánh dấu các views đã được quyết toán xong
    const interactionIds = unsettledViews.map((v) => v._id)
    await Interaction.updateMany(
      { _id: { $in: interactionIds } },
      { $set: { settled: true } }
    )

    const duration = Date.now() - start
    console.log(`[Settlement Job] Successfully settled ${unsettledViews.length} views for a total of ${totalAmountDisbursed.toLocaleString()} VNĐ in ${duration}ms`)

    return {
      status: 'success',
      settledCount: unsettledViews.length,
      totalAmount: totalAmountDisbursed,
      creatorsAffected: Object.keys(creatorEarnings).length
    }
  } catch (error) {
    console.error('[Settlement Job] Daily views settlement failed:', error)
    return { status: 'failed', error: error.message }
  }
}

// 7. Lập lịch chạy tự động lúc 00:00 hàng đêm
cron.schedule('0 0 * * *', async () => {
  try {
    await runDailySettlement()
    const WalletService = (await import('../services/WalletService.js')).default
    await WalletService.releasePendingHolds()
  } catch (err) {
    console.error('[Settlement Cron] Error running daily jobs:', err)
  }
})
