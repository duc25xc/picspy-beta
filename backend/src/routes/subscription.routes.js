import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import {
  getPlans,
  getMySubscription,
  claimFreeTokens,
  requestSubscription,
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

// Yêu cầu nâng gói (Phase 1: mock → trả thông tin chuyển khoản)
router.post('/subscribe', authenticate, requestSubscription)

// ── Admin Only ────────────────────────────────────────────────
// Admin kích hoạt gói thủ công sau khi xác nhận thanh toán
router.post('/activate', authenticate, requireAdmin, activateSubscription)

export default router
