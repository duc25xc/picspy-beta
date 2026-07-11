import cron from 'node-cron'
import Interaction from '../models/Interaction.model.js'
import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import Settings from '../models/Settings.model.js'
import VndTransaction from '../models/VndTransaction.model.js'

/**
 * 1. Hàm thực hiện quyết toán doanh thu lượt xem cho toàn bộ creator (Chạy 00:00 hàng đêm)
 */
export const runDailySettlement = async () => {
  console.log('[Settlement Job] Starting daily views payout settlement...')
  const start = Date.now()

  try {
    const settings = await Settings.getSingleton()
    const ratePerView = settings.payoutRatePerView || 10 // Đơn giá VNĐ trên mỗi view

    // Lấy tất cả interaction views chưa quyết toán
    const unsettledViews = await Interaction.find({
      type: 'view',
      settled: false,
    }).lean()

    if (unsettledViews.length === 0) {
      console.log('[Settlement Job] No unsettled views found. Finished.')
      return { status: 'success', settledCount: 0, totalAmount: 0 }
    }

    // Tra cứu tác giả (authorId) của các bài đăng này
    const postIds = [...new Set(unsettledViews.map((v) => v.postId.toString()))]
    const posts = await Post.find({ _id: { $in: postIds } })
      .select('authorId')
      .lean()

    const postAuthorMap = {}
    posts.forEach((post) => {
      postAuthorMap[post._id.toString()] = post.authorId.toString()
    })

    // Gom nhóm theo creator và ngày (YYYY-MM-DD)
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
    const creatorsAffected = Object.keys(creatorDailyGroup).length

    // Cộng tiền vào ví VNĐ của từng creator theo từng ngày dồn lại
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
        }).catch((err) =>
          console.error(
            `[Settlement Job] Error logging transaction for creator ${creatorId}:`,
            err
          )
        )

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
    console.log(
      `[Settlement Job] Successfully settled ${unsettledViews.length} views for a total of ${totalAmountDisbursed.toLocaleString()} VNĐ in ${duration}ms`
    )

    return {
      status: 'success',
      settledCount: unsettledViews.length,
      totalAmount: totalAmountDisbursed,
      creatorsAffected,
    }
  } catch (error) {
    console.error('[Settlement Job] Daily views settlement failed:', error)
    return { status: 'failed', error: error.message }
  }
}

/**
 * 2. Hàm tự động tính toán lại Điểm Trending (Hacker News Score Decay) cho bài viết (Chạy 00:00 hàng đêm)
 */
export const runDailyScoreDecay = async () => {
  console.log('[Score Decay Job] Starting daily score calculation...')
  const start = Date.now()

  try {
    const posts = await Post.find({ status: 'approved' })
      .select('_id stats createdAt isFeatured isSponsored')
      .lean()

    if (posts.length === 0) {
      console.log('[Score Decay Job] No approved posts found.')
      return { status: 'success', updatedCount: 0 }
    }

    const bulkOps = posts.map((post) => {
      const ageInHours = (Date.now() - new Date(post.createdAt)) / 3600000

      const views = post.stats?.viewsCount || 0
      const likes = post.stats?.likesCount || 0
      const downloads = post.stats?.downloadsCount || 0
      const comments = post.stats?.commentsCount || 0
      const bookmarks = post.stats?.bookmarksCount || 0

      // Trọng số theo 05_SKILLS.md + yêu cầu của bạn:
      // Views: 0.1, Likes: 3, Downloads: 5, Comments: 2, Bookmarks: 3
      const interactions =
        views * 0.1 + likes * 3 + downloads * 5 + comments * 2 + bookmarks * 3

      // Thời gian trôi qua đóng vai trò mẫu số để giảm nhiệt
      let score = interactions / Math.pow(ageInHours + 2, 1.5)

      // Boost cho featured và sponsored
      if (post.isFeatured) score *= 2
      if (post.isSponsored) score *= 3

      return {
        updateOne: {
          filter: { _id: post._id },
          update: { $set: { score } },
        },
      }
    })

    await Post.bulkWrite(bulkOps)
    const duration = Date.now() - start
    console.log(
      `[Score Decay Job] Successfully updated scores for ${posts.length} posts in ${duration}ms`
    )

    return { status: 'success', updatedCount: posts.length }
  } catch (error) {
    console.error('[Score Decay Job] Score calculation failed:', error)
    return { status: 'failed', error: error.message }
  }
}

/**
 * 3. Tự động kiểm tra hạ cấp các Subscription hết hạn (Chạy 00:00 hàng đêm)
 */
export const runDailySubscriptionCleanup = async () => {
  console.log('[Subscription Cleanup Job] Checking for expired memberships...')
  const start = Date.now()

  try {
    const now = new Date()
    // Tìm các user có gói khác 'free' nhưng thời gian hết hạn nhỏ hơn hoặc bằng hiện tại
    const expiredUsers = await User.find({
      subscriptionTier: { $ne: 'free' },
      subscriptionExpiry: { $lte: now },
    })

    if (expiredUsers.length === 0) {
      console.log('[Subscription Cleanup Job] No expired subscriptions found.')
      return { status: 'success', downgradedCount: 0 }
    }

    let downgradedCount = 0
    for (const user of expiredUsers) {
      const prevTier = user.subscriptionTier
      user.subscriptionTier = 'free'
      user.subscriptionCycle = 'monthly'
      user.subscriptionExpiry = null
      user.founderSlot = false // Thu hồi slot Founder nếu hết hạn không đóng tiếp
      await user.save()

      console.log(
        `[Subscription Cleanup Job] Downgraded user @${user.username} from ${prevTier} to free due to expiry.`
      )
      downgradedCount++
    }

    const duration = Date.now() - start
    console.log(
      `[Subscription Cleanup Job] Completed check. Downgraded ${downgradedCount} users in ${duration}ms`
    )
    return { status: 'success', downgradedCount }
  } catch (error) {
    console.error('[Subscription Cleanup Job] Verification failed:', error)
    return { status: 'failed', error: error.message }
  }
}

/**
 * Kiểm tra Creator đứng Top 1 hệ thống theo lượt xem và gửi thông báo WEEKLY_TOP
 */
export const checkWeeklyTopCreator = async () => {
  try {
    const User = (await import('../models/User.model.js')).default
    // Tìm creator có tổng lượt xem cao nhất
    const topCreator = await User.findOne({ role: { $ne: 'admin' }, isBanned: false })
      .sort({ 'stats.totalViews': -1 })
      .lean()

    if (!topCreator) return

    // Tính toán mốc ngày Thứ Hai đầu tuần làm mã định danh duy nhất cho tuần này
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(today.setDate(diff))
    startOfWeek.setHours(0, 0, 0, 0)

    const Notification = (await import('../models/Notification.model.js')).default
    const existing = await Notification.findOne({
      recipient: topCreator._id,
      type: 'WEEKLY_TOP',
      'metadata.weekStart': startOfWeek,
    })

    if (!existing) {
      const { triggerNotificationEvent } = await import('../services/notification.service.js')
      await triggerNotificationEvent({
        type: 'WEEKLY_TOP',
        actorId: null,
        recipientId: topCreator._id,
        targetId: topCreator._id,
        targetModel: 'User',
        metadata: {
          weekStart: startOfWeek,
          customTitle: `Tuần ${startOfWeek.toLocaleDateString('vi-VN')}`,
          message: '🏆 Chúc mừng! Bạn là Creator đứng Top 1 Hệ thống tuần này!'
        }
      })
    }
  } catch (error) {
    console.error('[Cron Jobs] Error checking weekly top creator:', error)
  }
}

/**
 * Tính toán và gửi báo cáo thống kê hàng ngày đến toàn bộ Admin
 */
export const sendDailyAdminStatsSummary = async () => {
  try {
    const User = (await import('../models/User.model.js')).default
    const Post = (await import('../models/Post.model.js')).default
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    const { triggerAdminNotificationEvent } = await import('../services/notification.service.js')

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [newUsers, newPosts, transactions] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Post.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      VndTransaction.find({ createdAt: { $gte: oneDayAgo } }).lean()
    ])

    let totalDeposits = 0
    let totalWithdrawals = 0
    transactions.forEach(t => {
      if (t.type === 'deposit') {
        totalDeposits += Math.abs(t.amount)
      } else if (t.type === 'withdraw_approved') {
        totalWithdrawals += Math.abs(t.amount)
      }
    })

    const summaryMessage = `📊 Thống kê 24h qua: Đăng ký mới: ${newUsers} | Bài đăng mới: ${newPosts} | Tổng nạp: ${totalDeposits.toLocaleString('vi-VN')}đ | Tổng rút: ${totalWithdrawals.toLocaleString('vi-VN')}đ.`

    await triggerAdminNotificationEvent({
      type: 'ADMIN_STATS_SUMMARY',
      actorId: null,
      targetId: null,
      targetModel: null,
      metadata: {
        message: summaryMessage
      }
    })
  } catch (error) {
    console.error('[Cron Jobs] Error sending admin stats summary:', error)
  }
}

// Lập lịch tự động chạy tất cả tác vụ lúc 00:00 hàng đêm
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ [Cron Scheduler] Initiating daily midnight tasks...')

  // 1. Chạy quyết toán lượt xem
  try {
    await runDailySettlement()
    const WalletService = (await import('../services/WalletService.js')).default
    await WalletService.releasePendingHolds()
  } catch (err) {
    console.error('[Cron Scheduler] Daily settlement failed:', err)
  }

  // 2. Chạy tính toán lại Điểm Trending (Score Decay)
  try {
    await runDailyScoreDecay()
  } catch (err) {
    console.error('[Cron Scheduler] Score decay failed:', err)
  }

  // 3. Chạy dọn dẹp các tài khoản hết hạn gói
  try {
    await runDailySubscriptionCleanup()
  } catch (err) {
    console.error('[Cron Scheduler] Subscription cleanup failed:', err)
  }

  // 4. Nếu là Chủ Nhật hàng tuần, chạy check Top Creator của tuần
  try {
    const today = new Date()
    if (today.getDay() === 0) {
      await checkWeeklyTopCreator()
    }
  } catch (err) {
    console.error('[Cron Scheduler] Weekly top creator check failed:', err)
  }

  // 5. Chạy báo cáo thống kê hàng ngày cho toàn bộ Admin
  try {
    await sendDailyAdminStatsSummary()
  } catch (err) {
    console.error('[Cron Scheduler] Admin stats summary failed:', err)
  }
})
