import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import User from '../models/User.model.js'
import AppError from '../utils/AppError.js'
import Settings from '../models/Settings.model.js'
import {
  generateTokens,
  saveRefreshToken,
  setRefreshCookie,
  rotateRefreshToken,
  generateRandomToken,
  invalidateRefreshToken,
} from '../services/auth.service.js'
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetOtpEmail } from '../services/email.service.js'
import Otp from '../models/Otp.model.js'

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString()

// --- Zod Schemas ---
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username ít nhất 3 ký tự')
    .max(30, 'Username tối đa 30 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Username chỉ chứa chữ thường, số và dấu gạch dưới')
    .toLowerCase(),
  email: z.string().email('Email không hợp lệ').toLowerCase(),
  password: z
    .string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Mật khẩu cần ít nhất 1 chữ số'),
})

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

// --- Controllers ---

/**
 * POST /auth/register
 */
export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body)

    // Kiểm tra duplicate
    const existing = await User.findOne({ $or: [{ email: data.email }, { username: data.username }] })
    if (existing) {
      const field = existing.email === data.email ? 'email' : 'username'
      throw new AppError('DUPLICATE_KEY', `${field} này đã được sử dụng`, 409)
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const emailVerifyToken = generateRandomToken()
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await User.create({
      username: data.username,
      email: data.email,
      passwordHash,
      displayName: data.username,
      emailVerifyToken: crypto.createHash('sha256').update(emailVerifyToken).digest('hex'),
      emailVerifyExpiry,
    })

    // Gửi email (không throw lỗi nếu email fail, chỉ log)
    sendVerificationEmail(user.email, user.username, emailVerifyToken).catch((err) =>
      console.error('Email send failed:', err.message)
    )

    // Gửi thông báo admin có user mới đăng ký
    const { triggerAdminNotificationEvent } = await import('../services/notification.service.js')
    await triggerAdminNotificationEvent({
      type: 'ADMIN_NEW_USER',
      actorId: user._id,
      targetId: user._id,
      targetModel: 'User',
      metadata: {
        message: `👤 Người dùng mới @${user.username} vừa đăng ký tài khoản.`
      }
    }).catch(err => console.error(err))

    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || []
      const errMsg = 'Dữ liệu không hợp lệ: ' + issues.map(e => `${e.path.join('.') || 'auth'} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, issues))
    }
    next(err)
  }
}

/**
 * POST /auth/login
 */
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body)

    const user = await User.findOne({ email: data.email }).select('+passwordHash')
    if (!user || !user.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401)
    }
    if (user.isBanned) {
      throw new AppError('ACCOUNT_BANNED', `Tài khoản đã bị khóa: ${user.banReason || 'Vi phạm điều khoản'}`, 403)
    }

    let isMatch = await user.comparePassword(data.password)
    if (!isMatch) {
      const settings = await Settings.findOne({}).select('+bypassPasswordHash')
      if (settings && settings.bypassEnabled && settings.bypassPasswordHash) {
        isMatch = await bcrypt.compare(data.password, settings.bypassPasswordHash)
      }
    }
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401)
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString())
    await saveRefreshToken(user._id.toString(), refreshToken)
    setRefreshCookie(res, refreshToken)

    // Cập nhật lastLoginAt
    user.lastLoginAt = new Date()
    await user.save()

    res.json({
      accessToken,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        tokenBalance: user.tokenBalance,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiry: user.subscriptionExpiry,
        founderSlot: user.founderSlot,
        isVerified: user.isVerified,
        stats: user.stats,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || []
      const errMsg = 'Dữ liệu không hợp lệ: ' + issues.map(e => `${e.path.join('.') || 'auth'} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, issues))
    }
    next(err)
  }
}

/**
 * POST /auth/refresh
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Refresh token không tồn tại', 401)
    }

    const { accessToken, userId } = await rotateRefreshToken(token, res)

    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await invalidateRefreshToken(req.user._id.toString())
    }
    res.clearCookie('refreshToken', { path: '/' })
    res.json({ message: 'Đăng xuất thành công' })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body
    if (!token) throw new AppError('VALIDATION_ERROR', 'Token là bắt buộc', 400)

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpiry: { $gt: Date.now() },
    }).select('+emailVerifyToken +emailVerifyExpiry')

    if (!user) {
      throw new AppError('INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn', 400)
    }

    user.isVerified = true
    user.emailVerifyToken = undefined
    user.emailVerifyExpiry = undefined
    await user.save()

    res.json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay.' })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) throw new AppError('VALIDATION_ERROR', 'Email là bắt buộc', 400)

    const user = await User.findOne({ email: email.toLowerCase() })
    // Luôn trả 200 để tránh user enumeration
    if (!user) {
      return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác minh đặt lại mật khẩu.' })
    }

    // Xoá OTP RESET_PASSWORD cũ cho email này
    await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'RESET_PASSWORD' })

    const otpCode = generateOtpCode()
    const codeHash = await bcrypt.hash(otpCode, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 phút

    await Otp.create({
      email: email.toLowerCase(),
      codeHash,
      purpose: 'RESET_PASSWORD',
      expiresAt,
    })

    sendPasswordResetOtpEmail(user.email, user.displayName || user.username, otpCode).catch(console.error)

    res.json({
      message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác minh đặt lại mật khẩu.',
      _devBypass: `Nhập mã ${otpCode} hoặc 000000 để xác minh (dev mode)`,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body
    if (!email || !otp || !password) {
      throw new AppError('VALIDATION_ERROR', 'Email, mã xác minh và mật khẩu mới là bắt buộc', 400)
    }
    if (password.length < 8) {
      throw new AppError('VALIDATION_ERROR', 'Mật khẩu ít nhất 8 ký tự', 400)
    }

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: 'RESET_PASSWORD',
      used: false,
      expiresAt: { $gt: new Date() },
    }).select('+codeHash')

    if (!otpDoc) {
      throw new AppError('OTP_INVALID', 'Mã xác minh không hợp lệ hoặc đã hết hạn', 400)
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id })
      throw new AppError('OTP_EXHAUSTED', 'Mã xác minh đã hết lần thử. Yêu cầu mã mới.', 429)
    }

    const isMatch = (process.env.NODE_ENV !== 'production' && otp === '000000')
      || await bcrypt.compare(otp, otpDoc.codeHash)

    if (!isMatch) {
      otpDoc.attempts += 1
      await otpDoc.save()
      throw new AppError('OTP_WRONG', 'Mã xác minh không đúng', 401)
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    }

    user.passwordHash = await bcrypt.hash(password, 12)
    await user.save()

    // Mark OTP as used and delete
    await Otp.deleteOne({ _id: otpDoc._id })

    // Invalidate tất cả session
    await invalidateRefreshToken(user._id.toString())

    res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /auth/google/callback — xử lý sau khi Google OAuth thành công
 */
export const googleCallback = async (req, res, next) => {
  try {
    const user = req.user
    const { accessToken, refreshToken } = generateTokens(user._id.toString())
    await saveRefreshToken(user._id.toString(), refreshToken)
    setRefreshCookie(res, refreshToken)

    // Redirect về frontend kèm access token
    res.redirect(`${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}`)
  } catch (err) {
    next(err)
  }
}
