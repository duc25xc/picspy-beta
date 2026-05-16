import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import {
  getAllPosts, updatePostStatus, bulkUpdatePosts,
  getAllUsers, adjustUserTokens, toggleBanUser,
  getDashboardStats, getAnalytics,
  getCategories, createCategory, updateCategory, toggleCategory, deleteCategory,
  getSettings, updateSettings,
} from '../controllers/admin.controller.js'

const router = Router()

// Tất cả admin routes đều cần authenticate + requireAdmin
router.use(authenticate, requireAdmin)

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats)
router.get('/dashboard/analytics', getAnalytics)

// ── Posts management ──────────────────────────────────────────
router.get('/posts', getAllPosts)
router.patch('/posts/:id/status', updatePostStatus)
router.post('/posts/bulk', bulkUpdatePosts)

// ── Users management ─────────────────────────────────────────
router.get('/users', getAllUsers)
router.post('/users/:id/tokens', adjustUserTokens)
router.patch('/users/:id/ban', toggleBanUser)

// ── Category management ───────────────────────────────────────
router.get('/categories', getCategories)
router.post('/categories', createCategory)
router.put('/categories/:id', updateCategory)
router.patch('/categories/:id/toggle', toggleCategory)
router.delete('/categories/:id', deleteCategory)

// ── System Settings ───────────────────────────────────────────
router.get('/settings', getSettings)
router.put('/settings', updateSettings)

export default router
