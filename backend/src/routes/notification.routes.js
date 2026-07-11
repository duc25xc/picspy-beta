import express from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import Notification from '../models/Notification.model.js'
import User from '../models/User.model.js'

const router = express.Router()

/**
 * GET /v1/notifications
 * Lấy danh sách thông báo của user hiện tại (phân trang)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50)
    const skip = (page - 1) * limit

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actors', 'username displayName avatar')
      .populate({
        path: 'metadata.postId',
        select: 'caption generatedImages status isCollection'
      })
      .lean()

    // Lấy tổng số lượng để phân trang
    const total = await Notification.countDocuments({ recipient: req.user._id })

    res.json({
      notifications,
      unreadCount: req.user.notificationCount || 0,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/notifications/read-all
 * Đánh dấu toàn bộ thông báo là đã đọc & reset bộ đếm unread
 */
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    await Promise.all([
      Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
      ),
      User.findByIdAndUpdate(req.user._id, { $set: { notificationCount: 0 } })
    ])

    res.json({ success: true, message: 'Đã đánh dấu đọc toàn bộ thông báo' })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /v1/notifications/:id/read
 * Đánh dấu đọc một thông báo cụ thể
 */
router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id, isRead: false },
      { $set: { isRead: true } },
      { new: true }
    )

    if (notification) {
      // Giảm nhẹ đếm chưa đọc nếu lớn hơn 0
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { notificationCount: -1 }
      })
    }

    res.json({ success: true, notification })
  } catch (err) {
    next(err)
  }
})

export default router
