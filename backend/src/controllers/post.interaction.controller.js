import Post from '../models/Post.model.js'
import Interaction from '../models/Interaction.model.js'
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
      .lean()

    if (!post) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)
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

    res.json({
      post,
      isLiked,
      isBookmarked,
      isFollowingAuthor,
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

      await Post.findByIdAndUpdate(postId, {
        $inc: { 'stats.viewsCount': 1 },
      })
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
        { new: true, select: 'authorId' }
      ).lean()

      // Tăng totalViews cho author (chỉ khi viewer không phải chính chủ)
      if (post && post.authorId.toString() !== userId.toString()) {
        const User = (await import('../models/User.model.js')).default
        await User.findByIdAndUpdate(post.authorId, {
          $inc: { 'stats.totalViews': 1 },
        })
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
