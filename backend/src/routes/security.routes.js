import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../middlewares/authenticate.js'
import {
  setupPin,
  verifyPin,
  changePin,
  resetPinRequest,
  resetPinVerify,
  getPinStatus,
  disablePin,
} from '../controllers/security.controller.js'

const router = Router()

// All security routes require authentication
router.use(authenticate)

// Strict rate limiter for PIN operations (anti-brute-force)
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    error: 'RATE_LIMITED',
    message: 'Quá nhiều yêu cầu PIN. Thử lại sau 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// GET /v1/security/pin-status — check if user has PIN set
router.get('/pin-status', getPinStatus)

// POST /v1/security/setup-pin — first-time PIN setup
router.post('/setup-pin', pinLimiter, setupPin)

// POST /v1/security/verify-pin — verify PIN before transaction
router.post('/verify-pin', pinLimiter, verifyPin)

// POST /v1/security/change-pin — change PIN (requires current PIN)
router.post('/change-pin', pinLimiter, changePin)

// POST /v1/security/reset-pin/request — request PIN reset via email OTP
router.post('/reset-pin/request', pinLimiter, resetPinRequest)

// POST /v1/security/reset-pin/verify — verify OTP + set new PIN
router.post('/reset-pin/verify', pinLimiter, resetPinVerify)

// POST /v1/security/disable-pin — disable PIN (requires account password)
router.post('/disable-pin', pinLimiter, disablePin)

export default router
