import { v2 as cloudinary } from 'cloudinary'
import Post from '../models/Post.model.js'
import Interaction from '../models/Interaction.model.js'
import AppError from '../utils/AppError.js'

/**
 * POST /posts/:id/download — Tải ảnh
 * - Free: tạo Cloudinary signed URL (hết hạn 30 phút)
 * - Premium: kiểm tra tokenBalance → trừ token → trả signed URL
 * - Security: KHÔNG expose publicId thực, chỉ trả URL ký tên ngắn hạn
 */
export const downloadPost = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId).lean()
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    const img = post.images?.[0]
    if (!img?.publicId) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy file ảnh', 404)
    }

    // ─── Premium: kiểm tra và trừ token ─────────────────────────
    if (post.isPremium) {
      const User = (await import('../models/User.model.js')).default
      const user = await User.findById(userId)

      if (!user) throw new AppError('UNAUTHORIZED', 'Người dùng không tồn tại', 401)

      // Ultimate tier không tốn token khi tải
      const isUnlimited = user.subscriptionTier === 'ultimate'
      const price = post.priceInTokens || 10

      if (!isUnlimited && user.tokenBalance < price) {
        return res.status(402).json({
          error: 'INSUFFICIENT_TOKENS',
          message: `Bạn cần ${price} token để tải ảnh này. Số dư hiện tại: ${user.tokenBalance} token.`,
          required: price,
          balance: user.tokenBalance,
          shortfall: price - user.tokenBalance,
        })
      }

      if (!isUnlimited) {
        // Trừ token atomic
        await User.findByIdAndUpdate(userId, { $inc: { tokenBalance: -price } })

        // Tăng totalEarned cho author (creator nhận 70%)
        if (post.authorId.toString() !== userId.toString()) {
          const authorShare = Math.floor(price * 0.7)
          await User.findByIdAndUpdate(post.authorId, {
            $inc: { totalEarned: authorShare },
          })
        }
      }
    }

    // ─── Tạo Cloudinary signed URL (30 phút, force download) ──
    // Signed URL ngắn hạn → vô dụng nếu ai copy từ DevTools
    const EXPIRES_IN = 30 * 60 // 30 phút
    const expiresAt = Math.floor(Date.now() / 1000) + EXPIRES_IN
    const downloadUrl = cloudinary.url(img.publicId, {
      sign_url: true,
      expires_at: expiresAt,
      resource_type: 'image',
      flags: 'attachment', // Force download, không hiển thị inline
      format: img.format || 'jpg',
    })

    // ─── Ghi interaction + cập nhật stats ─────────────────────
    await Interaction.create({ userId, postId, type: 'download' }).catch(() => {})
    await Post.findByIdAndUpdate(postId, { $inc: { 'stats.downloadsCount': 1 } })

    if (post.authorId.toString() !== userId.toString()) {
      const User = (await import('../models/User.model.js')).default
      await User.findByIdAndUpdate(post.authorId, {
        $inc: { 'stats.totalDownloads': 1 },
      })
    }

    res.json({
      downloadUrl,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresInMinutes: EXPIRES_IN / 60,
      tokensSpent: post.isPremium ? (post.priceInTokens || 10) : 0,
      message: post.isPremium ? `Đã trừ ${post.priceInTokens || 10} token` : 'Tải ảnh miễn phí',
    })
  } catch (err) {
    next(err)
  }
}
