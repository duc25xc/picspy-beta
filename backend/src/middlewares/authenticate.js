import jwt from 'jsonwebtoken'
import AppError from '../utils/AppError.js'
import User from '../models/User.model.js'

/**
 * Middleware xác thực JWT access token từ Authorization header
 * Gắn req.user vào request nếu hợp lệ
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này', 401)
    }

    const token = authHeader.split(' ')[1]
    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'Phiên đăng nhập đã hết hạn'
        : 'Token không hợp lệ'
      throw new AppError('UNAUTHORIZED', message, 401)
    }

    const user = await User.findById(payload.userId).select('-passwordHash')
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Người dùng không tồn tại', 401)
    }
    if (user.isBanned) {
      throw new AppError('FORBIDDEN', `Tài khoản đã bị khóa. Lý do: ${user.banReason || 'Vi phạm điều khoản'}`, 403)
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Middleware kiểm tra role admin
 * Phải dùng sau authenticate
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này', 403))
  }
  next()
}

/**
 * Middleware tùy chọn xác thực (không throw nếu không có token)
 * Dùng cho các endpoint public nhưng cần biết user nếu đăng nhập
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return next()

    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.userId).select('-passwordHash')
    if (user && !user.isBanned) req.user = user
    next()
  } catch {
    // Token lỗi → tiếp tục như anonymous
    next()
  }
}
