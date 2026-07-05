import { Router } from 'express'
import { authenticate, optionalAuth } from '../middlewares/authenticate.js'
import { getLensSpy, checkLensSpy, extractArguments, suggestMeta } from '../controllers/ai.controller.js'
import rateLimit from 'express-rate-limit'

const router = Router()

// Rate limit chặt cho AI route: tránh gọi API liên tục gây tốn tiền
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu AI. Vui lòng thử lại sau 1 phút.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  validate: { xForwardedForHeader: false, default: false },
})

/**
 * GET /v1/ai/lensspy/:postId
 * Kiểm tra trạng thái phân tích (không tốn xu, có thể public)
 */
router.get('/lensspy/:postId', optionalAuth, checkLensSpy)

/**
 * POST /v1/ai/lensspy/:postId
 * Kích hoạt phân tích LensSpy AI (tốn xu, phải đăng nhập)
 */
router.post('/lensspy/:postId', authenticate, aiLimiter, getLensSpy)

/**
 * POST /v1/ai/extract-arguments
 * Trích xuất từ khóa động từ prompt (tốn xu/tính phí, phải đăng nhập)
 */
router.post('/extract-arguments', authenticate, aiLimiter, extractArguments)

/**
 * POST /v1/ai/suggest-meta
 * Gợi ý mô tả ngắn và tags từ ảnh chụp bằng AI (tốn xu, phải đăng nhập)
 */
router.post('/suggest-meta', authenticate, aiLimiter, suggestMeta)

export default router
