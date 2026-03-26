import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import passport from '../config/googleStrategy.js'
import { authenticate } from '../middlewares/authenticate.js'
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleCallback,
} from '../controllers/auth.controller.js'

const router = Router()

// Rate limiting cho các endpoint nhạy cảm
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều lần đăng nhập. Thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều lần đăng ký từ IP này. Thử lại sau.' },
})

// Auth routes
router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refreshToken)
router.post('/logout', authenticate, logout)
router.post('/verify-email', verifyEmail)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google` }),
  googleCallback
)

export default router
