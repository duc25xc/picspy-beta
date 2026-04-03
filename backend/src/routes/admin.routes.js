import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import {
  getAllPosts,
  updatePostStatus,
  getAllUsers,
  adjustUserCoins,
  toggleBanUser,
  getDashboardStats,
} from '../controllers/admin.controller.js'

const router = Router()

// Tất cả admin routes đều cần authenticate + requireAdmin
router.use(authenticate, requireAdmin)

// Dashboard
router.get('/dashboard', getDashboardStats)

// Posts management
router.get('/posts', getAllPosts)
router.patch('/posts/:id/status', updatePostStatus)

// Users management
router.get('/users', getAllUsers)
router.post('/users/:id/coins', adjustUserCoins)
router.patch('/users/:id/ban', toggleBanUser)

export default router
