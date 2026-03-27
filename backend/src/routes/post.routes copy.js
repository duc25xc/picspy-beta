import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import upload, { handleMulterError } from '../middlewares/upload.js'
import rateLimit from 'express-rate-limit'
import { createPost } from '../controllers/post.controller.js'

const router = Router()

// Rate limit upload: 20 ảnh/ngày/user
const uploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { error: 'RATE_LIMITED', message: 'Bạn đã upload quá 20 ảnh hôm nay. Thử lại vào ngày mai.' },
})

router.post('/', authenticate, uploadLimiter, upload.single('image'), handleMulterError, createPost)

export default router
