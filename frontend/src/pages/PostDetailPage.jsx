import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, Download, Share2,
  Calendar, Tag, Zap, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import useTierAccess from '../hooks/useTierAccess'
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

  // Tier access — đặt ở đây để không vi phạm Rules of Hooks
  const tierAccess = useTierAccess()

  const fetchPost = useCallback(async () => {
    setLoading(true)
    setPalette([]); setAmbientReady(false); setImgLoaded(false)
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data.post)
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
      toast.success('Đã copy link!')
    } catch { toast.error('Không thể copy link') }
    finally { setShareLoading(false) }
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

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })

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
  const isAiPost = !!post.aiTool || genImages.length > 0

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
              <div className="flex items-center gap-1.5 text-white/35 text-sm">
                <Eye size={13} />
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
                  <PromptBlock text={post.prompt} variant="prompt" collapseAfter={6} />
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
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={{
                      background: 'rgba(121,134,235,0.1)',
                      borderColor: 'rgba(121,134,235,0.22)',
                      color: '#7986eb',
                    }}
                  >
                    <Tag size={9} />#{tag}
                  </span>
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
              className="flex flex-wrap gap-x-5 gap-y-1.5 py-3 border-t border-b"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              {post.category && (
                <span className="text-xs text-white/40 capitalize">{post.category}</span>
              )}
              {post.resolution && (
                <span className="text-xs font-bold uppercase" style={{ color: '#7986eb' }}>
                  {post.resolution}
                </span>
              )}
              {post.createdAt && (
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Calendar size={10} />
                  {formatDate(post.createdAt)}
                </span>
              )}
            </div>

            {/* ── Stats ───────────────────────────────── */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-white/35 text-sm">
                <Eye size={14} />
                <span>{(post.stats?.viewsCount || 0).toLocaleString()}</span>
                <span className="text-white/25 text-xs">lượt xem</span>
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
              <div className="grid grid-cols-3 gap-2.5">
                <LikeButton
                  postId={post._id}
                  initialCount={post.stats?.likesCount || 0}
                  initialLiked={post.isLiked}
                />
                <BookmarkButton
                  postId={post._id}
                  initialBookmarked={post.isBookmarked}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  disabled={shareLoading}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                    text-sm font-semibold text-white/55 hover:text-white/80
                    border border-white/8 hover:border-white/15
                    transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.04)', minHeight: 44 }}
                >
                  <Share2 size={14} /> Chia sẻ
                </motion.button>
              </div>
            </div>

            {/* ── Comments ────────────────────────────── */}
            <div
              className="pt-6 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <CommentSection postId={post._id} />
            </div>

          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default PostDetailPage
