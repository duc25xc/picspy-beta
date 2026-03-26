import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    url: String,
    thumbnailUrl: String,
    previewUrl: String,
    publicId: String,
    width: Number,
    height: Number,
    fileSize: Number,
    format: String,
  },
  { _id: false }
)

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // === IMAGE ===
    images: [imageSchema],
    blurHash: String,
    colorPalette: [{ type: String }],

    // === CONTENT ===
    caption: { type: String, maxlength: 500 },
    tags: [{ type: String, lowercase: true, trim: true }],
    category: {
      type: String,
      enum: ['nature', 'anime', 'minimal', 'abstract', 'city', 'space', 'dark', 'light', 'gradient', 'other'],
      required: true,
    },
    resolution: { type: String, enum: ['hd', '2k', '4k'] },
    orientation: { type: String, enum: ['portrait', 'landscape', 'square'] },

    // === AI ===
    isAIGenerated: { type: Boolean, default: false },
    aiTool: { type: String },

    // === MODERATION ===
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'hidden'],
      default: 'pending',
    },
    isNSFW: { type: Boolean, default: false },
    nsfwScore: { type: Number, min: 0, max: 1 },
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },

    // === MONETIZATION ===
    isPremium: { type: Boolean, default: false },
    priceInCoins: { type: Number, default: 50 },
    totalCoinsEarned: { type: Number, default: 0 },

    // === STATS (denormalized) ===
    stats: {
      viewsCount: { type: Number, default: 0 },
      likesCount: { type: Number, default: 0 },
      downloadsCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      bookmarksCount: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
    },

    // === RANKING ===
    score: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },

    // === SPONSORED ===
    isSponsored: { type: Boolean, default: false },
    sponsorExpiry: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Compound indexes
postSchema.index({ authorId: 1, createdAt: -1 })
postSchema.index({ status: 1, createdAt: -1 })
postSchema.index({ category: 1, score: -1 })
postSchema.index({ tags: 1 })
postSchema.index({ score: -1 })
postSchema.index({ colorPalette: 1 })
postSchema.index({ isNSFW: 1, status: 1 })
postSchema.index({ caption: 'text', tags: 'text' })

const Post = mongoose.model('Post', postSchema)
export default Post
