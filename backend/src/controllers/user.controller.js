import User from '../models/User.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'

/**
 * GET /users/me
 */
export const getMe = async (req, res, next) => {
  try {
    res.json({ user: req.user })
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
      throw new AppError('VALIDATION_ERROR', 'Display name tối đa 50 ký tự', 422)
    }
    if (updates.bio && updates.bio.length > 200) {
      throw new AppError('VALIDATION_ERROR', 'Bio tối đa 200 ký tự', 422)
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /users/me/avatar
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn ảnh', 400)

    const result = await uploadBuffer(
      req.file.buffer,
      'pixeldrop/avatars',
      `avatar_${req.user._id}`,
      {
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        format: 'webp',
      }
    )

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    )
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
    if (!currentPassword || !newPassword) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập đầy đủ thông tin', 400)
    }
    if (newPassword.length < 8) {
      throw new AppError('VALIDATION_ERROR', 'Mật khẩu mới ít nhất 8 ký tự', 422)
    }

    const user = await User.findById(req.user._id).select('+passwordHash')
    if (!user.passwordHash) {
      throw new AppError('FORBIDDEN', 'Tài khoản Google không thể đổi mật khẩu', 403)
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) throw new AppError('INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng', 401)

    const bcrypt = await import('bcryptjs')
    user.passwordHash = await bcrypt.default.hash(newPassword, 12)
    await user.save()

    res.json({ message: 'Đổi mật khẩu thành công' })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /users/:username
 */
export const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-passwordHash -emailVerifyToken -passwordResetToken -stripeCustomerId -settings')

    if (!user || user.isBanned) {
      throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    }

    res.json({ user })
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
    const existing = await Follow.findOne({ followerId: req.user._id, followingId: targetId })

    if (existing) {
      // Unfollow
      await existing.deleteOne()
      await User.findByIdAndUpdate(targetId, { $inc: { 'stats.followersCount': -1 } })
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.followingCount': -1 } })
      res.json({ following: false, message: 'Đã bỏ follow' })
    } else {
      // Follow
      await Follow.create({ followerId: req.user._id, followingId: targetId })
      await User.findByIdAndUpdate(targetId, { $inc: { 'stats.followersCount': 1 } })
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.followingCount': 1 } })
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
      .populate('followerId', 'username displayName avatar stats.followersCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({ followers: follows.map((f) => f.followerId) })
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
      .populate('followingId', 'username displayName avatar stats.followersCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    res.json({ following: follows.map((f) => f.followingId) })
  } catch (err) {
    next(err)
  }
}
