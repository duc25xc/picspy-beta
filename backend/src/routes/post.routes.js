import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import upload, { handleMulterError } from '../middlewares/upload.js'
import rateLimit from 'express-rate-limit'
import {
  createPost,
  getApprovedPosts,
  getMyPosts,
  updatePost,
  deletePost,
} from '../controllers/post.controller.js'

const router = Router()

// Rate limit upload: 20 ảnh/ngày/user
const uploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  validate: { xForwardedForHeader: false, default: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    error: 'RATE_LIMITED',
    message: 'Bạn đã upload quá 20 ảnh hôm nay. Thử lại vào ngày mai.',
  },
})

// =====================
// PUBLIC ROUTES
// =====================

/** GET /posts — Feed gallery công khai (chỉ approved) */
router.get('/', getApprovedPosts)

// =====================
// PROTECTED ROUTES
// =====================

/** GET /posts/me — Ảnh của user đang đăng nhập (tất cả status) */
router.get('/me', authenticate, getMyPosts)

/** POST /posts — Upload ảnh mới */
router.post(
  '/',
  authenticate,
  uploadLimiter,
  upload.single('image'),
  handleMulterError,
  createPost
)

/** PUT /posts/:id — Sửa bài đăng (chỉ owner) */
router.put('/:id', authenticate, updatePost)

/** DELETE /posts/:id — Xóa bài đăng (chỉ owner) */
router.delete('/:id', authenticate, deletePost)

export default router
