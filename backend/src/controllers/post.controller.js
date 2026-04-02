import { z } from 'zod'
import Post from '../models/Post.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'
import { imageQueue } from '../config/bullmq.js'
import { v2 as cloudinary } from 'cloudinary'

const postSchema = z.object({
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
  category: z.enum([
    'nature',
    'anime',
    'minimal',
    'abstract',
    'city',
    'space',
    'dark',
    'light',
    'gradient',
    'other',
  ]),
  isPremium: z.boolean().optional().default(false),
  priceInCoins: z.number().min(10).max(1000).optional().default(50),
  isAIGenerated: z.boolean().optional().default(false),
  aiTool: z.string().optional(),
  resolution: z.enum(['hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
})

// Schema riêng cho update (chỉ cho phép sửa một số trường)
const updatePostSchema = z.object({
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional(),
  category: z
    .enum([
      'nature',
      'anime',
      'minimal',
      'abstract',
      'city',
      'space',
      'dark',
      'light',
      'gradient',
      'other',
    ])
    .optional(),
  isPremium: z.boolean().optional(),
  priceInCoins: z.number().min(10).max(1000).optional(),
  isAIGenerated: z.boolean().optional(),
  aiTool: z.string().optional(),
  resolution: z.enum(['hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
})

/**
 * POST /posts — Upload ảnh mới
 * Flow: validate → upload raw lên Cloudinary → tạo Post (pending) → enqueue BullMQ
 */
export const createPost = async (req, res, next) => {
  try {
    if (!req.file)
      throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn ảnh để upload', 400)

    // Parse JSON fields từ FormData
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags)
      } catch {
        body.tags = body.tags.split(',').map((t) => t.trim())
      }
    }
    if (typeof body.isPremium === 'string')
      body.isPremium = body.isPremium === 'true'
    if (typeof body.isAIGenerated === 'string')
      body.isAIGenerated = body.isAIGenerated === 'true'
    if (body.priceInCoins) body.priceInCoins = parseInt(body.priceInCoins)

    const data = postSchema.parse(body)

    // Upload ảnh gốc lên Cloudinary
    const uploadResult = await uploadBuffer(
      req.file.buffer,
      'picspy/posts/originals',
      `post_${Date.now()}_${req.user._id}`,
      { resource_type: 'image' }
    )

    // Tạo Post document với status pending
    const post = await Post.create({
      authorId: req.user._id,
      images: [
        {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          fileSize: req.file.size,
          format: uploadResult.format,
        },
      ],
      ...data,
      status: 'pending',
    })

    // Enqueue job xử lý ảnh
    await imageQueue.add(
      'process-image',
      {
        postId: post._id.toString(),
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        authorId: req.user._id.toString(),
      },
      { priority: 1 }
    )

    // Cập nhật stats user
    await (
      await import('../models/User.model.js')
    ).default.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.postsCount': 1 },
    })

    res.status(202).json({
      message: 'Ảnh đang được xử lý. Bạn sẽ nhận được thông báo khi hoàn tất.',
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
 * Cursor-based pagination, sort by score desc
 */
export const getApprovedPosts = async (req, res, next) => {
  try {
    const {
      cursor,
      limit = 20,
      category,
      isAI,
      orientation,
      resolution,
      sort = 'new',
    } = req.query

    const query = { status: 'approved' }

    // Cursor-based pagination
    if (cursor) query._id = { $lt: cursor }

    // Filters
    if (category && category !== 'all') query.category = category
    if (isAI === 'true') query.isAIGenerated = true
    if (orientation) query.orientation = orientation
    if (resolution) query.resolution = resolution

    const sortObj =
      sort === 'hot'
        ? { score: -1, _id: -1 }
        : sort === 'top'
          ? { 'stats.likesCount': -1, _id: -1 }
          : { _id: -1 } // 'new' mặc định

    const posts = await Post.find(query)
      .sort(sortObj)
      .limit(parseInt(limit) + 1) // Lấy thêm 1 để check hasMore
      .populate('authorId', 'username displayName avatar isVerified subscriptionTier')
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    const nextCursor = hasMore ? posts[posts.length - 1]._id : null

    res.json({
      posts,
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
    if (status && ['pending', 'approved', 'rejected', 'hidden'].includes(status)) {
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
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (typeof body.isAIGenerated === 'string') body.isAIGenerated = body.isAIGenerated === 'true'
    if (body.priceInCoins) body.priceInCoins = parseInt(body.priceInCoins)
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags) } catch { body.tags = [] }
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
      return next(new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', 422, err.errors))
    }
    next(err)
  }
}

/**
 * DELETE /posts/:id — Xóa post (chỉ owner)
 * Xóa cả ảnh trên Cloudinary
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

    // Xóa tất cả ảnh trên Cloudinary (original + thumbnail + preview)
    const deletePromises = []
    for (const img of post.images) {
      if (img.publicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(img.publicId).catch(() => {})
        )
        // Xóa thumbnail và preview bằng cách đoán publicId
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

    // Giảm postsCount của user
    await (
      await import('../models/User.model.js')
    ).default.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.postsCount': -1 },
    })

    res.json({ message: 'Đã xóa bài đăng thành công', postId: req.params.id })
  } catch (err) {
    next(err)
  }
}
