import AppError from '../utils/AppError.js'
import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import PostAnalysis from '../models/PostAnalysis.model.js'
import UserUnlock from '../models/UserUnlock.model.js'
import { analyzeLensSpy } from '../services/ai.service.js'

const LENSSPY_COST = 2 // Token

/**
 * POST /v1/ai/lensspy/:postId
 * Mở khoá LensSpy cho user hiện tại. Trừ xu của user đó.
 *
 * Logic WIN-WIN:
 * 1. Kiểm tra user đã mở khoá post này chưa → nếu rồi trả về miễn phí
 * 2. Kiểm tra đủ xu
 * 3. Kiểm tra PostAnalysis cache → nếu đã có (user khác từng gọi AI) → dùng cache, trừ xu user này, tạo UserUnlock
 * 4. Nếu chưa có cache → gọi Gemini AI, lưu cache, trừ xu, tạo UserUnlock
 */
export const getLensSpy = async (req, res, next) => {
  try {
    const { postId } = req.params
    const userId = req.user._id

    // ── 1. Kiểm tra user đã mở khoá chưa → trả về miễn phí ──────
    const existingUnlock = await UserUnlock.findOne({ userId, postId })
    if (existingUnlock) {
      const analysis = await PostAnalysis.findOne({ postId })
      return res.json({
        success: true,
        alreadyUnlocked: true,
        tokensCost: 0,
        analysis,
      })
    }

    // ── 2. Tìm post ────────────────────────────────────────────────
    const post = await Post.findById(postId).select('generatedImages sourceImages exifData status')
    if (!post) throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    if (post.status !== 'approved') throw new AppError('FORBIDDEN', 'Bài đăng chưa được duyệt', 403)

    const imageUrl = post.generatedImages?.[0]?.url || post.generatedImages?.[0]?.previewUrl
    if (!imageUrl) throw new AppError('BAD_REQUEST', 'Bài đăng không có ảnh để phân tích', 400)

    // ── 3. Kiểm tra số dư xu ──────────────────────────────────────
    const user = await User.findById(userId).select('tokenBalance')
    if (!user || user.tokenBalance < LENSSPY_COST) {
      throw new AppError(
        'INSUFFICIENT_TOKENS',
        `Bạn cần ít nhất ${LENSSPY_COST} token để mở khoá LensSpy AI`,
        402
      )
    }

    // ── 4. Kiểm tra PostAnalysis cache ────────────────────────────
    // AI đã chạy từ user khác → dùng cache, chỉ trừ xu + tạo UserUnlock
    let analysis = await PostAnalysis.findOne({ postId })
    let fromAiCache = false

    if (!analysis) {
      // ── 5. Gọi Gemini Vision API ──────────────────────────────────
      let aiResult
      try {
        aiResult = await analyzeLensSpy(imageUrl, post.exifData || {})
      } catch (aiErr) {
        console.error('LensSpy AI error:', aiErr.message)
        throw new AppError('AI_ERROR', 'Không thể phân tích ảnh lúc này. Vui lòng thử lại sau.', 503)
      }

      const modelUsed = aiResult._modelUsed || 'gemini-2.5-flash'
      delete aiResult._modelUsed

      analysis = await PostAnalysis.create({
        postId,
        unlockedBy: userId,
        coinsCost: LENSSPY_COST,
        aiModel: modelUsed,
        ...aiResult,
      })
    } else {
      fromAiCache = true
    }

    // ── 6. Trừ xu (atomic) + Tạo UserUnlock ──────────────────────
    const [updatedUser] = await Promise.all([
      User.findOneAndUpdate(
        { _id: userId, tokenBalance: { $gte: LENSSPY_COST } },
        { $inc: { tokenBalance: -LENSSPY_COST } },
        { returnDocument: 'after', select: 'tokenBalance' }
      ),
      UserUnlock.create({ userId, postId, tokensPaid: LENSSPY_COST }),
    ])

    if (!updatedUser) {
      throw new AppError('INSUFFICIENT_TOKENS', 'Token không đủ hoặc đã thay đổi. Vui lòng thử lại.', 402)
    }

    return res.json({
      success: true,
      alreadyUnlocked: false,
      fromAiCache,
      tokensCost: LENSSPY_COST,
      remainingTokens: updatedUser.tokenBalance,
      analysis,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /v1/ai/lensspy/:postId
 * Kiểm tra trạng thái mở khoá của USER HIỆN TẠI cho post này.
 * - Nếu đã mở khoá → trả về analysis
 * - Nếu chưa → { hasUnlocked: false }
 * - Nếu không đăng nhập → { hasUnlocked: false }
 */
export const checkLensSpy = async (req, res, next) => {
  try {
    const { postId } = req.params
    const userId = req.user?._id // optionalAuth → có thể undefined

    if (!userId) {
      return res.json({ hasUnlocked: false, analysis: null })
    }

    const unlock = await UserUnlock.findOne({ userId, postId })
    if (!unlock) {
      return res.json({ hasUnlocked: false, analysis: null })
    }

    // User đã mở khoá → trả về kết quả
    const analysis = await PostAnalysis.findOne({ postId }).select('-__v')
    res.json({ hasUnlocked: true, analysis })
  } catch (err) {
    next(err)
  }
}
