import mongoose from 'mongoose'

// Schema dùng chung cho mọi ảnh (source + generated)
const imageSchema = new mongoose.Schema(
  {
    url: String,
    thumbnailUrl: String,
    previewUrl: String,
    localPath: String,
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
  'midjourney',
  'dalle-3',
  'stable-diffusion',
  'flux',
  'gemini-nano-banana-pro',
  'gemini-nano-banana-2',
  'chatgpt',
  'gpt-image-1-5',
  'gpt-1.5',
  'seedream',
  'grok',
  'picspy',
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
      validate: [(arr) => arr.length <= 5, 'Tối đa 5 ảnh tham khảo'],
      default: [],
    },

    // === EXIF (chỉ extract từ sourceImages[0] nếu có) ===
    exifData: {
      camera: String, // "Canon EOS R5"
      lensModel: String, // "RF 50mm F1.2L USM"
      iso: Number, // 400
      aperture: String, // "f/1.4"
      focalLength: String, // "50mm"
      shutterSpeed: String, // "1/250s"
      ev: Number, // Exposure Value: 10.5
      flash: String, // e.g. "Flash did not fire", "0", "1" etc.
      dateTaken: Date,
      software: String, // "Adobe Lightroom"
      whiteBalance: String, // "Auto" or "Manual"
      artist: String,
      copyright: String,
      exposureProgram: String,
      meteringMode: String,
      exposureCompensation: String,
      digitalZoomRatio: String,
      bodySerialNumber: String,
      lensSerialNumber: String,
      lensSpecification: String,
      colorSpace: String,
      gpsLat: Number,
      gpsLng: Number,
    },

    // === HISTOGRAM (RGB 64-bin — từ generatedImages[0]) ===
    histogram: {
      r: [Number], // 64 giá trị
      g: [Number],
      b: [Number],
    },

    // === HISTOGRAMS (RGB 64-bin — mảng chứa tất cả các ảnh kết quả) ===
    histograms: {
      type: [{
        r: [Number],
        g: [Number],
        b: [Number],
      }],
      default: []
    },

    // === POST TYPE & CLASSIFICATION ===
    postType: {
      type: String,
      enum: ['ai', 'digital-raw', 'digital-normal'],
      default: 'ai',
      required: true,
    },

    // === AI GENERATION (core mới) ===
    prompt: {
      type: String,
      required: [
        function () {
          return this.postType === 'ai'
        },
        'Prompt là bắt buộc đối với ảnh AI',
      ],
      validate: {
        validator: function (val) {
          if (this.postType !== 'ai') return true
          if (!val) return false
          const stripped = val.replace(/[\s\-_~!@#$%^&*()+=\[\]{}<>|\\/:;"',.?]+/g, '')
          return stripped.length >= 2
        },
        message: 'Prompt phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.',
      },
      maxlength: [5000, 'Prompt tối đa 5000 ký tự'],
      trim: true,
    },
    negativePrompt: {
      type: String,
      maxlength: [1000, 'Negative prompt tối đa 1000 ký tự'],
      trim: true,
    },
    aiTool: {
      type: String,
      required: [
        function () {
          return this.postType === 'ai'
        },
        'Vui lòng chọn công cụ AI',
      ],
      enum: {
        values: AI_TOOLS,
        message: 'Công cụ AI không hợp lệ',
      },
      // Note: we don't validate enum if it's not provided since it's only required for AI.
      // But Mongoose default enum validator runs if the field is present/set.
      // We will handle it by keeping it optional for digital type.
    },
    aiModel: { type: String, trim: true }, // "v6.1", "SDXL", "Flux Dev"
    parameters: { type: String, trim: true }, // "--ar 16:9 --v 6.1 --seed 12345"
    workflowJson: { type: String }, // ComfyUI/A1111 workflow JSON (Ultimate only)

    // === DIGITAL / REAL IMAGES ATTACHMENTS ===
    rawFile: {
      url: String,
      publicId: String,
      fileSize: Number,
      format: String,
      originalName: String,
    },
    colorFile: {
      url: String,
      publicId: String,
      fileSize: Number,
      format: String,
      originalName: String,
    },

    // === CONTENT TYPE (reserve video) ===
    contentType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },

    // === GENERATED IMAGES (kết quả AI hoặc bộ sưu tập digital, 1–10 ảnh) ===
    generatedImages: {
      type: [imageSchema],
      validate: [
        (arr) => arr.length >= 1 && arr.length <= 10,
        'Cần 1–10 ảnh kết quả',
      ],
    },

    // === COLLECTION (bộ sưu tập digital nhiều ảnh, không có ảnh gốc) ===
    isCollection: { type: Boolean, default: false },

    // === MULTI-MODEL COMPARISON (optional) ===
    // Khi isMultiModel=true, mỗi entry chứa kết quả từ 1 AI model khác nhau
    // cho cùng 1 prompt — cho phép viewer so sánh trực tiếp.
    isMultiModel: { type: Boolean, default: false },
    modelComparisons: {
      type: [
        {
          aiTool: { type: String, enum: AI_TOOLS },
          aiModel: { type: String, trim: true },
          generatedImages: { type: [imageSchema], default: [] },
          _id: false,
        },
      ],
      default: [],
    },

    // === GENERATED VIDEO (phase sau — reserve schema) ===
    generatedVideo: {
      url: String,
      thumbnailUrl: String,
      publicId: String,
      duration: Number, // seconds
      width: Number,
      height: Number,
    },

    // === VISUAL METADATA (từ generatedImages[0]) ===
    blurHash: String,
    colorPalette: [{ type: String }],

    // === CONTENT ===
    caption: {
      type: String,
      required: [true, 'Mô tả (caption) là bắt buộc'],
      validate: {
        validator: function (val) {
          if (!val) return false
          const stripped = val.replace(/[\s\-_~!@#$%^&*()+=\[\]{}<>|\\/:;"',.?]+/g, '')
          return stripped.length >= 2
        },
        message: 'Mô tả phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.',
      },
      maxlength: 500,
    },
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
    priceInVnd: { type: Number, default: 20000, min: 1000 },
    totalTokensEarned: { type: Number, default: 0 }, // Giữ để tương thích
    totalVndEarned: { type: Number, default: 0 },
    accessTier: {
      type: String,
      enum: ['free', 'pro', 'ultimate'],
      default: 'free',
    },

    // === REMIX SETTINGS ===
    allowRemix: { type: Boolean, default: true },
    remixRoyaltyPercent: { type: Number, default: 15, min: 0, max: 100 },
    remixDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },

    // === REMIX RELATIONSHIPS ===
    isRemix: { type: Boolean, default: false },
    parentPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    originalPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },

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

    // === EXTERNAL IMPORT (dữ liệu tổng hợp từ nguồn ngoài) ===
    isExternal: { type: Boolean, default: false },
    externalId: { type: String },
    sourceUrl: { type: String },
    authorUrl: { type: String },
    citedFrom: { type: String },
    originalLanguage: { type: String, default: 'EN' },
    originalCreatedAt: { type: Date },
    publishedAt: { type: Date },
    baseStats: {
      likesCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      bookmarksCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Compound indexes
postSchema.index({ authorId: 1, createdAt: -1 })
postSchema.index({ status: 1, createdAt: -1 })
postSchema.index({ status: 1, category: 1, postType: 1 })
postSchema.index({ category: 1, score: -1 })
postSchema.index({ tags: 1 })
postSchema.index({ score: -1 })
postSchema.index({ colorPalette: 1 })
postSchema.index({ isNSFW: 1, status: 1 })
postSchema.index({ aiTool: 1, status: 1 })
postSchema.index({ contentType: 1, status: 1 })
postSchema.index({ isExternal: 1, createdAt: -1 })
postSchema.index({ externalId: 1 })
postSchema.index({ prompt: 'text', caption: 'text', tags: 'text' })

const Post = mongoose.model('Post', postSchema)
export default Post
