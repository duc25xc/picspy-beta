import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // parentId = null → top-level comment
    // parentId = ObjectId → reply to a comment
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    likesCount: { type: Number, default: 0 },
    // Soft delete: không xóa hẳn để không mất replies
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Index: lấy comments của 1 post nhanh, sort mới nhất
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 })
// Index: lấy replies của 1 comment
commentSchema.index({ parentId: 1, createdAt: 1 })

const Comment = mongoose.model('Comment', commentSchema)
export default Comment
