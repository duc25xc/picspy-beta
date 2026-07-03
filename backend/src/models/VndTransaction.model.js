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
        'topup',          // Nạp tiền vào tài khoản
        'purchase_post',  // Người dùng mua ảnh Premium
        'earn_purchase',  // Creator nhận hoa hồng bán ảnh (70%)
        'earn_views',     // Creator nhận tiền views (Batch quyết toán đêm)
        'withdraw_request',// Creator yêu cầu rút tiền
        'withdraw_approved',// Yêu cầu rút tiền được duyệt
        'withdraw_rejected',// Yêu cầu rút tiền bị từ chối
      ],
      required: true,
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
