import mongoose from 'mongoose'

const subscriptionOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: String,
      enum: ['pro', 'ultimate', 'founder', 'topup'],
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    cycle: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly', 'one-time'],
      default: 'monthly',
    },
    price: {
      type: Number,
      required: true,
    },
    priceFormatted: {
      type: String,
    },
    memoContent: {
      type: String,
      required: true,
      index: true,
    },
    orderCode: {
      type: String,
      default: null,
    },
    shortId: {
      type: String,
      required: true,
    },
    userConfirmed: {
      type: Boolean,
      default: false,
    },
    userConfirmedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

subscriptionOrderSchema.index({ status: 1, createdAt: -1 })
subscriptionOrderSchema.index({ userId: 1, createdAt: -1 })

const SubscriptionOrder = mongoose.model('SubscriptionOrder', subscriptionOrderSchema)

// Tự động gỡ bỏ index orderCode_1 lỗi thời nếu có trong MongoDB
SubscriptionOrder.collection.dropIndex('orderCode_1').catch(() => {})

export default SubscriptionOrder
