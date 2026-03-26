/**
 * Custom error class với HTTP status code
 * Giúp phân biệt "expected" errors với runtime errors trong error handler middleware
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true // Đánh dấu là lỗi có thể dự đoán, không phải bug
    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError
