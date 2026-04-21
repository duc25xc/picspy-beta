import mongoose from 'mongoose'

/**
 * UserUnlock — Track từng user đã trả xu để mở khoá phân tích của post nào.
 *
 * Logic kinh doanh:
 * - AI chỉ gọi 1 lần duy nhất (cache trong PostAnalysis)
 * - Mỗi user muốn XEM kết quả → phải trả xu → tạo record ở đây
 * - User A mở khoá KHÔNG ảnh hưởng User B → B vẫn phải trả xu để xem
 * - Nhưng AI KHÔNG gọi lại → tiết kiệm chi phí AI API
 */
const userUnlockSchema = new mongoose.Schema(
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
    coinsPaid: { type: Number, default: 2 },
    // Timestamp tự động qua { timestamps: true }
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Mỗi user chỉ có 1 unlock record cho mỗi post (idempotent)
userUnlockSchema.index({ userId: 1, postId: 1 }, { unique: true })

const UserUnlock = mongoose.model('UserUnlock', userUnlockSchema)
export default UserUnlock
