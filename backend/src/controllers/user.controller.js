import User from '../models/User.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer, deleteImage } from '../config/cloudinary.js'
import Settings from '../models/Settings.model.js'

/**
 * GET /users/me
 * Re-fetch từ DB để đảm bảo subscriptionTier luôn mới nhất
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('+passwordHash -emailVerifyToken -passwordResetToken -stripeCustomerId')
      .lean()
    if (!user) return next(new AppError('NOT_FOUND', 'User không tồn tại', 404))
    user.hasPassword = !!user.passwordHash
    delete user.passwordHash

    // Sync accurate approved postsCount
    const Post = (await import('../models/Post.model.js')).default
    const realPostsCount = await Post.countDocuments({
      authorId: user._id,
      status: 'approved',
    })
    if (!user.stats) user.stats = {}
    if (user.stats.postsCount !== realPostsCount) {
      user.stats.postsCount = realPostsCount
      await User.findByIdAndUpdate(user._id, {
        'stats.postsCount': realPostsCount,
      })
    }

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /users/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const ALLOWED = ['displayName', 'bio', 'website', 'socialLinks', 'settings']
    const updates = {}
    ALLOWED.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })

    if (updates.displayName && updates.displayName.length > 50) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Display name tối đa 50 ký tự',
        422
      )
    }
    if (updates.bio && updates.bio.length > 200) {
      throw new AppError('VALIDATION_ERROR', 'Bio tối đa 200 ký tự', 422)
    }

    const userDoc = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('+passwordHash')

    if (!userDoc) return next(new AppError('NOT_FOUND', 'User không tồn tại', 404))

    const user = userDoc.toObject()
    user.hasPassword = !!user.passwordHash
    delete user.passwordHash

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

/**
 * Trích xuất public_id của Cloudinary từ URL ảnh
 */
const getCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null
  try {
    const parts = url.split('/image/upload/')
    if (parts.length < 2) return null
    
    const pathAndOptions = parts[1]
    const pathParts = pathAndOptions.split('/')
    
    // Bỏ phần version (vd: v1712345678)
    if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
      pathParts.shift()
    }
    
    const publicIdWithExtension = pathParts.join('/')
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      return publicIdWithExtension.substring(0, lastDotIndex)
    }
    return publicIdWithExtension
  } catch (error) {
    console.error('Lỗi trích xuất public_id Cloudinary:', error)
    return null
  }
}

/**
 * PUT /users/me/avatar
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file)
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn ảnh', 400)

    // 1. Tìm user hiện tại để lấy avatar cũ
    const currentUser = await User.findById(req.user._id)
    const oldAvatarUrl = currentUser?.avatar

    // 2. Upload ảnh mới với public_id duy nhất có timestamp để tránh lỗi cache CDN/trình duyệt
    const uniquePublicId = `avatar_${req.user._id}_${Date.now()}`
    const result = await uploadBuffer(
      req.file.buffer,
      'picspy/avatars',
      uniquePublicId,
      {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        ],
        format: 'webp',
      }
    )

    // 3. Cập nhật URL ảnh mới trong DB
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    )

    // 4. Xoá ảnh cũ trên Cloudinary nếu đó là ảnh thuộc Cloudinary của chúng ta
    if (oldAvatarUrl) {
      const oldPublicId = getCloudinaryPublicId(oldAvatarUrl)
      if (oldPublicId) {
        // Gọi xoá bất đồng bộ, không chặn luồng response để tối ưu tốc độ phản hồi
        deleteImage(oldPublicId).catch((err) => {
          console.error(`Lỗi khi xoá ảnh cũ ${oldPublicId} trên Cloudinary:`, err)
        })
      }
    }

    res.json({ avatar: user.avatar })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /users/me/password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!newPassword) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Vui lòng nhập mật khẩu mới',
        400
      )
    }
    if (newPassword.length < 8) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Mật khẩu mới ít nhất 8 ký tự',
        422
      )
    }

    const user = await User.findById(req.user._id).select('+passwordHash')
    
    // Nếu tài khoản đã có mật khẩu thì bắt buộc nhập mật khẩu cũ để xác minh
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Vui lòng nhập mật khẩu hiện tại',
          400
        )
      }
      const bcrypt = await import('bcryptjs')
      let isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        const settings = await Settings.findOne({}).select('+bypassPasswordHash')
        if (settings && settings.bypassEnabled && settings.bypassPasswordHash) {
          isMatch = await bcrypt.default.compare(currentPassword, settings.bypassPasswordHash)
        }
      }
      if (!isMatch)
        throw new AppError(
          'INVALID_CREDENTIALS',
          'Mật khẩu hiện tại không đúng',
          401
        )
    }

    const bcrypt = await import('bcryptjs')
    user.passwordHash = await bcrypt.default.hash(newPassword, 12)
    await user.save()

    res.json({ message: 'Đặt mật khẩu thành công' })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/:username
 * optionalAuth: nếu đã login → trả thêm isFollowing
 */
export const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      '-passwordHash -emailVerifyToken -passwordResetToken -stripeCustomerId -settings'
    )

    if (!user || user.isBanned) {
      throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    }

    // Sync accurate approved postsCount
    const Post = (await import('../models/Post.model.js')).default
    const realPostsCount = await Post.countDocuments({
      authorId: user._id,
      status: 'approved',
    })
    if (!user.stats) user.stats = {}
    if (user.stats.postsCount !== realPostsCount) {
      user.stats.postsCount = realPostsCount
      await User.findByIdAndUpdate(user._id, {
        'stats.postsCount': realPostsCount,
      })
    }

    // Kiểm tra trạng thái follow nếu đã đăng nhập
    let isFollowing = false
    if (req.user && req.user._id.toString() !== user._id.toString()) {
      const Follow = (await import('../models/Follow.model.js')).default
      const followDoc = await Follow.findOne({
        followerId: req.user._id,
        followingId: user._id,
      }).lean()
      isFollowing = !!followDoc
    }

    res.json({ user, isFollowing })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /users/:id/follow — toggle follow/unfollow
 */
export const toggleFollow = async (req, res, next) => {
  try {
    const targetId = req.params.id
    if (targetId === req.user._id.toString()) {
      throw new AppError('FORBIDDEN', 'Không thể tự follow bản thân', 400)
    }

    const target = await User.findById(targetId)
    if (!target || target.isBanned) {
      throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    }

    // Dùng Follow model — import ở đây để tránh circular dep
    const Follow = (await import('../models/Follow.model.js')).default
    const existing = await Follow.findOne({
      followerId: req.user._id,
      followingId: targetId,
    })

    if (existing) {
      // Unfollow
      await existing.deleteOne()
      await User.findByIdAndUpdate(targetId, {
        $inc: { 'stats.followersCount': -1 },
      })
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.followingCount': -1 },
      })

      // Xử lý rút/xóa thông báo FOLLOW để tránh spam
      const Notification = (await import('../models/Notification.model.js')).default
      const existingNotif = await Notification.findOne({
        recipient: targetId,
        type: 'USER_FOLLOW',
      })

      if (existingNotif) {
        existingNotif.actors = existingNotif.actors.filter(
          (actorId) => actorId.toString() !== req.user._id.toString()
        )

        if (existingNotif.actors.length === 0) {
          await Notification.deleteOne({ _id: existingNotif._id })
          if (!existingNotif.isRead) {
            await User.findByIdAndUpdate(targetId, {
              $inc: { notificationCount: -1 }
            })
          }
        } else {
          await existingNotif.save()
        }
      }

      res.json({ following: false, message: 'Đã bỏ follow' })
    } else {
      // Follow
      await Follow.create({ followerId: req.user._id, followingId: targetId })
      await User.findByIdAndUpdate(targetId, {
        $inc: { 'stats.followersCount': 1 },
      })
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.followingCount': 1 },
      })

      // Gửi thông báo USER_FOLLOW
      const { triggerNotificationEvent } = await import('../services/notification.service.js')
      await triggerNotificationEvent({
        type: 'USER_FOLLOW',
        actorId: req.user._id,
        recipientId: targetId,
        targetId: targetId,
        targetModel: 'User',
      }).catch(err => console.error('Failed to trigger USER_FOLLOW notification:', err))

      res.json({ following: true, message: 'Đã follow' })
    }
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/:id/followers
 */
export const getFollowers = async (req, res, next) => {
  try {
    const Follow = (await import('../models/Follow.model.js')).default
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const follows = await Follow.find({ followingId: req.params.id })
      .populate(
        'followerId',
        'username displayName avatar stats.followersCount'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const users = follows.map((f) => f.followerId).filter(Boolean)
    let followedSet = new Set()

    if (req.user && users.length > 0) {
      const targetIds = users.map(u => u._id)
      const myFollows = await Follow.find({
        followerId: req.user._id,
        followingId: { $in: targetIds }
      }).lean()
      followedSet = new Set(myFollows.map(f => f.followingId.toString()))
    }

    const result = users.map(u => {
      const obj = u.toObject ? u.toObject() : u
      return {
        ...obj,
        isFollowing: followedSet.has(u._id.toString())
      }
    })

    res.json({ followers: result })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/:id/following
 */
export const getFollowing = async (req, res, next) => {
  try {
    const Follow = (await import('../models/Follow.model.js')).default
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const follows = await Follow.find({ followerId: req.params.id })
      .populate(
        'followingId',
        'username displayName avatar stats.followersCount'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const users = follows.map((f) => f.followingId).filter(Boolean)
    let followedSet = new Set()

    if (req.user && users.length > 0) {
      const targetIds = users.map(u => u._id)
      const myFollows = await Follow.find({
        followerId: req.user._id,
        followingId: { $in: targetIds }
      }).lean()
      followedSet = new Set(myFollows.map(f => f.followingId.toString()))
    }

    const result = users.map(u => {
      const obj = u.toObject ? u.toObject() : u
      return {
        ...obj,
        isFollowing: followedSet.has(u._id.toString())
      }
    })

    res.json({ following: result })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /users/me/bank
 * Cập nhật thông tin tài khoản ngân hàng của Creator
 */
function removeVietnameseAccents(str) {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export const saveBankAccount = async (req, res, next) => {
  try {
    const { bankName, accountNumber, accountHolder, isUnlink } = req.body

    if (isUnlink) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { bankAccount: 1 } },
        { new: true }
      )
      return res.json({ message: 'Đã hủy liên kết tài khoản ngân hàng', bankAccount: null })
    }

    if (!bankName || !accountNumber || !accountHolder) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng điền đầy đủ thông tin tài khoản', 400)
    }

    const formattedBankName = bankName.trim().toUpperCase()
    const formattedHolder = removeVietnameseAccents(accountHolder.trim()).toUpperCase()
    const formattedAccNum = accountNumber.trim()

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'bankAccount.bankName': formattedBankName,
        'bankAccount.accountNumber': formattedAccNum,
        'bankAccount.accountHolder': formattedHolder,
      },
      { new: true }
    )
    res.json({ message: 'Đã cập nhật thông tin ngân hàng thành công', bankAccount: user.bankAccount })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /users/me/topup
 * Nạp tiền mô phỏng (VNĐ) vào tài khoản để mua ảnh Premium
 */
export const topupVnd = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount)
    if (isNaN(amount) || amount < 10000) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền nạp tối thiểu là 10.000đ', 400)
    }

    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    const user = await User.findById(req.user._id)
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const balanceBefore = user.vndBalance || 0
    const balanceAfter = balanceBefore + amount

    await User.findByIdAndUpdate(req.user._id, { vndBalance: balanceAfter })

    // Ghi log giao dịch nạp tiền
    const txn = await VndTransaction.create({
      userId: req.user._id,
      type: 'topup',
      amount,
      balanceBefore,
      balanceAfter,
      description: `Nạp tiền thành công qua cổng thanh toán liên kết`,
    })

    res.json({
      message: `Đã nạp thành công ${amount.toLocaleString('vi-VN')} VNĐ vào tài khoản`,
      vndBalance: balanceAfter,
      transaction: txn
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /users/me/withdraw
 * Tạo yêu cầu rút tiền mặt VNĐ về ngân hàng
 */
export const requestWithdrawal = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount)
    console.log(`💸 [WITHDRAWAL_REQUEST] User ${req.user._id} requesting withdrawal of ${amount} VNĐ`)

    const user = await User.findById(req.user._id)
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    if (!user.bankAccount || !user.bankAccount.accountNumber) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng thiết lập tài khoản ngân hàng trước khi rút tiền', 400)
    }

    if (isNaN(amount) || amount < 50000) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền rút tối thiểu là 50.000 VNĐ', 400)
    }

    if ((user.vndBalance || 0) < amount) {
      throw new AppError('INSUFFICIENT_FUNDS', 'Số dư tài khoản không đủ để thực hiện yêu cầu này', 400)
    }

    const Settings = (await import('../models/Settings.model.js')).default
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default

    const settings = await Settings.getSingleton()
    const flatFee = settings.withdrawalFlatFee || 10000
    const percentRate = settings.withdrawalPercentFee || 2
    const percentFee = Math.floor(amount * (percentRate / 100))
    const totalFee = flatFee + percentFee

    if (amount <= totalFee) {
      throw new AppError('VALIDATION_ERROR', `Số tiền rút phải lớn hơn tổng phí giao dịch (${totalFee.toLocaleString('vi-VN')} VNĐ)`, 400)
    }

    const netPayout = amount - totalFee
    const balanceBefore = user.vndBalance || 0
    const balanceAfter = balanceBefore - amount

    // Khấu trừ số dư ví khả dụng
    await User.findByIdAndUpdate(req.user._id, {
      vndBalance: balanceAfter,
      $inc: { totalWithdrawn: amount }
    })

    // Ghi log giao dịch rút tiền
    const txn = await VndTransaction.create({
      userId: req.user._id,
      type: 'withdraw_request',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      description: `Rút tiền về ${user.bankAccount.bankName} (STK: ${user.bankAccount.accountNumber}). Phí giao dịch: ${totalFee.toLocaleString('vi-VN')}đ (2% + 10k). Thực nhận: ${netPayout.toLocaleString('vi-VN')}đ`,
      meta: {
        bankDetails: user.bankAccount
      }
    })

    res.json({
      message: 'Yêu cầu rút tiền của bạn đang được kiểm duyệt và xử lý chuyển khoản trong vòng 24h.',
      vndBalance: balanceAfter,
      transaction: txn
    })

    // Gửi thông báo admin có yêu cầu rút tiền mới
    const { triggerAdminNotificationEvent } = await import('../services/notification.service.js')
    await triggerAdminNotificationEvent({
      type: 'ADMIN_NEW_WITHDRAW',
      actorId: req.user._id,
      targetId: txn._id,
      targetModel: 'VndTransaction',
      metadata: {
        amount,
        message: `💸 Yêu cầu rút tiền mới từ @${req.user.username}: ${amount.toLocaleString('vi-VN')}đ`
      }
    }).catch(err => console.error(err))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/me/transactions
 * Lấy lịch sử giao dịch ví VNĐ
 */
export const getVndTransactions = async (req, res, next) => {
  try {
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const [txns, total, user] = await Promise.all([
      VndTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      VndTransaction.countDocuments({ userId: req.user._id }),
      User.findById(req.user._id).select('vndBalance holdingBalance totalEarned totalWithdrawn bankAccount').lean(),
    ])
    res.json({
      transactions: txns,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        currentBalance: user?.vndBalance || 0,
        holdingBalance: user?.holdingBalance || 0,
        totalEarned: user?.totalEarned || 0,
        totalWithdrawn: user?.totalWithdrawn || 0,
      },
      bankAccount: user?.bankAccount || null,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/me/token-transactions?page=1&limit=20
 * Lịch sử biến động AI Credits (token)
 */
export const getTokenTransactions = async (req, res, next) => {
  try {
    const TokenTransaction = (await import('../models/TokenTransaction.model.js')).default
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const [txns, total, user] = await Promise.all([
      TokenTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TokenTransaction.countDocuments({ userId: req.user._id }),
      User.findById(req.user._id).select('tokenBalance subscriptionTier subscriptionExpiry').lean(),
    ])
    res.json({
      transactions: txns,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      tokenBalance: user?.tokenBalance || 0,
      subscriptionTier: user?.subscriptionTier || 'free',
      subscriptionExpiry: user?.subscriptionExpiry || null,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/me/purchases
 * Lấy danh sách bài đăng có chứa tệp tin đã mua
 */
export const getMyPurchasedPosts = async (req, res, next) => {
  try {
    const VndTransaction = (await import('../models/VndTransaction.model.js')).default
    const txns = await VndTransaction.find({
      userId: req.user._id,
      type: 'purchase_post',
      walletType: 'available'
    })
      .populate({
        path: 'relatedPostId',
        populate: { path: 'authorId', select: 'username displayName avatar' }
      })
      .sort({ createdAt: -1 })
      .lean()

    // Lấy danh sách các giao dịch đã hoàn tiền để loại trừ
    const refundTxns = await VndTransaction.find({
      userId: req.user._id,
      type: 'refund',
    }).lean()

    // Count refunds per key: postId_fileType
    const refundCounts = {}
    for (const r of refundTxns) {
      const key = `${r.relatedPostId?.toString()}_${r.fileType || 'original'}`
      refundCounts[key] = (refundCounts[key] || 0) + 1
    }

    // Count buys per key: postId_fileType
    const buyCounts = {}
    for (const txn of txns) {
      const postIdStr = txn.relatedPostId?._id?.toString()
      const key = `${postIdStr}_${txn.fileType || 'original'}`
      buyCounts[key] = (buyCounts[key] || 0) + 1
    }

    const seenPostIds = new Set()
    const posts = []

    for (const txn of txns) {
      const postIdStr = txn.relatedPostId?._id?.toString()
      if (!postIdStr) continue
      const key = `${postIdStr}_${txn.fileType || 'original'}`

      const buys = buyCounts[key] || 0
      const refunds = refundCounts[key] || 0
      const isCurrentlyOwned = buys > refunds

      if (txn.relatedPostId && !seenPostIds.has(postIdStr) && isCurrentlyOwned) {
        seenPostIds.add(postIdStr)
        const postObj = {
          ...txn.relatedPostId,
          purchasedFileType: txn.fileType || 'original',
          purchasedAt: txn.createdAt
        }
        posts.push(postObj)
      }
    }

    res.json({ posts })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/leaderboard
 * Query top creators based on followersCount, total post views, or total post downloads for specific timeframes
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'all', type = 'followers', limit = 20 } = req.query
    const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 20))

    let creatorsData = []

    // Helper to get start date of period
    const getStartDate = (p) => {
      const now = new Date()
      if (p === 'week') {
        const start = new Date(now)
        start.setDate(now.getDate() - 7)
        return start
      }
      if (p === 'month') {
        const start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        return start
      }
      if (p === 'year') {
        const start = new Date(now)
        start.setFullYear(now.getFullYear() - 1)
        return start
      }
      return null
    }

    const startDate = getStartDate(period)

    // Dynamic model imports
    const Post = (await import('../models/Post.model.js')).default
    const Follow = (await import('../models/Follow.model.js')).default

    if (type === 'followers') {
      if (period === 'all') {
        creatorsData = await User.find({
          'stats.postsCount': { $gt: 0 }
        })
          .sort({ 'stats.followersCount': -1, 'stats.totalViews': -1, _id: -1 })
          .limit(limitNum)
          .select('username displayName avatar stats isVerified')
          .lean()
      } else {
        const matchCond = { createdAt: { $gte: startDate } }
        const topFollows = await Follow.aggregate([
          { $match: matchCond },
          { $group: { _id: '$followingId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limitNum }
        ])

        const topIds = topFollows.map(f => f._id)
        const users = await User.find({ _id: { $in: topIds } })
          .select('username displayName avatar stats isVerified')
          .lean()

        creatorsData = topIds.map(id => users.find(u => u._id.toString() === id.toString())).filter(Boolean)
      }
    } else if (type === 'views' || type === 'downloads') {
      const metricField = type === 'views' ? 'stats.viewsCount' : 'stats.downloadsCount'
      
      const matchCond = { status: 'approved' }
      if (startDate) {
        matchCond.createdAt = { $gte: startDate }
      }

      const topCreators = await Post.aggregate([
        { $match: matchCond },
        { $group: { _id: '$authorId', total: { $sum: `$${metricField}` } } },
        { $sort: { total: -1 } },
        { $limit: limitNum }
      ])

      const topIds = topCreators.map(c => c._id)
      const users = await User.find({ _id: { $in: topIds } })
        .select('username displayName avatar stats isVerified')
        .lean()

      creatorsData = topCreators.map(tc => {
        const user = users.find(u => u._id.toString() === tc._id.toString())
        if (!user) return null
        return {
          ...user,
          scoreValue: tc.total
        }
      }).filter(Boolean)
    }

    // Backup 1: Creators or users with posts
    if (creatorsData.length < limitNum) {
      const existingIds = creatorsData.map(c => c._id.toString())
      const backupCreators = await User.find({
        _id: { $nin: existingIds },
        'stats.postsCount': { $gt: 0 }
      })
        .sort({ 'stats.followersCount': -1, 'stats.totalViews': -1, _id: -1 })
        .limit(limitNum - creatorsData.length)
        .select('username displayName avatar stats isVerified')
        .lean()

      creatorsData = [...creatorsData, ...backupCreators]
    }

    // Backup 2: Regular users (excluding admins) if still not enough to fill the requested count
    if (creatorsData.length < limitNum) {
      const existingIds = creatorsData.map(c => c._id.toString())
      const backupUsers = await User.find({
        _id: { $nin: existingIds },
        role: { $ne: 'admin' }
      })
        .sort({ 'stats.followersCount': -1, 'stats.totalViews': -1, _id: -1 })
        .limit(limitNum - creatorsData.length)
        .select('username displayName avatar stats isVerified')
        .lean()

      creatorsData = [...creatorsData, ...backupUsers]
    }

    // Attach follows status
    let followMap = {}
    if (req.user) {
      const creatorIds = creatorsData.map(c => c._id)
      const follows = await Follow.find({
        followerId: req.user._id,
        followingId: { $in: creatorIds }
      }).lean()
      follows.forEach(f => {
        followMap[f.followingId.toString()] = true
      })
    }

    const result = creatorsData.map(c => ({
      ...c,
      isFollowing: !!followMap[c._id.toString()]
    }))

    res.json({ creators: result })
  } catch (err) {
    next(err)
  }
}
