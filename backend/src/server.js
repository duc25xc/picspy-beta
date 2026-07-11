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
import { logger } from './utils/logger.js'

// Routes
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import postRoutes from './routes/post.routes.js'
import adminRoutes from './routes/admin.routes.js'
import aiRoutes from './routes/ai.routes.js'
import subscriptionRoutes from './routes/subscription.routes.js'
import studioRoutes from './routes/studio.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import {
  getPublicCategories,
  getPublicCategoriesDetails,
  seedCategories,
} from './controllers/admin.controller.js'
import { seedSubscriptionPlans } from './models/SubscriptionPlan.model.js'
import Settings from './models/Settings.model.js'

// Workers & Jobs (khởi động cùng server)
import './workers/imageProcessor.worker.js'
import './jobs/cronJobs.js'

const app = express()
const httpServer = http.createServer(app)

// =====================
// MIDDLEWARE
// =====================
app.use(helmet())
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Request logger middleware (writes to logs/server.log)
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`HTTP ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms | IP: ${req.ip}`)
  })
  next()
})
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
  message: {
    error: 'RATE_LIMITED',
    message: 'Quá nhiều request. Vui lòng chậm lại.',
  },
  skip: (req) => {
    // Bỏ qua limit cho view endpoint — tính lượt xem không cần giới hạn chặt
    return req.method === 'POST' && /^\/[a-f0-9]{24}\/view$/.test(req.path)
  },
})

// Limiter chặt cho /auth — chống brute force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'RATE_LIMITED',
    message: 'Quá nhiều thử đăng nhập. Vui lòng chờ 1 phút.',
  },
})

// Global fallback — áp dụng các route chưa có limiter riêng
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: {
    error: 'RATE_LIMITED',
    message: 'Quá nhiều request. Vui lòng chậm lại.',
  },
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
app.use('/v1/ai', aiRoutes)
app.use('/v1/subscriptions', subscriptionRoutes)
app.use('/v1/studio', studioRoutes)
app.use('/v1/notifications', notificationRoutes)
// Public: danh mục không cần auth
app.get('/v1/categories', getPublicCategories)
app.get('/v1/categories/details', getPublicCategoriesDetails)

// Public settings (để lấy mã màu chính của website)
app.get('/v1/settings', async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton()
    res.json({
      primaryColor: settings.primaryColor || '#7c3aed',
      gradientColor: settings.gradientColor || '#3b82f6',
      brandOpacity: settings.brandOpacity !== undefined ? settings.brandOpacity : 1,
      brandBlur: settings.brandBlur !== undefined ? settings.brandBlur : 0,
      enableGradient: settings.enableGradient !== undefined ? settings.enableGradient : true,
      shadowStyle: settings.shadowStyle || 'soft',
      announcementText: settings.announcementText || '',
      announcementLink: settings.announcementLink || '',
      announcementEnabled: settings.announcementEnabled !== undefined ? settings.announcementEnabled : false,
      globalLoaderType: settings.globalLoaderType || 'wave',
      splashExtraMs: settings.splashExtraMs ?? 0,
      myPostsSkeletonMs: settings.myPostsSkeletonMs ?? 0,
      postLoadingDelayMs: settings.postLoadingDelayMs ?? 0,
      blurPremiumImages: settings.blurPremiumImages !== undefined ? settings.blurPremiumImages : false,
      postDetailLayout: settings.postDetailLayout || 'left-image',
      categoriesPageStyle: settings.categoriesPageStyle || 'style-2',
      trendingCarouselInterval: settings.trendingCarouselInterval ?? 5000,
      discoveryAutoScrollInterval: settings.discoveryAutoScrollInterval ?? 10000,
      discoveryAutoScrollStagger: settings.discoveryAutoScrollStagger ?? 1000,
    })
  } catch (err) {
    next(err)
  }
})

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
  await seedSubscriptionPlans() // seed 4 gói subscription nếu chưa có
  const User = (await import('./models/User.model.js')).default
  await User.updateMany({ role: 'creator' }, { role: 'user' })
  initSocket(httpServer)

  httpServer.listen(PORT, () => {
    logger.info(`🚀 PicSpy server running on http://localhost:${PORT}`)
    logger.info(`📡 Socket.io listening on ws://localhost:${PORT}`)
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

startServer()
