import SubscriptionPlan from '../models/SubscriptionPlan.model.js'
import User from '../models/User.model.js'
import TokenTransaction from '../models/TokenTransaction.model.js'
import AppError from '../utils/AppError.js'

// Số token cấp cho gói Free (1 lần duy nhất)
const FREE_TOKEN_GRANT = 100

/**
 * GET /v1/subscriptions/plans
 * Public — lấy danh sách tất cả gói để hiển thị Pricing Page
 */
export const getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()

    // Tính số Founder's slots còn lại
    const founderPlan = plans.find(p => p.planId === 'founder')
    let founderSlotsLeft = null
    if (founderPlan) {
      const usedSlots = await User.countDocuments({ founderSlot: true })
      founderSlotsLeft = Math.max(0, founderPlan.maxFounderSlots - usedSlots)
    }

    res.json({ plans, founderSlotsLeft })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /v1/subscriptions/me
 * Auth required — lấy thông tin subscription hiện tại của user
 */
export const getMySubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('subscriptionTier subscriptionCycle subscriptionExpiry founderSlot tokenBalance freeTokenGranted')
      .lean()

    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const plan = await SubscriptionPlan.findOne({ planId: user.subscriptionTier }).lean()

    // Tính toán trạng thái
    const now = new Date()
    const isExpired = user.subscriptionExpiry && user.subscriptionExpiry < now
    const daysLeft = user.subscriptionExpiry
      ? Math.max(0, Math.ceil((user.subscriptionExpiry - now) / (1000 * 60 * 60 * 24)))
      : null

    res.json({
      subscription: {
        tier: user.subscriptionTier,
        cycle: user.subscriptionCycle,
        expiry: user.subscriptionExpiry,
        isExpired,
        daysLeft,
        founderSlot: user.founderSlot,
        plan: plan || null,
      },
      tokenBalance: user.tokenBalance,
      freeTokenGranted: user.freeTokenGranted,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/subscriptions/claim-free-tokens
 * Auth required — User Free nhận 100 token 1 lần duy nhất
 */
export const claimFreeTokens = async (req, res, next) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId).select('tokenBalance freeTokenGranted subscriptionTier')

    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    // Chỉ cho gói Free claim
    if (user.subscriptionTier !== 'free') {
      throw new AppError('FORBIDDEN', 'Chỉ tài khoản Free mới có thể nhận token khởi điểm', 400)
    }

    if (user.freeTokenGranted) {
      throw new AppError('ALREADY_CLAIMED', 'Bạn đã nhận 100 token khởi điểm rồi. Token Free không reset hàng tháng.', 400)
    }

    const balanceBefore = user.tokenBalance
    user.tokenBalance += FREE_TOKEN_GRANT
    user.freeTokenGranted = true
    await user.save()

    // Ghi audit transaction
    await TokenTransaction.create({
      userId,
      type: 'free_grant',
      amount: FREE_TOKEN_GRANT,
      balanceBefore,
      balanceAfter: user.tokenBalance,
      description: `Nhận ${FREE_TOKEN_GRANT} token khởi điểm (1 lần duy nhất cho tài khoản Free)`,
    })

    res.json({
      success: true,
      message: `Đã nhận ${FREE_TOKEN_GRANT} token! Đây là token dùng thử 1 lần`,
      tokenBalance: user.tokenBalance,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/subscriptions/subscribe (Mock — Phase 1: admin xử lý thủ công)
 * Auth required — User yêu cầu nâng gói, admin xét duyệt thủ công
 * Phase 2: tích hợp PayOS/VNPay thật
 */
export const requestSubscription = async (req, res, next) => {
  try {
    const { planId, cycle = 'monthly' } = req.body
    const userId = req.user._id

    const VALID_PLANS = ['pro', 'ultimate', 'founder']
    const VALID_CYCLES = ['weekly', 'monthly', 'yearly']

    if (!VALID_PLANS.includes(planId)) {
      throw new AppError('INVALID_PLAN', 'Gói không hợp lệ', 400)
    }
    if (!VALID_CYCLES.includes(cycle)) {
      throw new AppError('INVALID_CYCLE', 'Chu kỳ thanh toán không hợp lệ', 400)
    }

    // Kiểm tra Founder's slots
    if (planId === 'founder') {
      const founderPlan = await SubscriptionPlan.findOne({ planId: 'founder' })
      const usedSlots = await User.countDocuments({ founderSlot: true })
      if (usedSlots >= founderPlan.maxFounderSlots) {
        throw new AppError('FOUNDER_FULL', `Founder's Plan đã hết ${founderPlan.maxFounderSlots} slot. Vui lòng chọn gói Pro.`, 400)
      }
    }

    const plan = await SubscriptionPlan.findOne({ planId }).lean()
    if (!plan) throw new AppError('NOT_FOUND', 'Không tìm thấy gói', 404)

    const priceMap = { weekly: plan.pricing.weekly, monthly: plan.pricing.monthly, yearly: plan.pricing.yearly }
    const price = priceMap[cycle]

    // Phase 1: trả về thông tin thanh toán thủ công
    res.json({
      success: true,
      paymentRequired: true,
      instruction: 'Vui lòng chuyển khoản theo thông tin bên dưới và liên hệ admin để kích hoạt gói.',
      order: {
        planId,
        planName: plan.name,
        cycle,
        price,
        priceFormatted: price.toLocaleString('vi-VN') + '₫',
      },
      bankInfo: {
        bank: 'Vietcombank',
        accountNumber: '1234567890',    // TODO: cập nhật số tài khoản thật
        accountName: 'PICSPY PLATFORM',
        content: `PICSPY ${planId.toUpperCase()} ${userId.toString().slice(-6).toUpperCase()}`,
        note: 'Nội dung chuyển khoản phải đúng để admin xác nhận',
      },
      contactAdmin: 'Sau khi chuyển khoản, nhắn tin Zalo: 0xxx xxx xxx kèm ảnh chụp giao dịch.',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/admin/subscriptions/activate — Admin kích hoạt gói thủ công
 * Admin only
 */
export const activateSubscription = async (req, res, next) => {
  try {
    const { userId, planId, cycle = 'monthly', durationDays } = req.body

    const VALID_PLANS = ['pro', 'ultimate', 'founder']
    if (!VALID_PLANS.includes(planId)) {
      throw new AppError('INVALID_PLAN', 'Gói không hợp lệ', 400)
    }

    const user = await User.findById(userId)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    const plan = await SubscriptionPlan.findOne({ planId }).lean()
    if (!plan) throw new AppError('NOT_FOUND', 'Không tìm thấy gói', 404)

    // Tính ngày hết hạn
    const cycleDays = { weekly: 7, monthly: 30, yearly: 365 }
    const days = durationDays || cycleDays[cycle] || 30
    const now = new Date()
    // Nếu gói chưa hết hạn thì cộng thêm, không ghi đè
    const base = user.subscriptionExpiry && user.subscriptionExpiry > now
      ? user.subscriptionExpiry
      : now
    const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

    const prevTier = user.subscriptionTier
    user.subscriptionTier = planId
    user.subscriptionCycle = cycle
    user.subscriptionExpiry = newExpiry

    // Founder's Plan
    if (planId === 'founder') {
      user.founderSlot = true
    }

    // Cấp token theo gói (Ultimate = unlimited → không cộng vào DB, check realtime)
    let tokensGranted = 0
    if (plan.tokenPerMonth > 0) {
      const balanceBefore = user.tokenBalance
      user.tokenBalance += plan.tokenPerMonth
      tokensGranted = plan.tokenPerMonth

      await TokenTransaction.create({
        userId,
        type: 'monthly_grant',
        amount: tokensGranted,
        balanceBefore,
        balanceAfter: user.tokenBalance,
        description: `Kích hoạt gói ${plan.name} (${cycle}) — +${tokensGranted} token`,
        relatedSubscriptionId: planId,
        meta: { adminNote: `Activated by admin ${req.user.username || req.user._id}` },
      })
    }

    await user.save()

    res.json({
      success: true,
      message: `Đã kích hoạt gói ${plan.name} cho @${user.username}`,
      user: {
        username: user.username,
        subscriptionTier: user.subscriptionTier,
        subscriptionCycle: user.subscriptionCycle,
        subscriptionExpiry: user.subscriptionExpiry,
        founderSlot: user.founderSlot,
        tokenBalance: user.tokenBalance,
        tokensGranted,
      },
    })
  } catch (err) {
    next(err)
  }
}
