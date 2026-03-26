import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react'
import { Heart } from 'lucide-react'

const CATEGORIES = ['Tất cả', '🌿 Nature', '🎌 Anime', '◻️ Minimal', '🎨 Abstract', '🌃 City', '🚀 Space', '🌑 Dark', '🌈 Gradient']

const DEMO_RESULTS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', likes: 1240, h: 'tall' },
  { id: 2, img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400', likes: 890, h: 'short' },
  { id: 3, img: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400', likes: 2100, h: 'tall' },
  { id: 4, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', likes: 745, h: 'short' },
  { id: 5, img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400', likes: 1560, h: 'tall' },
  { id: 6, img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400', likes: 3200, h: 'short' },
  { id: 7, img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400', likes: 980, h: 'tall' },
  { id: 8, img: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400', likes: 2400, h: 'short' },
]

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [isAIOnly, setIsAIOnly] = useState(false)

  return (
    <div className="min-h-screen pb-24 md:pb-8 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-4">Khám phá</h1>
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              className="input pl-12 pr-12 text-base"
              placeholder="Tìm wallpaper, tag, creator..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                <X size={18} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border flex-shrink-0
                ${activeCategory === cat ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-50 border-white/10 text-white/60 hover:border-brand-500/50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsAIOnly(!isAIOnly)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${isAIOnly ? 'bg-brand-600' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isAIOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white/60 flex items-center gap-1">
              <Sparkles size={14} className="text-brand-400" /> AI only
            </span>
          </label>
          <div className="flex-1" />
          <span className="text-sm text-white/40">{DEMO_RESULTS.length} kết quả</span>
        </div>

        {/* Results — Masonry-like 2 column */}
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {DEMO_RESULTS.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer break-inside-avoid mb-3 ${post.h === 'tall' ? 'aspect-[3/4]' : 'aspect-square'}`}
            >
              <img src={post.img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-between">
                <button className="btn-primary text-xs py-1.5 px-3">Tải về</button>
                <div className="flex items-center gap-1 text-white text-sm">
                  <Heart size={14} className="text-red-400" />
                  {post.likes.toLocaleString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchPage
