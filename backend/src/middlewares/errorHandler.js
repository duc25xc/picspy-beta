import { logger } from '../utils/logger.js'

/**
 * Global error handling middleware
 * Phân biệt operational errors (AppError) vs programming bugs
 */
const errorHandler = (err, req, res, next) => {
  // Log the error to log file
  logger.error(`API Exception on ${req.method} ${req.originalUrl}`, err)
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      details,
    })
  }

  // Mongoose duplicate key (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    return res.status(409).json({
      error: 'DUPLICATE_KEY',
      message: `${field} "${value}" đã tồn tại`,
    })
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'INVALID_ID',
      message: 'ID không hợp lệ',
    })
  }

  // Custom AppError (operational errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  // Unknown/unexpected error — không lộ thông tin nhạy cảm
  console.error('💥 Unexpected error:', err)
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  })
}

export default errorHandler
