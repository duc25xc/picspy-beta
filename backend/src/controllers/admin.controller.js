import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import Category from '../models/Category.model.js'
import Settings from '../models/Settings.model.js'
import AuditLog from '../models/AuditLog.model.js'
import AppError from '../utils/AppError.js'
import { logAdminAction } from '../utils/auditLogger.js'

// ─── DEFAULT CATEGORIES SEED ──────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Thiên nhiên', slug: 'nature',   emoji: '🌿', sortOrder: 1 },
  { name: 'Anime',       slug: 'anime',    emoji: '🎌', sortOrder: 2 },
  { name: 'Minimal',     slug: 'minimal',  emoji: '◻️', sortOrder: 3 },
  { name: 'Abstract',    slug: 'abstract', emoji: '🎨', sortOrder: 4 },
  { name: 'Thành phố',  slug: 'city',     emoji: '🌃', sortOrder: 5 },
  { name: 'Vũ trụ',     slug: 'space',    emoji: '🚀', sortOrder: 6 },
  { name: 'Dark',        slug: 'dark',     emoji: '🌑', sortOrder: 7 },
  { name: 'Light',       slug: 'light',    emoji: '☀️', sortOrder: 8 },
  { name: 'Gradient',    slug: 'gradient', emoji: '🌈', sortOrder: 9 },
  { name: 'Khác',        slug: 'other',    emoji: '✨', sortOrder: 10 },
]

export const seedCategories = async () => {
  const count = await Category.countDocuments()
  if (count === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES)
    console.log('✅ Seeded', DEFAULT_CATEGORIES.length, 'default categories')
  }
}

// =============================================
// POST MANAGEMENT
// =============================================

/** GET /admin/posts */
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
  } catch (err) { next(err) }
}

/** PATCH /admin/posts/:id/status */
export const updatePostStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, rejectionReason } = req.body

    const VALID = ['approved', 'rejected', 'hidden', 'pending']
    if (!VALID.includes(status)) throw new AppError('INVALID_STATUS', 'Trạng thái không hợp lệ', 400)

    const post = await Post.findById(id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    const prev = post.status
    post.status = status
    if (status === 'rejected' && rejectionReason) post.rejectionReason = rejectionReason
    else if (status === 'approved') post.rejectionReason = undefined
    post.reviewedBy = req.user._id
    post.reviewedAt = new Date()
    await post.save()

    if (prev !== 'approved' && status === 'approved')
      await User.findByIdAndUpdate(post.authorId, { $inc: { 'stats.postsCount': 1 } })
    else if (prev === 'approved' && status !== 'approved')
      await User.findByIdAndUpdate(post.authorId, { $inc: { 'stats.postsCount': -1 } })

    // Log admin action
    await logAdminAction(req.user._id, `POST_${status.toUpperCase()}`, post._id, 'Post', {
      caption: post.caption,
      rejectionReason,
      previousStatus: prev
    })

    res.json({ message: `Đã cập nhật trạng thái thành "${status}"`, post })
  } catch (err) { next(err) }
}

/** POST /admin/posts/bulk — Bulk action nhiều posts */
export const bulkUpdatePosts = async (req, res, next) => {
  try {
    const { postIds, status, rejectionReason } = req.body
    if (!Array.isArray(postIds) || postIds.length === 0)
      throw new AppError('INVALID_INPUT', 'Cần ít nhất 1 post ID', 400)
    const VALID = ['approved', 'rejected', 'hidden', 'pending']
    if (!VALID.includes(status)) throw new AppError('INVALID_STATUS', 'Trạng thái không hợp lệ', 400)

    const posts = await Post.find({ _id: { $in: postIds } })

    // Cập nhật postsCount cho authors
    const authorUpdates = {}
    for (const post of posts) {
      const key = post.authorId.toString()
      if (!authorUpdates[key]) authorUpdates[key] = 0
      if (post.status !== 'approved' && status === 'approved') authorUpdates[key] += 1
      else if (post.status === 'approved' && status !== 'approved') authorUpdates[key] -= 1
    }

    const bulkUpdate = { status, reviewedBy: req.user._id, reviewedAt: new Date() }
    if (status === 'rejected' && rejectionReason) bulkUpdate.rejectionReason = rejectionReason
    if (status === 'approved') bulkUpdate.rejectionReason = undefined

    await Post.updateMany({ _id: { $in: postIds } }, { $set: bulkUpdate })

    // Cập nhật postsCount
    await Promise.all(
      Object.entries(authorUpdates)
        .filter(([, delta]) => delta !== 0)
        .map(([authorId, delta]) =>
          User.findByIdAndUpdate(authorId, { $inc: { 'stats.postsCount': delta } })
        )
    )

    // Log admin action
    await logAdminAction(req.user._id, `POST_BULK_${status.toUpperCase()}`, null, 'Post', {
      count: postIds.length,
      postIds,
      rejectionReason
    })

    res.json({ message: `Đã ${status} ${postIds.length} bài đăng`, updated: postIds.length })
  } catch (err) { next(err) }
}

// =============================================
// USER MANAGEMENT
// =============================================

/** GET /admin/users */
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

    res.json({
      users,
      totalUsers: await User.countDocuments(),
      pagination: { hasMore, nextCursor: hasMore ? users[users.length - 1]._id : null },
    })
  } catch (err) { next(err) }
}

/** POST /admin/users/:id/tokens */
export const adjustUserTokens = async (req, res, next) => {
  try {
    const { id } = req.params
    const { amount, reason = 'Admin adjustment' } = req.body
    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed === 0) throw new AppError('INVALID_AMOUNT', 'Số token không hợp lệ', 400)

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    user.tokenBalance = Math.max(0, user.tokenBalance + parsed)
    await user.save()

    // Log admin action
    await logAdminAction(req.user._id, 'USER_TOKENS_ADJUST', user._id, 'User', {
      username: user.username,
      amount: parsed,
      reason,
      newBalance: user.tokenBalance
    })

    res.json({
      message: `Đã ${parsed > 0 ? 'nạp' : 'trừ'} ${Math.abs(parsed)} token cho @${user.username}`,
      username: user.username,
      tokenBalance: user.tokenBalance,
      delta: parsed,
      reason,
    })
  } catch (err) { next(err) }
}

/** PATCH /admin/users/:id/ban */
export const toggleBanUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const { ban, reason, banDurationDays } = req.body
    if (id === req.user._id.toString())
      throw new AppError('FORBIDDEN', 'Không thể tự ban bản thân', 403)

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    user.isBanned = ban
    if (ban && reason) user.banReason = reason
    if (!ban) { user.banReason = undefined; user.banExpiry = undefined }

    // Hỗ trợ ban có thời hạn
    if (ban && banDurationDays && banDurationDays > 0) {
      user.banExpiry = new Date(Date.now() + banDurationDays * 24 * 60 * 60 * 1000)
    }

    await user.save()

    // Log admin action
    await logAdminAction(req.user._id, ban ? 'USER_BAN' : 'USER_UNBAN', user._id, 'User', {
      username: user.username,
      reason,
      durationDays: banDurationDays,
      expiry: user.banExpiry
    })

    res.json({
      message: ban ? `Đã ban @${user.username}` : `Đã unban @${user.username}`,
      isBanned: user.isBanned,
      banReason: user.banReason,
      banExpiry: user.banExpiry,
    })
  } catch (err) { next(err) }
}

/** PATCH /admin/users/:id/role — Set role user/admin */
export const setUserRole = async (req, res, next) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (id === req.user._id.toString())
      throw new AppError('FORBIDDEN', 'Không thể tự thay đổi role của bản thân', 403)

    const VALID_ROLES = ['user', 'admin']
    if (!VALID_ROLES.includes(role))
      throw new AppError('INVALID_ROLE', `Role không hợp lệ. Chọn: ${VALID_ROLES.join(', ')}`, 400)

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    const prevRole = user.role
    user.role = role
    await user.save()

    // Log admin action
    await logAdminAction(req.user._id, 'USER_ROLE_CHANGE', user._id, 'User', {
      username: user.username,
      previousRole: prevRole,
      newRole: role
    })

    res.json({
      message: `Đã đổi role @${user.username}: ${prevRole} → ${role}`,
      username: user.username,
      role: user.role,
      prevRole,
    })
  } catch (err) { next(err) }
}


/** PATCH /admin/users/:id/tier — Đổi subscription tier (dev/admin tool) */
export const changeUserTier = async (req, res, next) => {
  try {
    const { id } = req.params
    const { tier, expireInDays } = req.body

    const VALID_TIERS = ['free', 'pro', 'ultimate', 'founder']
    if (!VALID_TIERS.includes(tier))
      throw new AppError('INVALID_TIER', `Tier không hợp lệ. Chọn: ${VALID_TIERS.join(', ')}`, 400)

    const user = await User.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    const prevTier = user.subscriptionTier
    user.subscriptionTier = tier

    // Đặt expiry nếu có (mặc định 30 ngày)
    const days = parseInt(expireInDays) || (tier === 'free' ? 0 : 30)
    if (tier !== 'free' && days > 0) {
      user.subscriptionExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    } else {
      user.subscriptionExpiry = undefined
    }

    // Đặt founderSlot nếu là founder
    if (tier === 'founder') user.founderSlot = true
    else if (prevTier === 'founder' && tier !== 'founder') user.founderSlot = false

    await user.save()

    // Log admin action
    await logAdminAction(req.user._id, 'USER_TIER_CHANGE', user._id, 'User', {
      username: user.username,
      previousTier: prevTier,
      newTier: tier,
      expireInDays
    })

    res.json({
      message: `Đã đổi tier @${user.username}: ${prevTier} → ${tier}`,
      username: user.username,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiry: user.subscriptionExpiry,
      prevTier,
    })
  } catch (err) { next(err) }
}

// =============================================
// DASHBOARD & ANALYTICS
// =============================================

/** GET /admin/dashboard */
export const getDashboardStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [totalPosts, totalUsers, pendingPosts, totalApproved, recentPosts, recentUsers] =
      await Promise.all([
        Post.countDocuments(),
        User.countDocuments(),
        Post.countDocuments({ status: 'pending' }),
        Post.countDocuments({ status: 'approved' }),
        Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      ])

    res.json({ totalPosts, totalUsers, pendingPosts, totalApproved, recentPosts, recentUsers })
  } catch (err) { next(err) }
}

/** GET /admin/dashboard/analytics?days=7|30 */
export const getAnalytics = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30)
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - i)
      const end   = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i)
      const [posts, users] = await Promise.all([
        Post.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ])
      result.push({
        date: start.toISOString().split('T')[0],
        label: start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        posts,
        users,
      })
    }

    // Category breakdown
    const categoryStats = await Post.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    res.json({ timeline: result, categoryStats })
  } catch (err) { next(err) }
}

// =============================================
// CATEGORY MANAGEMENT
// =============================================

/** GET /admin/categories */
export const getCategories = async (req, res, next) => {
  try {
    await seedCategories() // auto-seed nếu chưa có
    const categories = await Category.find().lean()
    const sorted = [...categories].sort((a, b) => {
      if (a.slug === 'other') return 1
      if (b.slug === 'other') return -1
      return (a.sortOrder || 0) - (b.sortOrder || 0) || (a.createdAt || 0) - (b.createdAt || 0)
    })
    res.json({ categories: sorted })
  } catch (err) { next(err) }
}

/** GET /v1/categories — Public: chỉ trả về isActive */
export const getPublicCategories = async (req, res, next) => {
  try {
    await seedCategories()
    const categories = await Category.find({ isActive: true })
      .select('name slug emoji sortOrder')
      .lean()
    const sorted = [...categories].sort((a, b) => {
      if (a.slug === 'other') return 1
      if (b.slug === 'other') return -1
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })
    res.json({ categories: sorted })
  } catch (err) { next(err) }
}

/** GET /v1/categories/details — Public: trả về thông tin chi tiết danh mục kèm top posts */
export const getPublicCategoriesDetails = async (req, res, next) => {
  try {
    await seedCategories()
    const categories = await Category.find({ isActive: true }).lean()

    const categoriesData = await Promise.all(
      categories.map(async (cat) => {
        const count = await Post.countDocuments({ status: 'approved', category: cat.slug })

        // Tính tổng views và downloads của danh mục để phục vụ lọc Trending
        const stats = await Post.aggregate([
          { $match: { status: 'approved', category: cat.slug } },
          {
            $group: {
              _id: null,
              totalViews: { $sum: { $ifNull: ['$stats.viewsCount', 0] } },
              totalDownloads: { $sum: { $ifNull: ['$stats.downloadsCount', 0] } }
            }
          }
        ])
        const totalViews = stats[0]?.totalViews || 0
        const totalDownloads = stats[0]?.totalDownloads || 0

        // Lấy top 6 posts nhiều tương tác nhất để hiển thị giao diện đa dạng style
        const topPosts = await Post.aggregate([
          { $match: { status: 'approved', category: cat.slug } },
          {
            $addFields: {
              popularityScore: {
                $add: [
                  { $ifNull: ['$stats.viewsCount', 0] },
                  { $multiply: [{ $ifNull: ['$stats.likesCount', 0] }, 3] },
                  { $multiply: [{ $ifNull: ['$stats.downloadsCount', 0] }, 5] }
                ]
              }
            }
          },
          { $sort: { popularityScore: -1, _id: -1 } },
          { $limit: 6 },
          {
            $project: {
              _id: 1,
              generatedImages: 1,
              images: 1,
              caption: 1,
              prompt: 1,
              tags: 1,
              stats: 1
            }
          }
        ])

        return {
          _id: cat._id,
          key: cat.slug,
          label: cat.name,
          emoji: cat.emoji,
          createdAt: cat.createdAt,
          count,
          totalViews,
          totalDownloads,
          posts: topPosts
        }
      })
    )

    res.json({ categories: categoriesData })
  } catch (err) { next(err) }
}

/** POST /admin/categories */
export const createCategory = async (req, res, next) => {
  try {
    const { name, emoji = '🏷️', description } = req.body
    if (!name?.trim()) throw new AppError('INVALID_INPUT', 'Tên danh mục không được bỏ trống', 400)

    const slug = name.trim().toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    const maxOrder = await Category.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean()

    const category = await Category.create({
      name: name.trim(),
      slug,
      emoji,
      description,
      sortOrder: (maxOrder?.sortOrder || 0) + 1,
      createdBy: req.user._id,
    })

    res.status(201).json({ message: 'Đã tạo danh mục', category })
  } catch (err) {
    if (err.code === 11000) return next(new AppError('DUPLICATE', 'Slug đã tồn tại', 409))
    next(err)
  }
}

/** PUT /admin/categories/:id */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, emoji, description, sortOrder } = req.body

    const category = await Category.findById(id)
    if (!category) throw new AppError('NOT_FOUND', 'Không tìm thấy danh mục', 404)

    if (name !== undefined) category.name = name.trim()
    if (emoji !== undefined) category.emoji = emoji
    if (description !== undefined) category.description = description
    if (sortOrder !== undefined) category.sortOrder = parseInt(sortOrder)
    await category.save()

    res.json({ message: 'Đã cập nhật danh mục', category })
  } catch (err) { next(err) }
}

/** PATCH /admin/categories/:id/toggle — bật/tắt active */
export const toggleCategory = async (req, res, next) => {
  try {
    const { id } = req.params
    const category = await Category.findById(id)
    if (!category) throw new AppError('NOT_FOUND', 'Không tìm thấy danh mục', 404)

    // Không tắt "other" vì là fallback
    if (category.slug === 'other')
      throw new AppError('FORBIDDEN', 'Không thể tắt danh mục Khác (dùng làm fallback)', 400)

    category.isActive = !category.isActive
    await category.save()

    res.json({ message: `Đã ${category.isActive ? 'bật' : 'tắt'} danh mục "${category.name}"`, isActive: category.isActive })
  } catch (err) { next(err) }
}

/** DELETE /admin/categories/:id — soft delete (set inactive + migrate posts) */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params
    const category = await Category.findById(id)
    if (!category) throw new AppError('NOT_FOUND', 'Không tìm thấy danh mục', 404)

    if (category.slug === 'other')
      throw new AppError('FORBIDDEN', 'Không thể xóa danh mục mặc định "Khác"', 400)

    // Migrate posts về "other"
    const migrated = await Post.updateMany(
      { category: category.slug },
      { $set: { category: 'other' } }
    )

    await category.deleteOne()

    res.json({
      message: `Đã xóa danh mục "${category.name}"`,
      migratedPosts: migrated.modifiedCount,
    })
  } catch (err) { next(err) }
}

// =============================================
// SETTINGS MANAGEMENT
// =============================================

/** GET /admin/settings — Lấy setting hiện tại */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton()
    res.json({ settings })
  } catch (err) { next(err) }
}

/** PUT /admin/settings — Cập nhật 1 hoặc nhiều setting */
export const updateSettings = async (req, res, next) => {
  try {
    const allowed = [
      'autoApprove', 'autoApproveDelayMs', 'primaryColor', 'gradientColor', 
      'brandOpacity', 'brandBlur', 'enableGradient', 'shadowStyle',
      'announcementText', 'announcementLink', 'announcementEnabled',
      'categoryStyle', 'categoriesPageStyle', 'heroBannerMode', 'heroBannerImage',
      'heroCollageMode', 'heroCollageImages', 'globalLoaderType', 'splashExtraMs', 'myPostsSkeletonMs', 'postLoadingDelayMs',
      'payoutRatePerView', 'creatorSharePercent', 'withdrawalFlatFee', 'withdrawalPercentFee', 'blurPremiumImages',
      'postDetailLayout'
    ]
    const updates = {}
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    })

    if (Object.keys(updates).length === 0) {
      return next(new AppError('Không có trường nào hợp lệ để cập nhật', 400))
    }

    const settings = await Settings.updateSettings(updates)

    // Log admin action
    await logAdminAction(req.user._id, 'SYSTEM_SETTINGS_UPDATE', settings._id, 'Settings', updates)

    res.json({ message: 'Đã cập nhật cài đặt', settings })
  } catch (err) { next(err) }
}

/** GET /admin/audit-logs */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query
    const query = {}
    if (cursor) {
      query._id = { $lt: cursor }
    }

    const logs = await AuditLog.find(query)
      .populate('adminId', 'username avatar email')
      .sort({ _id: -1 })
      .limit(Number(limit) + 1)

    const hasMore = logs.length > Number(limit)
    const data = hasMore ? logs.slice(0, -1) : logs

    res.json({
      logs: data,
      pagination: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1]._id : null,
        count: data.length,
      },
    })
  } catch (err) { next(err) }
}

/** POST /admin/settlement/trigger — Chạy quyết toán thủ công */
export const triggerSettlement = async (req, res, next) => {
  try {
    const { runDailySettlement } = await import('../jobs/settlement.js')
    const result = await runDailySettlement()
    res.json({ message: 'Quyết toán hoàn thành', result })
  } catch (err) { next(err) }
}

/** POST /admin/users/:id/deposit */
export const depositUserVnd = async (req, res, next) => {
  try {
    const { id: userId } = req.params
    const { amount, description, adminNote } = req.body
    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed === 0) {
      throw new AppError('INVALID_AMOUNT', 'Số tiền điều chỉnh không hợp lệ', 400)
    }

    const WalletService = (await import('../services/WalletService.js')).default
    const result = await WalletService.deposit({
      userId,
      amount: parsed,
      description,
      adminNote,
      adminId: req.user._id
    })

    // Log admin action
    await logAdminAction(req.user._id, 'USER_VND_DEPOSIT', userId, 'User', {
      amount: parsed,
      description,
      adminNote,
      newBalance: result.user.vndBalance
    })

    const actionText = parsed > 0 ? 'nạp thành công' : 'trừ thành công'
    res.json({
      message: `Đã ${actionText} ${Math.abs(parsed).toLocaleString('vi-VN')} VNĐ cho @${result.user.username}`,
      username: result.user.username,
      vndBalance: result.user.vndBalance,
      transaction: result.transaction
    })
  } catch (err) { next(err) }
}

/** GET /admin/withdrawals */
export const getWithdrawalRequests = async (req, res, next) => {
  try {
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    // Tìm các yêu cầu rút tiền
    const requests = await VndTransaction.find({ type: 'withdraw_request' })
      .populate('userId', 'username displayName email avatar bankAccount vndBalance holdingBalance lockedBalance')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ requests })
  } catch (err) { next(err) }
}

/** POST /admin/withdrawals/:txnId/approve */
export const approveWithdrawal = async (req, res, next) => {
  try {
    const { txnId } = req.params
    const { adminNote } = req.body

    const WalletService = (await import('../services/WalletService.js')).default
    const result = await WalletService.withdrawApprove(
      txnId,
      adminNote,
      req.user._id
    )

    // Log admin action
    await logAdminAction(req.user._id, 'WITHDRAW_APPROVE', result.transaction.userId, 'VndTransaction', {
      transactionId: txnId,
      adminNote
    })

    res.json({
      message: 'Đã duyệt yêu cầu rút tiền thành công',
      transaction: result.transaction
    })
  } catch (err) { next(err) }
}

/** POST /admin/withdrawals/:txnId/reject */
export const rejectWithdrawal = async (req, res, next) => {
  try {
    const { txnId } = req.params
    const { adminNote } = req.body

    const WalletService = (await import('../services/WalletService.js')).default
    const result = await WalletService.withdrawReject(
      txnId,
      adminNote,
      req.user._id
    )

    // Log admin action
    await logAdminAction(req.user._id, 'WITHDRAW_REJECT', result.transaction.userId, 'VndTransaction', {
      transactionId: txnId,
      adminNote
    })

    res.json({
      message: 'Đã từ chối yêu cầu rút tiền thành công',
      transaction: result.transaction
    })
  } catch (err) { next(err) }
}


