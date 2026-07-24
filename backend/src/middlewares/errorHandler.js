import { logger } from '../utils/logger.js'

/**
 * Global error handling middleware
 * Phân biệt operational errors (AppError) vs programming bugs
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    const errMsg = 'Dữ liệu không hợp lệ: ' + details.map(d => `${d.field} (${d.message})`).join(', ')
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: errMsg,
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

  // Custom AppError (operational errors: 400, 401, 403, 404, 409, 422)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    })
  }

  // Unknown/unexpected error (500) — log full stack trace
  logger.error(`💥 Unexpected Exception on ${req.method} ${req.originalUrl}`, err)
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  })
}

export default errorHandler
