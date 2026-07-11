import { z } from 'zod'
import Comment from '../models/Comment.model.js'
import Post from '../models/Post.model.js'
import AppError from '../utils/AppError.js'

const commentSchema = z.object({
  content: z.string().min(1, 'Nội dung không được trống').max(1000),
  parentId: z.string().optional().nullable(),
})

/**
 * POST /posts/:id/comments — Tạo comment mới
 * Hỗ trợ nested 1 level (reply to top-level comment)
 */
export const createComment = async (req, res, next) => {
  try {
    const { id: postId } = req.params

    const post = await Post.findById(postId).select('status authorId caption').lean()
    if (!post || post.status !== 'approved') {
      throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại', 404)
    }

    const data = commentSchema.parse(req.body)

    // Nếu reply → kiểm tra parent comment tồn tại
    let parentId = null
    let parent = null
    if (data.parentId) {
      parent = await Comment.findById(data.parentId).lean()
      if (!parent || parent.postId.toString() !== postId) {
        throw new AppError('NOT_FOUND', 'Comment gốc không tồn tại', 404)
      }
      // Chỉ cho reply top-level (flatten 1 level)
      // Nếu parent đã là reply → reply vào top-level của nó
      parentId = parent.parentId || parent._id
    }

    const comment = await Comment.create({
      postId,
      authorId: req.user._id,
      parentId,
      content: data.content,
    })

    // Tăng commentsCount trên Post (denormalized)
    await Post.findByIdAndUpdate(postId, {
      $inc: { 'stats.commentsCount': 1 },
    })

    // Gửi thông báo Comment hoặc Reply
    const { triggerNotificationEvent } = await import('../services/notification.service.js')
    
    if (parentId && parent) {
      if (parent.authorId.toString() !== req.user._id.toString()) {
        await triggerNotificationEvent({
          type: 'COMMENT_REPLY',
          actorId: req.user._id,
          recipientId: parent.authorId,
          targetId: comment._id,
          targetModel: 'Comment',
          metadata: {
            postId,
            commentId: comment._id,
            customTitle: post.caption,
            message: data.content,
          }
        }).catch(err => console.error(err))
      }
    } else {
      if (post.authorId.toString() !== req.user._id.toString()) {
        await triggerNotificationEvent({
          type: 'POST_COMMENT',
          actorId: req.user._id,
          recipientId: post.authorId,
          targetId: comment._id,
          targetModel: 'Comment',
          metadata: {
            postId,
            commentId: comment._id,
            customTitle: post.caption,
            message: data.content,
          }
        }).catch(err => console.error(err))
      }
    }

    // Quét và gửi thông báo MENTION (@username)
    const mentionRegex = /@([a-z0-9_]{3,30})/g
    const matches = [...data.content.matchAll(mentionRegex)].map(m => m[1])
    if (matches.length > 0) {
      const User = (await import('../models/User.model.js')).default
      const mentionedUsers = await User.find({ username: { $in: matches } }).select('_id').lean()
      
      for (const u of mentionedUsers) {
        const uIdStr = u._id.toString()
        const isSelf = uIdStr === req.user._id.toString()
        const isParentAuthor = parent && uIdStr === parent.authorId.toString()
        const isPostAuthor = !parentId && uIdStr === post.authorId.toString()
        
        if (!isSelf && !isParentAuthor && !isPostAuthor) {
          await triggerNotificationEvent({
            type: 'POST_MENTION',
            actorId: req.user._id,
            recipientId: u._id,
            targetId: comment._id,
            targetModel: 'Comment',
            metadata: {
              postId,
              commentId: comment._id,
              customTitle: post.caption,
              message: data.content,
            }
          }).catch(err => console.error(err))
        }
      }
    }

    // Populate author info trước khi trả về
    const populated = await Comment.findById(comment._id)
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    res.status(201).json({ comment: populated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(
        new AppError('VALIDATION_ERROR', err.errors[0].message, 422)
      )
    }
    next(err)
  }
}

/**
 * GET /posts/:id/comments — Lấy danh sách comments
 * Trả top-level comments, mỗi comment kèm replies
 * Cursor pagination trên top-level
 */
export const getComments = async (req, res, next) => {
  try {
    const { id: postId } = req.params
    const { cursor, limit = 15 } = req.query
    const parsedLimit = Math.min(parseInt(limit) || 15, 50)

    // Query top-level comments
    const topQuery = {
      postId,
      parentId: null,
      isDeleted: false,
    }
    if (cursor) topQuery._id = { $lt: cursor }

    const topComments = await Comment.find(topQuery)
      .sort({ _id: -1 })
      .limit(parsedLimit + 1)
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    const hasMore = topComments.length > parsedLimit
    if (hasMore) topComments.pop()

    // Lấy replies cho mỗi top-level comment (tối đa 5 replies mỗi)
    const topIds = topComments.map((c) => c._id)
    const replies = await Comment.find({
      postId,
      parentId: { $in: topIds },
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    // Group replies vào comment cha
    const repliesMap = {}
    for (const reply of replies) {
      const pid = reply.parentId.toString()
      if (!repliesMap[pid]) repliesMap[pid] = []
      repliesMap[pid].push(reply)
    }

    const commentsWithReplies = topComments.map((c) => ({
      ...c,
      replies: repliesMap[c._id.toString()] || [],
    }))

    // Tổng comments cho post này
    const totalCount = await Comment.countDocuments({
      postId,
      isDeleted: false,
    })

    res.json({
      comments: commentsWithReplies,
      totalCount,
      pagination: {
        hasMore,
        nextCursor: hasMore
          ? topComments[topComments.length - 1]._id
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /posts/:id/comments/:commentId — Xóa comment
 * Soft delete: giữ lại document nhưng ẩn content
 * Chỉ author hoặc admin mới xóa được
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)
    if (!comment || comment.isDeleted) {
      throw new AppError('NOT_FOUND', 'Comment không tồn tại', 404)
    }

    // Chỉ author comment hoặc admin mới xóa được
    const isOwner =
      comment.authorId.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      throw new AppError(
        'FORBIDDEN',
        'Bạn không có quyền xóa comment này',
        403
      )
    }

    // Soft delete
    comment.isDeleted = true
    comment.content = '[Bình luận đã bị xóa]'
    await comment.save()

    // Giảm commentsCount
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { 'stats.commentsCount': -1 },
    })

    res.json({ message: 'Đã xóa bình luận' })
  } catch (err) {
    next(err)
  }
}
