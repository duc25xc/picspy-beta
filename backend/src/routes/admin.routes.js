import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import {
  getAllPosts, updatePostStatus, bulkUpdatePosts, buffPostStats,
  getAllUsers, adjustUserTokens, toggleBanUser, changeUserTier, setUserRole,
  createAdminUser, updateAdminUser, deleteAdminUser,
  getDashboardStats, getAnalytics,
  getCategories, createCategory, updateCategory, toggleCategory, deleteCategory,
  getSettings, updateSettings, getAuditLogs, triggerSettlement, triggerScoreDecay, triggerSubscriptionCleanup,
  depositUserVnd, getWithdrawalRequests, approveWithdrawal, rejectWithdrawal,
  getAdminReports, updateReportStatus,
  getServerLogs, clearServerLogs, clearAuditLogs,
} from '../controllers/admin.controller.js'

const router = Router()

// Tất cả admin routes đều cần authenticate + requireAdmin
router.use(authenticate, requireAdmin)

// ── Dashboard & Logs ──────────────────────────────────────────
router.get('/dashboard', getDashboardStats)
router.get('/dashboard/analytics', getAnalytics)
router.get('/audit-logs', getAuditLogs)
router.post('/audit-logs/clear', clearAuditLogs)
router.get('/server-logs', getServerLogs)
router.post('/server-logs/clear', clearServerLogs)

// ── Posts management ──────────────────────────────────────────
router.get('/posts', getAllPosts)
router.patch('/posts/:id/status', updatePostStatus)
router.post('/posts/bulk', bulkUpdatePosts)
router.post('/posts/:id/buff', buffPostStats)

// ── Reports management ────────────────────────────────────────
router.get('/reports', getAdminReports)
router.patch('/reports/:id/action', updateReportStatus)

// ── Users management ─────────────────────────────────────────
router.get('/users', getAllUsers)
router.post('/users', createAdminUser)
router.put('/users/:id', updateAdminUser)
router.delete('/users/:id', deleteAdminUser)
router.post('/users/:id/tokens', adjustUserTokens)
router.post('/users/:id/deposit', depositUserVnd)
router.patch('/users/:id/ban', toggleBanUser)
router.patch('/users/:id/tier', changeUserTier)
router.patch('/users/:id/role', setUserRole)

// ── Withdrawal requests management ───────────────────────────
router.get('/withdrawals', getWithdrawalRequests)
router.post('/withdrawals/:txnId/approve', approveWithdrawal)
router.post('/withdrawals/:txnId/reject', rejectWithdrawal)

// ── Category management ───────────────────────────────────────
router.get('/categories', getCategories)
router.post('/categories', createCategory)
router.put('/categories/:id', updateCategory)
router.patch('/categories/:id/toggle', toggleCategory)
router.delete('/categories/:id', deleteCategory)

// ── System Settings ───────────────────────────────────────────
router.get('/settings', getSettings)
router.put('/settings', updateSettings)
router.post('/settlement/trigger', triggerSettlement)
router.post('/settlement/trigger-score-decay', triggerScoreDecay)
router.post('/settlement/trigger-subscription-cleanup', triggerSubscriptionCleanup)

export default router
