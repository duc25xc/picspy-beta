import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Sparkles,
  Heart,
  Download,
  RefreshCw,
  ImageOff,
  Palette,
  ChevronDown,
  Camera,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import PostDetailModal from '../components/post/PostDetailModal'
import useModalUrl from '../hooks/useModalUrl'
import { getOptimizedWebpUrl } from '../utils/imageUrl'

// ── Fallback categories ─────────────────────────────────────────
const FALLBACK_CATEGORIES = [
  { key: 'nature', label: '🌿 Thiên nhiên' },
  { key: 'anime', label: '🎌 Anime' },
  { key: 'minimal', label: '◻️ Minimal' },
  { key: 'abstract', label: '🎨 Abstract' },
  { key: 'city', label: '🌃 Thành phố' },
  { key: 'space', label: '🚀 Vũ trụ' },
  { key: 'dark', label: '🌑 Dark' },
  { key: 'light', label: '☀️ Light' },
  { key: 'gradient', label: '🌈 Gradient' },
  { key: 'other', label: '✨ Khác' },
]

// ── Color presets for Color Search ──────────────────────────────
const COLOR_PRESETS = [
  { label: 'Đỏ', hex: '#ef4444', search: 'e53935' },
  { label: 'Cam', hex: '#f97316', search: 'f4511e' },
  { label: 'Vàng', hex: '#eab308', search: 'fdd835' },
  { label: 'Xanh lá', hex: '#22c55e', search: '43a047' },
  { label: 'Xanh dương', hex: '#3b82f6', search: '1e88e5' },
  { label: 'Tím', hex: '#8b5cf6', search: '7b1fa2' },
  { label: 'Hồng', hex: '#ec4899', search: 'e91e63' },
  { label: 'Nâu', hex: '#92400e', search: '6d4c41' },
  { label: 'Trắng', hex: '#ffffff', search: 'ffffff' },
  { label: 'Trắng ngà', hex: '#f1f5f9', search: 'fafafa' },
  { label: 'Đen', hex: '#000000', search: '000000' },
  { label: 'Đen mờ', hex: '#1e293b', search: '212121' },
  { label: 'Xám', hex: '#64748b', search: '78909c' },
  { label: 'Mint', hex: '#10b981', search: '00bfa5' },
]

// Helper chuyển đổi các hệ màu (RGB, HSL, Hex, Color Name) sang mã Hex chuẩn 6 ký tự để tìm kiếm
const parseToHex = (str) => {
  const clean = str.trim().toLowerCase()

  // 1. Định dạng Hex: #ffffff, #fff, ffffff, fff
  const hexMatch = clean.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    return hex
  }

  // 2. Định dạng RGB/RGBA: rgb(255, 0, 0)
  const rgbMatch = clean.match(/rgba?\(?\s*(\d+)\s*[\s,]\s*(\d+)\s*[\s,]\s*(\d+)/)
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10))
    const g = Math.min(255, parseInt(rgbMatch[2], 10))
    const b = Math.min(255, parseInt(rgbMatch[3], 10))
    return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
  }

  // 3. Định dạng HSL/HSLA: hsl(120, 100%, 50%)
  const hslMatch = clean.match(/hsla?\(?\s*(\d+)\s*[\s,]\s*(\d+)%?\s*[\s,]\s*(\d+)%?/)
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) % 360
    const s = Math.min(100, parseInt(hslMatch[2], 10)) / 100
    const l = Math.min(100, parseInt(hslMatch[3], 10)) / 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const rgb = [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ]
    return rgb.map(val => val.toString(16).padStart(2, '0')).join('')
  }

  // 4. Định nghĩa tên màu CSS cơ bản
  const COLOR_NAMES = {
    red: 'ff0000', green: '00ff00', blue: '0000ff',
    black: '000000', white: 'ffffff', yellow: 'ffff00',
    cyan: '00ffff', magenta: 'ff00ff', orange: 'ffa500',
    purple: '800080', pink: 'ffc0cb', brown: 'a52a2a',
    gray: '808080', grey: '808080', silver: 'c0c0c0',
    gold: 'ffd700', violet: 'ee82ee', indigo: '4b0082'
  }
  if (COLOR_NAMES[clean]) {
    return COLOR_NAMES[clean]
  }

}

// Component bộ chọn màu sắc tự do cô lập (Tối ưu hóa tránh Re-render toàn bộ trang SearchPage khi kéo chuột)
const CustomColorPickerButton = ({ activeColor, isCustomColorActive, onApply }) => {
  const [localColor, setLocalColor] = useState('')
  const inputRef = useRef(null)

  // Lưu trữ và khôi phục lịch sử màu gần đây từ localStorage
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = localStorage.getItem('picspy_recent_colors')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Hàm tính toán độ tương phản để hiển thị text màu đen hoặc trắng cho phù hợp
  const getContrastColor = (hex) => {
    let clean = hex.replace('#', '')
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    }
    const r = parseInt(clean.slice(0, 2), 16) || 0
    const g = parseInt(clean.slice(2, 4), 16) || 0
    const b = parseInt(clean.slice(4, 6), 16) || 0
    const yiq = (r * 299 + g * 587 + b * 114) / 1000
    return yiq >= 128 ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)'
  }

  useEffect(() => {
    if (!activeColor) {
      setLocalColor('')
    } else {
      setLocalColor(`#${activeColor}`)
    }
  }, [activeColor])

  // Hàm cập nhật và lưu mã màu vào lịch sử màu gần đây
  const saveRecentColor = (hex) => {
    const cleanHex = hex.replace('#', '').toLowerCase()
    setRecentColors((prev) => {
      const filtered = prev.filter(c => c !== cleanHex)
      const next = [cleanHex, ...filtered].slice(0, 5) // Giới hạn lưu tối đa 5 màu gần nhất
      localStorage.setItem('picspy_recent_colors', JSON.stringify(next))
      return next
    })
  }

  const displayColor = localColor || (activeColor ? `#${activeColor}` : '')

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 mt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Màu tự chọn:</span>
        
        <div className="relative flex items-center gap-3">
          {/* Vòng tròn hiển thị màu và input color ẩn */}
          <div className="relative">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center relative overflow-hidden cursor-pointer shadow-md
                ${displayColor ? 'border-white scale-105 shadow-lg' : 'border-white/10 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500'}`}
              title="Nhấp để mở bảng chọn màu"
              style={displayColor ? { backgroundColor: displayColor } : {}}
            >
              {!displayColor && (
                <span className="text-[14px] font-bold text-white drop-shadow-md">+</span>
              )}
              <input
                type="color"
                ref={inputRef}
                value={localColor || '#ffffff'}
                onChange={(e) => {
                  setLocalColor(e.target.value)
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </button>
          </div>

          {/* Ô nhập mã HEX trực tiếp bằng bàn phím */}
          <div className="relative">
            <input
              type="text"
              value={localColor}
              placeholder="#Mã màu..."
              onChange={(e) => {
                setLocalColor(e.target.value)
              }}
              className="bg-surface-50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 font-mono w-28 focus:border-white/30 focus:outline-none transition-colors shadow-sm"
              style={{
                fontFamily: 'Outfit, monospace',
                letterSpacing: '0.02em',
              }}
            />
          </div>
        </div>

        {/* Danh sách màu gần đây (Recent Colors) */}
        {recentColors.length > 0 && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/5 flex-wrap">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Gần đây:</span>
            <div className="flex items-center gap-3">
              {recentColors.map((hex) => {
                const isActive = activeColor === hex
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setLocalColor(`#${hex}`)
                      onApply(hex)
                      toast.success(`Đã áp dụng màu gần đây: #${hex}`)
                    }}
                    className={`w-16 h-7 rounded-xl border flex items-center justify-center font-mono text-[9px] font-bold tracking-wider uppercase transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer
                      ${isActive ? 'border-white scale-105 ring-2 ring-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'border-white/10 hover:border-white/30'}`}
                    style={{ 
                      backgroundColor: `#${hex}`,
                      color: getContrastColor(hex)
                    }}
                    title={`Tìm lại theo màu #${hex}`}
                  >
                    {hex}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Hiệu ứng chuyển động trượt mượt mà (Framer Motion Slide-in) */}
      <AnimatePresence>
        {localColor && localColor.replace('#', '').toLowerCase() !== activeColor && (
          <motion.button
            key="apply-color-btn"
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            type="button"
            onClick={() => {
              const hexClean = localColor.replace('#', '').toLowerCase()
              // Validate hex length (3 or 6)
              if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hexClean)) {
                onApply(hexClean)
                saveRecentColor(hexClean)
                toast.success(`Đã áp dụng màu: ${localColor}`)
              } else {
                toast.error('Mã màu không hợp lệ! Định dạng HEX 3 hoặc 6 ký tự (Ví dụ: #ff0000 hoặc #f00).')
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white/80 hover:text-white font-semibold text-xs border border-white/10 hover:border-white/35 shadow-lg transition-all duration-300 cursor-pointer flex-shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(8px)',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.03em',
            }}
          >
            <Check size={11} className="text-white/60" />
            <span>Áp dụng màu sắc</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}


// ── HSL-weighted fuzzy color matching ───────────────────────────
// Dùng HSL thay RGB → "Đỏ" match đỏ nâu, đỏ máu, đỏ nhạt...
const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}
const parseHex = (hex) => {
  const c = hex.replace('#', '')
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ]
}
const colorDistance = (hex1, hex2) => {
  try {
    const [r1, g1, b1] = parseHex(hex1)
    const [r2, g2, b2] = parseHex(hex2)
    const [h1, s1, l1] = rgbToHsl(r1, g1, b1)
    const [h2, s2, l2] = rgbToHsl(r2, g2, b2)

    // Edge case: ảnh tối (L<15) hoặc sáng (L>85) hoặc mờ màu (S<15)
    // → Hue không có nghĩa, chỉ so sánh Lightness
    const lowSat1 = s1 < 15,
      lowSat2 = s2 < 15
    if (lowSat1 || lowSat2) {
      // Hai màu đều mờ/trắng/đen → so sánh L
      const dL = Math.abs(l1 - l2)
      const dS = Math.abs(s1 - s2)
      return Math.sqrt((dL * 1.5) ** 2 + (dS * 0.5) ** 2)
    }

    const dH = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
    const dS = Math.abs(s1 - s2)
    const dL = Math.abs(l1 - l2)

    // Weight: Hue quan trọng nhất (x1.5), L (x0.9), S (x0.4)
    return Math.sqrt((dH * 1.5) ** 2 + (dS * 0.4) ** 2 + (dL * 0.9) ** 2)
  } catch {
    return 999
  }
}

const SORT_OPTIONS = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'hot', label: '🔥 Trending' },
  { key: 'top', label: '⭐ Top' },
]

// Golden ratio conjugate — phân tán delay chống clustering
const PHI = 0.618033988749895

// ── Skeleton Card ─────────────────────────────────────────────
const SkeletonCard = ({ tall, colIdx = 0, rowIdx = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 + colIdx * 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      type: 'spring',
      stiffness: 260,
      damping: 22,
      mass: 0.7,
      delay: colIdx * 0.1 + rowIdx * 0.06,
    }}
    className={`rounded-2xl bg-surface-100 animate-pulse mb-3 ${tall ? 'aspect-[3/4]' : 'aspect-square'}`}
  />
)

// ── Post Card ─────────────────────────────────────────────
/**
 * Spring Cascade Animation:
 * delay = colIdx*0.12 + rowIdx*0.06
 * → Waterfall từ trái→phải, trên→dưới
 * Load more → Golden Ratio distribution: delay = (i*φ % 1)*0.3
 */
const PostCard = ({
  post,
  colIdx = 0,
  rowIdx = 0,
  isNewBatch = false,
  globalIndex = 0,
  onClick,
}) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const displayUrl = getOptimizedWebpUrl(img?.thumbnailUrl || img?.url, 400)
  const isTall = useMemo(() => {
    if (!post._id) return false
    const idStr = post._id.toString()
    const lastChar = idStr.charCodeAt(idStr.length - 1) || 0
    return lastChar % 3 === 0 // ~33% ảnh cao, phân phối ngẫu nhiên đều mọi cột
  }, [post._id])

  const delay = isNewBatch
    ? ((globalIndex * PHI) % 1) * 0.3 // Phân bố Golden Ratio cho load more
    : colIdx * 0.12 + rowIdx * 0.06 // Waterfall cascade cho initial load

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 + colIdx * 8, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 22,
        mass: 0.8,
        delay,
      }}
      onClick={() => onClick?.(post, globalIndex)}
      className={`group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer mb-3
        ${isTall ? 'aspect-[3/4]' : 'aspect-square'}`}
    >
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={post.caption || 'Wallpaper'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-surface-100 flex items-center justify-center">
          <ImageOff size={24} className="text-white/20" />
        </div>
      )}

      {/* Color palette strip */}
      {post.colorPalette?.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 flex opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {post.colorPalette.slice(0, 6).map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
        {post.isPremium && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/80 text-white backdrop-blur-sm">
            💎
          </span>
        )}
        {post.aiTool && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-600/80 text-white backdrop-blur-sm">
            ✨ {post.aiTool}
          </span>
        )}
        {post.similarityScore !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-600/90 text-white backdrop-blur-sm">
            🎯 {post.similarityScore}%
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-xs font-medium">
            Xem chi tiết
          </span>
          <div className="flex items-center gap-2.5 text-white text-xs">
            <span className="flex items-center gap-1">
              <Heart size={11} className="text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Download size={11} className="text-brand-400" />
              {(post.stats?.downloadsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main SearchPage ─────────────────────────────────────────────
const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSort, setActiveSort] = useState('new')
  const [isAIOnly, setIsAIOnly] = useState(false)
  const [activeColor, setActiveColor] = useState(null) // hex string
  const [colorThreshold, setColorThreshold] = useState(12) // strict match = 12, fuzzy match = 30
  const [showColorPanel, setShowColorPanel] = useState(false)

  // Reset ngưỡng màu sắc về chính xác (12) bất cứ khi nào đổi màu chọn
  useEffect(() => {
    setColorThreshold(12)
  }, [activeColor])

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [total, setTotal] = useState(0)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  // Track các post được load lần 2+ (load more) → dùng Golden Ratio delay
  const [batchStarts, setBatchStarts] = useState(new Set()) // global index đầu mỗi batch

  // Image search states
  const fileInputRef = useRef(null)
  const [searchImageFile, setSearchImageFile] = useState(null)
  const [searchImagePreview, setSearchImagePreview] = useState(null)
  const [searchImageLoading, setSearchImageLoading] = useState(false)
  const [targetPalette, setTargetPalette] = useState([])

  // Dynamic categories từ API
  const [categories, setCategories] = useState([
    { key: 'all', label: 'Tất cả' },
    ...FALLBACK_CATEGORIES,
  ])

  const [selectedIndex, setSelectedIndex] = useState(null)
  const searchTimer = useRef(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const scrollContainerRef = useRef(null)
  const colorScrollRef = useRef(null)

  // Load categories từ API
  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => {
        if (data.categories?.length > 0) {
          setCategories([
            { key: 'all', label: 'Tất cả' },
            ...data.categories.map((c) => ({
              key: c.slug,
              label: `${c.emoji || ''} ${c.name}`.trim(),
            })),
          ])
        }
      })
      .catch(() => {})
  }, [])

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  // Tự động nhận diện các định dạng màu sắc (HEX, RGB, HSL) từ thanh tìm kiếm
  useEffect(() => {
    const cleanQuery = query.trim().toLowerCase()
    
    const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleanQuery)
    const isRgb = /^rgba?\(/.test(cleanQuery)
    const isHsl = /^hsla?\(/.test(cleanQuery)

    if (isHex || isRgb || isHsl) {
      const hex = parseToHex(cleanQuery)
      if (hex) {
        setActiveColor(hex)
        setQuery('')
        if (!showColorPanel) {
          setShowColorPanel(true)
        }
        toast.success(`Tìm kiếm theo mã màu: #${hex}`)
      }
    }
  }, [query, showColorPanel])





  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 10MB')
      return
    }

    setQuery('') // clear text query
    setSearchImageFile(file)
    setSearchImagePreview(URL.createObjectURL(file))
  }

  const clearImageSearch = () => {
    if (searchImagePreview) {
      URL.revokeObjectURL(searchImagePreview)
    }
    setSearchImageFile(null)
    setSearchImagePreview(null)
    setTargetPalette([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (searchImagePreview) {
        URL.revokeObjectURL(searchImagePreview)
      }
    }
  }, [searchImagePreview])

  const fetchPosts = useCallback(
    async ({ reset = false } = {}) => {
      if (reset) {
        if (!initialLoaded) setLoading(true)
        else setIsFiltering(true)
        setCursor(null)
      } else {
        setLoadingMore(true)
      }

      try {
        let results = []
        let hasMoreVal = false
        let nextCursorVal = null
        let countVal = 0

        if (searchImageFile) {
          // Call POST /posts/search-by-image (Multipart FormData)
          setSearchImageLoading(true)
          const formData = new FormData()
          formData.append('image', searchImageFile)

          const params = { limit: 16 }
          if (!reset && cursor) params.cursor = cursor
          if (isAIOnly) params.postType = 'ai'
          if (activeColor) {
            params.color = activeColor
            params.colorThreshold = colorThreshold
          }

          const { data } = await api.post('/posts/search-by-image', formData, {
            params,
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          results = data.posts || []

          hasMoreVal = data.pagination?.hasMore || false
          nextCursorVal = data.pagination?.nextCursor || null
          countVal = data.pagination?.count || results.length
          if (reset) {
            setTargetPalette(data.colorPalette || [])
          }
        } else {
          // Standard GET /posts call
          const params = { limit: 16, sort: activeSort }
          if (!reset && cursor) params.cursor = cursor
          if (activeCategory !== 'all') params.category = activeCategory
          if (isAIOnly) params.postType = 'ai'
          if (debouncedQuery.trim()) params.q = debouncedQuery.trim()
          if (activeColor) {
            params.color = activeColor
            params.colorThreshold = colorThreshold
          }

          const { data } = await api.get('/posts', { params })
          results = data.posts || []

          hasMoreVal = data.pagination?.hasMore || false
          nextCursorVal = data.pagination?.nextCursor || null
          countVal = data.pagination?.count || results.length
        }

        if (reset) {
          setPosts(results)
          setBatchStarts(new Set([0]))
          setTotal(countVal)
        } else {
          setPosts((prev) => {
            const newStart = prev.length
            setBatchStarts((s) => new Set([...s, newStart]))
            return [...prev, ...results]
          })
          setTotal((prev) => prev + results.length)
        }

        setHasMore(hasMoreVal)
        setCursor(nextCursorVal)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không thể tải kết quả tìm kiếm')
      } finally {
        setLoading(false)
        setIsFiltering(false)
        setLoadingMore(false)
        setInitialLoaded(true)
        setSearchImageLoading(false)
      }
    },
    [
      searchImageFile,
      activeCategory,
      activeSort,
      isAIOnly,
      activeColor,
      colorThreshold,
      debouncedQuery,
      cursor,
      initialLoaded,
    ]
  )

  useEffect(() => {
    fetchPosts({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSort, isAIOnly, activeColor, colorThreshold, debouncedQuery, searchImageFile])

  // 3-column JS split: biết chính xác cột/hàng → cascade animation chính xác
  const columns = useMemo(() => {
    const cols = [[], [], []]
    posts.forEach((post, i) => {
      const colIdx = i % 3
      const rowIdx = Math.floor(i / 3)
      const isNewBatch =
        !batchStarts.has(0) ||
        (batchStarts.size > 1 && [...batchStarts].some((s) => s === i))
      cols[colIdx].push({
        post,
        globalIndex: i,
        rowIdx,
        isNewBatch: i > 0 && batchStarts.has(i),
      })
    })
    return cols
  }, [posts, batchStarts])

  // Skeleton columns - xen kẽ tall/square đều mọi cột để cân bằng chiều cao loading
  const skeletonCols = useMemo(
    () => [
      [0, 3, 6, 9].map((i) => ({ idx: i, tall: i % 2 === 0 })),
      [1, 4, 7, 10].map((i) => ({ idx: i, tall: i % 2 === 1 })),
      [2, 5, 8, 11].map((i) => ({ idx: i, tall: i % 2 === 0 })),
    ],
    []
  )

  // Drag-to-scroll cho category chips
  const makeDraggable = (ref) => ({
    ref,
    onMouseDown: (e) => {
      const ele = ref.current
      if (!ele) return
      const startPos = { left: ele.scrollLeft, x: e.clientX }
      const move = (e) => {
        ele.scrollLeft = startPos.left - (e.clientX - startPos.x)
        ele.style.cursor = 'grabbing'
      }
      const up = () => {
        ele.style.cursor = 'grab'
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
  })

  const catDrag = makeDraggable(scrollContainerRef)
  const colorDrag = makeDraggable(colorScrollRef)

  const handleOpenPost = (_post, index) => setSelectedIndex(index)

  // Lấy postId để useModalUrl theo dõi
  const currentPostId = selectedIndex !== null ? posts[selectedIndex]?._id : null
  const closeModalState = useCallback(() => setSelectedIndex(null), [])
  const { closeModal } = useModalUrl(currentPostId, closeModalState)

  const handleClose = closeModal
  const handlePrev = () => setSelectedIndex((i) => Math.max(0, i - 1))
  const handleNext = () =>
    setSelectedIndex((i) => Math.min(posts.length - 1, i + 1))

  const toggleColor = (searchHex) => {
    setActiveColor((prev) => (prev === searchHex ? null : searchHex))
    if (!showColorPanel) setShowColorPanel(true)
  }

  const isCustomColorActive = activeColor && !COLOR_PRESETS.some((c) => c.search === activeColor)

  return (
    <>
      <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Search header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <h1 className="text-2xl font-display font-bold mb-4">Khám phá</h1>
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                id="search-input"
                className={`input pl-12 pr-28 text-base ${searchImagePreview ? 'border-brand-500 bg-brand-500/5' : ''}`}
                placeholder={searchImagePreview ? "Đang tìm kiếm bằng hình ảnh..." : "Tìm wallpaper, tag, danh mục..."}
                value={query}
                onChange={(e) => {
                  if (searchImagePreview) {
                    clearImageSearch()
                  }
                  setQuery(e.target.value)
                }}
                disabled={searchImageLoading}
                autoFocus
              />
              
              {/* Camera upload button + Clear button container */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                {searchImagePreview && (
                  <div className="relative group/thumb w-8 h-8 rounded-lg overflow-hidden border border-brand-400/50">
                    <img src={searchImagePreview} className="w-full h-full object-cover" alt="Search target" />
                    <button
                      type="button"
                      onClick={clearImageSearch}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Xóa ảnh"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {searchImageLoading ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full flex-shrink-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  !searchImagePreview ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white/40 hover:text-white/85 transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Tìm bằng hình ảnh"
                    >
                      <Camera size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={clearImageSearch}
                      className="text-white/40 hover:text-white/85 transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Xóa ảnh tìm kiếm"
                    >
                      <X size={18} />
                    </button>
                  )
                )}
                
                {query && !searchImagePreview && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-white/40 hover:text-white/85 transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
            </div>
          </motion.div>

          {/* Image Search Preview and Main Colors */}
          <AnimatePresence>
            {searchImagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mb-5 overflow-hidden"
              >
                <div className="card p-4 border border-brand-500/20 bg-brand-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Search target image preview */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-brand-400/30 flex-shrink-0 shadow-lg">
                      <img src={searchImagePreview} className="w-full h-full object-cover" alt="Ảnh mẫu tìm kiếm" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Tìm kiếm hình ảnh</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white/80 mr-1.5">Màu chủ đạo:</span>
                        {targetPalette && targetPalette.length > 0 ? (
                          targetPalette.map((hex, i) => {
                            const hexClean = hex.replace('#', '').toLowerCase()
                            const isActive = activeColor === hexClean
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setActiveColor(hexClean)
                                  if (!showColorPanel) {
                                    setShowColorPanel(true)
                                  }
                                  toast.success(`Lọc ảnh theo tông màu: ${hex}`)
                                }}
                                className={`w-5 h-5 rounded-lg border shadow-sm flex-shrink-0 cursor-pointer transition-all hover:scale-115 hover:rotate-6
                                  ${isActive ? 'border-white scale-115 ring-2 ring-brand-500/50 shadow-md' : 'border-white/20'}`}
                                style={{ backgroundColor: hex }}
                                title={`Lọc theo màu ${hex}`}
                              />
                            )
                          })
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-[11px] text-white/40">Đang phân tích màu sắc...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearImageSearch}
                    className="btn-secondary text-xs px-4 py-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all font-semibold flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                  >
                    <X size={13} /> Xóa ảnh mẫu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category chips */}
          <div
            {...catDrag}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 cursor-grab active:cursor-grabbing select-none"
          >
            {categories.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border flex-shrink-0
                  ${
                    activeCategory === key
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-surface-50 border-white/10 text-white/60 hover:border-brand-500/50 hover:text-white/80'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* AI toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsAIOnly(!isAIOnly)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${isAIOnly ? 'bg-brand-600' : 'bg-white/20'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isAIOnly ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </div>
              <span className="text-sm text-white/60 flex items-center gap-1">
                <Sparkles size={14} className="text-brand-400" /> AI only
              </span>
            </label>

            {/* Color Search toggle */}
            <button
              onClick={() => setShowColorPanel((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border
                ${showColorPanel || activeColor ? 'bg-brand-600/20 border-brand-500/50 text-brand-300' : 'bg-surface-50 border-white/10 text-white/50 hover:text-white/80'}`}
            >
              <Palette size={14} />
              Màu sắc
              {activeColor && (
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: `#${activeColor}` }}
                />
              )}
              <ChevronDown
                size={13}
                className={`transition-transform ${showColorPanel ? 'rotate-180' : ''}`}
              />
            </button>

            <div className="flex-1" />

            {/* Sort */}
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSort(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${activeSort === key ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-50 border-white/10 text-white/50 hover:text-white/80'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!loading && (
              <span className="text-sm text-white/30 ml-1 hidden md:inline-block min-w-[85px] text-right">
                {total} kết quả
              </span>
            )}
          </div>

          {/* Color Search Panel */}
          <AnimatePresence>
            {showColorPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-white/50 flex items-center gap-1.5">
                      <Palette size={13} /> Tìm theo màu chủ đạo
                    </p>
                    {activeColor && (
                      <button
                        onClick={() => setActiveColor(null)}
                        className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                      >
                        <X size={12} /> Bỏ lọc màu
                      </button>
                    )}
                  </div>
                  <div
                    {...colorDrag}
                    className="flex gap-2 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none pb-1 pt-3 pl-3"
                  >
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.search}
                        onClick={() => toggleColor(color.search)}
                        title={color.label}
                        className={`flex flex-col items-center gap-1.5 flex-shrink-0 group transition-all`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl border-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-24
                            ${activeColor === color.search ? 'border-white shadow-md' : 'border-white/20'}`}
                          style={{ backgroundColor: color.hex }}
                        />
                        <span
                          className={`text-[10px] transition-colors ${activeColor === color.search ? 'text-white' : 'text-white/30'}`}
                        >
                          {color.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Picker Button - Tách biệt ở dưới dòng presets để tránh bị cắt layout */}
                  <CustomColorPickerButton
                    activeColor={activeColor}
                    isCustomColorActive={isCustomColorActive}
                    onApply={(hex) => setActiveColor(hex)}
                  />
                  {activeColor && (
                    <p className="text-[11px] text-white/30 mt-2">
                      💡 Lọc ảnh có màu palette tương tự. Kết quả phụ thuộc vào
                      ảnh đã được xử lý màu.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {loading ? (
                // Skeleton: 3-col JS split với cascade animation
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 items-start"
                >
                  {skeletonCols.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className={`flex-1 flex flex-col ${colIdx === 2 ? 'hidden md:flex' : ''}`}
                    >
                      {col.map(({ idx, tall }, rowIdx) => (
                        <SkeletonCard
                          key={idx}
                          tall={tall}
                          colIdx={colIdx}
                          rowIdx={rowIdx}
                        />
                      ))}
                    </div>
                  ))}
                </motion.div>
              ) : posts.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                    {activeColor ? (
                      <div
                        className="w-8 h-8 rounded-xl border-4 border-white/20"
                        style={{ backgroundColor: `#${activeColor}` }}
                      />
                    ) : (
                      <ImageOff size={28} className="text-white/20" />
                    )}
                  </div>
                  <p className="text-white/40 mb-2">Không tìm thấy kết quả</p>
                  <p className="text-white/20 text-sm max-w-md mx-auto mb-4">
                    {activeColor && colorThreshold === 12
                      ? 'Không tìm thấy hình ảnh nào chứa mã màu chính xác 100% với màu sắc bạn đã chọn.'
                      : searchImagePreview
                        ? 'Không có ảnh nào tương tự màu sắc với ảnh của bạn. Thử ảnh mẫu khác hoặc xóa ảnh tìm kiếm.'
                        : activeColor
                          ? 'Không có ảnh nào khớp màu này. Thử màu khác hoặc tắt lọc màu.'
                          : debouncedQuery
                            ? `Không có wallpaper nào cho "${debouncedQuery}"`
                            : 'Danh mục này chưa có ảnh nào được duyệt'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                    {activeColor && colorThreshold === 12 && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => setColorThreshold(30)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-brand-300 hover:text-white font-semibold text-xs border border-brand-500/30 hover:border-brand-500/60 shadow-lg transition-all duration-300 cursor-pointer bg-brand-500/10 hover:bg-brand-500/20"
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          letterSpacing: '0.03em',
                        }}
                      >
                        💡 Xem các hình ảnh có màu gần giống
                      </motion.button>
                    )}
                    {searchImagePreview && (
                      <button
                        type="button"
                        onClick={clearImageSearch}
                        className="btn-secondary text-sm cursor-pointer"
                      >
                        Xóa ảnh tìm kiếm
                      </button>
                    )}
                    {activeColor && (
                      <button
                        type="button"
                        onClick={() => setActiveColor(null)}
                        className="btn-secondary text-sm cursor-pointer"
                      >
                        Bỏ lọc màu
                      </button>
                    )}
                    {debouncedQuery && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="btn-secondary text-sm cursor-pointer"
                      >
                        Xóa tìm kiếm
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`transition-opacity duration-300 ${isFiltering ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                >
                  {/* 3-column JS masonry — cascade spring animation */}
                  <div className="flex gap-3 items-start">
                    {columns.map((col, colIdx) => (
                      <div
                        key={colIdx}
                        className={`flex-1 flex flex-col ${colIdx === 2 ? 'hidden md:flex' : ''}`}
                      >
                        {col.map(
                          ({ post, globalIndex, rowIdx, isNewBatch }) => (
                            <PostCard
                              key={post._id}
                              post={post}
                              globalIndex={globalIndex}
                              colIdx={colIdx}
                              rowIdx={rowIdx}
                              isNewBatch={isNewBatch}
                              onClick={handleOpenPost}
                            />
                          )
                        )}
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="flex justify-center mt-12">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => fetchPosts()}
                        disabled={loadingMore}
                        className="btn-secondary min-w-[140px] flex items-center justify-center gap-2"
                      >
                        {loadingMore ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                          />
                        ) : (
                          <RefreshCw size={15} />
                        )}
                        <span>{loadingMore ? 'Đang tải...' : 'Xem thêm'}</span>
                      </motion.button>
                    </div>
                  )}

                  {!hasMore && posts.length > 0 && (
                    <p className="text-center text-white/20 text-sm mt-12 italic">
                      — Đã hiển thị tất cả {posts.length} kết quả —
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedIndex !== null && posts[selectedIndex] && (
          <PostDetailModal
            key={posts[selectedIndex]._id}
            postId={posts[selectedIndex]._id}
            onClose={handleClose}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex < posts.length - 1}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default SearchPage
