import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, Download, Share2,
  Calendar, Tag, Zap, Crown, Camera, Flag, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import useTierAccess from '../hooks/useTierAccess'
import { GiCutDiamond } from 'react-icons/gi'
import DownloadButton from '../components/post/DownloadButton'
import LikeButton from '../components/post/LikeButton'
import BookmarkButton from '../components/post/BookmarkButton'
import CommentSection from '../components/post/CommentSection'
import ExifPanel from '../components/post/ExifPanel'
import LensSpyPanel from '../components/post/LensSpyPanel'
import ImageGallery from '../components/post/ImageGallery'
import PromptBlock from '../components/post/PromptBlock'

/* ─── Ambient gradient ──────────────────────────────────────────── */
const buildAmbientGradient = (palette = []) => {
  if (!palette?.length) return null
  const positions = ['15% 20%', '85% 15%', '50% 85%', '20% 65%', '80% 55%', '45% 35%']
  return palette.slice(0, 6).map((hex, i) =>
    `radial-gradient(ellipse 100% 90% at ${positions[i % positions.length]}, ${hex}55 0%, transparent 65%)`
  ).join(', ')
}

const extractColorsFromImg = (src, count = 4) =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let s = src
    if (src?.includes('/upload/')) {
      const [base, rest] = src.split('/upload/')
      s = `${base}/upload/w_64,f_jpg,q_50/${rest}`
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 64
        canvas.height = img.naturalHeight || 64
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = []
        for (let i = 0; i < data.length; i += 12) {
          const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]]
          const br = r + g + b
          if (a > 180 && br > 40 && br < 720) pixels.push([r, g, b])
        }
        if (!pixels.length) { resolve([]); return }
        const quantize = (pts, depth) => {
          if (depth === 0 || pts.length < 2) {
            const avg = pts.reduce((a, p) => [a[0]+p[0], a[1]+p[1], a[2]+p[2]], [0,0,0])
              .map(v => Math.round(v / pts.length))
            return [avg]
          }
          const ranges = [0,1,2].map(ch => {
            const vals = pts.map(p => p[ch])
            return Math.max(...vals) - Math.min(...vals)
          })
          const ch = ranges.indexOf(Math.max(...ranges))
          pts.sort((a, b) => a[ch] - b[ch])
          const mid = Math.floor(pts.length / 2)
          return [...quantize(pts.slice(0, mid), depth-1), ...quantize(pts.slice(mid), depth-1)]
        }
        const clusters = quantize([...pixels], Math.log2(count))
        resolve(clusters.slice(0, count).map(([r,g,b]) =>
          `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
        ))
      } catch { resolve([]) }
    }
    img.onerror = () => resolve([])
    img.src = s
  })

/* ─── Download Button Wrapper ───────────────────────────────── */
const PostDownloadButton = ({ post, onUnlock }) => {
  return (
    <DownloadButton
      post={post}
      variant="detail"
      onUnlock={onUnlock}
    />
  )
}

/* ─── Main ──────────────────────────────────────────────────────── */
const PostDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [post, setPost]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [palette, setPalette]       = useState([])
  const [ambientReady, setAmbientReady] = useState(false)
  const [imgLoaded, setImgLoaded]   = useState(false)

  // Track which image is active in gallery — để show/hide ExifPanel
  const [activeIsSource, setActiveIsSource] = useState(false)
  const [activeImg, setActiveImg]   = useState(null)

  // Report & copy feedback states
  const [copied, setCopied] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  // Tier access — đặt ở đây để không vi phạm Rules of Hooks
  const tierAccess = useTierAccess()

  const fetchPost = useCallback(async () => {
    setLoading(true)
    setPalette([]); setAmbientReady(false); setImgLoaded(false)
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost({
        ...data.post,
        purchasedFileTypes: data.purchasedFileTypes || []
      })
      if (!data.post.isPremium) setIsUnlocked(true)
      if (data.post.colorPalette?.length) setPalette(data.post.colorPalette)
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy bài đăng')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    fetchPost()
    api.post(`/posts/${id}/view`).catch(() => {})
  }, [id]) // eslint-disable-line

  // Extract palette từ ảnh nếu server chưa có
  useEffect(() => {
    if (!post || palette.length > 0) return
    const imgUrl = post.generatedImages?.[0]?.thumbnailUrl
      || post.generatedImages?.[0]?.url
      || post.images?.[0]?.thumbnailUrl
      || post.images?.[0]?.url
    if (!imgUrl) return
    extractColorsFromImg(imgUrl, 4).then(colors => {
      if (colors.length > 0) setPalette(colors)
    })
  }, [post, palette.length])

  useEffect(() => {
    if (imgLoaded && palette.length > 0) {
      const t = setTimeout(() => setAmbientReady(true), 150)
      return () => clearTimeout(t)
    }
  }, [imgLoaded, palette])

  const ambientGradient = useMemo(() => buildAmbientGradient(palette), [palette])

  const handleShare = async () => {
    setShareLoading(true)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${id}`)
      setCopied(true)
      toast.success('Đã copy link!')
      setTimeout(() => setCopied(false), 1500)
    } catch { toast.error('Không thể copy link') }
    finally { setShareLoading(false) }
  }

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
      await api.post(`/posts/${id}/report`, { reason: reportReason })
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

  const handleImageChange = useCallback((img, isSource) => {
    setActiveImg(img)
    setActiveIsSource(isSource)
    setImgLoaded(false)
    // Extract palette từ ảnh mới nếu cần
    const url = img?.thumbnailUrl || img?.url
    if (url) {
      extractColorsFromImg(url, 4).then(colors => {
        if (colors.length > 0) setPalette(colors)
      })
    }
    setTimeout(() => setImgLoaded(true), 200) // give gallery time to swap
  }, [])

  const formatDate = (dateInput) => {
    if (!dateInput) return ''
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  /* ── Loading skeleton ──────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'oklch(11% 0.012 285)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="h-7 w-28 rounded-xl animate-pulse mb-8" style={{ background: 'oklch(19% 0.01 285)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="rounded-2xl animate-pulse aspect-[4/3]" style={{ background: 'oklch(15% 0.01 285)' }} />
          <div className="space-y-4">
            {[20, 12, 10, 32, 16].map((h, i) => (
              <div key={i} className={`h-${h} rounded-xl animate-pulse`} style={{ background: 'oklch(15% 0.01 285)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  /* ── Error ─────────────────────────────────────────── */
  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(11% 0.012 285)' }}>
      <div className="text-center px-4">
        <p className="text-5xl mb-4">😢</p>
        <h2 className="text-xl font-bold text-[#f5f3ff] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Không tìm thấy bài đăng
        </h2>
        <p className="text-white/40 text-sm mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#f5f3ff] transition-all"
          style={{
            background: 'oklch(52% 0.28 285)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.24), 0 4px 16px rgba(109,40,217,0.4)',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )

  if (!post) return null

  const author = post.authorId
  const isOwnPost = user && (post.authorId?._id === user._id || post.authorId === user._id)
  const genImages = post.generatedImages || []
  // Source images: mọi user đều xem được (chỉ gate download high-res, không gate view)
  const srcImages = post.sourceImages || []
  const isDigital = post.postType?.startsWith('digital')
  const hasExifData = post.exifData && Object.keys(post.exifData).length > 0
  const hasExif = !!(hasExifData || post.histogram)
  const hasNegative = !!post.negativePrompt
  const hasParameters = !!post.parameters
  // JSON workflow: chỉ Ultimate có post.workflowJson
  const hasJson = !!post.workflowJson && tierAccess.canExportJson
  const isAiPost = post.postType === 'ai'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-24 md:pb-12"
      style={{ background: 'oklch(11% 0.012 285)' }}
    >
      {/* ── Ambient background ───────────────────────── */}
      <AnimatePresence>
        {ambientGradient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: ambientReady ? 1 : 0 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: ambientGradient, filter: 'blur(80px)', mixBlendMode: 'screen' }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-8">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/45 hover:text-white/80
            transition-colors duration-150 mb-7 group"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          <span className="text-sm font-medium">Quay lại</span>
        </button>

        {/* ── Main grid: left gallery | right info ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* ─── LEFT: Image Gallery ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-24"
          >
            <ImageGallery
              generatedImages={genImages}
              sourceImages={srcImages}
              legacyImages={post.images || []}
              aiTool={post.aiTool}
              aiModel={post.aiModel}
              isPremium={post.isPremium}
              isUnlocked={isUnlocked}
              caption={post.caption}
              onImageChange={handleImageChange}
              isMultiModel={post.isMultiModel}
              modelComparisons={post.modelComparisons}
            />

            {/* Mobile stats */}
            <div className="flex items-center gap-5 mt-4 lg:hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <div className="flex items-center gap-1.5 text-white/35 text-sm" title="Lượt xem">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {(post.stats?.viewsCount || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-white/35 text-sm">
                <Download size={13} />
                {(post.stats?.downloadsCount || 0).toLocaleString()}
              </div>
            </div>
          </motion.div>

          {/* ─── RIGHT: Info panel ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >

            {/* ── Author ──────────────────────────────── */}
            <div className="flex items-center gap-3">
              <Link to={`/profile/${author?.username}`} className="flex items-center gap-3 group min-w-0">
                {author?.avatar ? (
                  <img
                    src={author.avatar}
                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0
                      ring-2 ring-[#7986eb]/25 group-hover:ring-[#7986eb]/55 transition-all duration-200"
                    alt=""
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center
                      text-white font-bold text-base flex-shrink-0"
                    style={{ background: 'oklch(52% 0.28 285)' }}
                  >
                    {author?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-[#f5f3ff] group-hover:text-[#7986eb] transition-colors duration-150 truncate">
                    {author?.displayName || author?.username}
                    {author?.isVerified && <span className="ml-1.5 text-[#7986eb] text-xs">✓</span>}
                  </p>
                  <p className="text-white/40 text-sm truncate">@{author?.username}</p>
                </div>
              </Link>
            </div>

            {/* ── Caption ─────────────────────────────── */}
            {post.caption && (
              <h1
                className="text-[1.375rem] font-bold leading-snug tracking-tight"
                style={{ color: '#f5f3ff', letterSpacing: '-0.02em' }}
              >
                {post.caption}
              </h1>
            )}

            {/* ── Bảng màu chủ đạo (chỉ khi ExifPanel full không hiện) ── */}
            {palette.length > 0 && !hasExif && (
              <div>
                <p className="text-[10px] text-white/25 mb-2 font-medium tracking-wider uppercase">
                  Màu chủ đạo
                </p>
                <div className="flex gap-2 items-center flex-wrap">
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
                        className="w-7 h-7 rounded-lg border border-white/15 cursor-pointer
                          hover:scale-125 hover:ring-2 hover:ring-white/30 transition-all duration-200 shadow-lg"
                        style={{ backgroundColor: hex }}
                        onClick={() => { navigator.clipboard?.writeText(hex) }}
                      />
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2
                        text-[9px] text-white/40 opacity-0 group-hover:opacity-100
                        transition-opacity whitespace-nowrap pointer-events-none">
                        {hex}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI Prompt section (chỉ khi là AI post) ──── */}
            {isAiPost && (
              <div className="space-y-3">

                {/* Tier badge — Founder */}
                {tierAccess.isFounder && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        background: 'rgba(217,119,6,0.15)',
                        border: '1px solid rgba(217,119,6,0.3)',
                        color: '#d97706',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      <Crown size={9} /> Founder’s Member
                    </span>
                  </div>
                )}

                {/* Main prompt */}
                {post.prompt && (
                  <PromptBlock text={post.prompt} variant="prompt" collapseAfter={6} parameters={post.parameters} />
                )}

                {/* Negative prompt — Pro gates ẩn/lock */}
                {(hasNegative || !tierAccess.canSeeWorkflowDetails) && (
                  <PromptBlock
                    text={post.negativePrompt}
                    variant="negative"
                    collapseAfter={4}
                    isLocked={!tierAccess.canSeeWorkflowDetails}
                  />
                )}

                {/* Parameters — Pro gates */}
                {(hasParameters || !tierAccess.canSeeWorkflowDetails) && (
                  <PromptBlock
                    text={post.parameters}
                    variant="parameters"
                    collapseAfter={4}
                    isLocked={!tierAccess.canSeeWorkflowDetails}
                  />
                )}

                {/* JSON Workflow — Ultimate only */}
                {(post.workflowJson || !tierAccess.canExportJson) && (
                  <PromptBlock
                    text={post.workflowJson}
                    variant="json"
                    collapseAfter={8}
                    isLocked={!tierAccess.canExportJson}
                  />
                )}

              </div>
            )}

            {/* ── Tags ────────────────────────────────── */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Link
                    key={tag}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:bg-[rgba(121,134,235,0.2)] hover:text-white cursor-pointer select-none"
                    style={{
                      background: 'rgba(121,134,235,0.1)',
                      borderColor: 'rgba(121,134,235,0.22)',
                      color: '#7986eb',
                    }}
                  >
                    <Tag size={9} />#{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* ── EXIF Panel — xuất hiện khi xem source image ── */}
            <AnimatePresence>
              {hasExif && (
                <motion.div
                  key="exif"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-xl"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'oklch(15% 0.01 285)' }}
                >
                  <ExifPanel
                    exifData={post.exifData}
                    histogram={post.histogram}
                    colorPalette={palette}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* LensSpy — chỉ khi xem source image hoặc ảnh digital và có lens data */}
            {(activeIsSource || isDigital) && !post.aiTool && (
              <LensSpyPanel postId={post._id} />
            )}

            {/* ── Meta: category / resolution / date ── */}
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 border-t border-b"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              {post.category && (
                <span className="inline-flex items-center text-xs text-white/40 capitalize leading-none">{post.category}</span>
              )}
              {post.resolution && (
                <span className="inline-flex items-center text-xs font-bold uppercase leading-none" style={{ color: '#7986eb' }}>
                  {post.resolution}
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
              <div className="flex flex-col gap-0.5 text-[11px] text-white/40 font-medium">
                {post.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-white/30" />
                    <span>Ngày đăng: {formatDate(post.createdAt)}</span>
                  </div>
                )}
                {post.exifData?.dateTaken && (
                  <div className="flex items-center gap-1.5">
                    <Camera size={11} className="text-white/30" />
                    <span>Ngày chụp: {formatDate(post.exifData.dateTaken)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Stats ───────────────────────────────── */}
            <div className="flex items-center gap-6">
              <div className="text-white/45 text-sm font-semibold select-none">
                {(post.stats?.viewsCount || 0).toLocaleString()} views
              </div>
              <div className="flex items-center gap-1.5 text-white/35 text-sm">
                <Download size={14} />
                <span>{(post.stats?.downloadsCount || 0).toLocaleString()}</span>
                <span className="text-white/25 text-xs">tải về</span>
              </div>
            </div>

            {/* ── Actions ─────────────────────────────── */}
            <div className="space-y-3">
              <PostDownloadButton post={post} onUnlock={() => setIsUnlocked(true)} />
              <div className={`grid ${isOwnPost ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
                <LikeButton
                  postId={post._id}
                  initialCount={post.stats?.likesCount || 0}
                  initialLiked={post.isLiked}
                  className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-white/8 hover:border-white/15 transition-all duration-150 bg-white/[0.04] text-xs font-semibold text-white/55 hover:text-white/80 min-h-[44px] w-full"
                />
                <BookmarkButton
                  postId={post._id}
                  initialBookmarked={post.isBookmarked}
                  showCount={true}
                  initialCount={post.stats?.bookmarksCount || 0}
                  className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-white/8 hover:border-white/15 transition-all duration-150 bg-white/[0.04] text-xs font-semibold text-white/55 hover:text-white/80 min-h-[44px] w-full"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  animate={copied ? { scale: [1, 1.12, 0.95, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  onClick={handleShare}
                  disabled={shareLoading}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                    text-xs font-semibold border hover:border-white/15
                    transition-all duration-200 min-h-[44px] w-full ${
                      copied
                        ? 'text-emerald-400 border-emerald-500/35 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.18)]'
                        : 'text-white/55 hover:text-white/80 border-white/8 bg-white/[0.04]'
                    }`}
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
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowReportDialog(true)}
                    className="flex items-center justify-center gap-1 py-2.5 rounded-xl
                      text-xs font-semibold text-white/55 hover:text-red-400
                      border border-white/8 hover:border-red-500/25
                      bg-white/[0.04] hover:bg-red-500/5
                      transition-all duration-150 min-h-[44px] w-full cursor-pointer"
                    title="Báo cáo vi phạm"
                  >
                    <Flag size={14} />
                    <span>Báo cáo</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* ── Comments ────────────────────────────── */}
            <div
              className="pt-6 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <CommentSection postId={post._id} />
            </div>

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

          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default PostDetailPage
