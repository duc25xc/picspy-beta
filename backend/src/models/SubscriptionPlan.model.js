import mongoose from 'mongoose'

/**
 * SubscriptionPlan — Định nghĩa các gói đăng ký.
 * Dùng để seed data và hiển thị Pricing Page.
 * Giá VNĐ — thanh toán thủ công (Phase 1).
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      enum: ['free', 'pro', 'ultimate', 'founder'],
      unique: true,
      required: true,
    },
    name:        { type: String, required: true },     // "Gói Pro"
    description: { type: String },
    badge:       { type: String },                      // emoji badge: "⭐", "💎", "🎖️"
    color:       { type: String, default: 'violet' },   // màu theme: violet, amber, cyan, gold

    // Giá VNĐ theo chu kỳ (0 = miễn phí)
    pricing: {
      weekly:  { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      yearly:  { type: Number, default: 0 },
    },

    // Giá gốc (để hiển thị "giá bị gạch")
    originalPricing: {
      monthly: { type: Number, default: 0 },
    },

    // Token economy
    // -1 = unlimited (chỉ Ultimate)
    tokenPerMonth: { type: Number, default: 0 },

    // Quyền lợi hiển thị trong Pricing Page
    features: [{ type: String }],

    // Quyền lợi kỹ thuật (dùng để gate features)
    permissions: {
      noAds:            { type: Boolean, default: false },
      highResDownload:  { type: Boolean, default: false },
      fullPromptAccess: { type: Boolean, default: false },
      oneClickCopy:     { type: Boolean, default: false },
      bookmarks:        { type: Boolean, default: false },
      jsonExport:       { type: Boolean, default: false },
      commercialRights: { type: Boolean, default: false },
      prioritySupport:  { type: Boolean, default: false },
    },

    // Dành riêng cho Founder's Plan
    isFounderPlan:   { type: Boolean, default: false },
    maxFounderSlots: { type: Number, default: 0 },   // 200

    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Seed data — 4 gói theo picspy-plan.md ─────────────────────────
export const PLAN_SEEDS = [
  {
    planId: 'free',
    name: 'Free',
    description: 'Khám phá PicSpy không giới hạn thời gian',
    badge: '🆓',
    color: 'slate',
    pricing: { weekly: 0, monthly: 0, yearly: 0 },
    originalPricing: { monthly: 0 },
    tokenPerMonth: 100, // Nhưng CHỈ cấp 1 LẦN duy nhất (xem freeTokenGranted)
    features: [
      '100 token dùng thử (1 lần, không reset)',
      'Xem ảnh có watermark',
      'Chỉ xem Basic Tier prompt',
      'Nội dung phức tạp bị khóa 🔒',
      'Có quảng cáo',
    ],
    permissions: {
      noAds: false, highResDownload: false, fullPromptAccess: false,
      oneClickCopy: false, bookmarks: false, jsonExport: false,
      commercialRights: false, prioritySupport: false,
    },
    isFounderPlan: false,
    maxFounderSlots: 0,
    sortOrder: 1,
  },
  {
    planId: 'founder',
    name: "Founder's Plan",
    description: 'Dành cho 200 người đầu tiên',
    badge: '🎖️',
    color: 'gold',
    pricing: { weekly: 0, monthly: 39000, yearly: 390000 },
    originalPricing: { monthly: 99000 },
    tokenPerMonth: 1000,
    features: [
      '1.000 token/tháng',
      'Giá cố định 39.000₫ mãi mãi',
      'Toàn bộ quyền lợi gói Pro',
      'Badge Founder đặc biệt ✨',
      'Không quảng cáo',
      'Giới hạn 200 slot',
    ],
    permissions: {
      noAds: true, highResDownload: true, fullPromptAccess: true,
      oneClickCopy: true, bookmarks: true, jsonExport: false,
      commercialRights: false, prioritySupport: false,
    },
    isFounderPlan: true,
    maxFounderSlots: 200,
    sortOrder: 2,
  },
  {
    planId: 'pro',
    name: 'Pro',
    description: 'Dành cho Creator & Designer cá nhân',
    badge: '⭐',
    color: 'violet',
    pricing: { weekly: 29000, monthly: 99000, yearly: 790000 },
    originalPricing: { monthly: 299000 },
    tokenPerMonth: 1000,
    features: [
      '1.000 token/tháng (gấp 10× Free)',
      'Mở khóa toàn bộ prompt & workflow',
      '1-Click Copy workflow (Prompt, Seed, CFG...)',
      'Ảnh gốc High-res, Video Full HD',
      'Lưu bộ sưu tập cá nhân',
      'Không quảng cáo',
    ],
    permissions: {
      noAds: true, highResDownload: true, fullPromptAccess: true,
      oneClickCopy: true, bookmarks: true, jsonExport: false,
      commercialRights: false, prioritySupport: false,
    },
    isFounderPlan: false,
    maxFounderSlots: 0,
    sortOrder: 3,
  },
  {
    planId: 'ultimate',
    name: 'Ultimate',
    description: 'Dành cho Agency & AI Studio',
    badge: '💎',
    color: 'cyan',
    pricing: { weekly: 59000, monthly: 199000, yearly: 1590000 },
    originalPricing: { monthly: 599000 },
    tokenPerMonth: -1, // -1 = Unlimited
    features: [
      'Token không giới hạn (Unlimited)',
      'Toàn bộ quyền lợi Pro',
      'Tải file JSON workflow (ComfyUI)',
      'Commercial Rights — quyền thương mại',
      'Hỗ trợ ưu tiên (Priority Support)',
      'API Access (sắp ra mắt)',
    ],
    permissions: {
      noAds: true, highResDownload: true, fullPromptAccess: true,
      oneClickCopy: true, bookmarks: true, jsonExport: true,
      commercialRights: true, prioritySupport: true,
    },
    isFounderPlan: false,
    maxFounderSlots: 0,
    sortOrder: 4,
  },
]

export const seedSubscriptionPlans = async () => {
  // Upsert mỗi plan để cập nhật khi seed data thay đổi (không chỉ insert lần đầu)
  for (const plan of PLAN_SEEDS) {
    await SubscriptionPlan.updateOne(
      { planId: plan.planId },
      { $set: plan },
      { upsert: true }
    )
  }
  console.log('✅ Synced 4 subscription plans (Free, Founder, Pro, Ultimate)')
}

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
export default SubscriptionPlan
