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
    } else if (fileType.startsWith('comp_')) {
      const compIdx = parseInt(fileType.replace('comp_', ''))
      if (!isNaN(compIdx) && post.modelComparisons?.[compIdx]?.generatedImages?.[0]) {
        targetFile = post.modelComparisons[compIdx].generatedImages[0]
        resourceType = 'image'
      }
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
    // ─── Premium: kiểm tra và thanh toán bằng VNĐ ────────────────
    if (post.isPremium) {
      const User = (await import('../models/User.model.js')).default
      const Settings = (await import('../models/Settings.model.js')).default
      const VndTransaction = (await import('../models/VndTransaction.model.js')).default
      const user = await User.findById(userId)

      if (!user) throw new AppError('UNAUTHORIZED', 'Người dùng không tồn tại', 401)

      // Ultimate tier không tốn VNĐ khi tải
      const isUnlimited = user.subscriptionTier === 'ultimate'
      const price = post.priceInVnd || 20000

      if (!isUnlimited && user.vndBalance < price) {
        return res.status(402).json({
          error: 'INSUFFICIENT_FUNDS',
          message: `Bạn cần ${price.toLocaleString('vi-VN')} VNĐ để tải ảnh này. Số dư ví hiện tại: ${user.vndBalance.toLocaleString('vi-VN')} VNĐ.`,
          required: price,
          balance: user.vndBalance,
          shortfall: price - user.vndBalance,
        })
      }

      if (!isUnlimited) {
        // Trừ số dư ví VNĐ của người tải
        const balanceBefore = user.vndBalance || 0
        const balanceAfter = Math.max(0, balanceBefore - price)
        await User.findByIdAndUpdate(userId, { vndBalance: balanceAfter })

        // Ghi nhận giao dịch của người mua
        await VndTransaction.create({
          userId,
          type: 'purchase_post',
          amount: -price,
          balanceBefore,
          balanceAfter,
          description: `Mua ảnh Premium: ${post.caption || 'Chất lượng cao'}`,
          relatedPostId: postId,
        }).catch(err => console.error('Failed to log purchase_post transaction:', err))

        // Cộng tiền và hoa hồng cho tác giả (Creator nhận creatorSharePercent%)
        if (post.authorId.toString() !== userId.toString()) {
          const settings = await Settings.getSingleton()
          const sharePercent = settings.creatorSharePercent || 70
          const authorShare = Math.floor(price * (sharePercent / 100))

          const author = await User.findById(post.authorId)
          if (author) {
            const authBefore = author.vndBalance || 0
            const authAfter = authBefore + authorShare
            await User.findByIdAndUpdate(post.authorId, {
              vndBalance: authAfter,
              $inc: { totalEarned: authorShare }
            })

            // Ghi nhận giao dịch của tác giả
            await VndTransaction.create({
              userId: post.authorId,
              type: 'earn_purchase',
              amount: authorShare,
              balanceBefore: authBefore,
              balanceAfter: authAfter,
              description: `Nhận ${sharePercent}% hoa hồng từ lượt tải ảnh Premium`,
              relatedPostId: postId,
              relatedUserId: userId,
            }).catch(err => console.error('Failed to log earn_purchase transaction:', err))
          }
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

    if (fileType === 'original' || fileType.startsWith('comp_')) {
      const prefix = fileType.startsWith('comp_') ? `comp_${fileType.replace('comp_', '')}_` : ''
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
      finalFilename = `${prefix}${baseName}_${dateStr}_picspy.${ext}`
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
      format: ext,
    }

    // No transformations are applied here to ensure Cloudinary serves the original byte-for-byte uploaded file without compression.

    const downloadUrl = targetFile.url || cloudinary.url(targetFile.publicId, urlOptions)

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
      vndSpent: post.isPremium ? (post.priceInVnd || 20000) : 0,
      message: post.isPremium ? `Đã trừ ${(post.priceInVnd || 20000).toLocaleString('vi-VN')} VNĐ` : 'Tải ảnh miễn phí',
    })
  } catch (err) {
    next(err)
  }
}
