import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Share2,
  MoreHorizontal,
  Eye,
  Tag,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserPlus,
  UserCheck,
  Maximize2,
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import LikeButton from './LikeButton'
import BookmarkButton from './BookmarkButton'
import DownloadButton from './DownloadButton'
import CommentSection from './CommentSection'
import toast from 'react-hot-toast'

/* ─── Font loader ────────────────────────────────────────── */
const FontStyle = () => (
  <style>{`
    .pj { font-family: 'Plus Jakarta Sans', sans-serif; }
    .modal-glass {
      background: rgba(14,13,18,0.96);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
    }
    .img-panel {
      background: #0a090e;
    }
  `}</style>
)

/* ─── Avatar ─────────────────────────────────────────────── */
const AuthorAvatar = ({ user, size = 10 }) => {
  const s = `w-${size} h-${size}`
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={`${s} rounded-full object-cover ring-2 ring-white/10 flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${s} rounded-full bg-gradient-to-br from-violet-600 to-blue-500
        flex items-center justify-center text-white font-bold pj flex-shrink-0`}
    >
      {user?.username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

/* ─── Category label map ─────────────────────────────────── */
const CATEGORY_LABELS = {
  nature: '🌿 Thiên nhiên', anime: '🎌 Anime', minimal: '◻️ Minimal',
  abstract: '🎨 Abstract', city: '🌃 Thành phố', space: '🚀 Vũ trụ',
  dark: '🌑 Dark', light: '☀️ Light', gradient: '🌈 Gradient', other: '✨ Khác',
}

/* ─── Main Modal ─────────────────────────────────────────── */
const PostDetailModal = ({ postId, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)

  const [post, setPost] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Track view khi mở modal
  const trackView = useCallback(async (id) => {
    try {
      await api.post(`/posts/${id}/view`)
    } catch { /* bỏ qua */ }
  }, [])

  // Fetch post detail
  const fetchPost = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    setImgLoaded(false)
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data.post)
      setIsLiked(data.isLiked || false)
      setIsBookmarked(data.isBookmarked || false)
      setIsFollowing(data.isFollowingAuthor || false)
      trackView(id)
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy bài đăng')
    } finally {
      setLoading(false)
    }
  }, [trackView])

  useEffect(() => {
    if (!postId) return
    fetchPost(postId)

    // Cập nhật URL (deeplink) mà không reload trang
    const prev = location.pathname
    window.history.pushState({}, '', `/posts/${postId}`)

    return () => {
      window.history.pushState({}, '', prev)
    }
  }, [postId]) // eslint-disable-line

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  /* ─── Follow/unfollow ─────────────────────────────────── */
  const handleFollow = async () => {
    if (!isLoggedIn) {
      toast('Đăng nhập để follow creator này 💜', { icon: '🔒' })
      return
    }
    if (followLoading) return

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowLoading(true)

    try {
      await api.post(`/users/${post.authorId._id}/follow`)
      toast(wasFollowing ? 'Đã bỏ follow' : `Đang follow @${post.authorId.username}`, {
        icon: wasFollowing ? '✓' : '💜',
        duration: 1500,
      })
    } catch {
      setIsFollowing(wasFollowing)
      toast.error('Không thể thực hiện')
    } finally {
      setFollowLoading(false)
    }
  }

  /* ─── Share ───────────────────────────────────────────── */
  const handleShare = () => {
    const url = `${window.location.origin}/posts/${postId}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Đã sao chép link!')
    }).catch(() => {
      toast.error('Không thể sao chép')
    })
  }

  const img = post?.images?.[0]
  const displayUrl = img?.thumbnailUrl || img?.url
  // Premium: chỉ load thumbnail nhỏ (blurred) — KHÔNG load fullUrl của ảnh gốc
  // Đây là bảo vệ thực sự: DevTools chỉ thấy ?w=400 chứ không thấy ảnh gốc
  const safePreviewUrl = post?.isPremium
    ? (img?.thumbnailUrl || (img?.url ? `${img.url.split('/upload/')[0]}/upload/w_400,e_blur:2000/${img.url.split('/upload/')[1]}` : null))
    : img?.url
  const fullUrl = post?.isPremium ? null : img?.url // Chỉ show full URL khi free

  const isOwnPost = currentUser && post?.authorId?._id === currentUser._id

  // Navigate to full detail page
  const goToDetail = () => {
    onClose()
    navigate(`/posts/${postId}`)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <FontStyle />

        {/* Close button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full
            bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10
            flex items-center justify-center text-white transition-all"
          aria-label="Đóng"
        >
          <X size={18} />
        </motion.button>

        {/* Prev/Next navigation */}
        {hasPrev && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50
              w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/10
              flex items-center justify-center text-white transition-all
              hidden md:flex"
          >
            <ChevronLeft size={20} />
          </motion.button>
        )}
        {hasNext && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50
              w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/10
              flex items-center justify-center text-white transition-all
              hidden md:flex"
          >
            <ChevronRight size={20} />
          </motion.button>
        )}

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="modal-glass rounded-2xl overflow-hidden
            w-full max-w-6xl max-h-[95vh]
            flex flex-col md:flex-row
            shadow-[0_40px_120px_rgba(0,0,0,0.8)]
            border border-white/8"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── LEFT: Image Panel ──────────────────────── */}
          <div className="img-panel relative flex items-center justify-center
            md:flex-1 min-h-[280px] md:min-h-0
            overflow-hidden">

            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={onClose} className="mt-4 text-white/40 text-xs hover:text-white">
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {/* Blurred bg */}
                {displayUrl && (
                  <div
                    className="absolute inset-0 opacity-20 scale-110"
                    style={{
                      backgroundImage: `url(${displayUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(20px)',
                    }}
                  />
                )}

                {/* Actual image (free only — premium shows blurred preview) */}
                {safePreviewUrl && (
                  <img
                    src={safePreviewUrl}
                    alt={post?.caption || 'Wallpaper'}
                    className={`relative z-10 max-h-full max-w-full object-contain
                      transition-opacity duration-500
                      ${imgLoaded ? 'opacity-100' : 'opacity-0'}
                      ${post?.isPremium ? 'blur-xl brightness-50 scale-110' : ''}`}
                    onLoad={() => setImgLoaded(true)}
                    style={{ maxHeight: 'min(80vh, 700px)' }}
                    draggable={false}
                    onContextMenu={(e) => post?.isPremium && e.preventDefault()}
                  />
                )}

                {/* Premium lock overlay */}
                {post?.isPremium && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/10 mx-4">
                      <span className="text-3xl mb-2 block">💎</span>
                      <p className="text-white font-bold text-sm mb-1">Ảnh Premium</p>
                      <p className="text-white/50 text-xs">Mua xu để tải về chất lượng gốc</p>
                    </div>
                  </div>
                )}

                {/* Skeleton */}
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse" />
                  </div>
                )}

                {/* Open full size — ẩn với premium */}
                {!post?.isPremium && fullUrl && (
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 right-3 z-20
                      w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm
                      flex items-center justify-center text-white/50
                      hover:text-white hover:bg-black/70 transition-all"
                    title="Xem full size"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}

                {/* Open Detail Page button */}
                <button
                  onClick={goToDetail}
                  className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5
                    px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10
                    text-white/60 hover:text-white hover:bg-black/80 transition-all text-xs font-semibold"
                  title="Xem trang riêng"
                >
                  <Maximize2 size={12} />
                  Trang riêng
                </button>
              </>
            )}
          </div>

          {/* ── RIGHT: Info Panel ──────────────────────── */}
          <div className="flex flex-col w-full md:w-[380px] lg:w-[420px] min-h-0
            border-t md:border-t-0 md:border-l border-white/8 pj">

            {/* ── Author + Actions ── */}
            <div className="flex flex-col gap-3 p-5 border-b border-white/8">
              {/* Author row */}
              {post?.authorId && (
                <div className="flex items-center gap-3">
                  <Link
                    to={`/profile/${post.authorId.username}`}
                    onClick={onClose}
                    className="flex-shrink-0"
                  >
                    <AuthorAvatar user={post.authorId} size={11} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${post.authorId.username}`}
                      onClick={onClose}
                      className="flex items-center gap-1.5 hover:text-violet-300 transition-colors"
                    >
                      <span className="font-semibold text-sm text-white truncate">
                        {post.authorId.displayName || post.authorId.username}
                      </span>
                      {post.authorId.isVerified && (
                        <CheckCircle size={13} className="text-violet-400 flex-shrink-0" />
                      )}
                    </Link>
                    <p className="text-xs text-white/40">
                      @{post.authorId.username}
                    </p>
                  </div>

                  {/* Follow button — ẩn nếu là post của bản thân */}
                  {!isOwnPost && (
                    <motion.button
                      onClick={handleFollow}
                      disabled={followLoading}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                        transition-all border flex-shrink-0
                        ${isFollowing
                          ? 'bg-white/5 border-white/15 text-white/60 hover:border-red-500/40 hover:text-red-400'
                          : 'bg-violet-600/80 border-violet-500/50 text-white hover:bg-violet-600'
                        }`}
                    >
                      {isFollowing ? (
                        <><UserCheck size={12} /> Đang follow</>
                      ) : (
                        <><UserPlus size={12} /> Follow</>
                      )}
                    </motion.button>
                  )}
                </div>
              )}

              {/* Caption */}
              {post?.caption && (
                <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                  {post.caption}
                </p>
              )}

              {/* Tags */}
              {post?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg
                        bg-violet-600/15 border border-violet-500/25
                        text-violet-400 text-[11px] font-medium"
                    >
                      <Tag size={9} />#{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Meta Info ── */}
            {post && (
              <div className="px-5 py-3 border-b border-white/8 flex flex-wrap gap-x-4 gap-y-1.5">
                {post.category && (
                  <span className="text-xs text-white/40">
                    {CATEGORY_LABELS[post.category] || post.category}
                  </span>
                )}
                {post.resolution && (
                  <span className="text-xs text-white/40 uppercase font-bold">
                    {post.resolution}
                  </span>
                )}
                {post.isAIGenerated && (
                  <span className="text-xs text-violet-400 font-medium">✨ AI</span>
                )}
                {post.isPremium && (
                  <span className="text-xs text-amber-400 font-medium">💎 Premium</span>
                )}
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Calendar size={10} />
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}

            {/* ── Stats + Action Buttons ── */}
            {post && (
              <div className="px-5 py-3 border-b border-white/8
                flex items-center gap-4 flex-wrap">
                {/* Like */}
                {post && (
                  <LikeButton
                    postId={post._id}
                    initialLiked={isLiked}
                    initialCount={post.stats?.likesCount || 0}
                    size="md"
                    onToggle={(liked) => setIsLiked(liked)}
                  />
                )}

                {/* Bookmark */}
                {post && (
                  <BookmarkButton
                    postId={post._id}
                    initialBookmarked={isBookmarked}
                    size="md"
                    onToggle={(b) => setIsBookmarked(b)}
                  />
                )}

                {/* Views */}
                <span className="flex items-center gap-1.5 text-white/30 text-xs">
                  <Eye size={14} />
                  {(post.stats?.viewsCount || 0).toLocaleString()}
                </span>

                {/* Share */}
                <motion.button
                  onClick={handleShare}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center gap-1.5 text-white/30
                    hover:text-white transition-colors"
                  title="Sao chép link"
                >
                  <Share2 size={16} />
                </motion.button>

                {/* Download — đẩy ra phải */}
                <div className="ml-auto">
                  {post && (
                    <DownloadButton
                      postId={post._id}
                      isPremium={post.isPremium}
                      priceInCoins={post.priceInCoins}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── Comments ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0
              scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {post && (
                <CommentSection
                  postId={post._id}
                  initialCount={post.stats?.commentsCount || 0}
                />
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PostDetailModal
