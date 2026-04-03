import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Sparkles,
  Heart,
  Download,
  RefreshCw,
  ImageOff,
} from 'lucide-react'
import api from '../api/api'
import PostDetailModal from '../components/post/PostDetailModal'

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'nature', label: '🌿 Nature' },
  { key: 'anime', label: '🎌 Anime' },
  { key: 'minimal', label: '◻️ Minimal' },
  { key: 'abstract', label: '🎨 Abstract' },
  { key: 'city', label: '🌃 City' },
  { key: 'space', label: '🚀 Space' },
  { key: 'dark', label: '🌑 Dark' },
  { key: 'light', label: '☀️ Light' },
  { key: 'gradient', label: '🌈 Gradient' },
  { key: 'other', label: '✨ Khác' },
]

const SORT_OPTIONS = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'hot', label: '🔥 Hot' },
  { key: 'top', label: '⭐ Top' },
]

// ── Skeleton Card ──────────────────────────────────────────
const SkeletonCard = ({ tall }) => (
  <div
    className={`rounded-2xl bg-surface-100 animate-pulse break-inside-avoid mb-3 ${tall ? 'aspect-[3/4]' : 'aspect-square'}`}
  />
)

// ── Post Card ──────────────────────────────────────────────
const PostCard = ({ post, index, onClick }) => {
  const img = post.images?.[0]
  const displayUrl = img?.thumbnailUrl || img?.url
  const isTall = index % 3 === 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => onClick?.(post, index)}
      className={`group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer break-inside-avoid mb-3
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Badges */}
      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
        {post.isPremium && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/80 text-white backdrop-blur-sm">
            💎
          </span>
        )}
        {post.isAIGenerated && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-600/80 text-white backdrop-blur-sm">
            AI
          </span>
        )}
      </div>

      {/* Hover content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-xs font-medium">Xem chi tiết</span>
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

// ── Main Component ─────────────────────────────────────────
const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSort, setActiveSort] = useState('new')
  const [isAIOnly, setIsAIOnly] = useState(false)

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [total, setTotal] = useState(0)

  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const scrollContainerRef = useRef(null)

  // Modal state
  const [selectedIndex, setSelectedIndex] = useState(null)

  // Debounce search query
  const searchTimer = useRef(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

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

        const { data } = await api.get('/posts', { params })
        let results = data.posts || []

        // Client-side filter by query (Phase 4: move to server-side)
        if (debouncedQuery.trim()) {
          const q = debouncedQuery.toLowerCase()
          results = results.filter(
            (p) =>
              p.caption?.toLowerCase().includes(q) ||
              p.tags?.some((t) => t.includes(q)) ||
              p.category?.includes(q)
          )
        }

        if (reset) {
          setPosts(results)
          setTotal(data.pagination?.count || results.length)
        } else {
          setPosts((prev) => [...prev, ...results])
          setTotal((prev) => prev + results.length)
        }

        setHasMore(data.pagination?.hasMore || false)
        setCursor(data.pagination?.nextCursor || null)
      } catch {
        // Giữ nguyên state cũ nếu lỗi
      } finally {
        setLoading(false)
        setIsFiltering(false)
        setLoadingMore(false)
        setInitialLoaded(true)
      }
    },
    [activeCategory, activeSort, isAIOnly, debouncedQuery, cursor, initialLoaded]
  )

  useEffect(() => {
    fetchPosts({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSort, isAIOnly, debouncedQuery])

  // Modal handlers
  const handleOpenPost = (_post, index) => setSelectedIndex(index)
  const handleClose = () => setSelectedIndex(null)
  const handlePrev = () => setSelectedIndex((i) => Math.max(0, i - 1))
  const handleNext = () => setSelectedIndex((i) => Math.min(posts.length - 1, i + 1))

  const handleMouseDown = (e) => {
    const ele = scrollContainerRef.current
    if (!ele) return
    const startPos = { left: ele.scrollLeft, x: e.clientX }
    const handleMouseMove = (e) => {
      const dx = e.clientX - startPos.x
      ele.scrollLeft = startPos.left - dx
      ele.style.cursor = 'grabbing'
      ele.style.userSelect = 'none'
    }
    const handleMouseUp = () => {
      ele.style.cursor = 'grab'
      ele.style.removeProperty('user-select')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
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
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 cursor-grab active:cursor-grabbing select-none"
          >
            {CATEGORIES.map(({ key, label }) => (
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
          <div className="flex items-center gap-3 mb-5">
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
            <div className="flex-1" />
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSort(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${
                      activeSort === key
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-50 border-white/10 text-white/50 hover:text-white/80'
                    }`}
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

          {/* Results Grid */}
          <motion.div layout className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="skeleton-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="columns-2 md:columns-3 gap-3"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonCard key={i} tall={i % 3 === 0} />
                  ))}
                </motion.div>
              ) : posts.length === 0 ? (
                <motion.div
                  key="empty-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                    <ImageOff size={28} className="text-white/20" />
                  </div>
                  <p className="text-white/40 mb-2">Không tìm thấy kết quả</p>
                  <p className="text-white/20 text-sm">
                    {debouncedQuery
                      ? `Không có wallpaper nào cho "${debouncedQuery}"`
                      : 'Danh mục này chưa có ảnh nào được duyệt'}
                  </p>
                  {debouncedQuery && (
                    <button
                      onClick={() => setQuery('')}
                      className="mt-4 btn-secondary text-sm"
                    >
                      Xóa tìm kiếm
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`transition-opacity duration-300 ${
                    isFiltering ? 'opacity-40 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="columns-2 md:columns-3 gap-3">
                    <AnimatePresence>
                      {posts.map((post, i) => (
                        <PostCard
                          key={post._id}
                          post={post}
                          index={i}
                          onClick={handleOpenPost}
                        />
                      ))}
                    </AnimatePresence>
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
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
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
          </motion.div>
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
