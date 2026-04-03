import mongoose from 'mongoose'

/**
 * Interaction model — unified cho like, bookmark, view
 * Unique index (userId + postId + type) ngăn trùng lặp
 * Download dùng model riêng vì có thêm metadata (coins, URL...)
 */
const interactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'bookmark', 'view'],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Ngăn user like/bookmark cùng 1 post 2 lần
interactionSchema.index(
  { userId: 1, postId: 1, type: 1 },
  { unique: true }
)

// Query nhanh: đếm like/bookmark/view của 1 post
interactionSchema.index({ postId: 1, type: 1 })

// Query: lịch sử của user (bookmark list, liked list)
interactionSchema.index({ userId: 1, type: 1, createdAt: -1 })

const Interaction = mongoose.model('Interaction', interactionSchema)
export default Interaction
