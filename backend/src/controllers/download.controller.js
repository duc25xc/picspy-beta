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
    const { fileType = 'original' } = req.body // 'original', 'raw', 'color'

    const post = await Post.findById(postId).lean()
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    let targetFile = null
    let resourceType = 'image'

    if (fileType === 'original') {
      targetFile = post.generatedImages?.[0]
      resourceType = 'image'
    } else if (fileType === 'source') {
      targetFile = post.sourceImages?.[0]
      resourceType = 'image'
    } else if (fileType === 'raw') {
      targetFile = post.rawFile
      resourceType = 'raw'
    } else if (fileType === 'color') {
      targetFile = post.colorFile
      resourceType = 'raw'
    } else {
      throw new AppError('BAD_REQUEST', 'Loại tệp tải xuống không hợp lệ', 400)
    }

    if (!targetFile || !targetFile.publicId) {
      throw new AppError('NOT_FOUND', `Không tìm thấy tệp yêu cầu (${fileType})`, 404)
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

    // ─── Tạo tên tệp tin tải xuống đặc trưng ───
    const dateObj = new Date()
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()
    const dateStr = `${day}_${month}_${year}`

    let baseName = ''
    let ext = targetFile.format || 'jpg'
    let finalFilename = ''

    if (fileType === 'original') {
      if (post.caption) {
        baseName = post.caption
          .trim()
          .toLowerCase()
          .normalize('NFD') // remove accents
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 50)
      }
      if (!baseName) {
        baseName = `photo_${postId.toString().slice(-6)}`
      }
      baseName = baseName.replace(/_+$/, '').replace(/^_+/, '')
      finalFilename = `${baseName}_${dateStr}_picspy.${ext}`
    } else if (fileType === 'source') {
      ext = targetFile.format || 'jpg'
      if (post.caption) {
        baseName = post.caption
          .trim()
          .toLowerCase()
          .normalize('NFD') // remove accents
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 50)
      }
      if (!baseName) {
        baseName = `source_${postId.toString().slice(-6)}`
      }
      baseName = baseName.replace(/_+$/, '').replace(/^_+/, '')
      finalFilename = `RAW-unedited-${baseName}-picspy.${ext}`
    } else if (fileType === 'raw') {
      ext = targetFile.format || 'raw'
      if (targetFile.originalName) {
        const parts = targetFile.originalName.split('.')
        parts.pop()
        baseName = parts.join('.')
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_\-]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 50)
      } else {
        baseName = `raw_${postId.toString().slice(-6)}`
      }
      baseName = baseName.replace(/_+$/, '').replace(/^_+/, '')
      finalFilename = `RAW-${baseName}-picspy.${ext}`
    } else if (fileType === 'color') {
      ext = targetFile.format || 'cube'
      if (targetFile.originalName) {
        const parts = targetFile.originalName.split('.')
        parts.pop()
        baseName = parts.join('.')
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_\-]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 50)
      } else {
        baseName = `lut_${postId.toString().slice(-6)}`
      }
      baseName = baseName.replace(/_+$/, '').replace(/^_+/, '')
      finalFilename = `LUT-${baseName}-picspy.${ext}`
    }

    // ─── Tạo Cloudinary signed URL (30 phút, force download) ──
    const EXPIRES_IN = 30 * 60 // 30 phút
    const expiresAt = Math.floor(Date.now() / 1000) + EXPIRES_IN
    const urlOptions = {
      sign_url: true,
      expires_at: expiresAt,
      resource_type: resourceType,
    }

    // No transformations are applied here to ensure Cloudinary serves the original byte-for-byte uploaded file without compression.

    const downloadUrl = cloudinary.url(targetFile.publicId, urlOptions)

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
      filename: finalFilename,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresInMinutes: EXPIRES_IN / 60,
      tokensSpent: post.isPremium ? (post.priceInTokens || 10) : 0,
      message: post.isPremium ? `Đã trừ ${post.priceInTokens || 10} token` : 'Tải ảnh miễn phí',
    })
  } catch (err) {
    next(err)
  }
}
