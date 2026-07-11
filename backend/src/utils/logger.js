import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu log nằm ở backend/logs
const logDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}
const logFilePath = path.join(logDir, 'server.log')

/**
 * Định dạng thông tin log gồm: Ngày giờ, Cấp độ log, Nội dung và Siêu dữ liệu bổ sung
 */
const formatMessage = (level, message, meta = '') => {
  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  const metaStr = meta
    ? ` | Meta: ${meta instanceof Error ? meta.stack || meta.message : typeof meta === 'object' ? JSON.stringify(meta) : meta}`
    : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`
}

/**
 * Hàm ghi log kết hợp in ra console có màu sắc trực quan và append vào file logs/server.log
 */
const writeLog = (level, message, meta) => {
  const formatted = formatMessage(level, message, meta)
  
  // Console log có biểu tượng chỉ thị màu sắc
  if (level === 'error') {
    console.error(`🔴 ${formatted.trim()}`)
  } else if (level === 'warn') {
    console.warn(`🟡 ${formatted.trim()}`)
  } else if (level === 'debug') {
    console.log(`🔵 ${formatted.trim()}`)
  } else {
    console.log(`🟢 ${formatted.trim()}`)
  }

  // Tối ưu hóa ghi file: chỉ ghi lỗi hệ thống nghiêm trọng (không phải lỗi operational của người dùng), cảnh báo CRITICAL, và khởi động hệ thống
  const shouldWriteToFile =
    (level === 'error' && (!meta || !meta.isOperational)) || // Bỏ qua lỗi AppError (như hết hạn token, 404, 400) để chống rác log
    (level === 'warn' && message.includes('CRITICAL')) ||
    (level === 'info' && (
      message.includes('🚀') ||
      message.includes('📡') ||
      message.includes('🌍') ||
      message.includes('running') ||
      message.includes('listening') ||
      message.includes('settlement') ||
      message.includes('Cron') ||
      message.includes('job')
    ))

  if (shouldWriteToFile) {
    fs.appendFile(logFilePath, formatted, (err) => {
      if (err) {
        console.error('Không thể ghi nhật ký vào file log:', err.message)
      }
    })
  }
}

export const logger = {
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta),
  debug: (message, meta) => writeLog('debug', message, meta),
}
