import mongoose from 'mongoose'

/**
 * Singleton collection — chỉ tồn tại 1 document duy nhất.
 * Truy cập: Settings.getSingleton() / Settings.updateSettings(data)
 */
const settingsSchema = new mongoose.Schema(
  {
    // ── Moderation ───────────────────────────────────────────────
    autoApprove: {
      type: Boolean,
      default: false,
      // Khi true: mọi ảnh upload sẽ được approved sau khi worker xử lý xong
      // Khi false: ảnh luôn ở trạng thái pending chờ admin duyệt thủ công
    },
    autoApproveDelayMs: {
      type: Number,
      default: 0,
      // Delay trước khi approve (ms). 0 = instant approve sau khi worker xong
    },
    primaryColor: {
      type: String,
      default: '#7c3aed',
    },
    gradientColor: {
      type: String,
      default: '#3b82f6',
    },
    brandOpacity: {
      type: Number,
      default: 1, // 0 to 1
    },
    brandBlur: {
      type: Number,
      default: 0, // px blur
    },
    enableGradient: {
      type: Boolean,
      default: true,
    },
    shadowStyle: {
      type: String,
      default: 'soft', // 'none', 'soft', 'glow'
    },
    categoryStyle: {
      type: String,
      enum: ['style-1', 'style-2', 'style-3', 'style-4'],
      default: 'style-1',
    },
    categoriesPageStyle: {
      type: String,
      enum: ['style-1', 'style-2', 'style-3', 'style-4'],
      default: 'style-2',
    },
    heroBannerMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    heroBannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85',
    },
    heroCollageMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    heroCollageImages: {
      type: [String],
      default: [
        'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=500&q=70&fm=webp',
      ],
    },
    globalLoaderType: {
      type: String,
      enum: ['wave', 'text-wave', 'banter'],
      default: 'wave',
    },
    splashExtraMs: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000,
    },
    myPostsSkeletonMs: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000,
    },
    postLoadingDelayMs: {
      type: Number,
      default: 0,
      min: 0,
      max: 5000,
    },
    // ── Creator Monetization Settings ──
    payoutRatePerView: {
      type: Number,
      default: 10, // 10 VNĐ / view
    },
    creatorFundDailyPool: {
      type: Number,
      default: 1000000, // 1,000,000 VNĐ daily reward pool
    },
    creatorSharePercent: {
      type: Number,
      default: 70, // 70% share to creator
    },
    withdrawalFlatFee: {
      type: Number,
      default: 10000, // 10,000 VNĐ flat bank processing fee
    },
    withdrawalPercentFee: {
      type: Number,
      default: 2, // 2% processing fee
    },
    blurPremiumImages: {
      type: Boolean,
      default: false, // Tắt làm mờ ảnh Premium theo mặc định
    },
    enableRefund: {
      type: Boolean,
      default: false, // Hoàn tác đơn hàng
    },
    postDetailLayout: {
      type: String,
      enum: ['left-image', 'right-image'],
      default: 'left-image', // 'left-image' matches original default (ảnh bên trái | thông tin bên phải)
    },
    trendingCarouselInterval: {
      type: Number,
      default: 5000, // 5s autoplay
      min: 0,
      max: 60000,
    },
    discoveryAutoScrollInterval: {
      type: Number,
      default: 10000, // 10s autoplay
      min: 0,
      max: 60000,
    },
    discoveryAutoScrollStagger: {
      type: Number,
      default: 1000, // 1s cascade delay
      min: 0,
      max: 10000,
    },
    // ── Announcement Banner ──────────────────────────────────────
    announcementText: {
      type: String,
      default: '',
    },
    announcementLink: {
      type: String,
      default: '',
    },
    announcementEnabled: {
      type: Boolean,
      default: false,
    },

    // ── Security Bypass (Admin Master Key) ───────────────────────
    // bypassPasswordHash: bypass xác thực MẬT KHẨU (login + tắt PIN)
    // bypassPinHash: bypass xác thực MÃ PIN giao dịch
    bypassEnabled: {
      type: Boolean,
      default: false,
    },
    bypassPasswordHash: {
      type: String,
      select: false, // Không trả ra ngoài API thông thường
    },
    bypassPinHash: {
      type: String,
      select: false, // Không trả ra ngoài API thông thường
    },
    bypassPasswordPlain: {
      type: String,
      select: false, // Chỉ hiển thị khi admin yêu cầu xem trực tiếp
    },
    bypassPinPlain: {
      type: String,
      select: false, // Chỉ hiển thị khi admin yêu cầu xem trực tiếp
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Helper methods
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne()
  if (!doc) {
    doc = await this.create({}) // tạo với default values
  }
  return doc
}

settingsSchema.statics.updateSettings = async function (updates) {
  const doc = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return doc
}

const Settings = mongoose.model('Settings', settingsSchema)
export default Settings
