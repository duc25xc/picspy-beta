import mongoose from 'mongoose'

// Schema dùng chung cho mọi ảnh (source + generated)
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

// Danh sách AI tools được hỗ trợ
export const AI_TOOLS = [
  'midjourney', 'dalle-3', 'stable-diffusion', 'flux',
  'leonardo', 'firefly', 'ideogram', 'bing-creator',
  'playground', 'canva-ai', 'comfyui',
  // Video AI (reserve)
  'sora', 'kling', 'runway', 'pika', 'luma', 'hailuo',
  'other',
]

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // === SOURCE IMAGES (ảnh input/tham khảo, tối đa 5) ===
    sourceImages: {
      type: [imageSchema],
      validate: [arr => arr.length <= 5, 'Tối đa 5 ảnh tham khảo'],
      default: [],
    },

    // === EXIF (chỉ extract từ sourceImages[0] nếu có) ===
    exifData: {
      camera: String,        // "Canon EOS R5"
      lensModel: String,     // "RF 50mm F1.2L USM"
      iso: Number,           // 400
      aperture: String,      // "f/1.4"
      focalLength: String,   // "50mm"
      shutterSpeed: String,  // "1/250s"
      ev: Number,            // Exposure Value: 10.5
      flash: Number,         // 0 = off, 1 = fired
      dateTaken: Date,
      software: String,      // "Adobe Lightroom"
      gpsLat: Number,
      gpsLng: Number,
    },

    // === HISTOGRAM (RGB 64-bin — từ generatedImages[0]) ===
    histogram: {
      r: [Number],   // 64 giá trị
      g: [Number],
      b: [Number],
    },

    // === AI GENERATION (core mới) ===
    prompt: {
      type: String,
      required: [true, 'Prompt là bắt buộc'],
      maxlength: [2000, 'Prompt tối đa 2000 ký tự'],
      trim: true,
    },
    negativePrompt: {
      type: String,
      maxlength: [1000, 'Negative prompt tối đa 1000 ký tự'],
      trim: true,
    },
    aiTool: {
      type: String,
      required: [true, 'Vui lòng chọn công cụ AI'],
      enum: { values: AI_TOOLS, message: 'Công cụ AI không hợp lệ' },
    },
    aiModel: { type: String, trim: true },       // "v6.1", "SDXL", "Flux Dev"
    parameters: { type: String, trim: true },     // "--ar 16:9 --v 6.1 --seed 12345"
    workflowJson: { type: String },               // ComfyUI/A1111 workflow JSON (Ultimate only)

    // === CONTENT TYPE (reserve video) ===
    contentType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },

    // === GENERATED IMAGES (kết quả AI, 1–5 ảnh) ===
    generatedImages: {
      type: [imageSchema],
      validate: [
        arr => arr.length >= 1 && arr.length <= 5,
        'Cần 1–5 ảnh kết quả AI',
      ],
    },

    // === GENERATED VIDEO (phase sau — reserve schema) ===
    generatedVideo: {
      url: String,
      thumbnailUrl: String,
      publicId: String,
      duration: Number,     // seconds
      width: Number,
      height: Number,
    },

    // === VISUAL METADATA (từ generatedImages[0]) ===
    blurHash: String,
    colorPalette: [{ type: String }],

    // === CONTENT ===
    caption: { type: String, maxlength: 500 },
    tags: [{ type: String, lowercase: true, trim: true }],
    category: {
      type: String,
      default: 'other',
      trim: true,
      lowercase: true,
    },
    resolution: { type: String, enum: ['sd', 'hd', '2k', '4k'] },
    orientation: { type: String, enum: ['portrait', 'landscape', 'square'] },
    aspectRatio: { type: String, trim: true },

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
    priceInTokens: { type: Number, default: 10, min: 1, max: 500 },
    totalTokensEarned: { type: Number, default: 0 },
    accessTier: { type: String, enum: ['free', 'pro', 'ultimate'], default: 'free' },

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
postSchema.index({ aiTool: 1, status: 1 })
postSchema.index({ contentType: 1, status: 1 })
postSchema.index({ prompt: 'text', caption: 'text', tags: 'text' })

const Post = mongoose.model('Post', postSchema)
export default Post
