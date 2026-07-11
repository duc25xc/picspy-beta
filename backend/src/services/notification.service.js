import Notification from '../models/Notification.model.js'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'

// Map notification types to their expiration durations (in days)
const EXPIRATION_MAP = {
  // Social: 30 days
  POST_LIKE: 30,
  POST_COMMENT: 30,
  COMMENT_REPLY: 30,
  USER_FOLLOW: 30,
  POST_MENTION: 30,
  
  // Monetization: 365 days (1 year)
  BUY_IMAGE: 365,
  SELL_SUCCESS: 365,
  WITHDRAW_SUCCESS: 365,
  WITHDRAW_REJECT: 365,
  TOPUP_SUCCESS: 365,

  // Growth: 90 days
  VIEW_MILESTONE: 90,
  WEEKLY_TOP: 90,

  // System: 180 days
  SYSTEM_ALERT: 180,
  SYSTEM_WARNING: 180,
  ADMIN_NEW_POST: 180,
  ADMIN_NEW_USER: 180,
  ADMIN_NEW_WITHDRAW: 180,
  ADMIN_NEW_REPORT: 180,
  ADMIN_STATS_SUMMARY: 180,

  // AI: 14 days
  AI_COMPLETE: 14,
  AI_FAILED: 14,
}

// Socket whitelist types that should trigger an immediate Toast popup on the client
const TOAST_WHITELIST = [
  'POST_LIKE',
  'POST_COMMENT',
  'COMMENT_REPLY',
  'USER_FOLLOW',
  'POST_MENTION',
  'SELL_SUCCESS',
  'BUY_IMAGE',
  'WITHDRAW_SUCCESS',
  'WITHDRAW_REJECT',
  'TOPUP_SUCCESS',
  'SYSTEM_ALERT',
  'SYSTEM_WARNING',
  'AI_COMPLETE',
  'AI_FAILED',
  'ADMIN_NEW_POST',
  'ADMIN_NEW_USER',
  'ADMIN_NEW_WITHDRAW',
  'ADMIN_NEW_REPORT',
  'ADMIN_STATS_SUMMARY'
]

// Cache để chặn spam các tương tác liên tiếp (Like / Follow) trong vòng 1 tiếng
const rateLimitCache = new Map()

// Tự động dọn dẹp bộ nhớ đệm chống leak memory
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of rateLimitCache.entries()) {
    if (now - timestamp > 60 * 60 * 1000) {
      rateLimitCache.delete(key)
    }
  }
}, 15 * 60 * 1000)

/**
 * Trigger a new notification event.
 * Handles merging engine, database persistence, and realtime delivery via Socket.io.
 */
export const triggerNotificationEvent = async ({
  type,
  actorId,
  recipientId,
  targetId,
  targetModel,
  metadata = {},
}) => {
  try {
    // 1. Chặn spam Like/Follow trong vòng 1 tiếng
    if (['POST_LIKE', 'USER_FOLLOW'].includes(type) && actorId && targetId) {
      const cacheKey = `${type}:${actorId.toString()}:${targetId.toString()}`
      const lastTriggered = rateLimitCache.get(cacheKey)
      const now = Date.now()
      
      if (lastTriggered && (now - lastTriggered < 60 * 60 * 1000)) {
        // Đã gửi trong vòng 1 tiếng qua, bỏ qua không tạo thông báo mới
        return null
      }
      // Lưu lại thời điểm gửi lần đầu tiên
      rateLimitCache.set(cacheKey, now)
    }

    // 2. Check if recipient is triggering their own notification, if so, ignore
    if (actorId && recipientId && actorId.toString() === recipientId.toString()) {
      // Allow self-notifications only for AI rendering jobs, topups, withdrawals, or system alerts
      if (!['AI_COMPLETE', 'AI_FAILED', 'TOPUP_SUCCESS', 'WITHDRAW_SUCCESS', 'WITHDRAW_REJECT', 'SYSTEM_ALERT', 'SYSTEM_WARNING'].includes(type)) {
        return null;
      }
    }

    // 2. Compute expiration date
    const durationDays = EXPIRATION_MAP[type] || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    let notificationDoc = null

    // 3. Apply Merge Engine rules
    if (type === 'POST_LIKE' && targetId) {
      // Merge likes: find an unread LIKE notification for the same post
      notificationDoc = await Notification.findOne({
        recipient: recipientId,
        type: 'POST_LIKE',
        target: targetId,
        isRead: false,
      })

      if (notificationDoc) {
        // Add actor if not already in list
        const actorStr = actorId.toString()
        const actorExists = notificationDoc.actors.some(id => id.toString() === actorStr)
        if (!actorExists) {
          notificationDoc.actors.push(actorId)
        }
        notificationDoc.expiresAt = expiresAt
        notificationDoc.metadata = { ...notificationDoc.metadata, ...metadata }
        await notificationDoc.save()
      }
    } else if (type === 'USER_FOLLOW') {
      // Merge follows: find an unread FOLLOW notification for same recipient
      notificationDoc = await Notification.findOne({
        recipient: recipientId,
        type: 'USER_FOLLOW',
        isRead: false,
      })

      if (notificationDoc) {
        const actorStr = actorId.toString()
        const actorExists = notificationDoc.actors.some(id => id.toString() === actorStr)
        if (!actorExists) {
          notificationDoc.actors.push(actorId)
        }
        notificationDoc.expiresAt = expiresAt
        notificationDoc.metadata = { ...notificationDoc.metadata, ...metadata }
        await notificationDoc.save()
      }
    }

    // If no merged notification found, create a new record
    if (!notificationDoc) {
      notificationDoc = await Notification.create({
        recipient: recipientId,
        type,
        actors: actorId ? [actorId] : [],
        target: targetId,
        targetModel,
        metadata,
        expiresAt,
      })
    }

    // 4. Increment unread notificationCount on User model
    const updatedUser = await User.findByIdAndUpdate(
      recipientId,
      { $inc: { notificationCount: 1 } },
      { new: true, select: 'notificationCount' }
    )

    const unreadCount = updatedUser ? updatedUser.notificationCount : 0

    // 5. Populate and Emit real-time update via global.io
    if (global.io) {
      const populated = await Notification.findById(notificationDoc._id)
        .populate('actors', 'username displayName avatar')
        .populate({
          path: 'metadata.postId',
          select: 'caption generatedImages status isCollection'
        })
        .lean()

      const shouldToast = TOAST_WHITELIST.includes(type)
      
      global.io.to(`user:${recipientId}`).emit('notification', {
        notification: populated,
        unreadCount,
        shouldToast,
      })
    }

    return notificationDoc
  } catch (error) {
    console.error(`[NotificationService] Error triggering event ${type}:`, error)
    return null
  }
}

/**
 * Check if view count qualifies for growth milestone notifications.
 */
export const checkViewMilestone = async (postDoc, newViews) => {
  try {
    const milestones = [100, 1000, 10000, 50000, 100000]
    
    // Find the highest milestone achieved
    let qualifiedMilestone = null
    for (const ms of milestones) {
      if (newViews >= ms) {
        qualifiedMilestone = ms
      }
    }

    if (!qualifiedMilestone) return

    // Verify if we already sent a notification for this milestone
    const existing = await Notification.findOne({
      recipient: postDoc.authorId,
      type: 'VIEW_MILESTONE',
      target: postDoc._id,
      'metadata.viewsCount': qualifiedMilestone,
    })

    if (!existing) {
      await triggerNotificationEvent({
        type: 'VIEW_MILESTONE',
        actorId: null,
        recipientId: postDoc.authorId,
        targetId: postDoc._id,
        targetModel: 'Post',
        metadata: {
          postId: postDoc._id,
          viewsCount: qualifiedMilestone,
          customTitle: postDoc.caption,
        }
      })
    }
  } catch (error) {
    console.error('[NotificationService] Error checking views milestone:', error)
  }
}

/**
 * Gửi thông báo đến toàn bộ tài khoản quản trị viên (Admin)
 */
export const triggerAdminNotificationEvent = async ({
  type,
  actorId,
  targetId,
  targetModel,
  metadata = {},
}) => {
  try {
    const User = (await import('../models/User.model.js')).default
    const admins = await User.find({ role: 'admin', isBanned: false }).select('_id').lean()
    const adminIds = admins.map(a => a._id)
    
    for (const adminId of adminIds) {
      await triggerNotificationEvent({
        type,
        actorId,
        recipientId: adminId,
        targetId,
        targetModel,
        metadata,
      })
    }
  } catch (error) {
    console.error('[NotificationService] Error triggering admin notification:', error)
  }
}
