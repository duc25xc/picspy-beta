import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, CornerDownRight, Trash2, ChevronDown } from 'lucide-react'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

/* ─── Time ago helper ────────────────────────────────────── */
const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return new Date(date).toLocaleDateString('vi-VN')
}

/* ─── Avatar ─────────────────────────────────────────────── */
const Avatar = ({ user, size = 8 }) => {
  const s = `w-${size} h-${size}`
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={`${s} rounded-full object-cover ring-1 ring-white/10 flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${s} rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
    >
      {user?.username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

/* ─── Single Comment Row ─────────────────────────────────── */
const CommentRow = ({ comment, currentUser, postId, onDelete, onReply, isReply = false }) => {
  const isOwner = currentUser?._id === comment.authorId?._id
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Xóa bình luận này?')) return
    setDeleting(true)
    try {
      await api.delete(`/posts/${postId}/comments/${comment._id}`)
      onDelete(comment._id)
    } catch {
      toast.error('Không thể xóa')
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex gap-3 ${isReply ? 'ml-9 mt-2' : ''}`}
    >
      {isReply && (
        <CornerDownRight size={12} className="text-white/20 mt-3 flex-shrink-0" />
      )}
      <Avatar user={comment.authorId} size={isReply ? 6 : 8} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link
            to={`/profile/${comment.authorId?.username}`}
            className="text-xs font-semibold text-white/80 hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {comment.authorId?.displayName || comment.authorId?.username}
          </Link>
          <span className="text-[10px] text-white/30">{timeAgo(comment.createdAt)}</span>
        </div>

        {comment.isDeleted ? (
          <p className="text-xs text-white/25 italic mt-0.5">[Bình luận đã bị xóa]</p>
        ) : (
          <p className="text-sm text-white/70 mt-0.5 break-words leading-relaxed">
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!comment.isDeleted && (
          <div className="flex items-center gap-3 mt-1.5">
            {!isReply && (
              <button
                onClick={() => onReply(comment)}
                className="text-[10px] text-white/30 hover:text-violet-400 transition-colors font-medium"
              >
                Trả lời
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] text-white/20 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={10} />
                Xóa
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Comment Input ──────────────────────────────────────── */
const CommentInput = ({ postId, replyTo, onCancelReply, onSuccess, currentUser }) => {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const body = { content: trimmed }
      if (replyTo) body.parentId = replyTo._id

      const { data } = await api.post(`/posts/${postId}/comments`, body)
      setText('')
      onCancelReply?.()
      onSuccess(data.comment, !!replyTo)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi bình luận')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <MessageCircle size={14} className="text-white/30" />
        <Link to="/login" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
          Đăng nhập để bình luận
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 rounded-lg px-3 py-1.5">
          <CornerDownRight size={11} />
          <span>Đang trả lời <span className="text-brand-400 font-medium">@{replyTo.authorId?.username}</span></span>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-auto hover:text-white/70 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Avatar user={currentUser} size={8} />
        <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-brand-500/50 transition-colors">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Viết bình luận..."
            maxLength={1000}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none min-h-[24px] max-h-[100px]"
            style={{ lineHeight: '1.5' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
          />
          <motion.button
            type="submit"
            disabled={!text.trim() || submitting}
            whileTap={{ scale: 0.9 }}
            className="text-brand-400 disabled:text-white/20 transition-colors flex-shrink-0 pb-0.5"
          >
            {submitting ? (
              <motion.div
                className="w-4 h-4 border-2 border-brand-400/30 border-t-brand-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>
      </div>
    </form>
  )
}

/* ─── Main CommentSection ────────────────────────────────── */
const CommentSection = ({ postId, initialCount = 0 }) => {
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [totalCount, setTotalCount] = useState(initialCount)

  const fetchComments = async (reset = false) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = { limit: 10 }
      if (!reset && cursor) params.cursor = cursor

      const { data } = await api.get(`/posts/${postId}/comments`, { params })
      const newComments = data.comments || []

      setComments((prev) => (reset ? newComments : [...prev, ...newComments]))
      setHasMore(data.pagination?.hasMore || false)
      setCursor(data.pagination?.nextCursor || null)
      setTotalCount(data.totalCount || 0)
    } catch {
      toast.error('Không thể tải bình luận')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchComments(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const handleNewComment = (comment, isReply) => {
    if (isReply) {
      // Thêm reply vào đúng parent
      setComments((prev) =>
        prev.map((c) =>
          c._id === comment.parentId
            ? { ...c, replies: [...(c.replies || []), comment] }
            : c
        )
      )
    } else {
      // Thêm top-level comment vào đầu
      setComments((prev) => [{ ...comment, replies: [] }, ...prev])
    }
    setTotalCount((n) => n + 1)
  }

  const handleDelete = (commentId) => {
    // Xóa top-level hoặc reply
    setComments((prev) => {
      const withoutTop = prev.filter((c) => c._id !== commentId)
      return withoutTop.map((c) => ({
        ...c,
        replies: (c.replies || []).filter((r) => r._id !== commentId),
      }))
    })
    setTotalCount((n) => Math.max(0, n - 1))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={16} className="text-white/50" />
        <span className="text-sm font-semibold text-white/70">
          {totalCount > 0 ? `${totalCount} bình luận` : 'Bình luận'}
        </span>
      </div>

      {/* Input */}
      <CommentInput
        postId={postId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSuccess={handleNewComment}
        currentUser={isLoggedIn ? user : null}
      />

      {/* List */}
      {loading ? (
        <div className="space-y-4 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <AnimatePresence>
            {comments.map((comment) => (
              <div key={comment._id}>
                <CommentRow
                  comment={comment}
                  currentUser={user}
                  postId={postId}
                  onDelete={handleDelete}
                  onReply={setReplyTo}
                />
                {/* Replies */}
                <AnimatePresence>
                  {(comment.replies || []).map((reply) => (
                    <CommentRow
                      key={reply._id}
                      comment={reply}
                      currentUser={user}
                      postId={postId}
                      onDelete={handleDelete}
                      onReply={setReplyTo}
                      isReply
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </AnimatePresence>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => fetchComments(false)}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mx-auto"
            >
              <ChevronDown size={14} />
              {loadingMore ? 'Đang tải...' : 'Xem thêm bình luận'}
            </button>
          )}

          <AnimatePresence mode="wait">
            {!loading && comments.length === 0 && (
              <motion.div
                key="empty-comment"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="text-center py-8 space-y-1.5"
              >
                <p className="text-2xl select-none">✨</p>
                <p className="text-sm text-white/30 font-medium">Chưa có bình luận nào.</p>
                <p className="text-xs text-white/20">Hãy là người đầu tiên!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default CommentSection
