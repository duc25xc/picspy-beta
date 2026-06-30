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
