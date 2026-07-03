import mongoose from 'mongoose'

const vndTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'topup',             // Nạp tiền vào tài khoản
        'purchase_post',     // Người dùng mua ảnh Premium
        'earn_purchase',     // Creator nhận hoa hồng bán ảnh (70%) - trực tiếp
        'earn_hold',         // Creator nhận tạm giữ (holding) từ bán ảnh (chờ đối soát)
        'release_hold',      // Giải ngân tiền tạm giữ sang ví khả dụng (available)
        'refund',            // Hoàn tiền cho người mua
        'refund_creator_hold',// Thu hồi tiền tạm giữ của creator do hoàn tiền
        'earn_views',        // Creator nhận tiền views (Batch quyết toán đêm)
        'withdraw_request',  // Creator yêu cầu rút tiền
        'withdraw_lock',     // Khóa tiền chờ duyệt rút
        'withdraw_approved', // Yêu cầu rút tiền được duyệt
        'withdraw_rejected', // Yêu cầu rút tiền bị từ chối
      ],
      required: true,
    },
    walletType: {
      type: String,
      enum: ['available', 'holding', 'locked'],
      default: 'available',
      required: true,
    },
    holdUntil: {
      type: Date, // Thời hạn tạm giữ
    },
    isHoldReleased: {
      type: Boolean,
      default: false,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Chỉ kiểm tra duy nhất nếu trường này tồn tại
    },
    fileType: {
      type: String,
    },
    amount: {
      type: Number,
      required: true, // Dương = cộng tiền, Âm = trừ tiền
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      maxlength: 300,
    },
    relatedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    meta: {
      ip: { type: String },
      userAgent: { type: String },
      adminNote: { type: String },
      bankDetails: {
        bankName: { type: String },
        accountNumber: { type: String },
        accountHolder: { type: String },
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

vndTransactionSchema.index({ userId: 1, createdAt: -1 })
vndTransactionSchema.index({ type: 1, createdAt: -1 })
vndTransactionSchema.index({ relatedPostId: 1 })

const VndTransaction = mongoose.model('VndTransaction', vndTransactionSchema)
export default VndTransaction
