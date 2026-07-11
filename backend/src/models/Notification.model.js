import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      // Group types:
      // Social: 'POST_LIKE', 'POST_COMMENT', 'COMMENT_REPLY', 'USER_FOLLOW', 'POST_MENTION'
      // Monetization: 'BUY_IMAGE', 'SELL_SUCCESS', 'WITHDRAW_SUCCESS', 'WITHDRAW_REJECT', 'TOPUP_SUCCESS'
      // Growth: 'VIEW_MILESTONE', 'WEEKLY_TOP'
      // System: 'SYSTEM_ALERT', 'SYSTEM_WARNING'
      // AI: 'AI_COMPLETE', 'AI_FAILED'
    },
    actors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    targetModel: {
      type: String,
      required: false,
      enum: ['Post', 'User', 'Comment', 'VndTransaction', 'TokenTransaction'],
    },
    metadata: {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
      amount: { type: Number },
      viewsCount: { type: Number },
      message: { type: String },
      customTitle: { type: String },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Compound index for querying user notifications efficiently
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })

// TTL index to automatically remove notifications after their expiresAt date
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
