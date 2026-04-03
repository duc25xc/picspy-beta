import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import AppError from '../utils/AppError.js'

// =============================================
// POST MANAGEMENT
// =============================================

/**
 * GET /admin/posts — Danh sách tất cả bài đăng (có filter status)
 */
export const getAllPosts = async (req, res, next) => {
  try {
    const { status = 'pending', cursor, limit = 20 } = req.query
    const query = {}
    if (status !== 'all') query.status = status
    if (cursor) query._id = { $lt: cursor }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate('authorId', 'username displayName avatar email')
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    // Count từng status
    const [pendingCount, approvedCount, rejectedCount, hiddenCount] = await Promise.all([
      Post.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'approved' }),
      Post.countDocuments({ status: 'rejected' }),
      Post.countDocuments({ status: 'hidden' }),
    ])

    res.json({
      posts,
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        hidden: hiddenCount,
        total: pendingCount + approvedCount + rejectedCount + hiddenCount,
      },
      pagination: {
        hasMore,
        nextCursor: hasMore ? posts[posts.length - 1]._id : null,
        count: posts.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /admin/posts/:id/status — Phê duyệt / Từ chối / Ẩn bài đăng
 */
export const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    const VALID_STATUSES = ['approved', 'rejected', 'hidden', 'pending']
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError('INVALID_STATUS', 'Trạng thái không hợp lệ', 400)
    }

    const post = await Post.findById(id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    const prevStatus = post.status
    post.status = status
    if (status === 'rejected' && rejectionReason) {
      post.rejectionReason = rejectionReason
    } else if (status === 'approved') {
      post.rejectionReason = undefined
    }
    await post.save()

    // Cập nhật postsCount của author khi approve/un-approve
    if (prevStatus !== 'approved' && status === 'approved') {
      await User.findByIdAndUpdate(post.authorId, { $inc: { 'stats.postsCount': 1 } })
    } else if (prevStatus === 'approved' && status !== 'approved') {
      await User.findByIdAndUpdate(post.authorId, {
        $inc: { 'stats.postsCount': -1 },
      })
    }

    res.json({ message: `Đã cập nhật trạng thái thành "${status}"`, post })
  } catch (err) {
    next(err)
  }
}

// =============================================
// USER MANAGEMENT
// =============================================

/**
 * GET /admin/users — Danh sách users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { cursor, limit = 20, search } = req.query
    const query = {}
    if (cursor) query._id = { $lt: cursor }
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ]
    }

    const users = await User.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .select('-passwordHash -emailVerifyToken -passwordResetToken')
      .lean()

    const hasMore = users.length > parseInt(limit)
    if (hasMore) users.pop()

    const totalUsers = await User.countDocuments()

    res.json({
      users,
      totalUsers,
      pagination: {
        hasMore,
        nextCursor: hasMore ? users[users.length - 1]._id : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// =============================================
// COIN MANAGEMENT (Admin tools)
// =============================================

/**
 * POST /admin/users/:id/coins — Nạp/trừ xu cho user
 */
export const adjustUserCoins = async (req, res, next) => {
  try {
    const { id } = req.params
    const { amount, reason = 'Admin adjustment' } = req.body

    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed === 0) {
      throw new AppError('INVALID_AMOUNT', 'Số xu không hợp lệ', 400)
    }

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    const newBalance = Math.max(0, user.coinBalance + parsed)
    user.coinBalance = newBalance
    await user.save()

    res.json({
      message: `Đã ${parsed > 0 ? 'nạp' : 'trừ'} ${Math.abs(parsed)} xu cho @${user.username}`,
      username: user.username,
      coinBalance: newBalance,
      delta: parsed,
      reason,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /admin/users/:id/ban — Ban/unban user
 */
export const toggleBanUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const { ban, reason } = req.body

    if (id === req.user._id.toString()) {
      throw new AppError('FORBIDDEN', 'Không thể tự ban bản thân', 403)
    }

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    user.isBanned = ban
    if (ban && reason) user.banReason = reason
    if (!ban) user.banReason = undefined
    await user.save()

    res.json({
      message: ban ? `Đã ban @${user.username}` : `Đã unban @${user.username}`,
      isBanned: user.isBanned,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /admin/dashboard — Thống kê tổng quan
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalPosts,
      totalUsers,
      pendingPosts,
      totalApproved,
    ] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Post.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'approved' }),
    ])

    // Posts 7 ngày gần nhất
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentPosts = await Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    const recentUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } })

    res.json({
      totalPosts,
      totalUsers,
      pendingPosts,
      totalApproved,
      recentPosts,
      recentUsers,
    })
  } catch (err) {
    next(err)
  }
}
