import AppError from '../utils/AppError.js'
import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import PostAnalysis from '../models/PostAnalysis.model.js'
import UserUnlock from '../models/UserUnlock.model.js'
import TokenTransaction from '../models/TokenTransaction.model.js'
import { analyzeLensSpy, extractPromptArguments, generateMetaSuggestions } from '../services/ai.service.js'

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

    const isUltimate = req.user.subscriptionTier === 'ultimate'
    const tokensCost = isUltimate ? 0 : LENSSPY_COST

    // ── 3. Kiểm tra số dư xu ──────────────────────────────────────
    const user = await User.findById(userId).select('tokenBalance')
    if (!isUltimate && (!user || user.tokenBalance < tokensCost)) {
      throw new AppError(
        'INSUFFICIENT_TOKENS',
        `Bạn cần ít nhất ${tokensCost} token để mở khoá LensSpy AI`,
        402
      )
    }

    // ── 4. Kiểm tra PostAnalysis cache ────────────────────────────
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
        coinsCost: tokensCost,
        aiModel: modelUsed,
        ...aiResult,
      })
    } else {
      fromAiCache = true
    }

    // ── 6. Trừ xu + Tạo UserUnlock + Ghi nhận Transaction ─────────
    let remainingTokens = user?.tokenBalance || 0
    if (isUltimate) {
      await UserUnlock.create({ userId, postId, tokensPaid: 0 })
    } else {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, tokenBalance: { $gte: tokensCost } },
        { $inc: { tokenBalance: -tokensCost } },
        { returnDocument: 'after', select: 'tokenBalance' }
      )

      if (!updatedUser) {
        throw new AppError('INSUFFICIENT_TOKENS', 'Token không đủ hoặc đã thay đổi. Vui lòng thử lại.', 402)
      }
      remainingTokens = updatedUser.tokenBalance

      // Ghi nhận lịch sử giao dịch xu
      await TokenTransaction.create({
        userId,
        type: 'spend_lensspy',
        amount: -tokensCost,
        balanceBefore: user.tokenBalance,
        balanceAfter: remainingTokens,
        description: `Mở khoá LensSpy AI cho bài đăng #${postId.toString().slice(-6)}`,
        relatedPostId: postId
      }).catch(err => console.error('Failed to log TokenTransaction for LensSpy:', err))
    }

    return res.json({
      success: true,
      alreadyUnlocked: false,
      fromAiCache,
      tokensCost,
      remainingTokens,
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

export const extractArguments = async (req, res, next) => {
  try {
    const { prompt } = req.body
    if (!prompt || prompt.trim().length === 0) {
      throw new AppError('BAD_REQUEST', 'Vui lòng nhập prompt cần phân tích', 400)
    }

    const userId = req.user._id
    const EXTRACT_COST = 2 // 2 tokens for dynamic keyword scan

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[EXTRACT-KEYWORDS] ► Request received`)
    console.log(`[EXTRACT-KEYWORDS]   userId: ${userId}`)
    console.log(`[EXTRACT-KEYWORDS]   promptLength: ${prompt.trim().length} chars`)

    // ── 1. Kiểm tra số dư xu ──────────────────────────────────────
    const user = await User.findById(userId).select('tokenBalance subscriptionTier username')
    console.log(`[EXTRACT-KEYWORDS]   username: ${user?.username}`)
    console.log(`[EXTRACT-KEYWORDS]   tier: ${user?.subscriptionTier}`)
    console.log(`[EXTRACT-KEYWORDS]   DB tokenBalance BEFORE: ${user?.tokenBalance}`)
    console.log(`[EXTRACT-KEYWORDS]   costToDeduct: ${EXTRACT_COST}`)

    if (!user || user.tokenBalance < EXTRACT_COST) {
      throw new AppError(
        'INSUFFICIENT_TOKENS',
        `Bạn cần ít nhất ${EXTRACT_COST} token để tự động tìm từ khóa động`,
        402
      )
    }

    // ── 2. Gọi Gemini API để trích xuất ──────────────────────────
    const aiResult = await extractPromptArguments(prompt)

    // ── 3. Trừ xu + Ghi nhận Transaction ─────────────────────────
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tokenBalance: { $gte: EXTRACT_COST } },
      { $inc: { tokenBalance: -EXTRACT_COST } },
      { returnDocument: 'after', select: 'tokenBalance' }
    )

    if (!updatedUser) {
      throw new AppError('INSUFFICIENT_TOKENS', 'Token không đủ hoặc đã thay đổi. Vui lòng thử lại.', 402)
    }
    const remainingTokens = updatedUser.tokenBalance
    console.log(`[EXTRACT-KEYWORDS]   DB tokenBalance AFTER: ${remainingTokens}`)
    console.log(`[EXTRACT-KEYWORDS]   Deducted: -${EXTRACT_COST} ✓`)
    console.log(`${'='.repeat(60)}\n`)

    // Ghi nhận lịch sử giao dịch xu
    await TokenTransaction.create({
      userId,
      type: 'spend_lensspy', // Dùng chung phân loại của LensSpy như yêu cầu
      amount: -EXTRACT_COST,
      balanceBefore: user.tokenBalance,
      balanceAfter: remainingTokens,
      description: 'Tự động tìm từ khóa động cho prompt',
    }).catch(err => console.error('Failed to log TokenTransaction for dynamic prompt scan:', err))

    return res.json({
      success: true,
      formatted_prompt: aiResult.formatted_prompt,
      variables: aiResult.variables,
      tokensCost: EXTRACT_COST,
      remainingTokens,
    })
  } catch (err) {
    next(err)
  }
}
export const suggestMeta = async (req, res, next) => {
  try {
    const { imageBase64, style } = req.body
    if (!imageBase64 || imageBase64.trim().length === 0) {
      throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp hình ảnh để phân tích', 400)
    }

    let base64Data = imageBase64
    let mimeType = 'image/jpeg'
    if (imageBase64.startsWith('data:')) {
      const parts = imageBase64.split(';base64,')
      mimeType = parts[0].split(':')[1]
      base64Data = parts[1]
    }

    const chosenStyle = style || 'gioi_tre_y2k'
    const userId = req.user._id
    const META_COST = 2

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[SUGGEST-META] ► Request received`)
    console.log(`[SUGGEST-META]   userId: ${userId}`)
    console.log(`[SUGGEST-META]   style: ${chosenStyle}`)

    // 1. Kiểm tra số dư xu
    const user = await User.findById(userId).select('tokenBalance subscriptionTier username')
    console.log(`[SUGGEST-META]   username: ${user?.username}`)
    console.log(`[SUGGEST-META]   tier: ${user?.subscriptionTier}`)
    console.log(`[SUGGEST-META]   DB tokenBalance BEFORE: ${user?.tokenBalance}`)
    console.log(`[SUGGEST-META]   costToDeduct: ${META_COST}`)

    if (!user || user.tokenBalance < META_COST) {
      throw new AppError(
        'INSUFFICIENT_TOKENS',
        `Bạn cần ít nhất ${META_COST} token để tự động gợi ý mô tả và tags`,
        402
      )
    }

    // 2. Gọi Gemini Vision AI
    let aiSuggestions
    try {
      aiSuggestions = await generateMetaSuggestions(base64Data, chosenStyle, mimeType)
    } catch (aiErr) {
      console.error('generateMetaSuggestions error:', aiErr)
      throw new AppError('AI_ERROR', 'Không thể gợi ý mô tả và tags lúc này. Vui lòng thử lại sau.', 503)
    }

    // 3. Trừ xu + Ghi nhận Transaction
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tokenBalance: { $gte: META_COST } },
      { $inc: { tokenBalance: -META_COST } },
      { returnDocument: 'after', select: 'tokenBalance' }
    )

    if (!updatedUser) {
      throw new AppError('INSUFFICIENT_TOKENS', 'Token không đủ hoặc đã thay đổi. Vui lòng thử lại.', 402)
    }
    const remainingTokens = updatedUser.tokenBalance
    console.log(`[SUGGEST-META]   DB tokenBalance AFTER: ${remainingTokens}`)
    console.log(`[SUGGEST-META]   Deducted: -${META_COST} ✓`)
    console.log(`${'='.repeat(60)}\n`)


    // Ghi nhận lịch sử giao dịch xu
    await TokenTransaction.create({
      userId,
      type: 'spend_lensspy',
      amount: -META_COST,
      balanceBefore: user.tokenBalance,
      balanceAfter: remainingTokens,
      description: `Tự động gợi ý mô tả và tags (Style: ${chosenStyle}) bằng AI`,
    }).catch(err => console.error('Failed to log TokenTransaction for suggestMeta:', err))

    const suggestedCategories = Array.isArray(aiSuggestions.categories)
      ? aiSuggestions.categories.slice(0, 3)
      : [aiSuggestions.category || 'Khác']

    return res.json({
      success: true,
      caption: aiSuggestions.caption,
      tags: aiSuggestions.tags,
      categories: suggestedCategories,
      category: suggestedCategories[0] || 'Khác',
      tokensCost: META_COST,
      remainingTokens,
    })
  } catch (err) {
    next(err)
  }
}
