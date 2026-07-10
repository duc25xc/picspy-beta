import { Router } from 'express'
import { authenticate, optionalAuth } from '../middlewares/authenticate.js'
import upload, { handleMulterError } from '../middlewares/upload.js'
import { downloadPost } from '../controllers/download.controller.js'
import rateLimit from 'express-rate-limit'
import {
  createPost,
  getApprovedPosts,
  getMyPosts,
  updatePost,
  deletePost,
  getFollowingFeed,
  searchByImage,
  getHomepageData,
  getSourceHistory,
  deleteSourceHistoryImage,
  getPostDiscovery,
} from '../controllers/post.controller.js'
import {
  getPostDetail,
  toggleLike,
  toggleBookmark,
  trackView,
  reportPost,
} from '../controllers/post.interaction.controller.js'
import {
  createComment,
  getComments,
  deleteComment,
} from '../controllers/comment.controller.js'

const router = Router()

// Rate limit upload: TẮT TẠM để dev/test (bật lại khi production)
// const uploadLimiter = rateLimit({
//   windowMs: 24 * 60 * 60 * 1000,
//   max: 20,
//   validate: { xForwardedForHeader: false, default: false },
//   keyGenerator: (req) => req.user?._id?.toString() || req.ip,
//   message: {
//     error: 'RATE_LIMITED',
//     message: 'Bạn đã upload quá 20 ảnh hôm nay. Thử lại vào ngày mai.',
//   },
// })

// =====================
// PUBLIC ROUTES
// =====================

/** GET /posts — Feed gallery công khai (chỉ approved) */
router.get('/', getApprovedPosts)

/** GET /posts/homepage-data — Trích xuất thống kê và dữ liệu thời gian thực cho trang chủ */
router.get('/homepage-data', optionalAuth, getHomepageData)

/** POST /posts/search-by-image — Tìm kiếm bằng hình ảnh (RGB Histogram) */
router.post('/search-by-image', upload.single('image'), handleMulterError, searchByImage)

// =====================
// PROTECTED ROUTES (phải đặt TRƯỚC /:id)
// =====================

/** GET /posts/me — Ảnh của user đang đăng nhập (tất cả status) */
router.get('/me', authenticate, getMyPosts)

/** GET /posts/following — Feed từ những người đang follow */
router.get('/following', authenticate, getFollowingFeed)

/** GET /posts/me/source-history — Lấy danh sách ảnh gốc của user */
router.get('/me/source-history', authenticate, getSourceHistory)

/** DELETE /posts/me/source-history — Gỡ/Xóa ảnh gốc khỏi bài đăng */
router.delete('/me/source-history', authenticate, deleteSourceHistoryImage)

/** POST /posts — Upload AI content mới (sourceImages 0-5, generatedImages 1-5) */
router.post(
  '/',
  authenticate,
  // uploadLimiter, // TẮT TẠM — bật lại khi production
  upload.fields([
    { name: 'sourceImages', maxCount: 5 },
    { name: 'generatedImages', maxCount: 5 },
    // Multi-model comparison slots (tối đa 5 model, mỗi model 5 ảnh)
    { name: 'compImages_0', maxCount: 5 },
    { name: 'compImages_1', maxCount: 5 },
    { name: 'compImages_2', maxCount: 5 },
    { name: 'compImages_3', maxCount: 5 },
    { name: 'compImages_4', maxCount: 5 },
    // Digital Photo optional attachments
    { name: 'rawFile', maxCount: 1 },
    { name: 'colorFile', maxCount: 1 },
  ]),
  handleMulterError,
  createPost
)

// =====================
// ROUTES CÓ :id (đặt SAU /me để tránh conflict)
// =====================

/** GET /posts/:id/discovery — Lấy các section Discovery (similar, color, creator, trending, gems, user recommendations) */
router.get('/:id/discovery', optionalAuth, getPostDiscovery)

/** GET /posts/:id — Chi tiết bài đăng (public, optionalAuth cho isLiked/isBookmarked) */
router.get('/:id', optionalAuth, getPostDetail)

/** PUT /posts/:id — Sửa bài đăng (chỉ owner) */
router.put(
  '/:id',
  authenticate,
  upload.fields([
    { name: 'sourceImages', maxCount: 5 },
    { name: 'generatedImages', maxCount: 5 },
    // Multi-model comparison slots (tối đa 5 model, mỗi model 5 ảnh)
    { name: 'compImages_0', maxCount: 5 },
    { name: 'compImages_1', maxCount: 5 },
    { name: 'compImages_2', maxCount: 5 },
    { name: 'compImages_3', maxCount: 5 },
    { name: 'compImages_4', maxCount: 5 },
    // Digital Photo optional attachments
    { name: 'rawFile', maxCount: 1 },
    { name: 'colorFile', maxCount: 1 },
  ]),
  handleMulterError,
  updatePost
)

/** DELETE /posts/:id — Xóa bài đăng (chỉ owner) */
router.delete('/:id', authenticate, deletePost)

// =====================
// INTERACTIONS
// =====================

/** POST /posts/:id/like — Toggle like */
router.post('/:id/like', authenticate, toggleLike)

/** POST /posts/:id/bookmark — Toggle bookmark */
router.post('/:id/bookmark', authenticate, toggleBookmark)

/** POST /posts/:id/view — Track view (optionalAuth: guest cũng đếm) */
router.post('/:id/view', optionalAuth, trackView)

/** POST /posts/:id/report — Báo cáo bài đăng vi phạm */
router.post('/:id/report', authenticate, reportPost)

// =====================
// COMMENTS
// =====================

/** GET /posts/:id/comments — Danh sách comments */
router.get('/:id/comments', getComments)

/** POST /posts/:id/comments — Tạo comment mới */
router.post('/:id/comments', authenticate, createComment)

/** DELETE /posts/:id/comments/:commentId — Xóa comment */
router.delete('/:id/comments/:commentId', authenticate, deleteComment)

// =====================
// DOWNLOAD
// =====================

/** POST /posts/:id/download — Tải ảnh (free hoặc premium) */
router.post('/:id/download', authenticate, downloadPost)

export default router
