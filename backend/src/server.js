import express from 'express'
import http from 'http'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

dotenv.config()

import connectDB from './config/db.js'
import { initSocket } from './socket/index.js'
import errorHandler from './middlewares/errorHandler.js'

// Routes
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import postRoutes from './routes/post.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { getPublicCategories, seedCategories } from './controllers/admin.controller.js'

// Workers (khởi động cùng server)
import './workers/imageProcessor.worker.js'

const app = express()
const httpServer = http.createServer(app)

// =====================
// MIDDLEWARE
// =====================
app.use(helmet())
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// =====================
// RATE LIMITERS — phải tạo tại app init, KHÔNG tạo trong request handler
// =====================

// Limiter cho /posts (thoải mái — browse gallery nhiều request)
const postsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều request. Vui lòng chậm lại.' },
  skip: (req) => {
    // Bỏ qua limit cho view endpoint — tính lượt xem không cần giới hạn chặt
    return req.method === 'POST' && /^\/[a-f0-9]{24}\/view$/.test(req.path)
  },
})

// Limiter chặt cho /auth — chống brute force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều thử đăng nhập. Vui lòng chờ 1 phút.' },
})

// Global fallback — áp dụng các route chưa có limiter riêng
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'RATE_LIMITED', message: 'Quá nhiều request. Vui lòng chậm lại.' },
})

app.use('/v1/posts', postsLimiter)
app.use('/v1/auth', authLimiter)
app.use('/v1', globalLimiter)


// =====================
// ROUTES
// =====================
app.use('/v1/auth', authRoutes)
app.use('/v1/users', userRoutes)
app.use('/v1/posts', postRoutes)
app.use('/v1/admin', adminRoutes)
// Public: danh mục không cần auth
app.get('/v1/categories', getPublicCategories)

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
)

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng bạn đến với API của PicSpy!',
    status: 'Server đang chạy cực mượt',
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} không tồn tại`,
  })
})

// Global error handler
app.use(errorHandler)

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()
  await seedCategories() // seed danh mục mặc định nếu chưa có
  initSocket(httpServer)

  httpServer.listen(PORT, () => {
    console.log(`🚀 PicSpy server running on http://localhost:${PORT}`)
    console.log(`📡 Socket.io listening on ws://localhost:${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

startServer()
