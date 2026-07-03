import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import {
  getOverview,
  getChartData,
  getStudioPosts,
  getEarningsHistory,
  getHashtagAnalytics,
  getCategoryStats,
} from '../controllers/studio.controller.js'

const router = Router()

// Tất cả studio routes đều cần đăng nhập
router.use(authenticate)

// GET /api/studio/overview — Stats tổng quan
router.get('/overview', getOverview)

// GET /api/studio/chart?period=7d|30d|90d&metric=views|downloads|earnings
router.get('/chart', getChartData)

// GET /api/studio/posts?sort=views|downloads|likes|earnings|recent&page=1
router.get('/posts', getStudioPosts)

// GET /api/studio/earnings?page=1 — Lịch sử thu nhập
router.get('/earnings', getEarningsHistory)

// GET /api/studio/hashtags — Phân tích hashtag
router.get('/hashtags', getHashtagAnalytics)

// GET /api/studio/categories — Views theo danh mục
router.get('/categories', getCategoryStats)

export default router

