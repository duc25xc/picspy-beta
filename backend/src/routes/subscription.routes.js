import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import {
  getPlans,
  getMySubscription,
  claimFreeTokens,
  requestSubscription,
  confirmTransferNotification,
  getPendingSubscriptionOrders,
  approveSubscriptionOrder,
  rejectSubscriptionOrder,
  activateSubscription,
} from '../controllers/subscription.controller.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────
// Xem danh sách gói (Pricing Page)
router.get('/plans', getPlans)

// ── Authenticated ─────────────────────────────────────────────
// Xem subscription hiện tại
router.get('/me', authenticate, getMySubscription)

// User Free nhận 100 token 1 lần duy nhất
router.post('/claim-free-tokens', authenticate, claimFreeTokens)

// Yêu cầu nâng gói (Phase 1: trả thông tin chuyển khoản & lưu đơn pending)
router.post('/subscribe', authenticate, requestSubscription)

// Người dùng thông báo đã chuyển khoản thành công
router.post('/confirm-transfer', authenticate, confirmTransferNotification)

// ── Admin Only ────────────────────────────────────────────────
// Admin lấy danh sách đơn nạp/nâng gói chờ duyệt
router.get('/pending-orders', authenticate, requireAdmin, getPendingSubscriptionOrders)

// Admin duyệt 1-click kích hoạt đơn nạp
router.post('/orders/:orderId/approve', authenticate, requireAdmin, approveSubscriptionOrder)

// Admin từ chối đơn nạp
router.post('/orders/:orderId/reject', authenticate, requireAdmin, rejectSubscriptionOrder)

// Admin kích hoạt gói thủ công
router.post('/activate', authenticate, requireAdmin, activateSubscription)

export default router
