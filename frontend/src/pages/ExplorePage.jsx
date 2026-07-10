import { useRef, useEffect, useState, useCallback } from 'react'
import api from '../api/api'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PostDetailModal from '../components/post/PostDetailModal'
import { useSettings } from '../context/SettingsContext'
import useModalUrl from '../hooks/useModalUrl'
import useAuthStore from '../store/auth.store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Camera,
  Heart,
  Eye,
  Download,
  Sparkles,
  Frown,
  Flame,
  Zap,
  Shuffle,
  Lightbulb,
  RefreshCw,
  Bookmark,
} from 'lucide-react'
import { GiCutDiamond } from 'react-icons/gi'

// Dimensions & pre-crop logic for magazine look
const CARD_PATTERN = [
  { col: 'lg:col-span-2', row: 'lg:row-span-2', type: 'hero' }, // 0 — Hero 2×2
  { col: 'lg:col-span-1', row: 'lg:row-span-2', type: 'tall' }, // 1 — Tall 1×2
  { col: 'lg:col-span-1', row: 'lg:row-span-2', type: 'tall' }, // 2 — Tall 1×2
  { col: 'lg:col-span-1', row: 'lg:row-span-1', type: 'std' }, // 3 — Std 1×1
  { col: 'lg:col-span-1', row: 'lg:row-span-1', type: 'std' }, // 4 — Std 1×1
  { col: 'lg:col-span-2', row: 'lg:row-span-1', type: 'wide' }, // 5 — Wide 2×1
]

const CARD_THUMB = {
  hero: { w: 600, h: 600, face: true },
  tall: { w: 400, h: 600, face: true },
  std: { w: 360, h: 360, face: true },
  wide: { w: 620, h: 280, face: false },
}

const getSmartCropUrl = (url, w, h, preferFace = true) => {
  if (!url || !url.includes('/upload/')) return url
  const [base, path] = url.split('/upload/')
  const gravity = preferFace ? 'g_auto:faces' : 'g_auto'
  return `${base}/upload/c_fill,${gravity},w_${w},h_${h},q_75,f_auto/${path}`
}

const getFewPostsPattern = (len, index) => {
  if (len <= 2) return { col: 'lg:col-span-2', row: 'lg:row-span-2', type: 'hero' }
  return CARD_PATTERN[index % CARD_PATTERN.length]
}

// Sub-filters tabs matching backend exactly
const POST_TYPE_TABS = [
  {
    key: 'all',
    label: 'Tất cả',
    icon: Globe,
    countKey: 'all',
    widthClass: 'w-[140px]',
  },
  {
    key: 'ai',
    label: 'Nghệ thuật AI',
    icon: Sparkles,
    countKey: 'ai',
    widthClass: 'w-[190px]',
  },
  {
    key: 'digital-normal',
    label: 'Ảnh Camera (EXIF)',
    icon: Camera,
    countKey: 'cameraExif',
    widthClass: 'w-[230px]',
  },
  {
    key: 'digital-raw',
    label: 'RAW & Presets',
    icon: Download,
    countKey: 'raw',
    widthClass: 'w-[190px]',
  },
]

// Sort Tabs
const EXPLORE_TABS = [
  { key: 'new', label: 'Mới nhất', icon: Sparkles, endpoint: '/posts', params: { sort: 'new' } },
  { key: 'hot', label: 'Xu hướng', icon: Flame, endpoint: '/posts', params: { sort: 'hot' } },
  { key: 'top', label: 'Phổ biến', icon: Zap, endpoint: '/posts', params: { sort: 'top' } },
  { key: 'following', label: 'Đang theo dõi', icon: Heart, endpoint: '/posts/following', params: {} },
  { key: 'random', label: 'Ngẫu nhiên', icon: Shuffle, endpoint: '/posts', params: { sort: 'random' } },
  { key: 'recommended', label: 'Gợi ý', icon: Lightbulb, endpoint: '/posts', params: { sort: 'recommended' } },
]

export default function ExplorePage() {
  const { postLoadingDelayMs } = useSettings()
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'new'
  const initialPostType = searchParams.get('postType') || 'all'
  const initialCategory = searchParams.get('category') || 'all'

  // Filter states
  const [activeTab, setActiveTab] = useState(initialTab)
  const [activePostType, setActivePostType] = useState(initialPostType)
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [onlyShowExif, setOnlyShowExif] = useState(true)

  // Posts & pagination states
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)

  // Track IDs already loaded in random tab to avoid duplicates on next page
  const seenIdsRef = useRef(new Set())

  // Stats badge counts
  const [tabStats, setTabStats] = useState({
    all: 0,
    ai: 0,
    raw: 0,
    cameraExif: 0,
  })

  // Categories list
  const [activeCategoriesList, setActiveCategoriesList] = useState([
    { key: 'all', label: 'Tất cả' },
    { key: 'nature', label: '🌿 Thiên nhiên' },
    { key: 'anime', label: '🎌 Anime' },
    { key: 'minimal', label: '⬜ Tối giản' },
    { key: 'abstract', label: '🎨 Abstract' },
    { key: 'city', label: '🌃 Thành phố' },
    { key: 'space', label: '🚀 Vũ trụ' },
    { key: 'dark', label: '🌑 Dark' },
    { key: 'light', label: '☀️ Light' },
    { key: 'gradient', label: '🌈 Gradient' },
    { key: 'other', label: '✨ Khác' },
  ])

  const scrollContainerRef = useRef(null)
  const loadMoreRef = useRef(null)

  // Drag-to-scroll category chips
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

  // Load Categories on mount
  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => {
        if (data.categories?.length > 0) {
          setActiveCategoriesList([
            { key: 'all', label: 'Tất cả' },
            ...data.categories.map((c) => ({
              key: c.slug,
              label: `${c.emoji || ''} ${c.name}`.trim(),
            })),
          ])
        }
      })
      .catch((err) => console.error('Failed to load categories for explore:', err))
  }, [])

  const currentTabObj = EXPLORE_TABS.find((t) => t.key === activeTab)

  // Fetch posts with cursor pagination
  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setIsEmpty(false)
        seenIdsRef.current = new Set() // clear seen IDs on filter change / manual refresh
      } else {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
      }

      if (postLoadingDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, postLoadingDelayMs))
      }

      try {
        const params = { limit: 16, ...currentTabObj.params }

        if (activeCategory !== 'all') {
          params.category = activeCategory
        }

        if (activePostType !== 'all') {
          params.postType = activePostType
        }

        if (activePostType === 'digital-normal' && onlyShowExif) {
          params.hasExif = 'true'
        }

        // Cursor pagination for non-random tabs
        if (!reset && cursor && currentTabObj.key !== 'random') {
          params.cursor = cursor
        }

        // Random tab: send already-seen IDs so backend can exclude them
        if (currentTabObj.key === 'random' && !reset && seenIdsRef.current.size > 0) {
          params.excludeIds = [...seenIdsRef.current].join(',')
        }

        const { data } = await api.get(currentTabObj.endpoint, { params })

        if (data.isEmpty || (reset && (!data.posts || data.posts.length === 0))) {
          setIsEmpty(true)
          setPosts([])
          setHasMore(false)
          setCursor(null)
          return
        }

        const newPosts = data.posts || []

        // Track seen IDs for random dedup
        if (currentTabObj.key === 'random') {
          newPosts.forEach(p => seenIdsRef.current.add(p._id))
        }

        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]))
        setHasMore(data.pagination?.hasMore || false)
        setCursor(data.pagination?.nextCursor || null)

        if (data.stats) {
          setTabStats(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch posts in explore:', err)
        if (reset) {
          setPosts([])
          setIsEmpty(true)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, cursor, currentTabObj, activePostType, activeCategory, onlyShowExif, postLoadingDelayMs, loadingMore, hasMore]
  )

  // Fetch on filters change
  useEffect(() => {
    fetchPosts(true)
    setSearchParams(
      {
        tab: activeTab,
        postType: activePostType,
        category: activeCategory,
      },
      { replace: true }
    )
  }, [activeTab, activePostType, activeCategory, onlyShowExif]) // eslint-disable-line

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(false)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [fetchPosts, hasMore, loadingMore, loading])

  // Post Detail Modal sync with URL state
  const currentPostId = selectedIndex !== null ? posts[selectedIndex]?._id : null
  const closeModalState = useCallback(() => setSelectedIndex(null), [])
  const { closeModal } = useModalUrl(currentPostId, closeModalState)

  const handleOpenPost = (post, index) => setSelectedIndex(index)
  const handleClose = closeModal
  const handlePrev = () => setSelectedIndex((i) => Math.max(0, i - 1))
  const handleNext = () => setSelectedIndex((i) => Math.min(posts.length - 1, i + 1))

  const handleTabChange = (key) => {
    if (key === 'following' && !isLoggedIn) {
      toast.error('Vui lòng đăng nhập để xem bảng tin người theo dõi!')
      navigate('/login')
      return
    }
    setActiveTab(key)
  }

  const currentCategoryObj = activeCategoriesList.find((c) => c.key === activeCategory)
  const currentCategoryName = currentCategoryObj ? currentCategoryObj.label : 'Tất cả'

  return (
    <>
      <div className="min-h-screen bg-surface py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header & Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div>
              <p className="text-brand-600 dark:text-blue-400 text-[11px] font-bold tracking-widest uppercase mb-3 pj flex items-center gap-1.5">
                <span>🌌</span> Trung tâm khám phá
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight pj">
                Khám phá ảnh nghệ thuật
              </h2>
              <p className="text-sm text-foreground/50 mt-2 pj max-w-xl">
                Bảng tin vô chậm tổng hợp các bức ảnh đỉnh cao nhất của cộng đồng PicSpy, lọc mượt mà theo từng phong cách và chủ đề nghệ thuật.
              </p>
            </div>

            {/* Sort Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-surface-50 p-1.5 rounded-2xl border border-[var(--color-border)] self-start lg:self-auto max-w-full overflow-x-auto no-scrollbar">
              {EXPLORE_TABS.map(({ key, label, icon: TabIcon }) => {
                const isActive = activeTab === key
                return (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 pj cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5
                      ${isActive ? 'text-white bg-gradient-brand shadow-sm font-black' : 'text-foreground/50 hover:text-foreground/80'}
                    `}
                  >
                    <TabIcon size={13} className={isActive ? 'text-white' : 'text-foreground/45'} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sub Filters Row */}
          <div className="flex flex-col gap-6 mb-10">
            {/* Post Type Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div
                className="flex gap-2 p-1 bg-[#1a172e]/35 dark:bg-[#1a172e]/55 backdrop-blur-md rounded-2xl border overflow-x-auto no-scrollbar max-w-full"
                style={{
                  borderColor: 'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
                }}
              >
                {POST_TYPE_TABS.map((tabItem) => {
                  const IconComp = tabItem.icon
                  const isActive = activePostType === tabItem.key
                  const count = tabStats[tabItem.countKey] ?? 0

                  const formatTabCount = (num) => {
                    if (num >= 10000) return '9.9k+'
                    if (num >= 1000) {
                      return (num / 1000).toFixed(1).replace('.0', '') + 'k'
                    }
                    return num.toString()
                  }

                  return (
                    <button
                      key={tabItem.key}
                      onClick={() => setActivePostType(tabItem.key)}
                      className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 flex items-center justify-center gap-2 pj cursor-pointer select-none whitespace-nowrap ${tabItem.widthClass}
                        ${isActive ? 'text-white' : 'text-foreground/45 hover:text-foreground/80'}
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="exploreActivePostTypeTab"
                          className="absolute inset-0 bg-gradient-brand shadow-md rounded-xl z-0"
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 28,
                          }}
                        />
                      )}

                      <span className="relative z-10 flex items-center justify-center">
                        <IconComp size={14} />
                      </span>
                      <span className="relative z-10">{tabItem.label}</span>
                      <span
                        className={`relative z-10 text-[9px] px-1 py-0.5 w-[38px] h-[16px] flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold transition-colors
                        ${isActive ? 'bg-white/20 text-white' : 'bg-foreground/5 text-foreground/40'}
                      `}
                      >
                        {formatTabCount(count)}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* EXIF Toggle or Random Refresh (Switch-style matching HOME exactly) */}
              <AnimatePresence>
                {activePostType === 'digital-normal' && activeTab !== 'random' && (
                  <motion.div
                    initial={{ opacity: 0, x: 15, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-3 bg-[#1a172e]/30 backdrop-blur-md px-4 py-2.5 rounded-xl border self-start md:self-auto"
                    style={{
                      borderColor: 'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
                    }}
                  >
                    <span className="text-xs text-foreground/60 font-medium pj">
                      Chỉ hiện ảnh có EXIF chi tiết
                    </span>
                    <button
                      onClick={() => setOnlyShowExif((prev) => !prev)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-all flex items-center cursor-pointer
                        ${onlyShowExif ? 'bg-green-500 justify-end' : 'bg-foreground/15 justify-start'}
                      `}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    </button>
                  </motion.div>
                )}

                {activeTab === 'random' && (
                  <motion.div
                    initial={{ opacity: 0, x: 15, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center"
                  >
                    <motion.button
                      onClick={() => fetchPosts(true)}
                      disabled={loading}
                      whileTap={{ scale: 0.93 }}
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="relative flex items-center gap-2 backdrop-blur-md px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: loading ? 'rgba(26,23,46,0.55)' : 'rgba(26,23,46,0.30)',
                        borderColor: loading
                          ? 'hsla(var(--color-brand-h), var(--color-brand-s), 60%, 0.35)'
                          : 'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
                        color: loading ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                        transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                        boxShadow: loading
                          ? '0 0 18px hsla(var(--color-brand-h), var(--color-brand-s), 55%, 0.18)'
                          : 'none',
                      }}
                    >
                      {/* Shimmer sweep while loading */}
                      {loading && (
                        <motion.span
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.07) 50%, transparent 65%)',
                            backgroundSize: '200% 100%',
                          }}
                          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                        />
                      )}

                      {/* Icon — spin driven by framer-motion, reacts instantly */}
                      <motion.span
                        animate={{ rotate: loading ? 360 : 0 }}
                        transition={
                          loading
                            ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
                            : { duration: 0.35, ease: 'easeOut' }
                        }
                        style={{ display: 'inline-flex', flexShrink: 0 }}
                      >
                        <RefreshCw size={13} />
                      </motion.span>

                      {/* Label */}
                      <span className="relative z-10">
                        {loading ? 'Đang tải...' : 'Làm mới ngẫu nhiên'}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Chips row (Clean scroll horizontal like HOME) */}
            <div
              ref={scrollContainerRef}
              {...catDrag}
              className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 cursor-grab active:cursor-grabbing select-none py-1 w-full"
            >
              {activeCategoriesList.map((cat) => {
                const isActive = activeCategory === cat.key
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border flex-shrink-0 cursor-pointer
                      ${
                        isActive
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-surface-50 border-white/10 text-white/60 hover:border-brand-500/50 hover:text-white/80'
                      }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Gallery View */}
          <div className="relative">
            {loading ? (
              <ExploreSkeleton />
            ) : isEmpty ? (
              <div className="card p-12 border border-white/5 flex flex-col items-center justify-center text-center gap-4 bg-white/[0.01] rounded-3xl relative overflow-hidden py-16">
                {/* Decorative glow */}
                <div className="absolute w-[200px] h-[200px] rounded-full blur-[80px] bg-brand-500/10 pointer-events-none -top-10" />
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center text-foreground/30 border border-white/5 relative z-10">
                  <Frown size={20} className="text-foreground/45" />
                </div>
                <div className="space-y-2 relative z-10">
                  <h4 className="text-white font-bold text-sm pj">Không tìm thấy bài viết nào</h4>
                  <p className="text-xs text-foreground/40 max-w-sm pj leading-relaxed">
                    Chưa có bài viết nào thuộc danh mục <span className="text-brand-400 font-bold">{currentCategoryName}</span> phù hợp với bộ lọc hiện tại.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div
                  className="grid grid-cols-2 lg:grid-cols-4 gap-6"
                  style={{ gridAutoRows: '220px' }}
                >
                  {posts.map((post, i) => {
                    const p = getFewPostsPattern(posts.length, i)
                    return (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, filter: 'blur(3px)', y: 15 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: i < 12 ? i * 0.04 : (i % 6) * 0.06,
                          ease: 'easeOut',
                        }}
                        className={`col-span-1 row-span-1 ${p.col} ${p.row}`}
                      >
                        <CommunityPostCard
                          post={post}
                          index={i}
                          onClick={handleOpenPost}
                          customType={p.type}
                        />
                      </motion.div>
                    )
                  })}
                </div>

                {/* Infinite Scroll Loader Trigger */}
                <div ref={loadMoreRef} className="w-full flex justify-center py-6">
                  {loadingMore && (
                    <div className="flex items-center gap-3 bg-surface-50 border border-[var(--color-border)] px-5 py-2.5 rounded-2xl shadow-lg">
                      <motion.div
                        className="w-4 h-4 border-2 border-brand-500/20 border-t-brand-500 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="text-xs font-bold text-foreground/60 pj">Đang tải thêm...</span>
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <div className="text-center py-6 pj flex flex-col items-center gap-2 select-none">
                      <p className="text-foreground/30 text-xs italic">
                        — Bạn đã xem hết tất cả {posts.length} tác phẩm nghệ thuật —
                      </p>
                      <Link
                        to="/upload"
                        className="text-brand-500 hover:text-brand-400 text-xs font-bold hover:underline transition-colors mt-1 cursor-pointer"
                      >
                        Đăng tải tác phẩm đầu tay của bạn để chia sẻ cùng cộng đồng ngay hôm nay!
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedIndex !== null && posts[selectedIndex] && (
          <PostDetailModal
            postId={posts[selectedIndex]?._id}
            onClose={handleClose}
            onPrev={selectedIndex > 0 ? handlePrev : null}
            onNext={selectedIndex < posts.length - 1 ? handleNext : null}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Magazine Style Post Card
const CommunityPostCard = ({ post, index, onClick, customType }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const author = post.authorId
  const glowColor = post.colors?.[0]?.hex || '#7c3aed'
  const pattern = CARD_PATTERN[index % CARD_PATTERN.length]
  const type = customType || pattern.type
  const alwaysShow = type === 'hero' || type === 'tall'

  const { w, h, face } = CARD_THUMB[type]
  const sourceUrl = img?.previewUrl || img?.thumbnailUrl || img?.url
  const displayUrl = sourceUrl ? getSmartCropUrl(sourceUrl, w, h, face) : null

  return (
    <div
      onClick={() => onClick?.(post, index)}
      className="group relative w-full h-full overflow-hidden rounded-2xl cursor-pointer border border-white/5 transition-all duration-500 ease-out hover:-translate-y-0.5 shadow-md transform-gpu backface-visibility-hidden will-change-transform"
      style={{ isolation: 'isolate' }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl transform-gpu backface-visibility-hidden">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Explore Art'}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-750 ease-out will-change-transform transform-gpu backface-visibility-hidden"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-100 animate-pulse" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent group-hover:from-black/90 group-hover:via-black/20 transition-colors duration-500" />

      {/* Hover glow border */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1.5px ${glowColor}70, 0 0 32px ${glowColor}15`,
        }}
      />

      {/* Top badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        {post.isPremium && (
          <span className="group relative overflow-hidden inline-flex items-center gap-1.5
            px-2.5 py-1 rounded-full text-[9px] font-black leading-none
            bg-black/65 border border-amber-500/45 text-amber-400
            backdrop-blur-md shadow-[0_0_10px_rgba(251,191,36,0.15)]
            cursor-default select-none transition-shadow duration-300
            hover:shadow-[0_0_16px_rgba(251,191,36,0.28)]"
          >
            {/* shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full
              transition-transform duration-700 ease-out pointer-events-none
              bg-gradient-to-r from-transparent via-amber-300/25 to-transparent" />
            <GiCutDiamond size={9} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-300" />
            PREMIUM
          </span>
        )}
        {post.aiTool && (
          <span className="inline-flex items-center leading-none bg-brand-500/25 border border-brand-500/25 text-brand-200 px-2 py-1 rounded-full text-[9px] font-bold backdrop-blur-sm pj">
            ✨ AI
          </span>
        )}
        {post.isCollection && (post.generatedImages?.length || 0) > 1 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold leading-none backdrop-blur-sm pj"
            style={{
              background: 'rgba(99,102,241,0.35)',
              color: 'rgba(199,210,254,0.95)',
              backdropFilter: 'blur(6px)',
            }}
          >
            🖼 {post.generatedImages.length} ảnh
          </span>
        )}
      </div>

      {/* Author and stats */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3.5 z-10 transition-transform duration-300 ease-out
        ${alwaysShow ? 'translate-y-0' : 'translate-y-full group-hover:translate-y-0'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {author?.avatar ? (
              <img
                src={author.avatar}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                alt=""
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-black pj shrink-0">
                {author?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-xs font-semibold text-white truncate pj drop-shadow">
              {author?.displayName || author?.username || 'Nghệ sĩ'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/70 text-[10px] font-bold shrink-0">
            <span className="flex items-center gap-0.5" title="Lượt thích">
              <Heart size={10} className="fill-red-400 text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5" title="Lượt xem">
              {/* Custom Solid Eye Icon for premium layout */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300 shrink-0">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              {(post.stats?.viewsCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5" title="Lượt lưu">
              <Bookmark size={10} className="text-amber-400 fill-amber-400" />
              {(post.stats?.bookmarksCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5" title="Lượt tải">
              <Download size={10} className="text-emerald-400" />
              {(post.stats?.downloadsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shimmer Skeleton for Magazine Grid
const ExploreSkeleton = () => (
  <div
    className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse"
    style={{ gridAutoRows: '220px' }}
  >
    {CARD_PATTERN.map((p, i) => (
      <div
        key={i}
        className={`rounded-2xl bg-white/[0.02] border border-white/5 col-span-1 row-span-1 ${p.col} ${p.row}`}
      />
    ))}
  </div>
)
