import mongoose from 'mongoose'

/**
 * TokenTransaction — Audit trail cho mọi biến động token.
 *
 * Tại sao cần model riêng thay vì chỉ dùng tokenBalance trên User?
 * - Traceable: biết chính xác token đến từ đâu, tiêu ở đâu
 * - Anti-fraud: phát hiện bất thường (đột biến earn, tiêu liên tục...)
 * - Creator payout: tính toán doanh thu creator chính xác
 * - Audit: admin có thể query lịch sử đầy đủ
 */
const tokenTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Loại giao dịch
    type: {
      type: String,
      enum: [
        'free_grant',        // Cấp 100 token 1 lần cho tài khoản Free mới
        'monthly_grant',     // Cấp token định kỳ hàng tháng (Pro/Ultimate)
        'topup',             // User mua token lẻ (chưa tích hợp payment gateway)
        'admin_adjust',      // Admin nạp/trừ thủ công
        'spend_lensspy',     // Tiêu token mở khóa LensSpy AI
        'spend_download',    // Tiêu token tải ảnh Premium
        'earn_download',     // Creator nhận khi ảnh được tải (70% giá)
        'referral_bonus',    // Thưởng referral (+200 token)
        'subscription_bonus',// Bonus khi nâng gói
        'refund',            // Hoàn token khi có lỗi
      ],
      required: true,
    },

    // Số lượng token thay đổi (dương = nhận, âm = tiêu)
    amount: { type: Number, required: true },

    // Snapshot số dư trước/sau để audit nhanh
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },

    // Mô tả ngắn để hiển thị trong UI
    description: { type: String, maxlength: 200 },

    // Liên kết với tài nguyên liên quan
    relatedPostId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    relatedUserId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // creator khi earn
    relatedSubscriptionId: { type: String }, // plan ID khi grant

    // Metadata bổ sung (IP, device fingerprint cho anti-fraud)
    meta: {
      ip:          { type: String },
      userAgent:   { type: String },
      adminNote:   { type: String }, // Ghi chú của admin khi adjust thủ công
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes cho query phổ biến
tokenTransactionSchema.index({ userId: 1, createdAt: -1 })
tokenTransactionSchema.index({ type: 1, createdAt: -1 })
tokenTransactionSchema.index({ relatedPostId: 1 })

const TokenTransaction = mongoose.model('TokenTransaction', tokenTransactionSchema)
export default TokenTransaction
