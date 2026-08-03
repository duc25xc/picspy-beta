import SubscriptionPlan from '../models/SubscriptionPlan.model.js'
import User from '../models/User.model.js'
import TokenTransaction from '../models/TokenTransaction.model.js'
import SubscriptionOrder from '../models/SubscriptionOrder.model.js'
import AppError from '../utils/AppError.js'
import { triggerNotificationEvent } from '../services/notification.service.js'

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
    const priceFormatted = price.toLocaleString('vi-VN') + '₫'

    const shortId = userId.toString().slice(-6).toUpperCase()
    const memoContent = `PICSPY ${planId.toUpperCase()} ${shortId}`

    // Lưu hoặc cập nhật đơn nạp chờ duyệt vào DB
    const orderDoc = await SubscriptionOrder.findOneAndUpdate(
      { userId, status: 'pending' },
      {
        orderCode: memoContent,
        planId,
        planName: plan.name,
        cycle,
        price,
        priceFormatted,
        memoContent,
        shortId,
        userConfirmed: false,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )

    // Gửi thông báo đến tất cả Admin — sẽ hiện trong chuông thông báo
    try {
      const adminUsers = await User.find({ role: 'admin' }).select('_id').lean()
      for (const admin of adminUsers) {
        await triggerNotificationEvent({
          type: 'SUBSCRIPTION_REQUEST',
          actorId: userId,
          recipientId: admin._id,
          metadata: {
            message: `⚡ [Đơn Nạp Gói Mới] User @${req.user.username || 'user'} (ID: #${shortId}) vừa tạo hóa đơn gói ${plan.name} (${priceFormatted}). Nội dung: "${memoContent}".`,
          },
        })
      }
    } catch {
      // Suppress notification error
    }

    res.json({
      success: true,
      paymentRequired: true,
      instruction: 'Vui lòng chuyển khoản theo thông tin hóa đơn bên dưới để nâng cấp gói tài khoản.',
      order: {
        id: orderDoc._id,
        planId,
        planName: plan.name,
        cycle,
        price,
        priceFormatted,
        user: {
          id: userId.toString(),
          shortId,
          username: req.user.username || 'Creator',
          displayName: req.user.displayName || req.user.username || 'User',
          email: req.user.email || ''
        }
      },
      bankInfo: {
        bank: 'VietinBank',
        bankFullName: 'Ngân hàng TMCP Công thương Việt Nam',
        branch: 'CN Thái Nguyên - Hội sở',
        accountNumber: '105870712923',
        accountName: 'HA MINH DUC',
        content: memoContent,
        qrCodeUrl: '/qr-code-viettin.jpg',
        dynamicQrUrl: `https://img.vietqr.io/image/vietinbank-105870712923-compact2.png?amount=${price}&addInfo=${encodeURIComponent(memoContent)}&accountName=HA%20MINH%20DUC`,
        note: `⚠️ BẮT BUỘC nhập đúng nội dung chuyển khoản "${memoContent}" khi giao dịch.`
      },
      contactAdmin: 'Sau khi chuyển khoản thành công, nhấn "Tôi đã chuyển khoản" để báo admin hỗ trợ kích hoạt nhanh nhất.'
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/subscriptions/confirm-transfer
 * Auth required — người dùng nhấn "Tôi đã chuyển khoản" trên PayModal
 */
export const confirmTransferNotification = async (req, res, next) => {
  try {
    const userId = req.user._id
    const shortId = userId.toString().slice(-6).toUpperCase()

    // Cập nhật đơn hàng gần nhất của user thành userConfirmed
    const order = await SubscriptionOrder.findOneAndUpdate(
      { userId, status: 'pending' },
      { userConfirmed: true, userConfirmedAt: new Date() },
      { sort: { createdAt: -1 }, returnDocument: 'after' }
    )

    // Gửi thông báo đến tất cả Admin — sẽ hiện trong chuông thông báo
    const adminUsers = await User.find({ role: 'admin' }).select('_id').lean()
    const planTitle = order ? order.planName : 'Nâng cấp Gói'
    const priceText = order ? order.priceFormatted : ''
    const memoText = order ? order.memoContent : `PICSPY ${shortId}`

    for (const admin of adminUsers) {
      await triggerNotificationEvent({
        type: 'SUBSCRIPTION_REQUEST',
        actorId: userId,
        recipientId: admin._id,
        metadata: {
          message: `⚡ [CK Xác Nhận] User @${req.user.username || 'user'} (ID: #${shortId}) bấm đã chuyển khoản gói ${planTitle} (${priceText}). Nội dung: "${memoText}".`,
        },
      })
    }

    res.json({
      success: true,
      message: 'Đã gửi thông báo cho Admin. Admin sẽ kiểm tra và kích hoạt gói cho bạn trong 5-15 phút!',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /v1/subscriptions/pending-orders — Admin lấy danh sách các đơn chuyển khoản chờ duyệt
 * Admin only
 */
export const getPendingSubscriptionOrders = async (req, res, next) => {
  try {
    const orders = await SubscriptionOrder.find({ status: 'pending' })
      .populate('userId', 'username displayName email avatar subscriptionTier tokenBalance')
      .sort({ userConfirmed: -1, createdAt: -1 })
      .lean()

    res.json({
      success: true,
      count: orders.length,
      orders,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/subscriptions/orders/:orderId/approve — Admin duyệt đơn nạp tiền/gói thủ công
 * Admin only
 */
export const approveSubscriptionOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const order = await SubscriptionOrder.findById(orderId)
    if (!order) throw new AppError('NOT_FOUND', 'Không tìm thấy đơn nạp', 404)

    if (order.status !== 'pending') {
      throw new AppError('ORDER_PROCESSED', `Đơn hàng đã ở trạng thái ${order.status}`, 400)
    }

    const user = await User.findById(order.userId)
    if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy user', 404)

    const plan = await SubscriptionPlan.findOne({ planId: order.planId }).lean()

    // Tính ngày hết hạn
    const cycleDays = { weekly: 7, monthly: 30, yearly: 365 }
    const days = cycleDays[order.cycle] || 30
    const now = new Date()
    const base = user.subscriptionExpiry && user.subscriptionExpiry > now ? user.subscriptionExpiry : now
    const newExpiry = new Date(base.getTime() + days * 86400000)

    user.subscriptionTier = order.planId
    user.subscriptionCycle = order.cycle
    user.subscriptionExpiry = newExpiry

    if (order.planId === 'founder') user.founderSlot = true

    // Cấp AI Credits
    let tokensGranted = 0
    const planTokenMap = { pro: 1000, founder: 2500, ultimate: 0, free: 0 }
    const tokensToGrant = plan ? (plan.tokenPerMonth || 0) : (planTokenMap[order.planId] || 0)

    const balanceBefore = typeof user.tokenBalance === 'number' && !isNaN(user.tokenBalance) ? user.tokenBalance : 0

    if (tokensToGrant > 0) {
      user.tokenBalance = balanceBefore + tokensToGrant
      tokensGranted = tokensToGrant

      await TokenTransaction.create({
        userId: user._id,
        type: 'monthly_grant',
        amount: tokensGranted,
        balanceBefore,
        balanceAfter: user.tokenBalance,
        description: `Duyệt đơn nạp gói ${order.planName} (${order.cycle || 'monthly'}) — +${tokensGranted} token`,
        relatedSubscriptionId: order.planId,
        meta: { adminNote: `Approved by admin ${req.user.username || req.user._id}` },
      })
    } else {
      user.tokenBalance = balanceBefore
    }

    await user.save()

    // Đánh dấu đơn hàng là đã duyệt
    order.status = 'approved'
    order.approvedBy = req.user._id
    order.approvedAt = new Date()
    await order.save()

    // Thông báo cho User — sẽ hiện trong chuông thông báo
    await triggerNotificationEvent({
      type: 'SUBSCRIPTION_APPROVED',
      actorId: req.user._id,
      recipientId: user._id,
      metadata: {
        message: `🎉 Gói PicSpy ${order.planName} (${order.cycle || 'monthly'}) đã được Admin kích hoạt thành công! Hạn dùng đến: ${newExpiry.toLocaleDateString('vi-VN')}.`,
      },
    })

    res.json({
      success: true,
      message: `Đã duyệt & kích hoạt gói ${order.planName} cho @${user.username}!`,
      order,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/subscriptions/orders/:orderId/reject — Admin từ chối đơn nạp
 * Admin only
 */
export const rejectSubscriptionOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params
    const { reason } = req.body

    const order = await SubscriptionOrder.findById(orderId)
    if (!order) throw new AppError('NOT_FOUND', 'Không tìm thấy đơn nạp', 404)

    order.status = 'rejected'
    order.rejectedReason = reason || 'Admin không tìm thấy giao dịch chuyển khoản phù hợp'
    await order.save()

    // Thông báo cho User — sẽ hiện trong chuông thông báo
    await triggerNotificationEvent({
      type: 'SUBSCRIPTION_REJECTED',
      actorId: req.user._id,
      recipientId: order.userId,
      metadata: {
        message: `❌ Đơn nạp gói PicSpy ${order.planName} (${order.memoContent}) không được duyệt. Lý do: ${order.rejectedReason}.`,
      },
    })

    res.json({
      success: true,
      message: `Đã từ chối đơn nạp của User`,
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
