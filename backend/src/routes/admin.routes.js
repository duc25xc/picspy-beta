import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import multer from 'multer'
import {
  getAllPosts, updatePostStatus, bulkUpdatePosts, buffPostStats, importCsvPosts, getCsvImportHistory, analyzeCsvPosts, undoCsvImportBatch, analyzeReclassifyCsvPosts, batchApplyReclassifications, batchApplyCategoryProposals,
  getAllUsers, adjustUserTokens, toggleBanUser, changeUserTier, setUserRole, cleanupOrphanCsvUsers, adminUpdateUserAvatar,
  createAdminUser, updateAdminUser, deleteAdminUser,
  getDashboardStats, getAnalytics,
  getCategories, createCategory, updateCategory, toggleCategory, deleteCategory,
  getCategoryRequests, approveCategoryRequest, rejectCategoryRequest,
  getSettings, updateSettings, getBypassKeys, getAuditLogs, triggerSettlement, triggerScoreDecay, triggerSubscriptionCleanup,
  depositUserVnd, getWithdrawalRequests, approveWithdrawal, rejectWithdrawal,
  getAdminReports, updateReportStatus,
  getServerLogs, clearServerLogs, clearAuditLogs,
} from '../controllers/admin.controller.js'

const router = Router()
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

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
router.get('/posts/import-history', getCsvImportHistory)
router.patch('/posts/:id/status', updatePostStatus)
router.post('/posts/bulk', bulkUpdatePosts)
router.post('/posts/buff', buffPostStats)
router.post('/posts/analyze-csv', uploadCsv.single('file'), analyzeCsvPosts)
router.post('/posts/import-csv', uploadCsv.single('file'), importCsvPosts)
router.post('/posts/undo-import', undoCsvImportBatch)
router.post('/posts/analyze-reclassify-csv', analyzeReclassifyCsvPosts)
router.post('/posts/batch-apply-reclassifications', batchApplyReclassifications)
router.post('/posts/batch-apply-category-proposals', batchApplyCategoryProposals)

// ── Reports management ────────────────────────────────────────
router.get('/reports', getAdminReports)
router.patch('/reports/:id/action', updateReportStatus)

// ── Users management ─────────────────────────────────────────
router.get('/users', getAllUsers)
router.post('/users/cleanup-orphans', cleanupOrphanCsvUsers)
router.post('/users', createAdminUser)
router.put('/users/:id', updateAdminUser)
router.delete('/users/:id', deleteAdminUser)
router.post('/users/:id/tokens', adjustUserTokens)
router.post('/users/:id/deposit', depositUserVnd)
router.patch('/users/:id/ban', toggleBanUser)
router.patch('/users/:id/tier', changeUserTier)
router.patch('/users/:id/role', setUserRole)
router.post('/users/:id/avatar', uploadAvatar.single('avatar'), adminUpdateUserAvatar)

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
router.get('/category-requests', getCategoryRequests)
router.post('/category-requests/:postId/approve', approveCategoryRequest)
router.post('/category-requests/:postId/reject', rejectCategoryRequest)

// ── System Settings ───────────────────────────────────────────
router.get('/settings', getSettings)
router.get('/settings/bypass-keys', getBypassKeys)
router.put('/settings', updateSettings)
router.post('/settlement/trigger', triggerSettlement)
router.post('/settlement/trigger-score-decay', triggerScoreDecay)
router.post('/settlement/trigger-subscription-cleanup', triggerSubscriptionCleanup)

export default router
