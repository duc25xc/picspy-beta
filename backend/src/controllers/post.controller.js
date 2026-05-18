import { z } from 'zod'
import exifr from 'exifr'
import Post, { AI_TOOLS } from '../models/Post.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'
import { imageQueue } from '../config/bullmq.js'
import { v2 as cloudinary } from 'cloudinary'

// === ZOD SCHEMAS ===

const createPostSchema = z.object({
  // AI generation (core)
  prompt: z.string().min(1, 'Prompt là bắt buộc').max(2000).trim(),
  negativePrompt: z.string().max(1000).trim().optional(),
  aiTool: z.enum(AI_TOOLS, { message: 'Công cụ AI không hợp lệ' }),
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
      ],
      translateKeys: false,
      translateValues: false,
    })
    if (!rawExif) return {}

    const cameraName = [rawExif.Make, rawExif.Model]
      .filter(Boolean)
      .join(' ')
      .trim()
    const exifData = {
      camera: cameraName || undefined,
      lensModel: rawExif.LensModel || undefined,
      iso: rawExif.ISO || undefined,
      aperture: rawExif.FNumber ? `f/${rawExif.FNumber}` : undefined,
      focalLength: rawExif.FocalLength ? `${rawExif.FocalLength}mm` : undefined,
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
    const genFiles = req.files?.generatedImages || []
    if (genFiles.length === 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Cần ít nhất 1 ảnh kết quả AI',
        400
      )
    }
    if (genFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh kết quả AI', 400)
    }

    const srcFiles = req.files?.sourceImages || []
    if (srcFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo', 400)
    }

    // Parse FormData fields
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags)
      } catch {
        body.tags = body.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      }
    }
    if (typeof body.isPremium === 'string')
      body.isPremium = body.isPremium === 'true'
    if (body.priceInTokens) body.priceInTokens = parseInt(body.priceInTokens)

    const data = createPostSchema.parse(body)

    // Upload source images (optional, parallel)
    const sourceImages = []
    let exifData = {}

    if (srcFiles.length > 0) {
      const srcUploads = await Promise.all(
        srcFiles.map((file, i) =>
          uploadImage(
            file.buffer,
            'picspy/posts/sources',
            `src_${req.user._id}_${i}`,
            file.size
          )
        )
      )
      sourceImages.push(...srcUploads)

      // Extract EXIF from first source image only
      exifData = await extractExif(srcFiles[0].buffer)
      if (Object.keys(exifData).length > 0) {
        console.log(
          '📷 EXIF extracted from source image:',
          JSON.stringify(exifData)
        )
      }
    }

    // Upload generated images (required, parallel)
    const genUploads = await Promise.all(
      genFiles.map((file, i) =>
        uploadImage(
          file.buffer,
          'picspy/posts/originals',
          `gen_${req.user._id}_${i}`,
          file.size
        )
      )
    )

    // Create Post document (status: pending)
    const hasExif = Object.keys(exifData).length > 0

    // workflowJson: chỉ lưu nếu user là ultimate (server-side gate)
    const userTier = req.user.subscriptionTier
    const allowWorkflow = userTier === 'ultimate'

    const post = await Post.create({
      authorId: req.user._id,
      sourceImages,
      generatedImages: genUploads,
      prompt: data.prompt,
      negativePrompt: data.negativePrompt,
      aiTool: data.aiTool,
      aiModel: data.aiModel,
      parameters: data.parameters,
      ...(allowWorkflow && data.workflowJson
        ? { workflowJson: data.workflowJson }
        : {}),
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
      status: 'pending',
    })

    // Enqueue job: worker xử lý generatedImages[0] (thumbnail, palette, blurHash, NSFW)
    await imageQueue.add(
      'process-image',
      {
        postId: post._id.toString(),
        // Worker sẽ xử lý generatedImages[0] cho blurHash, palette, histogram, NSFW
        imageUrl: genUploads[0].url,
        publicId: genUploads[0].publicId,
        authorId: req.user._id.toString(),
        generatedCount: genUploads.length,
      },
      { priority: 1 }
    )

    // Update user stats
    const User = (await import('../models/User.model.js')).default
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.postsCount': 1 },
    })

    res.status(202).json({
      message: 'Nội dung đang được xử lý. Bạn sẽ nhận thông báo khi hoàn tất.',
      postId: post._id,
      status: 'pending',
    })
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
        { $unwind: { path: '$authorId', preserveNullAndEmpty: true } },
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

    // Parse booleans từ JSON body hoặc FormData
    let body = { ...req.body }
    if (typeof body.isPremium === 'string')
      body.isPremium = body.isPremium === 'true'
    if (body.priceInTokens) body.priceInTokens = parseInt(body.priceInTokens)
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags)
      } catch {
        body.tags = []
      }
    }

    const data = updatePostSchema.parse(body)

    const updated = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true }
    )

    res.json({ message: 'Cập nhật thành công', post: updated })
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
