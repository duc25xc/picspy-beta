import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import TokenTransaction from '../models/TokenTransaction.model.js'
import VndTransaction from '../models/VndTransaction.model.js'
import AppError from '../utils/AppError.js'

/**
 * GET /api/studio/overview
 * Tổng quan studio: stats toàn thời gian + 7 ngày gần nhất
 */
export const getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id
    const now = new Date()
    const days7Ago = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const days30Ago = new Date(now - 30 * 24 * 60 * 60 * 1000)

    // Tất cả post của user (approved)
    const [allPosts, user, earningsLast30] = await Promise.all([
      Post.find({ authorId: userId, status: 'approved' })
        .select('stats totalTokensEarned createdAt')
        .lean(),
      User.findById(userId).select('stats totalEarned totalWithdrawn tokenBalance').lean(),
      TokenTransaction.find({
        userId,
        type: 'earn_download',
        createdAt: { $gte: days30Ago },
      }).lean(),
    ])

    // Tổng hợp stats từ posts
    const totals = allPosts.reduce(
      (acc, p) => ({
        views: acc.views + (p.stats?.viewsCount || 0),
        likes: acc.likes + (p.stats?.likesCount || 0),
        downloads: acc.downloads + (p.stats?.downloadsCount || 0),
        comments: acc.comments + (p.stats?.commentsCount || 0),
        bookmarks: acc.bookmarks + (p.stats?.bookmarksCount || 0),
      }),
      { views: 0, likes: 0, downloads: 0, comments: 0, bookmarks: 0 }
    )

    // Earnings 30 ngày
    const earnLast30 = earningsLast30.reduce((s, t) => s + (t.amount || 0), 0)

    res.json({
      totalPosts: allPosts.length,
      stats: totals,
      earnings: {
        totalEarned: user?.totalEarned || 0,
        totalWithdrawn: user?.totalWithdrawn || 0,
        currentBalance: user?.tokenBalance || 0,
        last30Days: earnLast30,
      },
      followers: user?.stats?.followersCount || 0,
      following: user?.stats?.followingCount || 0,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/studio/chart?period=7d|30d|90d&metric=views|downloads|earnings
 * Dữ liệu cho biểu đồ theo ngày
 */
export const getChartData = async (req, res, next) => {
  try {
    const userId = req.user._id
    const { period = '30d', metric = 'views' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Generate ngày label
    const labels = []
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      labels.push(d.toISOString().slice(0, 10)) // YYYY-MM-DD
    }

    let data = []

    if (metric === 'earnings') {
      // Aggregate từ TokenTransaction
      const txns = await TokenTransaction.find({
        userId,
        type: 'earn_download',
        createdAt: { $gte: startDate },
      }).lean()

      const map = {}
      txns.forEach((t) => {
        const day = new Date(t.createdAt).toISOString().slice(0, 10)
        map[day] = (map[day] || 0) + (t.amount || 0)
      })
      data = labels.map((l) => map[l] || 0)
    } else {
      // Từ posts createdAt: không đủ granularity — dùng viewsCount snapshot tích lũy
      // Thực tế: query Interaction model by createdAt per day
      const type = metric === 'downloads' ? 'download' : metric === 'likes' ? 'like' : 'view'

      const Interaction = (await import('../models/Interaction.model.js')).default

      // Lấy postIds của user
      const userPosts = await Post.find({ authorId: userId, status: 'approved' })
        .select('_id')
        .lean()
      const postIds = userPosts.map((p) => p._id)

      if (postIds.length === 0) {
        return res.json({ labels, data: labels.map(() => 0), metric, period })
      }

      const interactions = await Interaction.find({
        postId: { $in: postIds },
        type,
        createdAt: { $gte: startDate },
      })
        .select('createdAt')
        .lean()

      const map = {}
      interactions.forEach((i) => {
        const day = new Date(i.createdAt).toISOString().slice(0, 10)
        map[day] = (map[day] || 0) + 1
      })
      data = labels.map((l) => map[l] || 0)
    }

    res.json({ labels, data, metric, period })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/studio/posts?sort=views|downloads|likes|earnings&page=1&limit=10
 * Danh sách posts với performance stats
 */
export const getStudioPosts = async (req, res, next) => {
  try {
    const userId = req.user._id
    const { sort = 'views', page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const sortField = {
      views: 'stats.viewsCount',
      downloads: 'stats.downloadsCount',
      likes: 'stats.likesCount',
      earnings: 'totalTokensEarned',
      recent: 'createdAt',
    }[sort] || 'stats.viewsCount'
    const [posts, total] = await Promise.all([
      Post.find({ authorId: userId, status: 'approved' })
        .sort({ [sortField]: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('caption tags generatedImages images stats totalTokensEarned createdAt isPremium priceInVnd aiTool category')
        .lean(),
      Post.countDocuments({ authorId: userId, status: 'approved' }),
    ])

    res.json({
      posts,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/studio/earnings?page=1&limit=20
 * Lịch sử giao dịch token — earn only
 */
export const getEarningsHistory = async (req, res, next) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [transactions, total, user] = await Promise.all([
      VndTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('relatedPostId', 'caption generatedImages')
        .lean(),
      VndTransaction.countDocuments({ userId }),
      User.findById(userId).select('totalEarned totalWithdrawn vndBalance bankAccount').lean(),
    ])

    res.json({
      transactions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        totalEarned: user?.totalEarned || 0,
        totalWithdrawn: user?.totalWithdrawn || 0,
        currentBalance: user?.vndBalance || 0,
      },
      bankAccount: user?.bankAccount || null
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/studio/hashtags
 * Phân tích hashtag của creator + so sánh với trending toàn hệ thống
 */
export const getHashtagAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id

    // Tags của user
    const userPosts = await Post.find({ authorId: userId, status: 'approved' })
      .select('tags stats.viewsCount stats.downloadsCount')
      .lean()

    // Aggregate tags từ posts của user
    const tagMap = {}
    userPosts.forEach((p) => {
      ;(p.tags || []).forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = { count: 0, views: 0, downloads: 0 }
        tagMap[tag].count++
        tagMap[tag].views += p.stats?.viewsCount || 0
        tagMap[tag].downloads += p.stats?.downloadsCount || 0
      })
    })

    // Top 20 tags của user
    const userTags = Object.entries(tagMap)
      .map(([tag, stats]) => ({ tag, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20)

    // Trending tags toàn hệ thống (30 ngày gần nhất)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const trendingPosts = await Post.find({
      status: 'approved',
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('tags stats.viewsCount')
      .sort({ 'stats.viewsCount': -1 })
      .limit(200)
      .lean()

    const globalTagMap = {}
    trendingPosts.forEach((p) => {
      ;(p.tags || []).forEach((tag) => {
        globalTagMap[tag] = (globalTagMap[tag] || 0) + (p.stats?.viewsCount || 0)
      })
    })

    const trendingTags = Object.entries(globalTagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, views]) => ({ tag, views }))

    res.json({ userTags, trendingTags })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/studio/categories
 * Thống kê views/downloads/posts theo danh mục
 */
export const getCategoryStats = async (req, res, next) => {
  try {
    const userId = req.user._id

    const posts = await Post.find({ authorId: userId, status: 'approved' })
      .select('category stats')
      .lean()

    const catMap = {}
    posts.forEach((p) => {
      const cat = p.category || 'other'
      if (!catMap[cat]) catMap[cat] = { category: cat, posts: 0, views: 0, downloads: 0, likes: 0 }
      catMap[cat].posts++
      catMap[cat].views     += p.stats?.viewsCount     || 0
      catMap[cat].downloads += p.stats?.downloadsCount || 0
      catMap[cat].likes     += p.stats?.likesCount     || 0
    })

    const categories = Object.values(catMap).sort((a, b) => b.views - a.views)

    res.json({ categories })
  } catch (err) {
    next(err)
  }
}
