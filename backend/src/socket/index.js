import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

/**
 * Khởi tạo Socket.io server, gắn vào http server
 * Inject io vào global để workers có thể dùng
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Auth middleware: chỉ cho phép user đã đăng nhập kết nối
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('UNAUTHORIZED'))

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = payload.userId
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: user ${socket.userId}`)

    // Join phòng cá nhân để nhận notification riêng
    socket.join(`user:${socket.userId}`)

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: user ${socket.userId}`)
    })
  })

  // Inject vào global để workers & services dùng được
  global.io = io

  return io
}

/**
 * Gửi notification real-time đến user
 * Tự động lưu vào DB nếu cần (sẽ implement trong Phase 2)
 */
export const sendNotification = (recipientId, data) => {
  if (global.io) {
    global.io.to(`user:${recipientId}`).emit('notification', data)
  }
}
