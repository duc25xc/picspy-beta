import { z } from 'zod'
import Post from '../models/Post.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'
import { imageQueue } from '../config/bullmq.js'

const postSchema = z.object({
  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
  category: z.enum(['nature', 'anime', 'minimal', 'abstract', 'city', 'space', 'dark', 'light', 'gradient', 'other']),
  isPremium: z.boolean().optional().default(false),
  priceInCoins: z.number().min(10).max(1000).optional().default(50),
  isAIGenerated: z.boolean().optional().default(false),
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
    if (!req.file) throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn ảnh để upload', 400)

    // Parse JSON fields từ FormData
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags) } catch { body.tags = body.tags.split(',').map(t => t.trim()) }
    }
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (typeof body.isAIGenerated === 'string') body.isAIGenerated = body.isAIGenerated === 'true'
    if (body.priceInCoins) body.priceInCoins = parseInt(body.priceInCoins)

    const data = postSchema.parse(body)

    // Upload ảnh gốc lên Cloudinary
    const uploadResult = await uploadBuffer(
      req.file.buffer,
      'pixeldrop/posts/originals',
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
    await (await import('../models/User.model.js')).default.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.postsCount': 1 },
    })

    res.status(202).json({
      message: 'Ảnh đang được xử lý. Bạn sẽ nhận được thông báo khi hoàn tất.',
      postId: post._id,
      status: 'pending',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', 422, err.errors))
    }
    next(err)
  }
}
