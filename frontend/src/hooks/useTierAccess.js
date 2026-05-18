/**
 * useTierAccess.js
 *
 * Nguồn sự thật duy nhất cho tất cả feature-gating theo subscriptionTier.
 * Không import bất cứ gì từ component — pure logic hook.
 *
 * Tier hierarchy: free < founder < pro < ultimate
 * founder === pro về quyền truy cập, thêm badge đặc biệt.
 */

import useAuthStore from '../store/auth.store'

// Rank tier để so sánh
const TIER_RANK = { free: 0, founder: 2, pro: 2, ultimate: 3 }

/**
 * Kiểm tra xem tier hiện tại có đủ quyền không.
 * founder và pro có cùng rank (2).
 */
const meetsRank = (tier, required) =>
  (TIER_RANK[tier] ?? 0) >= (TIER_RANK[required] ?? 99)

export default function useTierAccess() {
  const user = useAuthStore(s => s.user)
  const tier = user?.subscriptionTier ?? 'free'
  const isLoggedIn = !!user

  return {
    tier,
    isLoggedIn,

    // ── Prompt ────────────────────────────────────────────────────
    /**
     * Guest (chưa đăng nhập): chỉ thấy ~80 chars đầu, blur + login CTA.
     * Đã đăng nhập (bất kỳ tier): full prompt — đây là reward cho việc tạo account.
     * Prompt chất lượng cao của creator được bảo vệ bởi login wall, không phải tier wall.
     */
    canSeeFullPrompt: isLoggedIn,

    /**
     * Flag rõ ràng để PromptBlock hiển thị đúng login CTA vs upsell CTA.
     */
    isGuest: !isLoggedIn,

    /**
     * Copy prompt (1-click): Tất cả user đã đăng nhập đều copy được.
     * Đây là tính năng cơ bản — login wall là đủ incentive.
     */
    canCopyPrompt: isLoggedIn,

    /**
     * Negative prompt + CFG/Seed/Steps params:
     * Pro+ và Founder thấy được.
     * Free (logged in): section bị ẩn, hiện upsell teaser.
     */
    canSeeWorkflowDetails: meetsRank(tier, 'pro'),

    /**
     * JSON workflow export (ComfyUI format):
     * Chỉ Ultimate.
     */
    canExportJson: meetsRank(tier, 'ultimate'),

    // ── Images ────────────────────────────────────────────────────
    /**
     * Watermark overlay trên ảnh: chỉ xuất hiện cho Free users.
     * Pro+/Founder không có watermark.
     */
    hasWatermark: !isLoggedIn || !meetsRank(tier, 'pro'),

    /**
     * Source image / ảnh gốc high-res: Pro+ và Founder.
     * Free chỉ thấy thumbnail của generated images.
     */
    canSeeSourceImages: meetsRank(tier, 'pro'),

    // ── UX ────────────────────────────────────────────────────────
    /** Không hiển thị quảng cáo: Pro+ và Founder */
    noAds: meetsRank(tier, 'pro'),

    /** Badge đặc biệt: chỉ Founder */
    isFounder: tier === 'founder',

    /** Hỗ trợ ưu tiên: Ultimate */
    hasPrioritySupport: meetsRank(tier, 'ultimate'),

    // ── Helper labels ─────────────────────────────────────────────
    /** Tier badge hiển thị */
    tierLabel: {
      free: 'Miễn phí',
      founder: "Founder's",
      pro: 'Pro',
      ultimate: 'Ultimate',
    }[tier] ?? 'Miễn phí',

    tierColor: {
      free: 'rgba(255,255,255,0.3)',
      founder: '#d97706',
      pro: '#7986eb',
      ultimate: '#06b6d4',
    }[tier] ?? 'rgba(255,255,255,0.3)',

    /** Upgrade destination CTA */
    upgradeTarget: meetsRank(tier, 'pro')
      ? '/pricing#ultimate'
      : '/pricing#pro',

    upgradeLabel: meetsRank(tier, 'pro')
      ? 'Nâng cấp Ultimate'
      : 'Nâng cấp Pro',
  }
}
