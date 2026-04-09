import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, Download, Share2, ExternalLink,
  Calendar, Tag, Maximize2, ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import LikeButton from '../components/post/LikeButton'
import BookmarkButton from '../components/post/BookmarkButton'
import CommentSection from '../components/post/CommentSection'
import ExifPanel from '../components/post/ExifPanel'

/* ─── Ambient gradient builder ────────────────────────────── */
/**
 * Dùng colorPalette (từ server) hoặc canvas-extracted để build
 * radial-gradient multi-layer (YouTube Ambient Mode style).
 */
const buildAmbientGradient = (palette = []) => {
  if (!palette?.length) return null
  const positions = ['15% 20%', '85% 15%', '50% 85%', '20% 65%', '80% 55%', '45% 35%']
  return palette.slice(0, 6).map((hex, i) =>
    `radial-gradient(ellipse 100% 90% at ${positions[i % positions.length]}, ${hex}60 0%, transparent 65%)`
  ).join(', ')
}

/* ─── Canvas color extractor (fallback khi colorPalette rỗng) ──
   Dùng <canvas> để sample pixels → cluster thành 4 màu chủ đạo.
   Chạy hoàn toàn client-side, không cần library.
*/
/**
 * Extract màu từ ảnh bằng Canvas API.
 * Dùng thumbnail URL (qua Cloudinary w_64 transform) để tránh CORS và nhanh hơn.
 */
const extractColorsFromImg = (src, count = 4) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // Dùng Cloudinary resize transform về 64px — nhỏ, nhanh, ít CORS issue
    let sampleSrc = src
    if (src && src.includes('/upload/')) {
      const [base, rest] = src.split('/upload/')
      sampleSrc = `${base}/upload/w_64,f_jpg,q_50/${rest}`
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
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3]
          const brightness = r + g + b
          if (a > 180 && brightness > 40 && brightness < 720) {
            pixels.push([r, g, b])
          }
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
        const hexColors = clusters.slice(0, count).map(([r,g,b]) =>
          `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
        )
        resolve(hexColors)
      } catch { resolve([]) }
    }
    img.onerror = () => resolve([])
    img.src = sampleSrc
  })
}

/* ─── Protected Image ─────────────────────────────────────── */
const getCloudinaryBlurredUrl = (url) => {
  if (!url || !url.includes('/upload/')) return url
  const [base, rest] = url.split('/upload/')
  return `${base}/upload/w_400,q_10,e_blur:2000/${rest}`
}

/* ─── Color Palette Display ───────────────────────────────── */
const ColorPaletteStrip = ({ palette }) => {
  if (!palette?.length) return null
  return (
    <div className="card p-4">
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3">
        🎨 Màu chủ đạo
      </p>
      <div className="flex gap-3 items-center flex-wrap">
        {palette.slice(0, 6).map((hex, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.07 }}
            className="group relative"
          >
            <div
              className="w-8 h-8 rounded-xl border-2 border-white/15 cursor-pointer shadow-lg
                hover:scale-125 hover:ring-2 hover:ring-white/40 transition-all duration-200"
              style={{ backgroundColor: hex }}
              title={hex}
            />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2
              text-[9px] text-white/50 opacity-0 group-hover:opacity-100
              transition-opacity whitespace-nowrap pointer-events-none font-mono">
              {hex}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Download Button ─────────────────────────────────────── */
const PostDownloadButton = ({ post, onUnlock }) => {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (!user) { toast.error('Đăng nhập để tải ảnh'); return }
    if (loading) return
    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${post._id}/download`)
      if (data.downloadUrl) {
        onUnlock?.()
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.download = `picspy_${post._id}.jpg`
        a.target = '_blank'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        toast.success('Đang tải ảnh...')
      }
    } catch (err) {
      const msg = err.response?.data?.message
      if (err.response?.status === 402) toast.error(msg || 'Cần nạp xu để tải ảnh Premium')
      else toast.error(msg || 'Không thể tải ảnh')
    } finally { setLoading(false) }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }} onClick={handleDownload} disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm transition-all
        ${post.isPremium
          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(234,179,8,0.3)]'
          : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
        } disabled:opacity-60`}
    >
      {loading ? (
        <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      ) : <Download size={16} />}
      {post.isPremium ? `Tải Premium · ${post.priceInCoins} xu` : 'Tải miễn phí'}
    </motion.button>
  )
}

/* ─── Main PostDetailPage ─────────────────────────────────── */
const PostDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const imgRef = useRef(null)

  const [post, setPost]           = useState(null)
  const [loading, setLoading]      = useState(true)
  const [error, setError]          = useState(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [imgLoaded, setImgLoaded]  = useState(false)
  const [ambientReady, setAmbientReady] = useState(false)

  // colorPalette: từ server hoặc extract tại client
  const [palette, setPalette] = useState([])

  const fetchPost = useCallback(async () => {
    setLoading(true)
    setImgLoaded(false); setAmbientReady(false); setPalette([])
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data.post)
      if (!data.post.isPremium) setIsUnlocked(true)
      // Nếu server đã có palette → dùng ngay, sẽ không cần extract canvas
      if (data.post.colorPalette?.length) {
        setPalette(data.post.colorPalette)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy bài đăng')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPost()
    api.post(`/posts/${id}/view`).catch(() => {})
  }, [id]) // eslint-disable-line

  // Khi ảnh load xong: nếu chưa có palette → extract bằng Image + Canvas (async)
  const handleImgLoad = useCallback(() => {
    setImgLoaded(true)
  }, [])

  // Extract màu sau khi post load + palette rỗng
  useEffect(() => {
    if (!post) return
    if (palette.length > 0) return // đã có từ server
    const imgUrl = post.images?.[0]?.thumbnailUrl || post.images?.[0]?.url
    if (!imgUrl) return
    extractColorsFromImg(imgUrl, 4).then(colors => {
      if (colors.length > 0) setPalette(colors)
    })
  }, [post, palette.length])

  // Ambient fade-in sau khi có palette + ảnh load
  useEffect(() => {
    if (imgLoaded && palette.length > 0) {
      const t = setTimeout(() => setAmbientReady(true), 150)
      return () => clearTimeout(t)
    }
  }, [imgLoaded, palette])

  // Build gradient memoized
  const ambientGradient = useMemo(() => buildAmbientGradient(palette), [palette])

  const safePreviewUrl = post?.isPremium && !isUnlocked
    ? getCloudinaryBlurredUrl(post?.images?.[0]?.thumbnailUrl || post?.images?.[0]?.url)
    : (post?.images?.[0]?.url || post?.images?.[0]?.thumbnailUrl)

  const handleShare = async () => {
    setShareLoading(true)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${id}`)
      toast.success('Đã copy link!')
    } catch { toast.error('Không thể copy link') }
    finally { setShareLoading(false) }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-32 bg-surface-100 rounded-xl animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
            <div className="rounded-3xl bg-surface-100 animate-pulse aspect-[4/3]" />
            <div className="space-y-4">
              {Array.from({length: 5}).map((_, i) => (
                <div key={i} className={`h-${i === 0 ? 16 : 10} bg-surface-100 rounded-xl animate-pulse`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">😢</p>
          <h2 className="text-xl font-bold text-white mb-2">Không tìm thấy bài đăng</h2>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">Về trang chủ</button>
        </div>
      </div>
    )
  }

  if (!post) return null

  const img = post.images?.[0]
  const author = post.authorId
  const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pb-24 md:pb-8">

      {/* ══ Ambient Background Layer (full page) ══════════════════ */}
      {ambientGradient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: ambientReady ? 1 : 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background: ambientGradient,
            filter: 'blur(80px)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Quay lại</span>
        </button>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* ─── LEFT: Image ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:sticky lg:top-24"
          >
            {/* Image wrapper với ambient inner glow */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {/* Inner ambient glow ring */}
              {ambientGradient && ambientReady && (
                <div
                  className="absolute inset-0 z-0 opacity-40"
                  style={{
                    background: ambientGradient,
                    filter: 'blur(20px)',
                    mixBlendMode: 'lighten',
                  }}
                />
              )}

              {/* Blurred bg */}
              {safePreviewUrl && (
                <div
                  className="absolute inset-0 opacity-20 scale-110"
                  style={{
                    backgroundImage: `url(${safePreviewUrl})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(24px)',
                  }}
                />
              )}

              {/* Main image */}
              <div className="relative z-10 w-full flex items-center justify-center bg-black/10 select-none">
                <img
                  ref={imgRef}
                  src={safePreviewUrl}
                  alt={post.caption || 'PicSpy Image'}
                  draggable={false}
                  onLoad={handleImgLoad}
                  onContextMenu={(e) => post.isPremium && !isUnlocked && e.preventDefault()}
                  className="block w-full h-auto max-h-[82vh] object-contain transition-all duration-500"
                  style={{
                    userSelect: 'none', WebkitUserSelect: 'none',
                    filter: post.isPremium && !isUnlocked ? 'blur(18px) brightness(0.5)' : 'none',
                  }}
                />

                {/* Premium overlay */}
                {post.isPremium && !isUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                      <ShieldAlert size={32} className="text-yellow-400 mx-auto mb-3" />
                      <p className="text-white font-bold text-lg mb-1">Nội dung Premium</p>
                      <p className="text-white/60 text-sm">Mua xu để xem và tải chất lượng gốc</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges */}
              {post.isPremium && (
                <div className="absolute top-4 left-4 z-20">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                    💎 PREMIUM
                  </span>
                </div>
              )}

              {/* Open in new tab */}
              {isUnlocked && img?.url && (
                <a href={img.url} target="_blank" rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 z-20 p-2.5 rounded-xl bg-black/60 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/80 transition-all"
                  title="Xem full size">
                  <ExternalLink size={16} />
                </a>
              )}

              {/* Dimensions */}
              {isUnlocked && (img?.width || img?.height) && (
                <div className="absolute bottom-4 left-4 z-20">
                  <span className="text-xs text-white/40 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                    {img?.width}×{img?.height}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile stats */}
            <div className="flex items-center gap-4 mt-4 lg:hidden">
              <div className="flex items-center gap-1.5 text-white/40 text-sm"><Eye size={14} /> {post.stats?.viewsCount || 0} lượt xem</div>
              <div className="flex items-center gap-1.5 text-white/40 text-sm"><Download size={14} /> {post.stats?.downloadsCount || 0} tải</div>
            </div>
          </motion.div>

          {/* ─── RIGHT: Info panel ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }} className="space-y-5"
          >
            {/* Author */}
            <div className="flex items-center justify-between">
              <Link to={`/profile/${author?.username}`} className="flex items-center gap-3 group">
                {author?.avatar ? (
                  <img src={author.avatar} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-violet-500/30 group-hover:ring-violet-500/60 transition-all" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {author?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-white group-hover:text-violet-300 transition-colors">
                    {author?.displayName || author?.username}
                    {author?.isVerified && <span className="ml-1 text-blue-400">✓</span>}
                  </p>
                  <p className="text-white/40 text-sm">@{author?.username}</p>
                </div>
              </Link>
            </div>

            {/* Caption */}
            {post.caption && (
              <h1 className="text-2xl font-bold text-white leading-snug">{post.caption}</h1>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600/15 border border-violet-500/25 text-violet-400">
                    <Tag size={10} />#{tag}
                  </span>
                ))}
              </div>
            )}

            {/* EXIF Panel — thông số chụp + histogram + bảng mã màu
                Hiển thị khi có bất kỳ: exifData, histogram, hoặc colorPalette */}
            {(post.exifData || post.histogram || palette.length > 0) && (
              <AnimatePresence>
                <motion.div
                  key="exif-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="card overflow-hidden"
                >
                  <ExifPanel
                    exifData={post.exifData}
                    histogram={post.histogram}
                    colorPalette={palette}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {post.category && (
                <div className="card p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Thể loại</p>
                  <p className="text-sm font-semibold text-white capitalize">{post.category}</p>
                </div>
              )}
              {post.resolution && (
                <div className="card p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Độ phân giải</p>
                  <p className="text-sm font-semibold text-white uppercase">{post.resolution}</p>
                </div>
              )}
              {img?.width && (
                <div className="card p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Kích thước</p>
                  <p className="text-sm font-semibold text-white">{img.width}×{img.height}</p>
                </div>
              )}
              {post.createdAt && (
                <div className="card p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Ngày đăng</p>
                  <p className="text-sm font-semibold text-white">{formatDate(post.createdAt)}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 py-3 border-t border-b border-white/8">
              <div className="flex items-center gap-2 text-white/50">
                <Eye size={16} />
                <span className="text-sm font-medium">{(post.stats?.viewsCount || 0).toLocaleString()}</span>
                <span className="text-xs">lượt xem</span>
              </div>
              <div className="flex items-center gap-2 text-white/50">
                <Download size={16} />
                <span className="text-sm font-medium">{(post.stats?.downloadsCount || 0).toLocaleString()}</span>
                <span className="text-xs">tải về</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <PostDownloadButton post={post} onUnlock={() => setIsUnlocked(true)} />
              <div className="grid grid-cols-3 gap-3">
                <LikeButton postId={post._id} initialCount={post.stats?.likesCount || 0} initialLiked={post.isLiked} />
                <BookmarkButton postId={post._id} initialBookmarked={post.isBookmarked} />
                <motion.button
                  whileTap={{ scale: 0.95 }} onClick={handleShare} disabled={shareLoading}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl
                    bg-white/5 border border-white/10 text-white/60
                    hover:bg-white/10 hover:text-white transition-all text-sm font-semibold"
                >
                  <Share2 size={15} /> Chia sẻ
                </motion.button>
              </div>
            </div>

            {/* AI badge */}
            {post.isAIGenerated && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                <span className="text-blue-400 text-lg">🤖</span>
                <div>
                  <p className="text-blue-400 text-xs font-bold">AI Generated</p>
                  {post.aiTool && <p className="text-white/40 text-xs">Tool: {post.aiTool}</p>}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border-t border-white/8 pt-6">
              <CommentSection postId={post._id} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default PostDetailPage
