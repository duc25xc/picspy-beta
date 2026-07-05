import { Router } from 'express'
import { authenticate, optionalAuth } from '../middlewares/authenticate.js'
import upload, { handleMulterError } from '../middlewares/upload.js'
import {
  getMe,
  updateMe,
  uploadAvatar,
  changePassword,
  getPublicProfile,
  toggleFollow,
  getFollowers,
  getFollowing,
  saveBankAccount,
  topupVnd,
  requestWithdrawal,
  getVndTransactions,
  getMyPurchasedPosts,
  getLeaderboard,
} from '../controllers/user.controller.js'
import { getMyBookmarks } from '../controllers/post.interaction.controller.js'

const router = Router()

// Protected (cần đăng nhập)
router.get('/me', authenticate, getMe)
router.put('/me', authenticate, updateMe)
router.put('/me/avatar', authenticate, upload.single('avatar'), handleMulterError, uploadAvatar)
router.put('/me/password', authenticate, changePassword)
router.get('/me/bookmarks', authenticate, getMyBookmarks)
router.get('/me/purchases', authenticate, getMyPurchasedPosts)
router.post('/me/bank', authenticate, saveBankAccount)
router.post('/me/topup', authenticate, topupVnd)
router.post('/me/withdraw', authenticate, requestWithdrawal)
router.get('/me/transactions', authenticate, getVndTransactions)

// Public
router.get('/leaderboard', optionalAuth, getLeaderboard)
router.get('/:username', optionalAuth, getPublicProfile)
router.get('/:id/followers', optionalAuth, getFollowers)
router.get('/:id/following', optionalAuth, getFollowing)

// Protected — follow/unfollow
router.post('/:id/follow', authenticate, toggleFollow)

export default router
