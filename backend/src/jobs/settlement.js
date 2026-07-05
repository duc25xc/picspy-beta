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

    // 2. Tra cứu tác giả (authorId) của các bài đăng này
    const postIds = [...new Set(unsettledViews.map(v => v.postId.toString()))]
    const posts = await Post.find({ _id: { $in: postIds } })
      .select('authorId')
      .lean()

    const postAuthorMap = {}
    posts.forEach((post) => {
      postAuthorMap[post._id.toString()] = post.authorId.toString()
    })

    // 3. Gom nhóm theo creator và ngày (YYYY-MM-DD)
    const creatorDailyGroup = {}
    unsettledViews.forEach((view) => {
      const pid = view.postId.toString()
      const creatorId = postAuthorMap[pid]
      if (!creatorId) return

      const dateStr = new Date(view.createdAt).toISOString().slice(0, 10)

      if (!creatorDailyGroup[creatorId]) creatorDailyGroup[creatorId] = {}
      if (!creatorDailyGroup[creatorId][dateStr]) {
        creatorDailyGroup[creatorId][dateStr] = { views: 0, viewIds: [] }
      }

      creatorDailyGroup[creatorId][dateStr].views++
      creatorDailyGroup[creatorId][dateStr].viewIds.push(view._id)
    })

    let totalAmountDisbursed = 0
    let processedViewsCount = 0

    // 4. Cộng tiền vào ví VNĐ của từng creator theo từng ngày dồn lại
    for (const [creatorId, datesMap] of Object.entries(creatorDailyGroup)) {
      const creator = await User.findById(creatorId)
      if (!creator) continue

      // Sắp xếp ngày tăng dần
      const sortedDates = Object.keys(datesMap).sort()

      for (const dateStr of sortedDates) {
        const stats = datesMap[dateStr]
        const amount = stats.views * ratePerView

        const balanceBefore = creator.vndBalance || 0
        const balanceAfter = balanceBefore + amount

        // Cập nhật ví creator (để vndBalance cộng dồn cho ngày tiếp theo)
        creator.vndBalance = balanceAfter
        creator.totalEarned = (creator.totalEarned || 0) + amount
        await creator.save()

        // Định dạng ngày hiển thị VN: DD-MM-YYYY
        const [y, m, d] = dateStr.split('-')
        const formattedDate = `${d}-${m}-${y}`

        // Ghi log giao dịch VNĐ cho ngày này
        await VndTransaction.create({
          userId: creatorId,
          type: 'earn_views',
          amount,
          balanceBefore,
          balanceAfter,
          description: `Quyết toán lượt xem ngày ${formattedDate}: ${stats.views.toLocaleString()} lượt xem x ${ratePerView}đ`,
        }).catch((err) => console.error(`[Settlement Job] Error logging transaction for creator ${creatorId}:`, err))

        // Đánh dấu các views của ngày này là đã quyết toán
        await Interaction.updateMany(
          { _id: { $in: stats.viewIds } },
          { $set: { settled: true } }
        )

        totalAmountDisbursed += amount
        processedViewsCount += stats.viewIds.length
      }
    }

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
