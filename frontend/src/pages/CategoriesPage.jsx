import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  TrendingUp,
  SortAsc,
  SortDesc,
  Calendar,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { IoDiamond, IoImages, IoSparkles, IoLeafOutline, IoPlanetOutline, IoSquareOutline, IoColorPaletteOutline, IoBusinessOutline, IoRocketOutline, IoMoonOutline, IoSunnyOutline, IoColorWandOutline, IoEllipsisHorizontalOutline } from 'react-icons/io5'
import api from '../api/api'
import { useSettings } from '../context/SettingsContext'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import ContentLoader from '../components/ui/ContentLoader'

// ── Category Icons mapping for frontend labels ──────────────────────
const CATEGORY_ICONS = {
  all: <IoSparkles className="text-yellow-400" size={14} />,
  nature: <IoLeafOutline className="text-emerald-400" size={14} />,
  anime: <IoPlanetOutline className="text-pink-400" size={14} />,
  minimal: <IoSquareOutline className="text-zinc-400" size={14} />,
  abstract: <IoColorPaletteOutline className="text-violet-400" size={14} />,
  city: <IoBusinessOutline className="text-sky-400" size={14} />,
  space: <IoRocketOutline className="text-amber-400" size={14} />,
  dark: <IoMoonOutline className="text-indigo-400" size={14} />,
  light: <IoSunnyOutline className="text-yellow-400" size={14} />,
  gradient: <IoColorWandOutline className="text-fuchsia-400" size={14} />,
  other: <IoEllipsisHorizontalOutline className="text-teal-400" size={14} />,
}

const CategoryCard = ({
  label,
  count,
  emoji,
  posts = [],
  style = 'style-2',
  delay,
  onClick,
}) => {
  const cardRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Auto transition for Style 3 slideshow (Intersection Observer optimized)
  useEffect(() => {
    if (style !== 'style-3' || posts.length <= 1) return

    let observer
    let intervalId

    const startCarousel = () => {
      intervalId = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % Math.min(posts.length, 5))
      }, 2000)
    }

    const stopCarousel = () => {
      if (intervalId) clearInterval(intervalId)
    }

    if (cardRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startCarousel()
          } else {
            stopCarousel()
          }
        },
        { threshold: 0.05 }
      )
      observer.observe(cardRef.current)
    }

    return () => {
      stopCarousel()
      if (observer) observer.disconnect()
    }
  }, [style, posts])

  const fallbackImg =
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80'
  const getPostImg = (p) => {
    const rawUrl =
      p?.generatedImages?.[0]?.thumbnailUrl ||
      p?.images?.[0]?.thumbnailUrl ||
      p?.generatedImages?.[0]?.url ||
      p?.images?.[0]?.url
    return getOptimizedWebpUrl(rawUrl || fallbackImg, 400)
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer border border-white/5 bg-[#121214]/40 hover:border-brand-500/30 transition-all duration-500 hover:shadow-[0_8px_32px_rgba(124,58,237,0.15)]"
    >
      {/* STYLE 1: Single Card Cover */}
      {style === 'style-1' && (
        <img
          src={posts.length > 0 ? getPostImg(posts[0]) : fallbackImg}
          alt={label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      )}

      {/* STYLE 2: Asymmetrical Staggered Grid */}
      {style === 'style-2' && (
        <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1.5 bg-[#121214]/50 dark:bg-black/40">
          <div className="flex flex-col gap-1 h-full">
            <div className="flex-[3] rounded-lg overflow-hidden border border-white/5 bg-white/5">
              <img
                src={posts[0] ? getPostImg(posts[0]) : fallbackImg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex-[2] rounded-lg overflow-hidden border border-white/5 bg-white/5">
              <img
                src={posts[1] ? getPostImg(posts[1]) : fallbackImg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 h-full">
            <div className="flex-[2] rounded-lg overflow-hidden border border-white/5 bg-white/5">
              <img
                src={posts[2] ? getPostImg(posts[2]) : fallbackImg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex-[3] rounded-lg overflow-hidden border border-white/5 bg-white/5">
              <img
                src={posts[3] ? getPostImg(posts[3]) : fallbackImg}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* STYLE 3: Slideshow Carousel */}
      {style === 'style-3' && (
        <div className="absolute inset-0 bg-[#121214]/50 dark:bg-black/40">
          {(posts.length > 0 ? posts.slice(0, 5) : [null]).map((post, idx) => (
            <img
              key={post?._id || idx}
              src={post ? getPostImg(post) : fallbackImg}
              alt={label}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000
                ${idx === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* STYLE 4: Interactive Split Slices */}
      {style === 'style-4' && (
        <div className="absolute inset-0 flex overflow-hidden bg-[#121214]/50 dark:bg-black/40">
          {(posts.length > 0 ? posts.slice(0, 3) : [null, null, null]).map(
            (post, idx) => (
              <div
                key={post?._id || idx}
                className="h-full relative flex-1 hover:flex-[3.5] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group/slice overflow-hidden border-r border-white/5 last:border-r-0"
              >
                <img
                  src={post ? getPostImg(post) : fallbackImg}
                  className="absolute inset-0 w-full h-full object-cover scale-105 group-hover/slice:scale-100 transition-transform duration-750"
                />
                <div className="absolute inset-0 bg-black/40 group-hover/slice:bg-black/10 transition-colors duration-300" />
              </div>
            )
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Floating glassmorphic card */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
        <div className="p-3.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm pj">
            <span className="flex-shrink-0 flex items-center justify-center">
              {CATEGORY_ICONS[label.toLowerCase()] || (emoji ? <span>{emoji}</span> : null)}
            </span>
            <span className="truncate">{label}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-white/50 font-bold uppercase tracking-wider pj">
            <span>{count} tác phẩm</span>
            <ArrowRight size={11} className="text-brand-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const CategoriesPage = () => {
  const navigate = useNavigate()
  const { categoriesPageStyle } = useSettings()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSort, setActiveSort] = useState('trending') // trending, az, za, newest, most_posts, least_posts
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  // Sort labels map
  const sortOptions = [
    { value: 'trending', label: 'Nổi bật (Trending)', icon: <TrendingUp size={12} /> },
    { value: 'az', label: 'Tên: A -> Z', icon: <SortAsc size={12} /> },
    { value: 'za', label: 'Tên: Z -> A', icon: <SortDesc size={12} /> },
    { value: 'newest', label: 'Mới nhất', icon: <Calendar size={12} /> },
    { value: 'most_posts', label: 'Nhiều ảnh nhất', icon: <Layers size={12} /> },
    { value: 'least_posts', label: 'Ít ảnh nhất', icon: <Layers size={12} /> },
  ]

  const activeSortOption = useMemo(
    () => sortOptions.find((o) => o.value === activeSort) || sortOptions[0],
    [activeSort]
  )

  useEffect(() => {
    // Fetch all categories with detailed stats + top posts
    api
      .get('/categories/details')
      .then(({ data }) => {
        setCategories(data.categories || [])
      })
      .catch((err) => {
        console.error('Không thể lấy danh mục chi tiết:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = () => setSortDropdownOpen(false)
    window.addEventListener('click', clickOutside)
    return () => window.removeEventListener('click', clickOutside)
  }, [])

  // Sort logic applied client side
  const sortedCategories = useMemo(() => {
    const items = [...categories]
    switch (activeSort) {
      case 'az':
        return items.sort((a, b) => a.label.localeCompare(b.label, 'vi'))
      case 'za':
        return items.sort((a, b) => b.label.localeCompare(a.label, 'vi'))
      case 'newest':
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      case 'most_posts':
        return items.sort((a, b) => b.count - a.count)
      case 'least_posts':
        return items.sort((a, b) => a.count - b.count)
      case 'trending':
      default:
        // Trending: view + downloads desc
        return items.sort(
          (a, b) =>
            b.totalViews + b.totalDownloads * 2 - (a.totalViews + a.totalDownloads * 2)
        )
    }
  }, [categories, activeSort])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <ContentLoader size="lg" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#09090b] text-white py-12 md:py-20 px-4 md:px-8 relative overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Background ambient light blobs */}
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[150px] -top-20 -left-20 bg-brand-500/10 pointer-events-none" />
      <div className="absolute w-[350px] h-[350px] rounded-full blur-[130px] bottom-0 right-0 bg-blue-500/5 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent mb-2">
              Khám phá Danh mục
            </h1>
            <p className="text-white/40 text-sm max-w-lg">
              Tổng hợp tất cả các chủ đề nghệ thuật sáng tạo độc đáo từ cộng đồng. Lựa chọn chủ đề bạn yêu thích để bắt đầu hành trình tìm kiếm.
            </p>
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-white/40 block mb-1.5 uppercase tracking-wider">
              Sắp xếp theo
            </span>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all min-w-[180px]"
            >
              <span className="flex items-center gap-1.5">
                {activeSortOption.icon}
                <span>{activeSortOption.label}</span>
              </span>
              <ChevronDown
                size={12}
                className={`text-white/40 transition-transform duration-200 ${
                  sortDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {sortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-[#12121e]/95 border border-white/10 shadow-2xl backdrop-blur-md z-30 py-1"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setActiveSort(opt.value)
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 hover:bg-white/5 ${
                        activeSort === opt.value
                          ? 'text-brand-300 font-bold bg-brand-600/10'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Categories Grid */}
        {sortedCategories.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">
            Không tìm thấy danh mục nào.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedCategories.map((cat, i) => (
              <CategoryCard
                key={cat.key}
                label={cat.label}
                count={cat.count}
                emoji={cat.emoji}
                posts={cat.posts}
                style={categoriesPageStyle}
                delay={i * 0.05}
                onClick={() => navigate(`/search?category=${cat.key}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoriesPage
