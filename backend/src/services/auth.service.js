import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import redis from '../config/redis.js'
import AppError from '../utils/AppError.js'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const REFRESH_TOKEN_REDIS_TTL = 7 * 24 * 3600 // 7 ngày tính theo giây

/**
 * Tạo access token và refresh token
 */
export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })

  // Thêm version (timestamp) để phân biệt token cũ/mới khi detect reuse
  const refreshToken = jwt.sign(
    { userId, version: Date.now() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  )

  return { accessToken, refreshToken }
}

/**
 * Lưu hash của refresh token vào Redis
 * Dùng hash thay vì plaintext để tránh lộ token nếu Redis bị expose
 */
export const saveRefreshToken = async (userId, refreshToken) => {
  const hash = await bcrypt.hash(refreshToken, 10)
  await redis.setex(`session:refresh:${userId}`, REFRESH_TOKEN_REDIS_TTL, hash)
}

/**
 * Set refresh token vào httpOnly cookie
 */
export const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    path: '/',
  })
}

/**
 * Xoay vòng refresh token:
 * 1. Verify token cũ
 * 2. So sánh với hash trong Redis (detect reuse attack)
 * 3. Tạo token mới, lưu lại
 */
export const rotateRefreshToken = async (oldRefreshToken, res) => {
  let payload
  try {
    payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET)
  } catch {
    throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ', 401)
  }

  const storedHash = await redis.get(`session:refresh:${payload.userId}`)

  if (!storedHash) {
    throw new AppError('SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)
  }

  const isValid = await bcrypt.compare(oldRefreshToken, storedHash)
  if (!isValid) {
    // Token reuse detected → xóa session, force logout toàn bộ
    await redis.del(`session:refresh:${payload.userId}`)
    throw new AppError('REFRESH_TOKEN_REUSE', 'Phát hiện token sử dụng lại. Vui lòng đăng nhập lại.', 401)
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId)
  await saveRefreshToken(payload.userId, newRefreshToken)
  setRefreshCookie(res, newRefreshToken)

  return { accessToken, userId: payload.userId }
}

/**
 * Tạo token ngẫu nhiên cho email verify / password reset
 */
export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Xóa session (logout)
 */
export const invalidateRefreshToken = async (userId) => {
  await redis.del(`session:refresh:${userId}`)
}
