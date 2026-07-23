import RemixSession from '../models/RemixSession.model.js'
import Post, { AI_TOOLS } from '../models/Post.model.js'
import User from '../models/User.model.js'
import VndTransaction from '../models/VndTransaction.model.js'
import AppError from '../utils/AppError.js'
import WalletService from '../services/WalletService.js'
import { verifyRemix, verifyRemixPrompt } from '../services/ai.service.js'
import TokenTransaction from '../models/TokenTransaction.model.js'
import { uploadBuffer, fetchImageBuffer } from '../config/cloudinary.js'
import { v2 as cloudinary } from 'cloudinary'

// Helper to extract Cloudinary publicId and delete the asset
const deleteCloudinaryUrl = async (url) => {
  if (!url) return
  try {
    const parts = url.split('/upload/')
    if (parts.length < 2) return
    const path = parts[1]
    const pathParts = path.split('/')
    if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
      pathParts.shift()
    }
    const publicIdWithExt = pathParts.join('/')
    const lastDotIdx = publicIdWithExt.lastIndexOf('.')
    const publicId = lastDotIdx === -1 ? publicIdWithExt : publicIdWithExt.substring(0, lastDotIdx)
    
    console.log(`☁️ Cloudinary cleanup: destroying ${publicId}`)
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    console.error('Failed to destroy Cloudinary image:', url, err.message)
  }
}

/**
 * POST /v1/remix/purchase
 * Mua tác phẩm để remix (được giảm giá)
 */
export const purchasePost = async (req, res, next) => {
  try {
    let { postId } = req.body
    const userId = req.user._id

    const post = await Post.findById(postId)
    if (post && post.isRemix && post.originalPostId) {
      postId = post.originalPostId.toString()
    }

    const ip = req.ip
    const userAgent = req.headers['user-agent']
    const idempotencyKey = `remix_purchase_${userId}_${postId}`

    const result = await WalletService.purchasePostForRemix({
      buyerId: userId,
      postId,
      idempotencyKey,
      ip,
      userAgent
    })

    return res.json({
      success: true,
      alreadyPurchased: !!result.alreadyPurchased,
      message: result.alreadyPurchased ? 'Bạn đã sở hữu bài viết này' : 'Mua bài viết để Remix thành công!'
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/remix/sessions
 * Tạo một Official Remix Session mới
 */
export const createSession = async (req, res, next) => {
  try {
    let { postId } = req.body
    const userId = req.user._id
    const userTier = req.user.subscriptionTier || 'free'

    // Gatecheck: chỉ cho phép PRO / ULTIMATE / FOUNDER (TIER_RANK >= 2)
    const allowedTiers = ['pro', 'ultimate', 'founder']
    if (!allowedTiers.includes(userTier)) {
      throw new AppError('FORBIDDEN', 'Remix chỉ dành cho các gói PRO / ULTIMATE / FOUNDER 🔒', 403)
    }

    let post = await Post.findById(postId)
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại hoặc chưa được duyệt', 404)
    }

    // Nếu đây là bài viết Remix, tự động chuyển về bài gốc ban đầu
    if (post.isRemix && post.originalPostId) {
      const origPost = await Post.findById(post.originalPostId)
      if (origPost && origPost.status === 'approved') {
        post = origPost
      }
    }

    // Chặn tác giả gốc tự remix bài của chính mình
    if (post.authorId.toString() === userId.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không thể remix bài viết của chính mình. Remix chỉ dành cho các creator khác!', 403)
    }

    if (!post.allowRemix) {
      throw new AppError('BAD_REQUEST', 'Tác giả bài đăng này không bật quyền cho phép Remix', 400)
    }

    // Kiểm tra xem user B đã remix post này chưa (B chỉ được remix 1 lần của A để tránh spam)
    const existingRemixPost = await Post.findOne({
      authorId: userId,
      parentPostId: postId,
      isRemix: true
    })
    if (existingRemixPost) {
      throw new AppError('BAD_REQUEST', 'Bạn đã remix tác phẩm này rồi. Mỗi người chỉ được remix 1 lần để tránh spam!', 400)
    }

    // Nếu post là Premium, kiểm tra xem user B đã mua post A chưa
    if (post.isPremium && post.authorId.toString() !== userId.toString()) {
      const purchases = await VndTransaction.find({
        userId,
        type: 'purchase_post',
        relatedPostId: postId
      })
      const refunds = await VndTransaction.find({
        userId,
        type: 'refund',
        relatedPostId: postId
      })

      const hasPurchased = purchases.length > refunds.length
      if (!hasPurchased) {
        // Trả về Payment Required với thông tin chiết khấu
        const discountPercent = post.remixDiscountPercent !== undefined ? post.remixDiscountPercent : 10
        const basePrice = post.priceInVnd || 20000
        const discountedPrice = Math.round((basePrice * (1 - discountPercent / 100)) / 1000) * 1000
        return res.status(402).json({
          error: 'PAYMENT_REQUIRED',
          message: 'Bạn phải mua tác phẩm gốc để bắt đầu Remix',
          priceInVnd: post.priceInVnd,
          discountedPrice,
          discountPercent
        })
      }
    }

    // Xóa tất cả các phiên active cũ của user này để tránh rác DB & Cloudinary
    try {
      const oldActiveSessions = await RemixSession.find({ userId, status: 'active' })
      for (const oldSess of oldActiveSessions) {
        // 1. Xóa toàn bộ các ảnh sinh ra trong lịch sử
        if (oldSess.generatedHistory && oldSess.generatedHistory.length > 0) {
          for (const ver of oldSess.generatedHistory) {
            if (ver.url) await deleteCloudinaryUrl(ver.url)
          }
        }
        // 2. Xóa ảnh chính của session (nếu chưa nằm trong list lịch sử)
        if (oldSess.remixImageUrl) {
          await deleteCloudinaryUrl(oldSess.remixImageUrl)
        }
        // 3. Xóa ảnh source tham khảo được tải lên riêng (nếu có)
        if (oldSess.remixSourceImageUrl) {
          await deleteCloudinaryUrl(oldSess.remixSourceImageUrl)
        }
      }
      await RemixSession.deleteMany({ userId, status: 'active' })
    } catch (cleanupErr) {
      console.error('Failed to cleanup old active Remix sessions & Cloudinary assets:', cleanupErr)
    }

    // Tạo session mới
    const session = await RemixSession.create({
      userId,
      originalPostId: postId,
      remixPrompt: post.prompt,
      status: 'active'
    })

    return res.status(201).json({
      success: true,
      sessionId: session._id,
      originalPost: post,
      generatedImages: post.generatedImages || [],
      sourceImages: post.sourceImages || []
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /v1/remix/sessions/:id
 * Lấy thông tin session hiện tại
 */
export const getSession = async (req, res, next) => {
  try {
    const session = await RemixSession.findById(req.params.id).populate({
      path: 'originalPostId',
      populate: { path: 'authorId', select: 'username displayName avatar' }
    })

    if (!session) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phiên Remix', 404)
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền truy cập phiên Remix này', 403)
    }

    const orig = session.originalPostId
    console.log(`[getSession] sessionId=${session._id}`)
    console.log(`[getSession] originalPost._id=${orig?._id}`)
    console.log(`[getSession] generatedImages.length=${orig?.generatedImages?.length ?? 'N/A'}`)
    console.log(`[getSession] isMultiModel=${orig?.isMultiModel}, modelComparisons.length=${orig?.modelComparisons?.length ?? 0}`)
    console.log(`[getSession] sourceImages.length=${orig?.sourceImages?.length ?? 'N/A'}`)
    // Log each modelComparison's images for clarity
    if (orig?.modelComparisons?.length) {
      orig.modelComparisons.forEach((mc, i) => {
        console.log(`[getSession]   modelComparisons[${i}] aiModel=${mc.aiModel}, images=${mc.generatedImages?.length ?? 0}`)
      })
    }

    return res.json({
      success: true,
      session
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/remix/sessions/:id/generate
 * Thực hiện generate ảnh từ prompt mới, upload lên Cloudinary và chạy AI check
 */
export const generateImage = async (req, res, next) => {
  try {
    const { prompt } = req.body
    const userId = req.user._id

    console.log(`[generateImage] Content-Type: ${req.headers['content-type']}`)
    console.log(`[generateImage] req.body:`, req.body)
    console.log(`[generateImage] req.files:`, req.files ? Object.keys(req.files) : 'none')
    console.log(`[generateImage] prompt=${prompt?.slice(0, 60)}, sourceImageUrl=${req.body.sourceImageUrl?.slice(0, 80)}`)

    if (!prompt || prompt.trim().length < 2) {
      throw new AppError('BAD_REQUEST', 'Prompt là bắt buộc và phải dài ít nhất 2 ký tự', 400)
    }

    const session = await RemixSession.findById(req.params.id)
    if (!session) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phiên Remix', 404)
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền chỉnh sửa phiên Remix này', 403)
    }

    if (session.status !== 'active') {
      throw new AppError('BAD_REQUEST', 'Phiên Remix này đã kết thúc hoặc không khả dụng', 400)
    }

    // 1. Trừ phí 10 token mỗi lượt sinh ảnh Remix
    const tokensCost = 10
    const user = await User.findById(userId).select('tokenBalance subscriptionTier')
    if (!user || user.tokenBalance < tokensCost) {
      throw new AppError('INSUFFICIENT_TOKENS', `Bạn cần ít nhất ${tokensCost} AI Credit để sinh ảnh Remix.`, 402)
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tokenBalance: { $gte: tokensCost } },
      { $inc: { tokenBalance: -tokensCost } },
      { returnDocument: 'after', select: 'tokenBalance' }
    )
    if (!updatedUser) {
      throw new AppError('INSUFFICIENT_TOKENS', 'Số dư AI Credit không đủ hoặc đã thay đổi. Vui lòng thử lại.', 402)
    }

    // Log giao dịch token
    await TokenTransaction.create({
      userId,
      amount: -tokensCost,
      balanceBefore: user.tokenBalance,
      balanceAfter: updatedUser.tokenBalance,
      description: `Tạo ảnh Remix (Prompt: ${prompt.slice(0, 50)}...)`
    }).catch(err => console.error('Failed to log TokenTransaction for Remix:', err))

    // 2. Kiểm tra nếu creator tải lên ảnh gốc/tham khảo mới để remix
    let remixSourceImageUrl = undefined
    if (req.files && req.files.sourceImage && req.files.sourceImage[0]) {
      console.log('☁️ Remix generate: uploading custom source/reference image to Cloudinary...')
      const file = req.files.sourceImage[0]
      const uploadSourceRes = await uploadBuffer(
        file.buffer,
        'picspy/posts/originals',
        `source_${userId}_${Date.now()}`
      )
      remixSourceImageUrl = uploadSourceRes.secure_url
      session.remixSourceImageUrl = remixSourceImageUrl
    } else if (req.body.sourceImageUrl) {
      // Creator chọn ảnh tham khảo từ URL sẵn có (kết quả bài gốc hoặc lịch sử)
      remixSourceImageUrl = req.body.sourceImageUrl
      session.remixSourceImageUrl = remixSourceImageUrl
    }

    // 3. Tải ảnh từ Pollinations.ai về dạng buffer (thử tối đa 3 lần với kích thước giảm dần nếu lỗi)
    let buffer
    let fetchErr = null
    const attempts = [
      { width: 1024, height: 1024 },
      { width: 1024, height: 1024 },
      { width: 768, height: 768 },
      { width: 512, height: 512 }
    ]

    for (let i = 0; i < attempts.length; i++) {
      const { width, height } = attempts[i]
      const seed = Math.floor(Math.random() * 10000000)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=${width}&height=${height}&nologo=true&seed=${seed}`
      
      try {
        if (i > 0) {
          const delay = i * 2500 // Lần 2 đợi 2.5s, lần 3 đợi 5s, lần 4 đợi 7.5s
          console.log(`⏳ [generateImage] Attempt ${i + 1}/${attempts.length} - Waiting ${delay}ms before calling Pollinations to avoid rate limits...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        console.log(`🤖 [generateImage] Attempt ${i + 1}/${attempts.length} (${width}x${height}) calling Pollinations: ${pollinationsUrl}`)
        buffer = await fetchImageBuffer(pollinationsUrl, 25000) // 25s timeout per attempt
        
        if (buffer && buffer.length > 0) {
          console.log(`✅ [generateImage] Successfully fetched image buffer (${buffer.length} bytes) on attempt ${i + 1}`)
          fetchErr = null
          break
        }
      } catch (err) {
        fetchErr = err
        console.error(`⚠️ [generateImage] Attempt ${i + 1}/${attempts.length} failed:`, err.message)
      }
    }

    if (fetchErr || !buffer) {
      console.error('💥 [generateImage] All attempts to generate image failed:', fetchErr?.message)
      throw new AppError('AI_ERROR', `Không thể sinh ảnh tự động bằng AI. Chi tiết: ${fetchErr?.message || 'Không có buffer'}`, 502)
    }

    // 4. Upload buffer lên Cloudinary
    console.log(`☁️ Remix generate: uploading generated image to Cloudinary...`)
    const uploadRes = await uploadBuffer(
      buffer,
      'picspy/posts/remixes',
      `remix_${userId}_${Date.now()}`
    )

    // 3. Thực hiện AI Check (3 tầng)
    // Lấy thông tin bài gốc
    const originalPost = await Post.findById(session.originalPostId)
    if (!originalPost) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy tác phẩm gốc để đối chiếu', 404)
    }

    console.log(`🤖 Remix generate: starting 3-tier AI Check...`)
    let aiCheck
    try {
      aiCheck = await verifyRemix(
        originalPost.prompt,
        prompt,
        originalPost.generatedImages?.[0]?.url || remixSourceImageUrl || '',
        uploadRes.secure_url
      )
    } catch (aiErr) {
      console.error('verifyRemix error:', aiErr)
      // Mặc định cho phép cảnh báo thay vì lỗi block
      aiCheck = {
        semanticScore: 50,
        imageScore: 50,
        changedCategories: {
          subject: true,
          outfit: true,
          background: true,
          lighting: true,
          style: true,
          camera: true
        },
        decision: 'warning',
        message: 'Không thể kết nối AI Check. Nhận diện tạm thời: Cảnh báo hãy chỉnh sửa thêm.'
      }
    }

    // 4. Lưu kết quả vào session
    session.remixPrompt = prompt
    session.remixImageUrl = uploadRes.secure_url
    session.aiCheckResult = aiCheck
    
    if (!session.generatedHistory) {
      session.generatedHistory = []
    }
    session.generatedHistory.push({
      url: uploadRes.secure_url,
      prompt,
      aiCheckResult: aiCheck
    })
    
    await session.save()

    return res.json({
      success: true,
      imageUrl: uploadRes.secure_url,
      aiCheckResult: aiCheck,
      tokenBalance: updatedUser.tokenBalance
    })
  } catch (err) {
    console.error('💥 [generateImage] Error details:', err)
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.code || 'GENERATION_FAILED',
      message: err.message || 'Không thể sinh ảnh tự động bằng AI. Vui lòng thử lại.',
      details: err.stack || err.message
    })
  }
}

/**
 * POST /v1/remix/sessions/:id/publish
 * Đăng bài viết Remix chính thức
 */
export const publishRemix = async (req, res, next) => {
  try {
    const { caption, tags, category, isPremium, priceInVnd } = req.body
    const userId = req.user._id

    const session = await RemixSession.findById(req.params.id)
    if (!session) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phiên Remix', 404)
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền sở hữu phiên Remix này', 403)
    }

    if (session.status !== 'active') {
      throw new AppError('BAD_REQUEST', 'Phiên Remix này đã kết thúc', 400)
    }

    const originalPost = await Post.findById(session.originalPostId)
    if (!originalPost) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy bài gốc', 404)
    }

    const { generatedImages } = req.body

    // Cho phép publish nếu có ảnh từ session (sinh AI) HOẶC có ảnh gửi kèm từ body (user tự tải lên)
    const hasImage = session.remixImageUrl || (generatedImages && Array.isArray(generatedImages) && generatedImages.length > 0)

    if (!hasImage) {
      throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp ít nhất một ảnh kết quả (sinh bằng AI hoặc tự tải lên) trước khi publish', 400)
    }

    // Nếu chưa có aiCheckResult (ví dụ: user bypass check hoặc dùng ảnh tự tải lên)
    // thì tự động chạy prompt check trên backend để đảm bảo an toàn.
    if (!session.aiCheckResult) {
      const activePrompt = session.remixPrompt || req.body.prompt || caption
      const aiCheck = await verifyRemixPrompt(originalPost.prompt, activePrompt)
      session.aiCheckResult = aiCheck
      await session.save()
    }

    // Chặn publish nếu bị REJECT
    if (session.aiCheckResult.decision === 'reject') {
      throw new AppError('FORBIDDEN', `Không thể đăng tải bài viết này: ${session.aiCheckResult.message}`, 403)
    }

    // Validate sàn giá (price floor) để chống phá giá bài gốc
    const price = priceInVnd ? parseInt(priceInVnd) : 20000
    if (isPremium) {
      const discountPercent = originalPost.remixDiscountPercent !== undefined ? originalPost.remixDiscountPercent : 10
      const minAllowedPrice = Math.round((originalPost.priceInVnd * (1 - discountPercent / 100)) / 1000) * 1000
      if (price < minAllowedPrice) {
        throw new AppError('BAD_REQUEST', `Giá bán của bài viết Remix tối thiểu phải là ${minAllowedPrice.toLocaleString('vi-VN')} VNĐ (để tránh phá giá bài viết gốc của tác giả)`, 400)
      }
    }

    // Xác định ảnh nguồn/tham khảo: nếu creator tải lên mới thì dùng mới, ngược lại dùng của bài gốc
    const finalSourceImages = session.remixSourceImageUrl
      ? [{
          url: session.remixSourceImageUrl,
          thumbnailUrl: session.remixSourceImageUrl,
          previewUrl: session.remixSourceImageUrl,
          width: 1024,
          height: 1024
        }]
      : (originalPost.sourceImages || [])

    // Xác định ảnh kết quả: cho phép gửi mảng nhiều ảnh kết quả, fallback về ảnh của session
    let finalGeneratedImages = [{
      url: session.remixImageUrl,
      thumbnailUrl: session.remixImageUrl,
      previewUrl: session.remixImageUrl,
      width: 1024,
      height: 1024
    }]

    if (generatedImages && Array.isArray(generatedImages) && generatedImages.length > 0) {
      finalGeneratedImages = generatedImages.map(img => ({
        url: typeof img === 'string' ? img : (img.url || img.previewUrl || img.preview),
        thumbnailUrl: typeof img === 'string' ? img : (img.url || img.previewUrl || img.preview),
        previewUrl: typeof img === 'string' ? img : (img.url || img.previewUrl || img.preview),
        width: 1024,
        height: 1024
      }))
    }

    // Tạo bài viết Remix mới
    const parsedTags = Array.isArray(tags) ? tags : typeof tags === 'string' ? JSON.parse(tags) : []
    let finalAiTool = req.body.aiTool || originalPost.aiTool || 'picspy'
    if (!AI_TOOLS.includes(finalAiTool)) {
      finalAiTool = 'picspy'
    }

    const newPost = await Post.create({
      authorId: userId,
      postType: 'ai',
      prompt: session.remixPrompt,
      sourceImages: finalSourceImages,
      generatedImages: finalGeneratedImages,
      caption,
      tags: parsedTags,
      category: category || 'other',
      isPremium: !!isPremium,
      priceInVnd: price,
      status: 'approved', // Tự động duyệt bài Remix vì đã có AI Check thông qua
      isRemix: true,
      parentPostId: originalPost._id,
      originalPostId: originalPost.originalPostId || originalPost._id,
      aiTool: finalAiTool
    })

    // Đóng session
    session.status = 'published'
    await session.save()

    // Dọn dẹp tài nguyên thừa trên Cloudinary (các phiên bản ảnh nháp không được chọn đăng)
    try {
      const publishedUrls = new Set(finalGeneratedImages.map(img => img.url))
      
      if (session.generatedHistory && session.generatedHistory.length > 0) {
        for (const ver of session.generatedHistory) {
          if (ver.url && !publishedUrls.has(ver.url)) {
            await deleteCloudinaryUrl(ver.url)
          }
        }
      }
      
      if (session.remixImageUrl && !publishedUrls.has(session.remixImageUrl)) {
        await deleteCloudinaryUrl(session.remixImageUrl)
      }
      
      const publishedSourceUrls = new Set(finalSourceImages.map(img => img.url))
      if (session.remixSourceImageUrl && !publishedSourceUrls.has(session.remixSourceImageUrl)) {
        await deleteCloudinaryUrl(session.remixSourceImageUrl)
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup orphan Cloudinary assets during publish:', cleanupErr)
    }

    return res.status(201).json({
      success: true,
      post: newPost
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/remix/sessions/:id/check-prompt
 * Thực hiện kiểm duyệt prompt (phân tích 2 tầng, không tốn xu, không sinh ảnh)
 */
export const checkPromptOnly = async (req, res, next) => {
  try {
    const { prompt } = req.body
    const userId = req.user._id

    if (!prompt || prompt.trim().length < 2) {
      throw new AppError('BAD_REQUEST', 'Prompt là bắt buộc và phải dài ít nhất 2 ký tự', 400)
    }

    const session = await RemixSession.findById(req.params.id)
    if (!session) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phiên Remix', 404)
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền chỉnh sửa phiên Remix này', 403)
    }

    const originalPost = await Post.findById(session.originalPostId)
    if (!originalPost) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy tác phẩm gốc để đối chiếu', 404)
    }

    console.log(`🤖 Remix checkPromptOnly: starting prompt check...`)
    const aiCheck = await verifyRemixPrompt(originalPost.prompt, prompt)

    // Lưu prompt và kết quả kiểm duyệt vào session để hỗ trợ publish khi dùng ảnh tự upload
    session.remixPrompt = prompt
    session.aiCheckResult = aiCheck
    await session.save()

    return res.json({
      success: true,
      aiCheckResult: aiCheck
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /v1/remix/upload-image
 * Upload trực tiếp 1 file ảnh (từ thiết bị) lên Cloudinary để làm ảnh tham khảo hoặc thêm vào kết quả
 */
export const uploadRemixImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('BAD_REQUEST', 'Vui lòng cung cấp file ảnh để upload', 400)
    }
    console.log('☁️ Remix: uploading custom image to Cloudinary...')
    const result = await uploadBuffer(
      req.file.buffer,
      'picspy/posts/remixes',
      `upload_${req.user._id}_${Date.now()}`
    )
    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    })
  } catch (err) {
    next(err)
  }
}

