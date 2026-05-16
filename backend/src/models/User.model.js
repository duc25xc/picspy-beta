import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    // === IDENTITY ===
    username: {
      type: String,
      unique: true,
      required: [true, 'Username là bắt buộc'],
      minlength: [3, 'Username ít nhất 3 ký tự'],
      maxlength: [30, 'Username tối đa 30 ký tự'],
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9_]+$/,
        'Username chỉ chứa chữ thường, số và dấu gạch dưới',
      ],
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Email là bắt buộc'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    passwordHash: { type: String, select: false },
    googleId: { type: String, sparse: true },

    // === PROFILE ===
    displayName: { type: String, maxlength: 50, trim: true },
    avatar: { type: String, default: '' },
    bio: { type: String, maxlength: 200 },
    website: { type: String },
    socialLinks: {
      tiktok: { type: String, default: '' },
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
    },

    // === ROLE & STATUS ===
    role: {
      type: String,
      enum: ['user', 'creator', 'admin'],
      default: 'user',
    },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    warningCount: { type: Number, default: 0 },

    // === SUBSCRIPTION ===
    subscriptionTier: {
      type: String,
      // founder = gói Founder's Plan đặc biệt (giá lock 39k/tháng, giới hạn 200 slot)
      // ultimate = gói Agency/Studio (token không giới hạn)
      enum: ['free', 'pro', 'ultimate', 'founder'],
      default: 'free',
    },
    subscriptionCycle: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    subscriptionExpiry: { type: Date },
    founderSlot: { type: Boolean, default: false }, // Đánh dấu Founder's Plan
    stripeCustomerId: { type: String },

    // === TOKEN ECONOMY (đơn vị dịch vụ nội bộ — không quy ra tiền mặt cho user thường) ===
    tokenBalance: { type: Number, default: 0, min: 0 },
    // freeTokenGranted: true = user free đã nhận 100 token 1 lần (không reset hàng tháng)
    freeTokenGranted: { type: Boolean, default: false },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    // === STATS (denormalized để tránh query nặng) ===
    stats: {
      postsCount: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalDownloads: { type: Number, default: 0 },
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
    },

    // === SETTINGS ===
    settings: {
      showNSFW: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      isPrivate: { type: Boolean, default: false },
    },

    // === AUTH ===
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes
// userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })

// Virtual: chưa có password nhưng có googleId = đăng nhập Google
userSchema.virtual('isGoogleUser').get(function () {
  return !this.passwordHash && !!this.googleId
})

// Method: so sánh password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

// Static: tìm user công khai (không trả về field nhạy cảm)
userSchema.statics.findPublicProfile = function (username) {
  return this.findOne({ username }).select(
    '-passwordHash -emailVerifyToken -passwordResetToken -stripeCustomerId'
  )
}

const User = mongoose.model('User', userSchema)
export default User
