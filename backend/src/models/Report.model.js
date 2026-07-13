import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },

    // ── Order Report fields ───────────────────────────────────────
    /**
     * true = báo cáo từ người đã MUA ảnh (Order Report)
     * false / undefined = báo cáo vi phạm thông thường
     */
    isBuyerReport: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * Phân loại vấn đề (chỉ dùng với Order Report):
     * - payment_error      : Thanh toán lỗi (bị charge nhưng không nhận được)
     * - double_payment     : Bị thanh toán 2 lần
     * - no_file            : Không nhận được file (storage/download error)
     * - creator_violation  : Creator vi phạm (AI nhưng ghi Original, sai mô tả, DMCA...)
     * - wrong_description  : Sai mô tả (ví dụ ghi 50 RAW nhưng chỉ có 5 JPEG)
     * - dmca               : DMCA / ảnh ăn cắp
     * - other              : Khác
     */
    reportCategory: {
      type: String,
      enum: [
        'payment_error',
        'double_payment',
        'no_file',
        'creator_violation',
        'wrong_description',
        'dmca',
        'other',
      ],
    },

    /**
     * Thời điểm user đã mua post — dùng để admin hiểu context
     * (được lấy từ VndTransaction.createdAt khi tạo báo cáo)
     */
    purchasedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Ensure a user can only report a specific post once
reportSchema.index({ reporterId: 1, postId: 1 }, { unique: true })

const Report = mongoose.model('Report', reportSchema)
export default Report
