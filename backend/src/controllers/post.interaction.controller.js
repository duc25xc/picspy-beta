import Post from '../models/Post.model.js'
import Interaction from '../models/Interaction.model.js'
import Report from '../models/Report.model.js'
import AppError from '../utils/AppError.js'

/**
 * GET /posts/:id — Chi tiết bài đăng
 * Public: ai cũng xem được approved post
 * Nếu user đã login → trả thêm isLiked, isBookmarked
 */
export const getPostDetail = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate(
        'authorId',
        'username displayName avatar isVerified subscriptionTier stats.followersCount stats.postsCount'
      )
      .populate({
        path: 'parentPostId',
        select: 'caption authorId generatedImages isPremium priceInVnd aiTool stats',
        populate: { path: 'authorId', select: 'username displayName avatar' }
      })
      .lean()

    if (!post) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)
    }

    let siblingRemixes = []
    if (post.isRemix) {
      const targetOriginalId = post.originalPostId || post.parentPostId
      if (targetOriginalId) {
        siblingRemixes = await Post.find({
          originalPostId: targetOriginalId,
          status: 'approved',
          _id: { $ne: post._id }
        })
        .select('caption authorId generatedImages stats')
        .populate('authorId', 'username displayName avatar')
        .limit(10)
        .lean()
      }
    }

    // Chỉ xem được approved post (hoặc chính chủ)
    if (
      post.status !== 'approved' &&
      (!req.user || post.authorId._id.toString() !== req.user._id.toString())
    ) {
      throw new AppError('NOT_FOUND', 'Bài đăng không khả dụng', 404)
    }

    // Nếu user đã login → check tương tác
    let isLiked = false
    let isBookmarked = false
    let isFollowingAuthor = false

    if (req.user) {
      const [likeDoc, bookmarkDoc] = await Promise.all([
        Interaction.findOne({
          userId: req.user._id,
          postId: post._id,
          type: 'like',
        }).lean(),
        Interaction.findOne({
          userId: req.user._id,
          postId: post._id,
          type: 'bookmark',
        }).lean(),
      ])

      isLiked = !!likeDoc
      isBookmarked = !!bookmarkDoc

      // Check follow
      if (post.authorId._id.toString() !== req.user._id.toString()) {
        const Follow = (await import('../models/Follow.model.js')).default
        const followDoc = await Follow.findOne({
          followerId: req.user._id,
          followingId: post.authorId._id,
        }).lean()
        isFollowingAuthor = !!followDoc
      }
    }

    let purchasedFileTypes = []
    if (req.user) {
      const VndTransaction = (await import('../models/VndTransaction.model.js')).default
      const txns = await VndTransaction.find({
        userId: req.user._id,
        type: 'purchase_post',
        relatedPostId: post._id,
        walletType: 'available'
      }).select('fileType').lean()

      const refundTxns = await VndTransaction.find({
        userId: req.user._id,
        type: 'refund',
        relatedPostId: post._id,
      }).select('fileType').lean()

      // Count refunds per fileType
      const refundCounts = {}
      for (const r of refundTxns) {
        const ft = r.fileType || 'original'
        refundCounts[ft] = (refundCounts[ft] || 0) + 1
      }

      // Count buys per fileType
      const buyCounts = {}
      for (const t of txns) {
        const ft = t.fileType || 'original'
        buyCounts[ft] = (buyCounts[ft] || 0) + 1
      }

      // User owns the fileType if buyCount > refundCount
      purchasedFileTypes = Object.keys(buyCounts).filter(ft => {
        const buys = buyCounts[ft] || 0
        const refunds = refundCounts[ft] || 0
        return buys > refunds
      })
    }

    // Lấy các bản Remix trực tiếp từ tác phẩm này
    const remixes = await Post.find({
      $or: [
        { parentPostId: post._id },
        { originalPostId: post._id }
      ],
      status: 'approved'
    })
    .select('caption authorId generatedImages stats createdAt')
    .populate('authorId', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

    res.json({
      post,
      isLiked,
      isBookmarked,
      isFollowingAuthor,
      purchasedFileTypes,
      siblingRemixes,
      remixes
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /posts/:id/like — Toggle like
 * Atomic update likesCount + tạo/xóa interaction
 */
export const toggleLike = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId)
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    const existing = await Interaction.findOne({
      userId,
      postId,
      type: 'like',
    })

    if (existing) {
      // Unlike
      await existing.deleteOne()
      await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.likesCount': -1 },
      })

      // Giảm totalLikes cho author (denormalized)
      if (post.authorId.toString() !== userId.toString()) {
        const User = (await import('../models/User.model.js')).default
        await User.findByIdAndUpdate(post.authorId, {
          $inc: { 'stats.totalLikes': -1 },
        })

        // Xử lý rút/xóa thông báo LIKE để tránh spam
        const Notification = (await import('../models/Notification.model.js')).default
        const existingNotif = await Notification.findOne({
          recipient: post.authorId,
          type: 'POST_LIKE',
          target: postId,
        })

        if (existingNotif) {
          existingNotif.actors = existingNotif.actors.filter(
            (actorId) => actorId.toString() !== userId.toString()
          )

          if (existingNotif.actors.length === 0) {
            await Notification.deleteOne({ _id: existingNotif._id })
            if (!existingNotif.isRead) {
              await User.findByIdAndUpdate(post.authorId, {
                $inc: { notificationCount: -1 }
              })
            }
          } else {
            await existingNotif.save()
          }
        }
      }

      res.json({ liked: false, likesCount: Math.max(0, post.stats.likesCount - 1) })
    } else {
      // Like
      await Interaction.create({ userId, postId, type: 'like' })
      await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.likesCount': 1 },
      })

      // Tăng totalLikes cho author (denormalized)
      if (post.authorId.toString() !== userId.toString()) {
        const User = (await import('../models/User.model.js')).default
        await User.findByIdAndUpdate(post.authorId, {
          $inc: { 'stats.totalLikes': 1 },
        })

        // Gửi thông báo LIKE
        const { triggerNotificationEvent } = await import('../services/notification.service.js')
        await triggerNotificationEvent({
          type: 'POST_LIKE',
          actorId: userId,
          recipientId: post.authorId,
          targetId: postId,
          targetModel: 'Post',
          metadata: {
            postId,
            customTitle: post.caption,
          }
        }).catch(err => console.error('Failed to trigger POST_LIKE notification:', err))
      }

      res.json({ liked: true, likesCount: post.stats.likesCount + 1 })
    }
  } catch (err) {
    // Duplicate key = đã like rồi, bỏ qua
    if (err.code === 11000) {
      return res.json({ liked: true, message: 'Đã like rồi' })
    }
    next(err)
  }
}

/**
 * POST /posts/:id/bookmark — Toggle bookmark
 */
export const toggleBookmark = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId)
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    const existing = await Interaction.findOne({
      userId,
      postId,
      type: 'bookmark',
    })

    if (existing) {
      await existing.deleteOne()
      await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.bookmarksCount': -1 },
      })
      res.json({ bookmarked: false })
    } else {
      await Interaction.create({ userId, postId, type: 'bookmark' })
      await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.bookmarksCount': 1 },
      })
      res.json({ bookmarked: true })
    }
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ bookmarked: true })
    }
    next(err)
  }
}


// Module-level Set để dedup guest views (IP + postId, cleared mỗi 24h)
const guestViewCache = new Set()
setInterval(() => guestViewCache.clear(), 24 * 60 * 60 * 1000)

/**
 * POST /posts/:id/view — Track view
 * Auth users: dedup via Interaction model (unique index)
 * Guest users: dedup via IP+postId cache (reset mỗi 24h)
 */
export const trackView = async (req, res, next) => {
  try {
    const { id: postId } = req.params

    if (!req.user) {
      // Guest: dedup bằng IP
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
      const guestKey = `${ip}:${postId}`

      if (guestViewCache.has(guestKey)) {
        return res.json({ viewed: false, reason: 'already_viewed' })
      }
      guestViewCache.add(guestKey)

      const post = await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.viewsCount': 1 },
      }, { new: true, select: 'authorId stats caption' }).lean()

      if (post) {
        const { checkViewMilestone } = await import('../services/notification.service.js')
        await checkViewMilestone(post, post.stats?.viewsCount || 0).catch(err => console.error(err))
      }
      return res.json({ viewed: true })
    }

    const userId = req.user._id

    // Auth users: dedup qua Interaction model (unique index)
    try {
      await Interaction.create({ userId, postId, type: 'view' })

      // Chỉ tăng count khi view mới thực sự
      const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { 'stats.viewsCount': 1 } },
        { new: true, select: 'authorId stats caption' }
      ).lean()

      if (post) {
        const { checkViewMilestone } = await import('../services/notification.service.js')
        await checkViewMilestone(post, post.stats?.viewsCount || 0).catch(err => console.error(err))

        // Tăng totalViews cho author (chỉ khi viewer không phải chính chủ)
        if (post.authorId.toString() !== userId.toString()) {
          const User = (await import('../models/User.model.js')).default
          await User.findByIdAndUpdate(post.authorId, {
            $inc: { 'stats.totalViews': 1 },
          })
        }
      }
    } catch (err) {
      // Duplicate key = đã view, bỏ qua im lặng
      if (err.code !== 11000) throw err
    }

    res.json({ viewed: true })
  } catch (err) {
    next(err)
  }
}


/**
 * GET /users/me/bookmarks — Danh sách bookmark của user
 */
export const getMyBookmarks = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query
    const query = { userId: req.user._id, type: 'bookmark' }

    if (cursor) query._id = { $lt: cursor }

    const bookmarks = await Interaction.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate({
        path: 'postId',
        match: { status: 'approved' },
        populate: {
          path: 'authorId',
          select: 'username displayName avatar',
        },
      })
      .lean()

    // Lọc null (post đã bị xóa hoặc chưa approved)
    const filtered = bookmarks.filter((b) => b.postId != null)

    const hasMore = filtered.length > parseInt(limit)
    if (hasMore) filtered.pop()

    res.json({
      posts: filtered.map((b) => b.postId),
      pagination: {
        hasMore,
        nextCursor: hasMore ? filtered[filtered.length - 1]._id : null,
        count: filtered.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /posts/:id/report — Báo cáo bài đăng vi phạm
 */
export const reportPost = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const reporterId = req.user._id
    const { reason } = req.body

    if (!reason || !reason.trim()) {
      throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp lý do báo cáo', 400)
    }

    const post = await Post.findById(postId)
    if (!post) {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    // Không cho tự báo cáo bài của mình
    if (post.authorId.toString() === reporterId.toString()) {
      throw new AppError('BAD_REQUEST', 'Bạn không thể báo cáo bài viết của chính mình', 400)
    }

    // Check if already reported
    const existing = await Report.findOne({ reporterId, postId })
    if (existing) {
      throw new AppError('CONFLICT', 'Bạn đã báo cáo bài đăng này rồi', 409)
    }

    await Report.create({
      reporterId,
      postId,
      reason: reason.trim(),
    })

    // Gửi thông báo admin có báo cáo vi phạm mới
    const { triggerAdminNotificationEvent } = await import('../services/notification.service.js')
    await triggerAdminNotificationEvent({
      type: 'ADMIN_NEW_REPORT',
      actorId: reporterId,
      targetId: postId,
      targetModel: 'Post',
      metadata: {
        postId,
        message: `🚨 Báo cáo vi phạm mới từ @${req.user.username}: "${reason.trim()}"`
      }
    }).catch(err => console.error(err))

    res.json({
      success: true,
      message: 'Báo cáo vi phạm thành công. Ban quản trị sẽ kiểm duyệt bài viết này.',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /posts/:id/order-report — Báo cáo sau khi đã mua ảnh (Order Report)
 *
 * Điều kiện:
 * 1. User phải đã mua ảnh này (có VndTransaction type=purchase_post)
 * 2. Chỉ được báo cáo trong vòng 3 ngày kể từ ngày mua
 * 3. Mỗi user chỉ được báo cáo 1 lần / post (dùng chung unique index)
 */
export const orderReportPost = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const reporterId = req.user._id
    const { reason, reportCategory } = req.body

    if (!reason || !reason.trim()) {
      throw new AppError('BAD_REQUEST', 'Vui lòng mô tả vấn đề bạn gặp phải', 400)
    }

    const post = await Post.findById(postId)
    if (!post) {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    // Tìm giao dịch mua ảnh (lấy giao dịch sớm nhất để tính thời gian)
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    const purchaseTxn = await VndTransaction.findOne({
      userId: reporterId,
      type: 'purchase_post',
      relatedPostId: postId,
      walletType: 'available',
    }).sort({ createdAt: 1 }).lean()

    if (!purchaseTxn) {
      throw new AppError(
        'FORBIDDEN',
        'Bạn chưa mua ảnh này. Chỉ người mua mới có thể gửi Order Report.',
        403
      )
    }

    // Kiểm tra cửa sổ 3 ngày
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const purchasedAt = new Date(purchaseTxn.createdAt)
    const now = new Date()
    if (now - purchasedAt > THREE_DAYS_MS) {
      throw new AppError(
        'FORBIDDEN',
        'Thời hạn Order Report (3 ngày kể từ ngày mua) đã hết.',
        403
      )
    }

    // Check if already reported (buyer report or regular — cùng unique index)
    const existing = await Report.findOne({ reporterId, postId })
    if (existing) {
      throw new AppError('CONFLICT', 'Bạn đã gửi báo cáo cho bài đăng này rồi.', 409)
    }

    const validCategories = [
      'payment_error',
      'double_payment',
      'no_file',
      'creator_violation',
      'wrong_description',
      'dmca',
      'other',
    ]

    await Report.create({
      reporterId,
      postId,
      reason: reason.trim(),
      isBuyerReport: true,
      reportCategory: validCategories.includes(reportCategory) ? reportCategory : 'other',
      purchasedAt,
    })

    // Thông báo admin — đánh dấu rõ đây là Order Report
    const { triggerAdminNotificationEvent } = await import('../services/notification.service.js')
    await triggerAdminNotificationEvent({
      type: 'ADMIN_NEW_REPORT',
      actorId: reporterId,
      targetId: postId,
      targetModel: 'Post',
      metadata: {
        postId,
        message: `🛍 Order Report từ buyer @${req.user.username}: "${reason.trim()}"`,
      },
    }).catch(err => console.error(err))

    res.json({
      success: true,
      message: 'Order Report đã được gửi. Ban quản trị sẽ xem xét và liên hệ với bạn.',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /posts/:id/refund — Yêu cầu hoàn tác (refund) giao dịch mua ảnh
 */
export const refundPostPurchase = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const { fileType = 'original' } = req.body
    const buyerId = req.user._id

    // 1. Kiểm tra cấu hình xem Refund có được bật trong Settings không
    const Settings = (await import('../models/Settings.model.js')).default
    const settings = await Settings.getSingleton()
    if (!settings.enableRefund) {
      throw new AppError('FORBIDDEN', 'Chức năng hoàn tiền (Refund) đã bị vô hiệu hóa bởi Admin.', 403)
    }

    // 2. Thực hiện hoàn tiền qua WalletService
    const WalletService = (await import('../services/WalletService.js')).default
    const result = await WalletService.refundPurchase({
      buyerId,
      postId,
      fileType,
      reason: 'Người dùng tự yêu cầu hoàn tác đơn hàng',
    })

    res.json({
      success: true,
      amount: result.amount,
      message: `Hoàn tác thành công. Số tiền ${result.amount.toLocaleString('vi-VN')} VNĐ đã được hoàn lại vào ví khả dụng.`,
    })
  } catch (err) {
    next(err)
  }
}
