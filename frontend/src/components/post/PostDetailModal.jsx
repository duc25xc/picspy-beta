import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Share2,
  Eye,
  Tag,
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserCheck,
  Maximize2,
  Flag,
  Check,
} from 'lucide-react'
import { IoSparkles } from 'react-icons/io5'
import { GiCutDiamond } from 'react-icons/gi'
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
import ConfirmModal from '../common/ConfirmModal'
import { useSettings } from '../../context/SettingsContext'

/* ─── Ambient glow builder ────────────────────────────────────── */
/**
 * Tạo CSS radial-gradient đa lớp từ colorPalette (giống YouTube Ambient Mode).
 * Mỗi màu toả ra từ một góc/vị trí khác nhau để tạo hiệu ứng ánh sáng bao phủ.
 */
const buildAmbientGradient = (palette = []) => {
  if (!palette?.length) return null
  const positions = [
    '10% 20%',
    '90% 15%',
    '50% 80%',
    '20% 70%',
    '80% 60%',
    '40% 30%',
  ]
  const layers = palette.slice(0, 6).map((hex, i) => {
    const pos = positions[i % positions.length]
    return `radial-gradient(ellipse 90% 80% at ${pos}, ${hex}55 0%, transparent 70%)`
  })
  return layers.join(', ')
}

const formatDate = (dateInput) => {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/* ─── NOTE: FontStyle component removed ─────────────────────────
   Plus Jakarta Sans is loaded globally in index.html.
   Injecting a <style> tag at runtime (when modal opens) caused:
   1. FOUT / reflow → background text sizes jumped
   2. The .pj class re-cascade changed font metrics on ExplorePage
      elements (header, tabs, description) that also use .pj
   Instead, .modal-glass / .img-panel / .ambient-layer are defined
   once in index.css (see @layer components block).
───────────────────────────────────────────────────────────────── */

/* ─── Avatar ──────────────────────────────────────────────────── */
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

/* ─── Color Palette Display ───────────────────────────────────── */
const ColorPaletteStrip = ({ palette }) => {
  const handleCopy = (hex) => {
    navigator.clipboard?.writeText(hex)
    toast.success(`Đã sao chép: ${hex} 🎨`, { id: `copy-${hex}`, duration: 1500 })
  }

  if (!palette?.length) return null
  return (
    <div className="px-5 py-2.5 border-b border-white/8">
      <p className="text-[10px] text-white/25 mb-2 font-medium tracking-wider uppercase">
        Màu chủ đạo (Click để copy)
      </p>
      <div className="flex gap-2 items-center">
        {palette.slice(0, 6).map((hex, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.06 + 0.2 }}
            title={`Click để copy: ${hex}`}
            className="group relative"
          >
            <div
              onClick={() => handleCopy(hex)}
              className="w-6 h-6 rounded-lg border border-white/15 cursor-pointer
                hover:scale-125 hover:ring-2 hover:ring-white/30 transition-all duration-200 shadow-lg active:scale-95"
              style={{ backgroundColor: hex }}
            />
            {/* Tooltip hex */}
            <span
              className="absolute -bottom-5 left-1/2 -translate-x-1/2
              text-[9px] text-white/40 opacity-0 group-hover:opacity-100
              transition-opacity whitespace-nowrap pointer-events-none"
            >
              {hex}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Modal ──────────────────────────────────────────────── */
const PostDetailModal = ({
  postId,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const navigate = useNavigate()
  const { postDetailLayout } = useSettings()
  const currentUser = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)

  const [post, setPost] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [ambientReady, setAmbientReady] = useState(false)

  // Feedback states
  const [copied, setCopied] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

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
      try {
        await api.post(`/posts/${id}/view`)
      } catch {
        /* bỏ qua nếu lỗi */
      }
    }, 800)
  }, [])

  /* Fetch post — KHÔNG gọi trackView ở đây (tránh double count) */
  const fetchPost = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    setImgLoaded(false)
    setAmbientReady(false)
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost({
        ...data.post,
        purchasedFileTypes: data.purchasedFileTypes || [],
      })
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
  }, [postId]) // eslint-disable-line

  /* Keyboard nav */
  useEffect(() => {
    const handleKey = (e) => {
      const isEditable =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      if (isEditable) return

      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  /* ─── Body-scroll-lock — ZERO layout shift ────────────────────
   *
   * The shift happens because:
   *   `position:fixed + width:100%` makes body as wide as the VIEWPORT
   *   (e.g. 1024px) instead of the content area (1024 - scrollbar = 1009px).
   *   That extra ~15px expansion pushes centered content LEFT.
   *
   * Fix: measure body.clientWidth RIGHT NOW (the true content width)
   *   then pin that exact pixel value on the fixed body.
   */
  useEffect(() => {
    const body = document.body
    const scrollY = window.scrollY
    // Snapshot the body's actual layout width BEFORE any changes.
    // We CANNOT use '100%' here: position:fixed resolves 100% against the
    // VIEWPORT (e.g. 1024px), but the body was previously narrower by the
    // scrollbar width (e.g. 1024 - 6 = 1018px). That extra expansion is what
    // pushes centered content to the LEFT.
    const lockedWidth = body.getBoundingClientRect().width

    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = `${lockedWidth}px` // ← exact px, NOT '100%'

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      window.scrollTo({ top: scrollY, behavior: 'instant' })
    }
  }, [])

  /* Kích hoạt ambient sau khi ảnh load xong */
  useEffect(() => {
    if (imgLoaded && ambientGradient) {
      const t = setTimeout(() => setAmbientReady(true), 100)
      return () => clearTimeout(t)
    }
  }, [imgLoaded, ambientGradient])

  // ── Sync follow state across tabs ──────────────────────────────
  useEffect(() => {
    if (!post?.authorId?._id) return
    const channel = new BroadcastChannel('picspy_follow_sync')
    const handleMessage = (event) => {
      const { creatorId, isFollowing: newIsFollowing } = event.data
      if (post.authorId._id === creatorId) {
        setIsFollowing(newIsFollowing)
      }
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [post?.authorId?._id])

  /* ─── Follow/Unfollow ── */
  const confirmUnfollow = async () => {
    if (followLoading) return
    setFollowLoading(true)
    try {
      const { data } = await api.post(`/users/${post.authorId._id}/follow`)
      setIsFollowing(data.following)
      toast('Đã bỏ follow', { icon: '✓', duration: 1500 })

      // Broadcast sự kiện sync cho các tab khác
      const channel = new BroadcastChannel('picspy_follow_sync')
      channel.postMessage({
        creatorId: post.authorId._id,
        isFollowing: data.following,
      })
      channel.close()
    } catch {
      toast.error('Không thể thực hiện')
    } finally {
      setFollowLoading(false)
      setShowUnfollowConfirm(false)
    }
  }

  const handleFollow = async () => {
    if (!isLoggedIn) {
      toast('Đăng nhập để follow creator này 💜', { icon: '🔒' })
      return
    }
    if (isFollowing) {
      setShowUnfollowConfirm(true)
    } else {
      if (followLoading) return
      setFollowLoading(true)
      try {
        const { data } = await api.post(`/users/${post.authorId._id}/follow`)
        setIsFollowing(data.following)
        toast(`Đang follow @${post.authorId.username}`, {
          icon: '💜',
          duration: 1500,
        })

        // Broadcast sự kiện sync cho các tab khác
        const channel = new BroadcastChannel('picspy_follow_sync')
        channel.postMessage({
          creatorId: post.authorId._id,
          isFollowing: data.following,
        })
        channel.close()
      } catch {
        toast.error('Không thể thực hiện')
      } finally {
        setFollowLoading(false)
      }
    }
  }

  /* ─── Share ── */
  const handleShare = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/posts/${postId}`)
      .then(() => {
        setCopied(true)
        toast.success('Đã sao chép link!')
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => toast.error('Không thể sao chép'))
  }

  /* ─── Report ── */
  const handleReportSubmit = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) {
      toast('Đăng nhập để báo cáo vi phạm 🔒')
      return
    }
    if (!reportReason.trim()) {
      toast.error('Vui lòng chọn hoặc điền lý do')
      return
    }

    setReporting(true)
    try {
      await api.post(`/posts/${postId}/report`, { reason: reportReason })
      toast.success('Gửi báo cáo thành công! Admin sẽ kiểm duyệt.')
      setShowReportDialog(false)
      setReportReason('')
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi báo cáo'
      toast.error(msg)
    } finally {
      setReporting(false)
    }
  }

  const firstImg = post?.generatedImages?.[0] || post?.images?.[0]
  const displayUrl = firstImg?.thumbnailUrl || firstImg?.url
  const isOwnPost = currentUser && post?.authorId?._id === currentUser._id

  const goToDetail = () => {
    onClose()
    navigate(`/posts/${postId}`)
  }

  return (
    <>
      <motion.div
        key="post-detail-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* FontStyle removed — styles now live in index.css */}

        {/* Close */}
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

        {/* Prev/Next */}
        {hasPrev && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50
              w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
              backdrop-blur-md border border-white/10
              flex items-center justify-center text-white transition-all hidden md:flex"
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
              flex items-center justify-center text-white transition-all hidden md:flex"
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
            w-full max-w-6xl h-[820px] max-h-[95vh]
            flex flex-col md:flex-row
            shadow-[0_40px_120px_rgba(0,0,0,0.9)]
            border border-white/8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ═══ Info Panel ═══════════════════════════════ */}
          <div
            className={`flex flex-col w-full md:w-[380px] lg:w-[420px] min-h-0 order-2
              ${postDetailLayout === 'right-image' ? 'md:order-1 md:border-r' : 'md:order-2 md:border-l'}
              border-b md:border-b-0 border-white/8 pj
              overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10`}
          >
            {/* Author + Actions */}
            <div className="flex flex-col gap-3 p-5 border-b border-white/8">
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
                        <CheckCircle
                          size={13}
                          className="text-violet-400 flex-shrink-0"
                        />
                      )}
                    </Link>
                    <p className="text-xs text-white/40">
                      @{post.authorId.username}
                    </p>
                  </div>
                  {!isOwnPost && (
                    <motion.button
                      onClick={handleFollow}
                      disabled={followLoading}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                        transition-all border flex-shrink-0
                        ${
                          isFollowing
                            ? 'bg-white/5 border-white/15 text-white/60 hover:border-red-500/40 hover:text-red-400'
                            : 'bg-brand-600 hover:bg-brand-500 text-white'
                        }`}
                      style={
                        isFollowing
                          ? {}
                          : {
                              backdropFilter: 'var(--color-brand-blur, none)',
                              border:
                                '1px solid rgba(255, 255, 255, calc((1 - var(--color-brand-opacity, 1)) * 0.15))',
                            }
                      }
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={12} /> Đang follow
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} /> Follow
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              )}

              {post?.caption && (
                <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                  {post.caption}
                </p>
              )}

              {post?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/search?q=${encodeURIComponent(tag)}`}
                      onClick={() => onClose?.()}
                      className="badge-brand flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium hover:bg-brand-500/25 hover:text-white transition-colors cursor-pointer select-none"
                    >
                      <Tag size={9} />#{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt Blocks — compact trong modal */}
            {post?.postType === 'ai' && post?.prompt && (
              <div className="px-5 pt-3 space-y-2">
                <PromptBlock
                  text={post.prompt}
                  variant="prompt"
                  collapseAfter={4}
                  parameters={post.parameters}
                />
                {post.negativePrompt && (
                  <PromptBlock
                    text={post.negativePrompt}
                    variant="negative"
                    collapseAfter={3}
                  />
                )}
                {post.parameters && (
                  <PromptBlock
                    text={post.parameters}
                    variant="parameters"
                    collapseAfter={3}
                  />
                )}
                {post.workflowJson && (
                  <PromptBlock
                    text={post.workflowJson}
                    variant="json"
                    collapseAfter={6}
                  />
                )}
              </div>
            )}

            {/* Meta Info */}
            {post && (
              <div className="px-5 py-3 border-b border-white/8 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {post.postType && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      post.postType === 'ai'
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                        : post.postType === 'digital-raw'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {post.postType === 'ai'
                      ? '✦ AI'
                      : post.postType === 'digital-raw'
                        ? '📷 RAW'
                        : 'Ảnh Digital'}
                  </span>
                )}
                {post.category && (
                  <span className="text-xs text-white/40">{post.category}</span>
                )}
                {post.resolution && (
                  <span
                    className="text-xs font-bold uppercase"
                    style={{ color: '#7986eb' }}
                  >
                    {post.resolution}
                  </span>
                )}
                {post.aiTool && (
                  <span
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: '#7986eb' }}
                  >
                    <IoSparkles size={11} className="text-[#7986eb]" />
                    {post.aiTool}
                  </span>
                )}
                {post.isPremium && (
                  <span className="group relative overflow-hidden inline-flex items-center gap-1.5
                    px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide
                    bg-black/65 border border-amber-500/45 text-amber-400
                    backdrop-blur-md shadow-[0_0_12px_rgba(251,191,36,0.15)]
                    cursor-default select-none transition-shadow duration-300
                    hover:shadow-[0_0_18px_rgba(251,191,36,0.28)]"
                  >
                    {/* shimmer sweep */}
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                      transition-transform duration-700 ease-out pointer-events-none
                      bg-gradient-to-r from-transparent via-amber-300/25 to-transparent" />
                    <GiCutDiamond size={10} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    PREMIUM
                  </span>
                )}
                <div className="flex flex-col gap-1 text-[11px] text-white/40 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-white/30" />
                    <span>Ngày đăng: {formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye size={11} className="text-white/30" />
                    <span>Lượt xem: {(post.stats?.viewsCount || 0).toLocaleString()} views</span>
                  </div>
                  {post.exifData?.dateTaken && (
                    <div className="flex items-center gap-1.5">
                      <Camera size={11} className="text-white/30" />
                      <span>
                        Ngày chụp: {formatDate(post.exifData.dateTaken)}
                      </span>
                    </div>
                  )}
                </div>
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

            {/* Bảng màu chủ đạo — ExifPanel compact KHÔNG render palette nên luôn hiện ở đây */}
            {post?.colorPalette?.length > 0 && (
              <ColorPaletteStrip palette={post.colorPalette} />
            )}

             {/* Stats + Action Buttons */}
             {post && (
               <div className="px-5 py-4 border-b border-white/8 space-y-4">
                 {/* Full width Download row */}
                 <div className="w-full">
                   <DownloadButton
                     post={post}
                     postId={post._id}
                     isPremium={post.isPremium}
                     priceInVnd={post.priceInVnd}
                     variant="detail"
                   />
                 </div>

                 {/* Micro-actions row */}
                 <div className="flex items-center justify-between px-1 text-white/50">
                   <LikeButton
                     postId={post._id}
                     initialLiked={isLiked}
                     initialCount={post.stats?.likesCount || 0}
                     size="md"
                     onToggle={(liked) => setIsLiked(liked)}
                   />
                   <BookmarkButton
                     postId={post._id}
                     initialBookmarked={isBookmarked}
                     showCount={true}
                     initialCount={post.stats?.bookmarksCount || 0}
                     size="md"
                     onToggle={(b) => setIsBookmarked(b)}
                   />
                   <motion.button
                     onClick={handleShare}
                     whileTap={{ scale: 0.9 }}
                     animate={copied ? { scale: [1, 1.15, 0.95, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                     transition={{ duration: 0.45, ease: 'easeInOut' }}
                     className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 py-1 ${
                       copied ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'text-white/30 hover:text-white'
                     }`}
                     title="Sao chép link"
                   >
                     <motion.span
                       animate={copied ? { rotate: [0, 360], scale: [1, 1.25, 1] } : { rotate: 0, scale: 1 }}
                       transition={{ duration: 0.4, ease: 'easeOut' }}
                       className="flex items-center justify-center shrink-0"
                     >
                       {copied ? <Check size={14} /> : <Share2 size={14} />}
                     </motion.span>
                     <span>{(post.stats?.sharesCount || 0).toLocaleString()}</span>
                   </motion.button>

                   {!isOwnPost && (
                     <motion.button
                       onClick={() => setShowReportDialog(true)}
                       whileTap={{ scale: 0.9 }}
                       className="flex items-center gap-1.5 text-white/30 hover:text-red-400 transition-colors text-xs font-semibold py-1 cursor-pointer"
                       title="Báo cáo vi phạm"
                     >
                       <Flag size={14} />
                       <span>Báo cáo</span>
                     </motion.button>
                   )}
                 </div>
               </div>
             )}

            {/* Comments */}
            <div className="px-5 py-4 min-h-0 border-t border-white/5">
              {post && (
                <CommentSection
                  postId={post._id}
                  initialCount={post.stats?.commentsCount || 0}
                />
              )}
            </div>
          </div>

          {/* ═══ Image Gallery ════════════════════════════ */}
          <div
            className={`img-panel relative flex items-center justify-center
              md:flex-1 min-h-[280px] md:min-h-0 overflow-hidden p-3 order-1
              ${postDetailLayout === 'right-image' ? 'md:order-2' : 'md:order-1'}`}
          >
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
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
            ) : error ? (
              <div className="text-center p-8 relative z-10">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 text-white/40 text-xs hover:text-white"
                >
                  Đóng
                </button>
              </div>
            ) : post ? (
              <>
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
                    onExpand={goToDetail}
                    isMultiModel={post.isMultiModel}
                    modelComparisons={post.modelComparisons}
                    maxImageHeight="max-h-[58vh]"
                  />
                </div>
                {/* Trang riêng button - Floating Sticker style (Transparent/Translucent) */}
                <button
                  onClick={goToDetail}
                  className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                    border border-white/15 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/10 shadow-lg
                    transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-xs font-semibold backdrop-blur-md cursor-pointer"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    fontFamily: 'Outfit, sans-serif',
                    letterSpacing: '0.03em',
                  }}
                >
                  <Maximize2 size={11} />
                  Xem trang riêng
                </button>
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>

      {/* Unfollow Confirm Dialog */}
      <ConfirmModal
        isOpen={showUnfollowConfirm}
        onClose={() => setShowUnfollowConfirm(false)}
        onConfirm={confirmUnfollow}
        title="Hủy theo dõi?"
        message={
          post?.authorId ? (
            <>
              Bạn có chắc chắn muốn hủy theo dõi{' '}
              <span className="text-white font-bold whitespace-nowrap">
                {post.authorId.displayName || post.authorId.username}
              </span>{' '}
              không?
            </>
          ) : (
            ''
          )
        }
        confirmText="Hủy theo dõi"
        cancelText="Bỏ qua"
        type="danger"
        zIndex={300}
      />

      {/* Report Modal Dialog */}
      <AnimatePresence>
        {showReportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md bg-[#161426]/90 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute -top-10 -right-10 w-[150px] h-[150px] bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Flag className="text-red-400" size={20} /> Báo cáo bài viết
              </h3>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Giúp PicSpy giữ gìn môi trường nghệ thuật lành mạnh. Vui lòng chọn hoặc nhập lý do bài đăng này vi phạm tiêu chuẩn cộng đồng.
              </p>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="space-y-2">
                  {[
                    'Nội dung nhạy cảm, người lớn (NSFW)',
                    'Bản quyền/Ăn cắp tác phẩm',
                    'Spam hoặc nội dung lừa đảo',
                    'Nội dung thù ghét, bạo lực',
                    'Lý do khác (Nhập chi tiết bên dưới)',
                  ].map((preset) => (
                    <label
                      key={preset}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors text-xs text-white/80"
                    >
                      <input
                        type="radio"
                        name="reportReasonPreset"
                        value={preset}
                        checked={
                          reportReason === preset ||
                          (preset.startsWith('Lý do khác') &&
                            !['Nội dung nhạy cảm, người lớn (NSFW)', 'Bản quyền/Ăn cắp tác phẩm', 'Spam hoặc nội dung lừa đảo', 'Nội dung thù ghét, bạo lực'].includes(reportReason) &&
                            reportReason.length > 0)
                        }
                        onChange={() => setReportReason(preset)}
                        className="mt-0.5 accent-brand-500"
                      />
                      <span>{preset}</span>
                    </label>
                  ))}
                </div>

                {(reportReason.startsWith('Lý do khác') ||
                  (!['Nội dung nhạy cảm, người lớn (NSFW)', 'Bản quyền/Ăn cắp tác phẩm', 'Spam hoặc nội dung lừa đảo', 'Nội dung thù ghét, bạo lực'].includes(reportReason) &&
                    reportReason.length > 0)) && (
                  <textarea
                    placeholder="Vui lòng nhập lý do cụ thể..."
                    rows={3}
                    onChange={(e) => setReportReason(e.target.value)}
                    value={
                      ['Nội dung nhạy cảm, người lớn (NSFW)', 'Bản quyền/Ăn cắp tác phẩm', 'Spam hoặc nội dung lừa đảo', 'Nội dung thù ghét, bạo lực'].includes(reportReason)
                        ? ''
                        : reportReason.startsWith('Lý do khác')
                        ? ''
                        : reportReason
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 resize-none"
                    required
                  />
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportDialog(false)
                      setReportReason('')
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white/55 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={reporting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/35 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {reporting ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default PostDetailModal
