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
} from 'lucide-react'
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
  { label: 'Trắng', hex: '#f1f5f9', search: 'fafafa' },
  { label: 'Đen', hex: '#1e293b', search: '212121' },
  { label: 'Xám', hex: '#64748b', search: '78909c' },
  { label: 'Mint', hex: '#10b981', search: '00bfa5' },
]

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
  { key: 'hot', label: '🔥 Hot' },
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
  const displayUrl = img?.thumbnailUrl || getOptimizedWebpUrl(img?.url, 400)
  const isTall = globalIndex % 3 === 0

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
  const [showColorPanel, setShowColorPanel] = useState(false)

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
        const params = { limit: 16, sort: activeSort }
        if (!reset && cursor) params.cursor = cursor
        if (activeCategory !== 'all') params.category = activeCategory
        if (isAIOnly) params.isAI = 'true'
        if (debouncedQuery.trim()) params.q = debouncedQuery.trim()
        if (activeColor) params.color = activeColor // hex search (server-side optional, fallback client)

        const { data } = await api.get('/posts', { params })
        let results = data.posts || []

        // Client-side color filter dùng HSL-weighted distance
        // Threshold 30 (chặt hơn 45 cũ) — chỉ match màu cùng họ thực sự
        if (activeColor && results.length > 0) {
          const targetHex = '#' + activeColor
          results = results.filter((post) => {
            if (!post.colorPalette?.length) return false
            // Lấy distance nhỏ nhất trong tất cả màu palette
            const minDist = Math.min(
              ...post.colorPalette
                .filter((hex) => hex && hex.replace('#', '').length === 6)
                .map((hex) => colorDistance(hex, targetHex))
            )
            return minDist < 30 // Chặt hơn: 30 thay vì 45
          })
        }

        if (reset) {
          setPosts(results)
          setBatchStarts(new Set([0]))
          setTotal(data.pagination?.count || results.length)
        } else {
          setPosts((prev) => {
            const newStart = prev.length
            setBatchStarts((s) => new Set([...s, newStart]))
            return [...prev, ...results]
          })
          setTotal((prev) => prev + results.length)
        }

        setHasMore(data.pagination?.hasMore || false)
        setCursor(data.pagination?.nextCursor || null)
      } catch {
        /* giữ state cũ */
      } finally {
        setLoading(false)
        setIsFiltering(false)
        setLoadingMore(false)
        setInitialLoaded(true)
      }
    },
    [
      activeCategory,
      activeSort,
      isAIOnly,
      activeColor,
      debouncedQuery,
      cursor,
      initialLoaded,
    ]
  )

  useEffect(() => {
    fetchPosts({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSort, isAIOnly, activeColor, debouncedQuery])

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

  // Skeleton columns
  const skeletonCols = useMemo(
    () => [
      [0, 3, 6, 9].map((i) => ({ idx: i, tall: i % 3 === 0 })),
      [1, 4, 7, 10].map((i) => ({ idx: i, tall: i % 3 === 0 })),
      [2, 5, 8, 11].map((i) => ({ idx: i, tall: i % 3 === 0 })),
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
                className="input pl-12 pr-12 text-base"
                placeholder="Tìm wallpaper, tag, danh mục..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </motion.div>

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
              <span className="text-sm text-white/30 ml-1 hidden md:block">
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
                          className={`w-9 h-9 rounded-xl border-2 transition-all duration-200 group-hover:scale-110
                            ${activeColor === color.search ? 'border-white scale-110 shadow-lg' : 'border-white/20'}`}
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
                  <p className="text-white/20 text-sm">
                    {activeColor
                      ? 'Không có ảnh nào khớp màu này. Thử màu khác hoặc tắt lọc màu.'
                      : debouncedQuery
                        ? `Không có wallpaper nào cho "${debouncedQuery}"`
                        : 'Danh mục này chưa có ảnh nào được duyệt'}
                  </p>
                  <div className="flex gap-3 justify-center mt-4">
                    {activeColor && (
                      <button
                        onClick={() => setActiveColor(null)}
                        className="btn-secondary text-sm"
                      >
                        Bỏ lọc màu
                      </button>
                    )}
                    {debouncedQuery && (
                      <button
                        onClick={() => setQuery('')}
                        className="btn-secondary text-sm"
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
