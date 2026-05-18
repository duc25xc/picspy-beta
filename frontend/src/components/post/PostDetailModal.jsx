import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Share2, Eye, Tag, Calendar, CheckCircle,
  ChevronLeft, ChevronRight, UserPlus, UserCheck, Maximize2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import LikeButton from './LikeButton'
import BookmarkButton from './BookmarkButton'
import DownloadButton from './DownloadButton'
import CommentSection from './CommentSection'
import ExifPanel from './ExifPanel'
import ImageGallery from './ImageGallery'
import PromptBlock from './PromptBlock'
import toast from 'react-hot-toast'

/* ─── Ambient glow builder ────────────────────────────────────── */
/**
 * Tạo CSS radial-gradient đa lớp từ colorPalette (giống YouTube Ambient Mode).
 * Mỗi màu toả ra từ một góc/vị trí khác nhau để tạo hiệu ứng ánh sáng bao phủ.
 */
const buildAmbientGradient = (palette = []) => {
  if (!palette?.length) return null
  const positions = [
    '10% 20%', '90% 15%', '50% 80%', '20% 70%', '80% 60%', '40% 30%',
  ]
  const layers = palette.slice(0, 6).map((hex, i) => {
    const pos = positions[i % positions.length]
    return `radial-gradient(ellipse 90% 80% at ${pos}, ${hex}55 0%, transparent 70%)`
  })
  return layers.join(', ')
}

/* ─── Font & inline styles ────────────────────────────────────── */
const FontStyle = () => (
  <style>{`
    .pj { font-family: 'Plus Jakarta Sans', sans-serif; }
    .modal-glass {
      background: rgba(10,9,14,0.97);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
    }
    .img-panel { background: #07060b; }
    @keyframes ambient-pulse {
      0%,100% { opacity: 0.55; transform: scale(1); }
      50%      { opacity: 0.75; transform: scale(1.04); }
    }
    .ambient-layer {
      animation: ambient-pulse 5s ease-in-out infinite;
    }
  `}</style>
)

/* ─── Avatar ──────────────────────────────────────────────────── */
const AuthorAvatar = ({ user, size = 10 }) => {
  const s = `w-${size} h-${size}`
  if (user?.avatar) {
    return (
      <img src={user.avatar} alt={user.username}
        className={`${s} rounded-full object-cover ring-2 ring-white/10 flex-shrink-0`} />
    )
  }
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-violet-600 to-blue-500
      flex items-center justify-center text-white font-bold pj flex-shrink-0`}>
      {user?.username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

/* ─── Color Palette Display ───────────────────────────────────── */
const ColorPaletteStrip = ({ palette }) => {
  if (!palette?.length) return null
  return (
    <div className="px-5 py-2.5 border-b border-white/8">
      <p className="text-[10px] text-white/25 mb-2 font-medium tracking-wider uppercase">Màu chủ đạo</p>
      <div className="flex gap-2 items-center">
        {palette.slice(0, 6).map((hex, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.06 + 0.2 }}
            title={hex}
            className="group relative"
          >
            <div
              className="w-6 h-6 rounded-lg border border-white/15 cursor-pointer
                hover:scale-125 hover:ring-2 hover:ring-white/30 transition-all duration-200 shadow-lg"
              style={{ backgroundColor: hex }}
            />
            {/* Tooltip hex */}
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2
              text-[9px] text-white/40 opacity-0 group-hover:opacity-100
              transition-opacity whitespace-nowrap pointer-events-none">
              {hex}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Modal ──────────────────────────────────────────────── */
const PostDetailModal = ({ postId, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  const navigate   = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const isLoggedIn  = useAuthStore((s) => !!s.user && !!s.accessToken)

  const [post, setPost]             = useState(null)
  const [isLiked, setIsLiked]       = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [imgLoaded, setImgLoaded]   = useState(false)
  const [ambientReady, setAmbientReady] = useState(false)

  /* Tính ambient gradient memoized — chỉ recompute khi palette đổi */
  const ambientGradient = useMemo(
    () => buildAmbientGradient(post?.colorPalette),
    [post?.colorPalette]
  )

  /* Track view — debounce 800ms: nhấn Next nhanh chỉ tính view khi dừng lại */
  const viewTimer = useRef(null)
  const trackView = useCallback((id) => {
    clearTimeout(viewTimer.current)
    viewTimer.current = setTimeout(async () => {
      try { await api.post(`/posts/${id}/view`) } catch { /* bỏ qua nếu lỗi */ }
    }, 800)
  }, [])

  /* Fetch post — KHÔNG gọi trackView ở đây (tránh double count) */
  const fetchPost = useCallback(async (id) => {
    setLoading(true); setError(null)
    setImgLoaded(false); setAmbientReady(false)
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data.post)
      setIsLiked(data.isLiked || false)
      setIsBookmarked(data.isBookmarked || false)
      setIsFollowing(data.isFollowingAuthor || false)
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy bài đăng')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!postId) return
    fetchPost(postId)
    trackView(postId) // debounced — chỉ tính khi dừng lại >= 800ms
    // URL được quản lý bởi useModalUrl ở parent component (HomePage/SearchPage)
    // hoặc PostDeepLinkPage — không push/restore ở đây để tránh conflict
  }, [postId]) // eslint-disable-line

  /* Keyboard nav */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  /* Kích hoạt ambient sau khi ảnh load xong */
  useEffect(() => {
    if (imgLoaded && ambientGradient) {
      const t = setTimeout(() => setAmbientReady(true), 100)
      return () => clearTimeout(t)
    }
  }, [imgLoaded, ambientGradient])

  /* ─── Follow/Unfollow ── */
  const handleFollow = async () => {
    if (!isLoggedIn) { toast('Đăng nhập để follow creator này 💜', { icon: '🔒' }); return }
    if (followLoading) return
    const was = isFollowing
    setIsFollowing(!was); setFollowLoading(true)
    try {
      await api.post(`/users/${post.authorId._id}/follow`)
      toast(was ? 'Đã bỏ follow' : `Đang follow @${post.authorId.username}`, {
        icon: was ? '✓' : '💜', duration: 1500,
      })
    } catch { setIsFollowing(was); toast.error('Không thể thực hiện') }
    finally { setFollowLoading(false) }
  }

  /* ─── Share ── */
  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`)
      .then(() => toast.success('Đã sao chép link!'))
      .catch(() => toast.error('Không thể sao chép'))
  }

  const firstImg = post?.generatedImages?.[0] || post?.images?.[0]
  const displayUrl = firstImg?.thumbnailUrl || firstImg?.url
  const isOwnPost = currentUser && post?.authorId?._id === currentUser._id

  const goToDetail = () => { onClose(); navigate(`/posts/${postId}`) }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <FontStyle />

        {/* Close */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }} onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full
            bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10
            flex items-center justify-center text-white transition-all"
          aria-label="Đóng"
        >
          <X size={18} />
        </motion.button>

        {/* Prev/Next */}
        {hasPrev && (
          <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50
              w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/10
              flex items-center justify-center text-white transition-all hidden md:flex">
            <ChevronLeft size={20} />
          </motion.button>
        )}
        {hasNext && (
          <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50
              w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/10
              flex items-center justify-center text-white transition-all hidden md:flex">
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
            shadow-[0_40px_120px_rgba(0,0,0,0.9)]
            border border-white/8 relative"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ═══ LEFT: Image Gallery ════════════════════════════ */}
          <div className="img-panel relative flex items-center justify-center
            md:flex-1 min-h-[280px] md:min-h-0 overflow-hidden p-3">

            {/* ── Ambient Mode Layer ── */}
            {ambientGradient && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: ambientReady ? 1 : 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="ambient-layer absolute inset-0 z-0 pointer-events-none"
                style={{
                  background: ambientGradient,
                  filter: 'blur(40px)',
                  mixBlendMode: 'screen',
                }}
              />
            )}

            {loading ? (
              <div className="flex items-center justify-center relative z-10 w-full min-h-[260px]">
                <motion.div
                  className="w-8 h-8 border-2 border-[#7986eb]/40 border-t-[#7986eb] rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            ) : error ? (
              <div className="text-center p-8 relative z-10">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={onClose} className="mt-4 text-white/40 text-xs hover:text-white">Đóng</button>
              </div>
            ) : post ? (
              <div className="relative z-10 w-full">
                <ImageGallery
                  generatedImages={post.generatedImages || []}
                  sourceImages={post.sourceImages || []}
                  legacyImages={post.images || []}
                  aiTool={post.aiTool}
                  aiModel={post.aiModel}
                  isPremium={post.isPremium}
                  isUnlocked={!post.isPremium}
                  caption={post.caption}
                />
                {/* Trang riêng button */}
                <button
                  onClick={goToDetail}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    border border-white/10 text-white/50 hover:text-white/80
                    transition-all text-xs font-semibold backdrop-blur-md"
                  style={{ background: 'rgba(10,9,14,0.5)', fontFamily: 'Outfit, sans-serif' }}
                >
                  <Maximize2 size={11} />
                  Xem trang riêng
                </button>
              </div>
            ) : null}
          </div>

          {/* ═══ RIGHT: Info Panel ═══════════════════════════════ */}
          <div className="flex flex-col w-full md:w-[380px] lg:w-[420px] min-h-0
            border-t md:border-t-0 md:border-l border-white/8 pj">

            {/* Author + Actions */}
            <div className="flex flex-col gap-3 p-5 border-b border-white/8">
              {post?.authorId && (
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${post.authorId.username}`} onClick={onClose} className="flex-shrink-0">
                    <AuthorAvatar user={post.authorId} size={11} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${post.authorId.username}`} onClick={onClose}
                      className="flex items-center gap-1.5 hover:text-violet-300 transition-colors">
                      <span className="font-semibold text-sm text-white truncate">
                        {post.authorId.displayName || post.authorId.username}
                      </span>
                      {post.authorId.isVerified && <CheckCircle size={13} className="text-violet-400 flex-shrink-0" />}
                    </Link>
                    <p className="text-xs text-white/40">@{post.authorId.username}</p>
                  </div>
                  {!isOwnPost && (
                    <motion.button
                      onClick={handleFollow} disabled={followLoading}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                        transition-all border flex-shrink-0
                        ${isFollowing
                          ? 'bg-white/5 border-white/15 text-white/60 hover:border-red-500/40 hover:text-red-400'
                          : 'bg-violet-600/80 border-violet-500/50 text-white hover:bg-violet-600'}`}
                    >
                      {isFollowing ? <><UserCheck size={12} /> Đang follow</> : <><UserPlus size={12} /> Follow</>}
                    </motion.button>
                  )}
                </div>
              )}

              {post?.caption && (
                <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{post.caption}</p>
              )}

              {post?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg
                        bg-violet-600/15 border border-violet-500/25
                        text-violet-400 text-[11px] font-medium">
                      <Tag size={9} />#{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Block — compact trong modal */}
            {post?.prompt && (
              <div className="px-5 pt-3">
                <PromptBlock text={post.prompt} variant="prompt" collapseAfter={4} />
              </div>
            )}

            {/* Meta Info */}
            {post && (
              <div className="px-5 py-3 border-b border-white/8 flex flex-wrap gap-x-4 gap-y-1.5">
                {post.category && (
                  <span className="text-xs text-white/40">{post.category}</span>
                )}
                {post.resolution && (
                  <span className="text-xs font-bold uppercase" style={{ color: '#7986eb' }}>{post.resolution}</span>
                )}
                {post.aiTool && (
                  <span className="text-xs font-medium" style={{ color: '#7986eb' }}>✨ {post.aiTool}</span>
                )}
                {post.isPremium && <span className="text-xs text-amber-400 font-medium">💎 Premium</span>}
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Calendar size={10} />
                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}

            {/* EXIF Panel — compact mode cho modal (inline pills) */}
            {post && (
              <ExifPanel
                exifData={post.exifData}
                histogram={post.histogram}
                colorPalette={post.colorPalette}
                compact
              />
            )}

            {/* Fallback: Color strip đơn giản nếu không có ExifPanel data */}
            {post && !post.exifData && !post.histogram && (
              <ColorPaletteStrip palette={post.colorPalette} />
            )}

            {/* Stats + Action Buttons */}
            {post && (
              <div className="px-5 py-3 border-b border-white/8 flex items-center gap-4 flex-wrap">
                <LikeButton
                  postId={post._id} initialLiked={isLiked}
                  initialCount={post.stats?.likesCount || 0} size="md"
                  onToggle={(liked) => setIsLiked(liked)}
                />
                <BookmarkButton
                  postId={post._id} initialBookmarked={isBookmarked}
                  size="md" onToggle={(b) => setIsBookmarked(b)}
                />
                <span className="flex items-center gap-1.5 text-white/30 text-xs">
                  <Eye size={14} />
                  {(post.stats?.viewsCount || 0).toLocaleString()}
                </span>
                <motion.button
                  onClick={handleShare} whileTap={{ scale: 0.9 }}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white transition-colors"
                  title="Sao chép link"
                >
                  <Share2 size={16} />
                </motion.button>
                <div className="ml-auto">
                  <DownloadButton
                    postId={post._id}
                    isPremium={post.isPremium}
                    priceInCoins={post.priceInCoins}
                  />
                </div>
              </div>
            )}

            {/* Comments */}
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
