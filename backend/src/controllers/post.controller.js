import { z } from 'zod'
import exifr from 'exifr'
import Post, { AI_TOOLS } from '../models/Post.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'
import { imageQueue } from '../config/bullmq.js'
import { v2 as cloudinary } from 'cloudinary'

// === ZOD SCHEMAS ===

const createPostSchema = z.object({
  // Phân loại bài viết
  postType: z.enum(['ai', 'digital', 'digital-raw', 'digital-normal']).default('ai'),
  // AI generation (core) - optional ở Zod, validate thủ công sau dựa trên postType
  prompt: z.string().max(2000).trim().optional(),
  negativePrompt: z.string().max(1000).trim().optional(),
  aiTool: z.enum(AI_TOOLS).optional(),
  aiModel: z.string().trim().optional(),
  parameters: z.string().trim().optional(),
  // workflowJson: được gửi từ client nhưng được kiểm tra tier ở middleware
  workflowJson: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'workflowJson phải là JSON hợp lệ' }
    ),
  contentType: z.enum(['image', 'video']).default('image'),

  // Content metadata
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
  category: z.string().min(1).toLowerCase().trim().default('other'),

  // Monetization
  isPremium: z.boolean().optional().default(false),
  priceInTokens: z.number().min(1).max(500).optional().default(10),

  // Compat (legacy)
  resolution: z.enum(['sd', 'hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  aspectRatio: z.string().optional(),
})

const updatePostSchema = z.object({
  postType: z.enum(['ai', 'digital', 'digital-raw', 'digital-normal']).optional(),
  prompt: z.string().min(1).max(2000).trim().optional(),
  negativePrompt: z.string().max(1000).trim().optional(),
  aiTool: z.enum(AI_TOOLS).optional(),
  aiModel: z.string().trim().optional(),
  parameters: z.string().trim().optional(),
  workflowJson: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'workflowJson phải là JSON hợp lệ' }
    ),
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional(),
  category: z.string().min(1).toLowerCase().trim().optional(),
  isPremium: z.boolean().optional(),
  priceInTokens: z.number().min(1).max(500).optional(),
  resolution: z.enum(['sd', 'hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  aspectRatio: z.string().optional(),
})

// === HELPERS ===

const cleanCameraName = (make, model) => {
  if (!make && !model) return undefined
  const mk = (make || '').trim()
  const md = (model || '').trim()
  if (!mk) return md
  if (!md) return mk
  if (md.toLowerCase().startsWith(mk.toLowerCase())) {
    return md
  }
  return `${mk} ${md}`
}

const cleanLensModel = (lens, cameraName) => {
  if (!lens) return undefined
  let cleaned = lens.trim()
  
  if (cameraName) {
    const escaped = cameraName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '')
    
    const parts = cameraName.split(/\s+/).filter(p => p.length >= 2)
    parts.forEach(part => {
      const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), '')
      if (part.length > 3) {
        cleaned = cleaned.replace(new RegExp(escapedPart, 'gi'), '')
      }
    })
  }

  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '')
  cleaned = cleaned.trim()

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  return cleaned || undefined
}

/** Parse EXIF metadata from an image buffer */
const extractExif = async (buffer) => {
  try {
    const rawExif = await exifr.parse(buffer, {
      pick: [
        'Make',
        'Model',
        'ISO',
        'FNumber',
        'FocalLength',
        'ExposureTime',
        'DateTimeOriginal',
        'LensModel',
        'Software',
        'GPSLatitude',
        'GPSLongitude',
        'ExposureValue',
        'Flash',
        'WhiteBalance',
      ]
    })
    if (!rawExif) return {}

    const cameraName = cleanCameraName(rawExif.Make, rawExif.Model)
    const cleanedLens = cleanLensModel(rawExif.LensModel, cameraName)
    
    const rawAperture = rawExif.FNumber 
      ? Math.round(rawExif.FNumber * 100) / 100 
      : undefined
    const rawFocalLength = rawExif.FocalLength 
      ? Math.round(rawExif.FocalLength * 100) / 100 
      : undefined

    const exifData = {
      camera: cameraName || undefined,
      lensModel: cleanedLens || undefined,
      iso: rawExif.ISO || undefined,
      aperture: rawAperture ? `f/${rawAperture}` : undefined,
      focalLength: rawFocalLength ? `${rawFocalLength}mm` : undefined,
      shutterSpeed: rawExif.ExposureTime
        ? rawExif.ExposureTime >= 1
          ? `${rawExif.ExposureTime}s`
          : `1/${Math.round(1 / rawExif.ExposureTime)}s`
        : undefined,
      ev:
        rawExif.ExposureValue !== undefined
          ? Math.round(rawExif.ExposureValue * 10) / 10
          : undefined,
      flash: rawExif.Flash !== undefined ? rawExif.Flash : undefined,
      dateTaken: rawExif.DateTimeOriginal || undefined,
      software: rawExif.Software || undefined,
      whiteBalance: rawExif.WhiteBalance || undefined,
      gpsLat: rawExif.GPSLatitude || undefined,
      gpsLng: rawExif.GPSLongitude || undefined,
    }
    // Remove undefined keys
    Object.keys(exifData).forEach(
      (k) => exifData[k] === undefined && delete exifData[k]
    )
    return exifData
  } catch (err) {
    console.warn('⚠️ EXIF extraction:', err.message)
    return {}
  }
}

/** Upload single buffer to Cloudinary and return image object */
const uploadImage = async (buffer, folder, publicIdPrefix, fileSize) => {
  const result = await uploadBuffer(
    buffer,
    folder,
    `${publicIdPrefix}_${Date.now()}`,
    { resource_type: 'image' }
  )
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    fileSize: fileSize || result.bytes,
    format: result.format,
  }
}

// === CONTROLLERS ===

/**
 * POST /posts — Upload AI content mới
 *
 * Multer fields:
 *   - sourceImages: 0–5 ảnh input/tham khảo
 *   - generatedImages: 1–5 ảnh kết quả AI
 *
 * Body (FormData):
 *   - prompt (required), negativePrompt, aiTool (required), aiModel, parameters
 *   - caption, tags (JSON string), category, isPremium, priceInTokens
 */
export const createPost = async (req, res, next) => {
  try {
    // ── Parse FormData fields ───────────────────────────────────
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags) }
      catch { body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean) }
    }
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (body.priceInTokens) body.priceInTokens = parseInt(body.priceInTokens)

    // ── Multi-model mode detection ──────────────────────────────
    // modelComparisons JSON: [{aiTool, aiModel, slotIndex}]
    let compMeta = []
    if (body.modelComparisons) {
      try { compMeta = JSON.parse(body.modelComparisons) } catch {}
    }
    const isMultiModel = compMeta.length >= 2 // cần ít nhất 2 slots mới là so sánh

    // ── Validate & collect primary generated images ─────────────
    // Single-model: dùng field 'generatedImages'
    // Multi-model:  dùng field 'compImages_0' làm primary
    const primaryFiles = isMultiModel
      ? (req.files?.[`compImages_${compMeta[0]?.slotIndex ?? 0}`] || [])
      : (req.files?.generatedImages || [])

    if (primaryFiles.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Cần ít nhất 1 ảnh tải lên', 400)
    }
    if (primaryFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh kết quả', 400)
    }

    // ── Source images ────────────────────────────────────────────
    const srcFiles = req.files?.sourceImages || []
    if (srcFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo', 400)
    }

    // sourceImageRefs: ảnh tham khảo reuse từ Cloudinary (không re-upload)
    let sourceImageRefs = []
    if (body.sourceImageRefs) {
      try { sourceImageRefs = JSON.parse(body.sourceImageRefs) } catch {}
    }
    if (sourceImageRefs.length + srcFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo (bao gồm ảnh từ lịch sử)', 400)
    }

    const data = createPostSchema.parse(body)

    // ── Validation based on postType ─────────────────────────────
    if (data.postType === 'ai') {
      if (!data.prompt || data.prompt.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Prompt là bắt buộc đối với ảnh AI', 400)
      }
      if (!data.aiTool) {
        throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn công cụ AI', 400)
      }
    }

    // ── Upload rawFile & colorFile (Digital attachments) ──────────
    let rawFile = undefined
    if (req.files?.rawFile?.[0]) {
      const file = req.files.rawFile[0]
      const uploadRes = await uploadBuffer(
        file.buffer,
        'picspy/posts/raws',
        `raw_${req.user._id}_${Date.now()}`,
        { resource_type: 'raw' }
      )
      rawFile = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        fileSize: file.size,
        format: file.originalname.split('.').pop().toLowerCase(),
        originalName: file.originalname,
      }
    }

    let colorFile = undefined
    if (req.files?.colorFile?.[0]) {
      const file = req.files.colorFile[0]
      const uploadRes = await uploadBuffer(
        file.buffer,
        'picspy/posts/colors',
        `color_${req.user._id}_${Date.now()}`,
        { resource_type: 'raw' }
      )
      colorFile = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        fileSize: file.size,
        format: file.originalname.split('.').pop().toLowerCase(),
        originalName: file.originalname,
      }
    }

    // Determine final postType
    let finalPostType = data.postType
    if (finalPostType.startsWith('digital')) {
      finalPostType = rawFile ? 'digital-raw' : 'digital-normal'
    }

    // ── Upload source images (new files, parallel) ────────────────
    const sourceImages = [...sourceImageRefs] // bắt đầu bằng refs đã có
    let exifData = {}

    if (srcFiles.length > 0) {
      const srcUploads = await Promise.all(
        srcFiles.map((file, i) =>
          uploadImage(file.buffer, 'picspy/posts/sources', `src_${req.user._id}_${i}`, file.size)
        )
      )
      sourceImages.push(...srcUploads)

      // Extract EXIF from first new source image (refs không có buffer)
      exifData = await extractExif(srcFiles[0].buffer)
      if (Object.keys(exifData).length > 0) {
        console.log('📷 EXIF extracted from source image:', JSON.stringify(exifData))
      }
    }

    // ── Upload primary generated images ──────────────────────────
    const genUploads = await Promise.all(
      primaryFiles.map((file, i) =>
        uploadImage(file.buffer, 'picspy/posts/originals', `gen_${req.user._id}_${i}`, file.size)
      )
    )

    // Trích xuất EXIF từ ảnh kết quả chính nếu không có ảnh tham khảo hoặc ảnh tham khảo không có EXIF
    if (Object.keys(exifData).length === 0 && primaryFiles.length > 0) {
      exifData = await extractExif(primaryFiles[0].buffer)
      if (Object.keys(exifData).length > 0) {
        console.log('📷 EXIF extracted from primary image:', JSON.stringify(exifData))
      }
    }

    // ── Upload comparison model slots (multi-model only) ──────────
    const modelComparisons = []
    if (isMultiModel && finalPostType === 'ai') {
      // Slot 0 đã là primary — bắt đầu từ slot 1
      for (let i = 1; i < compMeta.length; i++) {
        const slot = compMeta[i]
        const slotFiles = req.files?.[`compImages_${slot.slotIndex}`] || []
        if (slotFiles.length === 0) continue // skip slot trống
        if (slotFiles.length > 5) continue   // validate nhẹ

        const slotUploads = await Promise.all(
          slotFiles.map((file, j) =>
            uploadImage(file.buffer, 'picspy/posts/originals', `comp_${req.user._id}_${i}_${j}`, file.size)
          )
        )
        modelComparisons.push({
          aiTool: slot.aiTool,
          aiModel: slot.aiModel || undefined,
          generatedImages: slotUploads,
        })
      }
    }

    // ── Determine primary aiTool from slot 0 meta (multi-model) ──
    const primaryAiTool = (isMultiModel && finalPostType === 'ai') ? (compMeta[0]?.aiTool || data.aiTool) : data.aiTool
    const primaryAiModel = (isMultiModel && finalPostType === 'ai') ? (compMeta[0]?.aiModel || data.aiModel) : data.aiModel

    // ── workflowJson gate (Ultimate only) ────────────────────────
    const userTier = req.user.subscriptionTier
    const allowWorkflow = userTier === 'ultimate'
    const hasExif = Object.keys(exifData).length > 0

    // ── Create Post document ──────────────────────────────────────
    const post = await Post.create({
      authorId: req.user._id,
      postType: finalPostType,
      sourceImages,
      generatedImages: genUploads,
      prompt: finalPostType === 'ai' ? data.prompt : undefined,
      negativePrompt: finalPostType === 'ai' ? data.negativePrompt : undefined,
      aiTool: finalPostType === 'ai' ? primaryAiTool : undefined,
      aiModel: finalPostType === 'ai' ? primaryAiModel : undefined,
      parameters: finalPostType === 'ai' ? data.parameters : undefined,
      ...(allowWorkflow && data.workflowJson && finalPostType === 'ai' ? { workflowJson: data.workflowJson } : {}),
      contentType: data.contentType,
      caption: data.caption,
      tags: data.tags,
      category: data.category,
      isPremium: data.isPremium,
      priceInTokens: data.priceInTokens,
      resolution: data.resolution,
      orientation: data.orientation,
      aspectRatio: data.aspectRatio,
      ...(hasExif ? { exifData } : {}),
      rawFile,
      colorFile,
      // Multi-model
      isMultiModel: finalPostType === 'ai' ? isMultiModel : false,
      modelComparisons: finalPostType === 'ai' ? modelComparisons : [],
      status: 'pending',
    })

    // ── Enqueue image processing job ──────────────────────────────
    await imageQueue.add(
      'process-image',
      {
        postId: post._id.toString(),
        imageUrl: genUploads[0].url,
        publicId: genUploads[0].publicId,
        authorId: req.user._id.toString(),
        generatedCount: genUploads.length,
      },
      { priority: 1 }
    )

    // ── Update user stats ─────────────────────────────────────────
    const User = (await import('../models/User.model.js')).default
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.postsCount': 1 } })

    res.status(202).json({
      message: 'Nội dung đang được xử lý. Bạn sẽ nhận thông báo khi hoàn tất.',
      postId: post._id,
      status: 'pending',
      isMultiModel,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', 422, err.errors))
    }
    next(err)
  }
}

/**
 * GET /posts — Feed công khai, chỉ approved posts
 * Filters: category, aiTool, contentType, orientation, resolution
 * Sort: new (default), hot, top
 */
export const getApprovedPosts = async (req, res, next) => {
  try {
    const {
      cursor,
      limit = 20,
      category,
      aiTool,
      contentType,
      orientation,
      resolution,
      sort = 'new',
      authorId, // Lọc theo tác giả — dùng cho ProfilePage
      q, // free-text search: caption, prompt, tags
    } = req.query

    const baseMatch = { status: 'approved' }

    // =====================
    // Free-text search (q)
    // =====================
    if (typeof q === 'string') {
      const raw = q.trim()
      if (raw.length > 0) {
        // Safety: limit query length
        const queryText = raw.slice(0, 80)

        // Escape regex special chars
        const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const rx = new RegExp(escaped, 'i')

        // Normalize tags tokens: split by spaces/commas
        const tokens = queryText
          .toLowerCase()
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10)

        const or = [{ caption: rx }, { prompt: rx }]

        // If we have tokens, include tags match.
        // tags is an array -> use $in for exact tokens.
        if (tokens.length > 0) {
          or.push({ tags: { $in: tokens } })
        }

        // Also include partial match on tags via regex against each string in array.
        // (Mongo will apply regex per array element)
        or.push({ tags: rx })

        baseMatch.$or = or
      }
    }

    if (category && category !== 'all') baseMatch.category = category
    if (aiTool) baseMatch.aiTool = aiTool
    if (contentType) baseMatch.contentType = contentType
    if (orientation) baseMatch.orientation = orientation
    if (resolution) baseMatch.resolution = resolution
    // Filter theo author (cho ProfilePage) — chỉ chấp nhận ObjectId hợp lệ
    if (authorId && /^[a-f\d]{24}$/i.test(authorId))
      baseMatch.authorId = authorId

    // ─── HOT: Aggregation pipeline tính điểm real-time ──────
    if (sort === 'hot') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const pipeline = [
        { $match: { ...baseMatch, createdAt: { $gte: sevenDaysAgo } } },
        {
          $addFields: {
            hotScore: {
              $add: [
                { $multiply: ['$stats.viewsCount', 1] },
                { $multiply: ['$stats.likesCount', 3] },
                { $multiply: ['$stats.downloadsCount', 5] },
              ],
            },
          },
        },
        { $sort: { hotScore: -1, _id: -1 } },
        { $limit: parseInt(limit) + 1 },
        {
          $lookup: {
            from: 'users',
            localField: 'authorId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  username: 1,
                  displayName: 1,
                  avatar: 1,
                  isVerified: 1,
                },
              },
            ],
            as: 'authorId',
          },
        },
        { $unwind: { path: '$authorId', preserveNullAndEmptyArrays: true } },
      ]

      const posts = await Post.aggregate(pipeline)
      const hasMore = posts.length > parseInt(limit)
      if (hasMore) posts.pop()

      return res.json({
        posts,
        pagination: { hasMore, nextCursor: null, count: posts.length },
        sortMode: 'hot',
      })
    }

    // ─── NEW & TOP: Cursor-based pagination ─────────────────
    const query = { ...baseMatch }
    if (cursor) {
      query._id = { $lt: cursor }
    }

    const sortObj =
      sort === 'top' ? { 'stats.likesCount': -1, _id: -1 } : { _id: -1 } // 'new' mặc định

    const posts = await Post.find(query)
      .sort(sortObj)
      .limit(parseInt(limit) + 1)
      .populate(
        'authorId',
        'username displayName avatar isVerified subscriptionTier'
      )
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    const nextCursor = hasMore ? posts[posts.length - 1]._id : null

    res.json({
      posts,
      pagination: { hasMore, nextCursor, count: posts.length },
      sortMode: sort,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/me — Lấy ảnh của user đang đăng nhập (cần auth)
 * Bao gồm tất cả status, có filter
 */
export const getMyPosts = async (req, res, next) => {
  try {
    const {
      cursor,
      limit = 20,
      status, // 'pending' | 'approved' | 'rejected' | 'hidden' | undefined (all)
    } = req.query

    const query = { authorId: req.user._id }

    if (cursor) query._id = { $lt: cursor }
    if (
      status &&
      ['pending', 'approved', 'rejected', 'hidden'].includes(status)
    ) {
      query.status = status
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    const nextCursor = hasMore ? posts[posts.length - 1]._id : null

    // Tổng hợp stats
    const statusCounts = await Post.aggregate([
      { $match: { authorId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 }
    statusCounts.forEach(({ _id, count }) => {
      stats[_id] = count
      stats.total += count
    })

    res.json({
      posts,
      stats,
      pagination: {
        hasMore,
        nextCursor,
        count: posts.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /posts/:id — Chỉnh sửa post (chỉ owner)
 */
export const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    if (post.authorId.toString() !== req.user._id.toString()) {
      throw new AppError(
        'FORBIDDEN',
        'Bạn không có quyền chỉnh sửa bài đăng này',
        403
      )
    }

    // ── Parse FormData fields ───────────────────────────────────
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags)
      } catch {
        body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
    }
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (body.priceInTokens) body.priceInTokens = parseInt(body.priceInTokens)

    // Validate textual data qua Zod
    const data = updatePostSchema.parse(body)

    // ── Xử lý ảnh gốc (Source Images) ───────────────────────────
    let keepSourceImagePublicIds = []
    if (body.keepSourceImagePublicIds) {
      try {
        keepSourceImagePublicIds = JSON.parse(body.keepSourceImagePublicIds)
      } catch {}
    }

    let sourceImageRefs = []
    if (body.sourceImageRefs) {
      try {
        sourceImageRefs = JSON.parse(body.sourceImageRefs)
      } catch {}
    }

    const srcFiles = req.files?.sourceImages || []
    
    // Gom danh sách ảnh gốc cũ được giữ lại
    const oldSourceImagesKept = (post.sourceImages || []).filter(img => 
      img.publicId && keepSourceImagePublicIds.includes(img.publicId)
    )

    // Xác định ảnh gốc cũ cần xóa
    const sourceImagesToDestroy = (post.sourceImages || []).filter(img => 
      img.publicId && !keepSourceImagePublicIds.includes(img.publicId)
    )

    // Upload các ảnh tham khảo mới
    const newSourceUploads = []
    if (srcFiles.length > 0) {
      const srcUploads = await Promise.all(
        srcFiles.map((file, i) =>
          uploadImage(file.buffer, 'picspy/posts/sources', `src_${req.user._id}_${i}`, file.size)
        )
      )
      newSourceUploads.push(...srcUploads)
    }

    const finalSourceImages = [...oldSourceImagesKept, ...sourceImageRefs, ...newSourceUploads]
    if (finalSourceImages.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo', 400)
    }

    // Xóa ảnh gốc cũ khỏi Cloudinary
    if (sourceImagesToDestroy.length > 0) {
      await Promise.all(
        sourceImagesToDestroy.map(img => cloudinary.uploader.destroy(img.publicId).catch(() => {}))
      )
    }

    // ── Xử lý ảnh kết quả & Multi-model ────────────────────────
    let compMeta = []
    if (body.modelComparisons) {
      try {
        compMeta = JSON.parse(body.modelComparisons)
      } catch {}
    }
    const isMultiModel = compMeta.length >= 2

    // Danh sách tất cả các ảnh kết quả cũ đã có (để check dọn dẹp)
    const allOldGeneratedImages = []
    if (post.generatedImages && post.generatedImages.length > 0) {
      allOldGeneratedImages.push(...post.generatedImages)
    }
    if (post.modelComparisons && post.modelComparisons.length > 0) {
      post.modelComparisons.forEach(slot => {
        if (slot.generatedImages && slot.generatedImages.length > 0) {
          allOldGeneratedImages.push(...slot.generatedImages)
        }
      })
    }

    let finalGeneratedImages = []
    let finalModelComparisons = []
    const keptImagePublicIds = new Set() // để theo dõi các ảnh cũ được giữ lại

    if (isMultiModel) {
      // Chế độ so sánh nhiều model
      for (let i = 0; i < compMeta.length; i++) {
        const slot = compMeta[i]
        
        // Lấy ảnh cũ được giữ lại trong slot này
        let slotKeepIds = slot.keepImagePublicIds || []
        const oldImagesKept = allOldGeneratedImages.filter(img => 
          img.publicId && slotKeepIds.includes(img.publicId)
        )
        oldImagesKept.forEach(img => keptImagePublicIds.add(img.publicId))

        // Upload ảnh mới cho slot này (compImages_X)
        const slotFiles = req.files?.[`compImages_${slot.slotIndex}`] || []
        const newSlotUploads = await Promise.all(
          slotFiles.map((file, j) =>
            uploadImage(file.buffer, 'picspy/posts/originals', `comp_${req.user._id}_${i}_${j}`, file.size)
          )
        )

        const slotImages = [...oldImagesKept, ...newSlotUploads]
        if (slotImages.length === 0) {
          throw new AppError('VALIDATION_ERROR', `Model ${i + 1} cần ít nhất 1 ảnh kết quả`, 400)
        }
        if (slotImages.length > 5) {
          throw new AppError('VALIDATION_ERROR', `Model ${i + 1} tối đa 5 ảnh kết quả`, 400)
        }

        finalModelComparisons.push({
          aiTool: slot.aiTool,
          aiModel: slot.aiModel || undefined,
          generatedImages: slotImages,
        })
      }

      // Slot đầu tiên làm primary cho tương thích ngược
      finalGeneratedImages = finalModelComparisons[0].generatedImages
    } else {
      // Chế độ single-model
      let keepGeneratedImagePublicIds = []
      if (body.keepGeneratedImagePublicIds) {
        try {
          keepGeneratedImagePublicIds = JSON.parse(body.keepGeneratedImagePublicIds)
        } catch {}
      }

      const oldImagesKept = allOldGeneratedImages.filter(img =>
        img.publicId && keepGeneratedImagePublicIds.includes(img.publicId)
      )
      oldImagesKept.forEach(img => keptImagePublicIds.add(img.publicId))

      const genFiles = req.files?.generatedImages || []
      const newGenUploads = await Promise.all(
        genFiles.map((file, i) =>
          uploadImage(file.buffer, 'picspy/posts/originals', `gen_${req.user._id}_${i}`, file.size)
        )
      )

      finalGeneratedImages = [...oldImagesKept, ...newGenUploads]
      if (finalGeneratedImages.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Cần ít nhất 1 ảnh kết quả AI', 400)
      }
      if (finalGeneratedImages.length > 5) {
        throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh kết quả AI', 400)
      }
      finalModelComparisons = []
    }

    // Xác định các ảnh kết quả cũ cần xóa khỏi Cloudinary (những ảnh không được giữ lại ở bất kỳ đâu)
    const imagesToDestroy = allOldGeneratedImages.filter(img => 
      img.publicId && !keptImagePublicIds.has(img.publicId)
    )

    if (imagesToDestroy.length > 0) {
      await Promise.all(
        imagesToDestroy.map(img => {
          const promises = [cloudinary.uploader.destroy(img.publicId).catch(() => {})]
          const baseName = img.publicId.split('/').pop()
          promises.push(cloudinary.uploader.destroy(`picspy/posts/thumbnails/${baseName}_thumb`).catch(() => {}))
          promises.push(cloudinary.uploader.destroy(`picspy/posts/previews/${baseName}_preview`).catch(() => {}))
          return Promise.all(promises)
        })
      )
    }

    // Determine primary aiTool & aiModel
    const primaryAiTool = isMultiModel ? (compMeta[0]?.aiTool || data.aiTool) : data.aiTool
    const primaryAiModel = isMultiModel ? (compMeta[0]?.aiModel || data.aiModel) : data.aiModel

    // Check workflowJson gate
    const userTier = req.user.subscriptionTier
    const allowWorkflow = userTier === 'ultimate'

    // Update fields
    const promptChanged = data.prompt !== undefined && data.prompt !== post.prompt
    post.prompt = data.prompt !== undefined ? data.prompt : post.prompt
    post.negativePrompt = data.negativePrompt !== undefined ? data.negativePrompt : post.negativePrompt
    post.aiTool = primaryAiTool !== undefined ? primaryAiTool : post.aiTool
    post.aiModel = primaryAiModel !== undefined ? primaryAiModel : post.aiModel
    post.parameters = data.parameters !== undefined ? data.parameters : post.parameters
    if (allowWorkflow) {
      post.workflowJson = data.workflowJson !== undefined ? data.workflowJson : post.workflowJson
    }
    post.caption = data.caption !== undefined ? data.caption : post.caption
    post.tags = data.tags !== undefined ? data.tags : post.tags
    post.category = data.category !== undefined ? data.category : post.category
    post.isPremium = data.isPremium !== undefined ? data.isPremium : post.isPremium
    post.priceInTokens = data.priceInTokens !== undefined ? data.priceInTokens : post.priceInTokens
    
    // Resolution, orientation, aspectRatio
    if (data.resolution) post.resolution = data.resolution
    if (data.orientation) post.orientation = data.orientation
    if (data.aspectRatio) post.aspectRatio = data.aspectRatio

    // Update images
    post.sourceImages = finalSourceImages
    
    // Để xem ảnh chính có bị đổi không
    const oldPrimaryPublicId = post.generatedImages?.[0]?.publicId
    const newPrimaryPublicId = finalGeneratedImages[0]?.publicId

    post.generatedImages = finalGeneratedImages
    post.isMultiModel = isMultiModel
    post.modelComparisons = finalModelComparisons

    // Nếu thay đổi ảnh chính đầu tiên, ta trigger hàng chờ re-processing
    const hasPrimaryImageChanged = oldPrimaryPublicId !== newPrimaryPublicId

    // Cập nhật trạng thái duyệt về 'pending' khi bài viết sửa ảnh hoặc prompt quan trọng
    if (hasPrimaryImageChanged || promptChanged) {
      post.status = 'pending'
    }

    await post.save()

    // Enqueue processing job if primary image changed
    if (hasPrimaryImageChanged && newPrimaryPublicId) {
      await imageQueue.add(
        'process-image',
        {
          postId: post._id.toString(),
          imageUrl: finalGeneratedImages[0].url,
          publicId: finalGeneratedImages[0].publicId,
          authorId: req.user._id.toString(),
          generatedCount: finalGeneratedImages.length,
        },
        { priority: 1 }
      )
    }

    res.json({ message: 'Cập nhật thành công', post })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          'Dữ liệu không hợp lệ',
          422,
          err.errors
        )
      )
    }
    next(err)
  }
}

/**
 * DELETE /posts/:id — Xóa post (chỉ owner)
 * Xóa cả ảnh trên Cloudinary (sourceImages + generatedImages)
 */
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    if (post.authorId.toString() !== req.user._id.toString()) {
      throw new AppError(
        'FORBIDDEN',
        'Bạn không có quyền xóa bài đăng này',
        403
      )
    }

    // Xóa tất cả ảnh trên Cloudinary
    const deletePromises = []

    // Xóa sourceImages
    for (const img of post.sourceImages || []) {
      if (img.publicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(img.publicId).catch(() => {})
        )
      }
    }

    // Xóa generatedImages + thumbnails + previews
    for (const img of post.generatedImages || []) {
      if (img.publicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(img.publicId).catch(() => {})
        )
        const baseName = img.publicId.split('/').pop()
        deletePromises.push(
          cloudinary.uploader
            .destroy(`picspy/posts/thumbnails/${baseName}_thumb`)
            .catch(() => {})
        )
        deletePromises.push(
          cloudinary.uploader
            .destroy(`picspy/posts/previews/${baseName}_preview`)
            .catch(() => {})
        )
      }
    }

    await Promise.allSettled(deletePromises)
    await post.deleteOne()

    // Giảm postsCount
    const User = (await import('../models/User.model.js')).default
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.postsCount': -1 },
    })

    res.json({ message: 'Đã xóa bài đăng thành công', postId: req.params.id })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/following — Feed từ những người đang follow
 */
export const getFollowingFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query

    const Follow = (await import('../models/Follow.model.js')).default
    const follows = await Follow.find({ followerId: req.user._id })
      .select('followingId')
      .lean()

    const followingIds = follows.map((f) => f.followingId)

    if (followingIds.length === 0) {
      return res.json({
        posts: [],
        isEmpty: true,
        pagination: { hasMore: false, nextCursor: null, count: 0 },
      })
    }

    const query = { status: 'approved', authorId: { $in: followingIds } }
    if (cursor) query._id = { $lt: cursor }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    res.json({
      posts,
      pagination: {
        hasMore,
        nextCursor: hasMore ? posts[posts.length - 1]._id : null,
        count: posts.length,
      },
    })
  } catch (err) {
    next(err)
  }
}
