import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import api from '../api/api'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PostDetailModal from '../components/post/PostDetailModal'
import ContentLoader, { BrandLogo } from '../components/ui/ContentLoader'
import { createPortal } from 'react-dom'
import { useSettings } from '../context/SettingsContext'
import useModalUrl from '../hooks/useModalUrl'
import { getOptimizedWebpUrl } from '../utils/imageUrl'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import {
  ArrowRight,
  TrendingUp,
  Download,
  Heart,
  Sparkles,
  Users,
  Camera,
  Star,
  Zap,
  Globe,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Bookmark,
  Search,
  Bell,
  Copy,
  Check,
  X,
  Flame,
} from 'lucide-react'
import useAuthStore from '../store/auth.store'
import ConfirmModal from '../components/common/ConfirmModal'
import { GiCutDiamond } from 'react-icons/gi'

/* ─── Google Fonts: Plus Jakarta Sans ─────────────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

    :root {
      --font-jakarta: 'Plus Jakarta Sans', sans-serif;
    }

    .pj { font-family: var(--font-jakarta) !important; }

    /* ── Liquid Glass core ── */
    .liquid-glass {
      background: var(--color-glass-bg);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid var(--color-glass-border);
      box-shadow: 
        inset 0 1px 0 var(--color-glass-inset-glow),
        0 8px 32px var(--color-glass-shadow),
        var(--box-shadow-neon-glow, 0 0 0 transparent);
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .liquid-glass-strong {
      background: var(--color-glass-strong-bg);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      border: 1px solid var(--color-glass-strong-border);
      box-shadow:
        inset 0 1px 0 var(--color-glass-strong-inset),
        0 20px 60px var(--color-glass-shadow),
        var(--box-shadow-neon-glow, 0 0 0 transparent);
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .liquid-glass-hover {
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .liquid-glass-hover:hover {
      background: var(--color-glass-hover-bg);
      border-color: var(--color-glass-hover-border);
      box-shadow:
        inset 0 1px 0 var(--color-glass-hover-inset),
        0 12px 40px var(--color-glass-shadow),
        var(--box-shadow-neon-glow, 0 0 40px var(--color-glass-hover-glow));
    }

    /* ── Gradient text — giống HomePage cũ, tương thích Light/Dark ── */
    .hero-gradient-text {
      background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .light .hero-gradient-text {
      background: linear-gradient(135deg, #7c3aed 0%, #fe843e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── Shimmer (giữ lại nếu dùng chỗ khác) ── */
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .shimmer-text {
      background: linear-gradient(
        90deg,
        #7c3aed 0%, #a78bfa 30%, #60a5fa 60%, #7c3aed 100%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }

    /* ── Floating orbs keyframes ── */
    @keyframes float-slow {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-30px) scale(1.05); }
    }
    @keyframes float-medium {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-20px) rotate(5deg); }
      66% { transform: translateY(10px) rotate(-3deg); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .orb-float-1 { animation: float-slow 8s ease-in-out infinite; }
    .orb-float-2 { animation: float-medium 11s ease-in-out infinite; }
    .orb-float-3 { animation: float-slow 14s ease-in-out infinite reverse; }

    /* ── Grid background ── */
    .hero-grid {
      background-image: 
        linear-gradient(rgba(124,58,237,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124,58,237,0.035) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    /* ── Image card hover glow ── */
    .img-card-glow:hover {
      box-shadow: 
        0 0 0 1px rgba(124,58,237,0.3),
        0 20px 60px rgba(124,58,237,0.15),
        0 0 80px rgba(96,165,250,0.08);
    }

    /* ── Scroll reveal ── */
    @keyframes fadeSlideUp {
      from { opacity:0; transform: translateY(24px); }
      to   { opacity:1; transform: translateY(0); }
    }

    /* ── Category scroll ── */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* ── Noise texture ── */
    .noise::after {
      content:'';
      position:absolute;
      inset:0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      border-radius: inherit;
    }

    /* ── Creator leaderboard ── */
    @keyframes borderTrace {
      0%,100% { opacity:0.3; }
      50% { opacity:0.8; }
    }
  `}</style>
)

/* ─── Data ───────────────────────────────────────────────── */
const STATS = [
  { value: '50K+', label: 'Wallpapers', color: '#a78bfa' },
  { value: '12M', label: 'Downloads', color: '#60a5fa' },
  { value: '8.5K', label: 'Creators', color: '#f59e0b' },
  { value: '2M+', label: 'VNĐ đã trả', color: '#34d399' },
]

const CATEGORIES = [
  {
    label: 'Nature',
    count: '2,450',
    emoji: '🌿',
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  },
  {
    label: 'Cyberpunk',
    count: '1,820',
    emoji: '🤖',
    img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=80',
  },
  {
    label: 'Minimal',
    count: '950',
    emoji: '⬜',
    img: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=600&q=80',
  },
  {
    label: 'Portrait',
    count: '3,110',
    emoji: '👤',
    img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=80',
  },
  {
    label: 'Space',
    count: '1,340',
    emoji: '🚀',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80',
  },
  {
    label: 'Abstract',
    count: '2,760',
    emoji: '🎨',
    img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80',
  },
]

const TRENDING_COMMUNITY = [
  {
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85',
    author: 'Alex Rivers',
    avatar: 'AR',
    likes: 1200,
    title: 'Neon Dreamscape',
  },
  {
    img: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=900&q=85',
    author: 'Sarah Chen',
    avatar: 'SC',
    likes: 940,
    title: 'Cosmic Silk',
  },
  {
    img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=900&q=85',
    author: 'Marcus V.',
    avatar: 'MV',
    likes: 2500,
    title: 'Neo Saigon 2077',
  },
]

const MASONRY_DROPS = [
  {
    img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&q=80',
    h: 'tall',
    badge: 'New',
  },
  {
    img: 'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?w=600&q=80',
    h: 'short',
    badge: null,
  },
  {
    img: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=600&q=80',
    h: 'tall',
    badge: 'HOT',
  },
  {
    img: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=600&q=80',
    h: 'short',
    badge: null,
  },
]

const LEADERBOARD = [
  {
    rank: '01',
    name: 'Hùng Nguyễn',
    followers: '12.4k',
    pro: true,
    avatar: 'HN',
  },
  { rank: '02', name: 'Linh Phạm', followers: '9.8k', pro: true, avatar: 'LP' },
  {
    rank: '03',
    name: 'Kevin Dang',
    followers: '8.2k',
    pro: false,
    avatar: 'KD',
  },
  { rank: '04', name: 'Tú Anh', followers: '6.5k', pro: false, avatar: 'TA' },
]

/* ─── Sub-components ─────────────────────────────────────── */

const Orb = ({ className, style }) => (
  <div
    className={`absolute rounded-full pointer-events-none ${className}`}
    style={style}
  />
)

const LiquidCard = ({ children, className = '', strong = false, ...props }) => (
  <div
    className={`${strong ? 'liquid-glass-strong' : 'liquid-glass'} liquid-glass-hover rounded-2xl ${className}`}
    {...props}
  >
    {children}
  </div>
)

/* Animated Counter Component */
const AnimatedCounter = ({ targetValue, format = '', color }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 1200 // ms
          const startTime = performance.now()

          const animate = (now) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out expo curve
            const easeProgress =
              progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
            const current = Math.floor(easeProgress * targetValue)
            setCount(current)

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [targetValue])

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K'
    }
    return num.toString()
  }

  return (
    <span ref={ref} style={{ color, textShadow: `0 0 20px ${color}50` }}>
      {formatNumber(count)}
      {format}
    </span>
  )
}

/* Stat counter card */
const StatCard = ({ value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
  >
    <LiquidCard className="p-6 text-center group cursor-default relative overflow-hidden noise">
      {/* Inner glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at center, ${color}12 0%, transparent 70%)`,
        }}
      />
      <p
        className="text-4xl font-black pj mb-1.5 relative z-10"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        <AnimatedCounter
          targetValue={parseInt(value) || 0}
          format={value.toString().includes('+') ? '+' : ''}
          color={color}
        />
      </p>
      <p className="text-foreground/45 dark:text-white/45 text-[10px] font-bold tracking-widest uppercase pj relative z-10">
        {label}
      </p>
    </LiquidCard>
  </motion.div>
)

/* Category card with 4 dynamic layout styles configured by Admin */
const CategoryCard = ({
  label,
  count,
  emoji,
  posts = [],
  style = 'style-1',
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
      initial={{ opacity: 0, scale: 0.93 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer img-card-glow transition-all duration-500"
    >
      {/* STYLE 1: Single Card Cover */}
      {style === 'style-1' && (
        <img
          src={posts.length > 0 ? getPostImg(posts[0]) : fallbackImg}
          alt={label}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
      )}

      {/* STYLE 2: Asymmetrical Staggered Grid */}
      {style === 'style-2' && (
        <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1 bg-[#121214]/50 dark:bg-black/40">
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
                {post && (
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover/slice:opacity-100 transition-opacity duration-300 pointer-events-none delay-100 z-30">
                    <p className="text-[9px] text-white/90 line-clamp-2 font-medium bg-black/75 backdrop-blur-md px-2 py-1 border border-white/10 leading-normal">
                      {post.prompt || post.caption || 'Art'}
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none z-10" />

      {/* Floating label */}
      <div className="absolute bottom-5 left-4 right-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-400 z-20 pointer-events-none">
        <LiquidCard className="px-4 py-3">
          <span className="text-sm font-bold text-foreground dark:text-white pj flex items-center gap-2">
            <span>{emoji}</span> {label}
          </span>
          <p className="text-[10px] text-foreground/60 dark:text-white/60 font-bold uppercase tracking-wider pj mt-0.5">
            {count} tác phẩm
          </p>
        </LiquidCard>
      </div>
    </motion.div>
  )
}

/* Trending image card with spotlight glow and copy prompt quick icon */
const TrendingCard = ({ post, index, delay, onClick }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const displayUrl = img?.previewUrl || img?.thumbnailUrl || img?.url
  const author = post.authorId

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-brand-500/30 transition-all duration-500 min-h-[220px] md:min-h-[260px] w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] flex-shrink-0 shadow-lg hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)]"
    >
      <img
        src={displayUrl}
        alt={post.caption || 'Trending Art'}
        className="w-full h-full object-cover absolute inset-0 group-hover:scale-[1.03] transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

      {/* Prompt copy button on top-right */}
      {post.prompt && (
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(post.prompt)
              toast.success('📋 Đã sao chép prompt!')
            }}
            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer border border-white/10 backdrop-blur-md"
            title="Sao chép prompt"
          >
            <Copy size={13} />
          </button>
        </div>
      )}

      {/* Hover info overlay at the bottom */}
      <div className="absolute inset-x-0 bottom-0 p-3 z-10">
        <div className="liquid-glass rounded-xl px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {author?.avatar ? (
              <img
                src={author.avatar}
                alt={author.displayName}
                className="w-7 h-7 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-black pj">
                {(author?.displayName || author?.username || 'U')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[11px] text-foreground pj truncate max-w-[80px] sm:max-w-[120px]">
                {author?.displayName || author?.username || 'Nghệ sĩ'}
              </p>
              <p className="text-[9px] text-foreground/50 pj truncate max-w-[80px] sm:max-w-[120px]">
                {post.caption || post.prompt || 'Tác phẩm'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[10px] text-foreground/80 font-bold shrink-0">
            <div className="flex items-center gap-1">
              <Heart size={11} className="fill-red-400 text-red-400" />
              <span className="pj">{post.stats?.likesCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Lượt tải">
              <Download size={11} className="text-blue-400" />
              <span className="pj">{post.stats?.downloadsCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* Masonry drop card for New Collections */
const MasonryCard = ({ post, index, onClick }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const displayUrl = img?.previewUrl || img?.thumbnailUrl || img?.url
  const isTall = index % 2 === 1
  const views = post.stats?.viewsCount || 0
  const formatViews = views >= 1000 ? (views / 1000).toFixed(1) + 'k' : views

  // Badge text
  let badge = null
  if (post.postType === 'ai') badge = 'AI'
  else if (post.postType === 'digital-raw') badge = 'RAW'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl cursor-pointer break-inside-avoid
        img-card-glow transition-all duration-500 mb-5 border border-white/5 bg-white/[0.02]
        ${isTall ? 'aspect-[3/4]' : 'aspect-square'}`}
    >
      <img
        src={displayUrl}
        alt={post.caption || 'Collection Image'}
        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
        loading="lazy"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent
        to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />
      {badge && (
        <div className="absolute top-3 left-3">
          <span className="badge-brand px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md pj">
            {badge}
          </span>
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 p-4
        translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/70 text-xs pj font-semibold">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0 opacity-80"
            >
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>{' '}
            {formatViews} views
          </div>
          <div className="flex items-center gap-1 text-white/70 text-xs hover:text-red-400 transition-colors">
            <Heart size={12} className="fill-red-400 text-red-400" />
            <span className="font-bold pj">{post.stats?.likesCount || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Magazine grid pattern: lặp mỗi 6 item ───────────────────
const CARD_PATTERN = [
  { col: 'lg:col-span-2', row: 'lg:row-span-2', type: 'hero' }, // 0 — Hero 2×2
  { col: 'lg:col-span-1', row: 'lg:row-span-2', type: 'tall' }, // 1 — Tall 1×2
  { col: 'lg:col-span-1', row: 'lg:row-span-2', type: 'tall' }, // 2 — Tall 1×2
  { col: 'lg:col-span-1', row: 'lg:row-span-1', type: 'std' }, // 3 — Std 1×1
  { col: 'lg:col-span-1', row: 'lg:row-span-1', type: 'std' }, // 4 — Std 1×1
  { col: 'lg:col-span-2', row: 'lg:row-span-1', type: 'wide' }, // 5 — Wide 2×1
]

/*
  getSmartCropUrl — Cloudinary AI Gravity thumbnail
  ───────────────────────────────────────────────────
  Tại sao không dùng object-position: top cứng nhắc?
  → Chỉ đúng cho ảnh chân dung đứng, sai cho:
      • Ảnh nằm ngang (landscape, thiên nhiên)
      • Ảnh chủ thể ở giữa/dưới
      • Wallpaper abstract

  Cloudinary g_auto
  → AI saliency: tìm vùng visual nổi bật nhất (contrast, color, texture)
  → g_auto:face: ưu tiên detect khuôn mặt trước, fallback về g_auto nếu không có mặt
  → Pre-crop đúng tỷ lệ grid cell → object-cover không cần crop thêm nữa

  Kết quả: ảnh cosplay portrait ân dưới → crop tập trung vào mặt
            ảnh biển tall → crop tìm vùng đẹp nhất (sky + người)
            ảnh thiên nhiên wide → crop tập trung landscape đẹp nhất
*/
const getSmartCropUrl = (url, w, h, preferFace = true) => {
  if (!url || !url.includes('/upload/')) return url
  const [base, path] = url.split('/upload/')
  // Gữ version nếu có, Cloudinary vẫn hiểu
  const gravity = preferFace ? 'g_auto:faces' : 'g_auto'
  return `${base}/upload/c_fill,${gravity},w_${w},h_${h},q_75,f_auto/${path}`
}

// Dimensions (w×h px) phù hợp với tỷ lệ từng card type (gridAutoRows: 200px)
// hero  2×2 = 400px h × ≈2÷2 = 1:1  +  padding  → 600×600
// tall  1×2 = 400px h × narrow    → 400×600 (portrait-friendly)
// std   1×1 = 200px h × square    → 360×360
// wide  2×1 = 200px h × wide      → 600×280
const CARD_THUMB = {
  hero: { w: 600, h: 600, face: true },
  tall: { w: 400, h: 600, face: true }, // portrait → uu tiên detect face
  std: { w: 360, h: 360, face: true },
  wide: { w: 620, h: 280, face: false }, // landscape → dùng saliency
}

/* Community gallery card — magazine editorial style */
const CommunityPostCard = ({ post, index, onClick, customType }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const author = post.authorId
  const glowColor = post.colors?.[0]?.hex || '#7c3aed'
  const pattern = CARD_PATTERN[index % CARD_PATTERN.length]
  const type = customType || pattern.type
  const alwaysShow = type === 'hero' || type === 'tall'

  // Smart crop URL: Cloudinary AI tìm điểm đẹp nhất đúng với tỷ lệ card
  const { w, h, face } = CARD_THUMB[type]
  const sourceUrl = img?.previewUrl || img?.thumbnailUrl || img?.url
  const displayUrl = sourceUrl ? getSmartCropUrl(sourceUrl, w, h, face) : null

  return (
    <div
      onClick={() => onClick?.(post, index)}
      className="group relative w-full h-full overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-500 ease-out hover:-translate-y-0.5 transform-gpu backface-visibility-hidden will-change-transform"
      style={{ isolation: 'isolate' }}
    >
      {/* Image — object-cover chỉ align, thumbnail đã được AI pre-crop */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl transform-gpu backface-visibility-hidden">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Wallpaper'}
            className="w-full h-full object-cover
              group-hover:scale-[1.06] transition-transform duration-700 ease-out will-change-transform transform-gpu backface-visibility-hidden"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-100 animate-pulse" />
        )}
      </div>

      {/* Cinematic gradient — deepens on hover */}
      <div
        className="absolute inset-0
        bg-gradient-to-t from-black/75 via-black/5 to-transparent
        group-hover:from-black/90 group-hover:via-black/25
        transition-colors duration-500"
      />

      {/* Color glow border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 0 1.5px ${glowColor}70, 0 0 32px ${glowColor}20`,
        }}
      />

      {/* TOP badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        {post.isPremium && (
          <span
            className="relative overflow-hidden flex items-center gap-1.5
            px-2.5 py-1 rounded-full text-[10px] font-black pj
            bg-black/60 border border-amber-500/40 text-amber-400
            backdrop-blur-sm shadow-md"
          >
            {/* shimmer sweep on hover */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full
              transition-transform duration-700
              bg-gradient-to-r from-transparent via-amber-300/20 to-transparent"
            />
            <GiCutDiamond size={11} className="text-amber-400 shrink-0" />
            PREMIUM
          </span>
        )}
        {post.aiTool && (
          <span className="badge-brand px-2 py-1 rounded-full text-[10px] font-bold leading-none backdrop-blur-sm pj flex items-center">
            ✨ AI
          </span>
        )}
        {post.isCollection && (post.generatedImages?.length || 0) > 1 && (
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold leading-none backdrop-blur-sm pj"
            style={{
              background: 'rgba(99,102,241,0.35)',
              color: 'rgba(199,210,254,0.95)',
              backdropFilter: 'blur(6px)',
            }}
          >
            🖼 {post.generatedImages.length} ảnh
          </span>
        )}
        {post.resolution && (
          <span
            className="flex items-center px-2 py-1 rounded-full text-[10px] font-bold leading-none uppercase
            bg-black/50 text-white/70 backdrop-blur-sm pj"
          >
            {post.resolution}
          </span>
        )}
      </div>

      {/* Author strip — always for hero/tall, slide-up for std/wide */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 z-10
        transition-transform duration-350 ease-out
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
              <div
                className="w-6 h-6 rounded-full bg-gradient-brand
                flex items-center justify-center text-white text-[10px] font-black pj shrink-0"
              >
                {author?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-xs font-semibold text-white truncate pj drop-shadow">
              {author?.displayName || author?.username || 'Creator'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-[11px] shrink-0">
            <span className="flex items-center gap-0.5" title="Lượt thích">
              <Heart size={9} className="text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5" title="Lượt xem">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-blue-300 shrink-0"
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              {(post.stats?.viewsCount || 0).toLocaleString()}
            </span>
            {index < 3 && (
              <>
                <span className="flex items-center gap-0.5" title="Lượt lưu">
                  <Bookmark
                    size={9}
                    className="text-amber-400 fill-amber-400"
                  />
                  {(post.stats?.bookmarksCount || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-0.5" title="Lượt tải">
                  <Download size={9} className="text-emerald-400" />
                  {(post.stats?.downloadsCount || 0).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Skeleton — cùng grid cấu trúc với gallery thực */
const GallerySkeleton = () => (
  <div
    className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    style={{ gridAutoRows: '200px' }}
  >
    {CARD_PATTERN.map((p, i) => (
      <div
        key={i}
        className={`rounded-2xl bg-surface-100 animate-pulse
          col-span-1 row-span-1 ${p.col} ${p.row}`}
      />
    ))}
  </div>
)

/* Leaderboard row with dynamic details and follow toggler */
const LeaderRow = ({ c, rank, delay, onFollow, metricType = 'followers' }) => {
  const currentUser = useAuthStore((s) => s.user)
  const isMe =
    currentUser && (currentUser._id === c._id || currentUser.id === c._id)

  const rankColors = [
    'text-yellow-500',
    'text-slate-400',
    'text-amber-700',
    'text-slate-500',
  ]
  const rankText = rank < 10 ? `0${rank}` : `${rank}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between group py-2"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span
          className={`font-black italic text-xl w-7 pj ${rankColors[rank - 1] || 'text-foreground/30'}`}
        >
          {rankText}
        </span>
        <Link
          to={`/profile/${c.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
        >
          <div className="relative flex-shrink-0">
            {c.avatar ? (
              <img
                src={c.avatar}
                alt={c.displayName || c.username}
                className="w-12 h-12 rounded-full object-cover border border-[var(--color-border)]"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName || c.username || '')}&background=8b5cf6&color=fff`
                }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full bg-gradient-brand
                flex items-center justify-center text-white text-sm font-black pj border border-[var(--color-border)]"
              >
                {(c.displayName || c.username || 'U').slice(0, 2).toUpperCase()}
              </div>
            )}
            {c.isVerified && (
              <span
                className="absolute -bottom-1 -right-1 bg-brand-600 text-[8px] font-black
                px-1.5 py-0.5 rounded-sm text-white pj tracking-wide"
              >
                PRO
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm text-foreground pj truncate">
              {c.displayName || c.username}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider pj truncate">
              {metricType === 'followers' &&
                `${(c.stats?.followersCount || 0).toLocaleString()} followers`}
              {metricType === 'views' &&
                `${(c.scoreValue || c.stats?.viewsCount || 0).toLocaleString()} views`}
              {metricType === 'downloads' &&
                `${(c.scoreValue || c.stats?.downloadsCount || 0).toLocaleString()} downloads`}
            </div>
          </div>
        </Link>
      </div>

        {isMe ? (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 font-bold select-none pj flex-shrink-0">
            Tôi
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onFollow?.(c)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border flex-shrink-0
              ${
                c.isFollowing
                  ? 'bg-green-500/10 border-green-500/30 text-green-500'
                  : 'liquid-glass border-white/10 text-foreground/30 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500/20'
              }`}
            title={c.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
          >
            {c.isFollowing ? <Check size={14} /> : <Plus size={14} />}
          </button>
        )}
      </motion.div>
    )
  }

/* ─── Community Gallery Section với Feed Tabs ────────────── */
const FEED_TABS = [
  {
    key: 'new',
    label: 'Mới nhất',
    icon: Sparkles,
    endpoint: '/posts',
    params: { sort: 'new' },
    needAuth: false,
  },
  {
    key: 'hot',
    label: 'Xu hướng',
    icon: Flame,
    endpoint: '/posts',
    params: { sort: 'hot' },
    needAuth: false,
  },
  {
    key: 'following',
    label: 'Đang theo dõi',
    icon: Heart,
    endpoint: '/posts/following',
    params: {},
    needAuth: true,
  },
]

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
    widthClass: 'w-[210px]',
  },
  {
    key: 'external_ai',
    label: 'Khám phá AI',
    icon: Sparkles,
    countKey: 'externalAi',
    widthClass: 'w-[210px]',
  },
  {
    key: 'digital-normal',
    label: 'Ảnh Camera (EXIF)',
    icon: Camera,
    countKey: 'cameraExif',
    widthClass: 'w-[250px]',
  },
  {
    key: 'digital-raw',
    label: 'RAW & Presets',
    icon: Download,
    countKey: 'raw',
    widthClass: 'w-[220px]',
  },
]

const GALLERY_CATEGORIES = [
  { key: 'all', label: 'Tất cả danh mục', emoji: '🌟' },
  { key: 'nature', label: 'Thiên nhiên', emoji: '🌿' },
  { key: 'cyberpunk', label: 'Cyberpunk', emoji: '🤖' },
  { key: 'portrait', label: 'Chân dung', emoji: '👤' },
  { key: 'landscape', label: 'Phong cảnh', emoji: '🏔️' },
  { key: 'architecture', label: 'Kiến trúc', emoji: '🏛️' },
]

const getFewPostsPattern = (count, index) => {
  if (count === 1) {
    return { col: 'col-span-2 lg:col-span-2', row: 'row-span-2', type: 'hero' }
  }
  if (count === 2) {
    return { col: 'col-span-2 lg:col-span-2', row: 'row-span-2', type: 'hero' }
  }
  if (count === 3) {
    if (index === 0)
      return {
        col: 'col-span-2 lg:col-span-2',
        row: 'row-span-2',
        type: 'hero',
      }
    if (index === 1)
      return {
        col: 'col-span-2 lg:col-span-2',
        row: 'row-span-1',
        type: 'wide',
      }
    if (index === 2)
      return {
        col: 'col-span-2 lg:col-span-2',
        row: 'row-span-1',
        type: 'wide',
      }
  }
  if (count === 4) {
    if (index === 0)
      return {
        col: 'col-span-2 lg:col-span-2',
        row: 'row-span-2',
        type: 'hero',
      }
    if (index === 1)
      return {
        col: 'col-span-2 lg:col-span-2',
        row: 'row-span-1',
        type: 'wide',
      }
    if (index === 2)
      return { col: 'col-span-1 lg:col-span-1', row: 'row-span-1', type: 'std' }
    if (index === 3)
      return { col: 'col-span-1 lg:col-span-1', row: 'row-span-1', type: 'std' }
  }
  return CARD_PATTERN[index % CARD_PATTERN.length]
}

const CommunityGallerySection = () => {
  const { postLoadingDelayMs } = useSettings()
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('new')
  const [activePostType, setActivePostType] = useState('all')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'ai_explore' || tabParam === 'external_ai') {
      setActivePostType('external_ai')
    }
  }, [searchParams])
  const [activeCategory, setActiveCategory] = useState('all')
  const [onlyShowExif, setOnlyShowExif] = useState(true)
  const [tabStats, setTabStats] = useState({
    all: 0,
    ai: 0,
    raw: 0,
    cameraExif: 0,
  })
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)

  const scrollContainerRef = useRef(null)

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
      .catch((err) =>
        console.error('Failed to load categories for gallery:', err)
      )
  }, [])

  const tab = FEED_TABS.find((t) => t.key === activeTab)

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setIsEmpty(false)
      } else setLoadingMore(true)

      if (postLoadingDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, postLoadingDelayMs))
      }

      try {
        const params = { limit: 12, ...tab.params }

        if (activeCategory !== 'all') {
          params.category = activeCategory
        }

        if (activePostType === 'external_ai') {
          params.postType = 'ai'
          params.isExternal = 'true'
        } else if (activePostType !== 'all') {
          params.postType = activePostType
          if (activePostType === 'ai') {
            params.isExternal = 'false'
          }
        }

        if (activePostType === 'digital-normal' && onlyShowExif) {
          params.hasExif = 'true'
        }

        if (!reset && cursor) params.cursor = cursor

        const { data } = await api.get(tab.endpoint, { params })

        if (data.isEmpty) {
          setIsEmpty(true)
          setPosts([])
          return
        }

        const newPosts = data.posts || []
        setPosts(reset ? newPosts : (p) => [...p, ...newPosts])
        setHasMore(data.pagination?.hasMore || false)
        setCursor(data.pagination?.nextCursor || null)

        if (data.stats) {
          setTabStats(data.stats)
        }
      } catch {
        if (reset) setPosts([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, cursor, tab, activePostType, activeCategory, onlyShowExif]
  )

  useEffect(() => {
    fetchPosts(true)
  }, [activeTab, activePostType, activeCategory, onlyShowExif]) // eslint-disable-line

  // L\u1ea5y postId hi\u1ec7n t\u1ea1i \u0111\u1ec3 useModalUrl theo d\u00f5i
  const currentPostId =
    selectedIndex !== null ? posts[selectedIndex]?._id : null

  // \u0110\u00f3ng modal thu\u1ea7n (kh\u00f4ng navigate) — d\u00f9ng n\u1ed9i b\u1ed9
  const closeModalState = useCallback(() => setSelectedIndex(null), [])

  // Hook \u0111\u1ed3ng b\u1ed9 URL \u2194 modal
  const { closeModal } = useModalUrl(currentPostId, closeModalState)

  const handleOpenPost = (_post, index) => setSelectedIndex(index)
  // Khi user ch\u1ee7 \u0111\u1ed9ng \u0111\u00f3ng (X / backdrop / Escape) \u2192 restore URL
  const handleClose = closeModal
  const handlePrev = () => setSelectedIndex((i) => Math.max(0, i - 1))
  const handleNext = () =>
    setSelectedIndex((i) => Math.min(posts.length - 1, i + 1))

  const handleTabChange = (key) => {
    if (key === 'following' && !isLoggedIn) {
      window.location.href = '/login'
      return
    }
    setActiveTab(key)
  }

  const currentCategoryObj = activeCategoriesList.find(
    (c) => c.key === activeCategory
  )
  const currentCategoryName = currentCategoryObj
    ? currentCategoryObj.label
    : 'Tất cả'

  return (
    <>
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header + Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-5"
          >
            <div>
              <p className="text-green-400 text-[11px] font-bold tracking-widest uppercase mb-3 pj">
                🎨 Từ cộng đồng
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight pj">
                Khám phá ảnh
              </h2>
            </div>

            {/* Feed Tabs */}
            <div className="flex gap-1.5 bg-surface-50 p-1 rounded-2xl border border-[var(--color-border)] self-start md:self-auto">
              {FEED_TABS.map(({ key, label, icon: TabIcon, needAuth }) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 pj flex items-center gap-1.5
                    ${
                      activeTab === key
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-foreground/50 hover:text-foreground'
                    }
                    ${needAuth && !isLoggedIn ? 'opacity-60' : ''}
                  `}
                >
                  <TabIcon size={13} />
                  {label}
                  {needAuth && !isLoggedIn && (
                    <span className="ml-1 text-[9px] opacity-40">🔒</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Post Type Tabs + Category Filter Row */}
          <div className="flex flex-col gap-6 mb-10">
            {/* Row 1: Post Type Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div
                className="flex gap-2 p-1 bg-[#1a172e]/30 dark:bg-[#1a172e]/50 backdrop-blur-md rounded-2xl border overflow-x-auto no-scrollbar max-w-full"
                style={{
                  borderColor:
                    'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
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
                      onClick={() => {
                        setActivePostType(tabItem.key)
                      }}
                      className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 flex items-center justify-center gap-2 pj cursor-pointer select-none whitespace-nowrap ${tabItem.widthClass}
                        ${isActive ? 'text-white' : 'text-foreground/45 hover:text-foreground/80'}
                      `}
                    >
                      {/* Spring Active Indicator sliding background */}
                      {isActive && (
                        <motion.div
                          layoutId="activePostTypeTab"
                          className="absolute inset-0 bg-gradient-brand shadow-md rounded-xl z-0"
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 28,
                          }}
                        />
                      )}

                      <span className="relative z-10 flex items-center justify-center">
                        <IconComp size={15} />
                      </span>

                      <span className="relative z-10">{tabItem.label}</span>

                      {/* Live Stats Badge */}
                      <span
                        className={`relative z-10 text-[10px] px-1 py-0.5 w-[42px] h-[18px] flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold transition-colors
                        ${isActive ? 'bg-white/20 text-white' : 'bg-foreground/5 text-foreground/40'}
                      `}
                      >
                        {formatTabCount(count)}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Row 1.5: EXIF Toggle for Camera Tab */}
              <AnimatePresence>
                {activePostType === 'digital-normal' && (
                  <motion.div
                    initial={{ opacity: 0, x: 15, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-3 bg-[#1a172e]/30 backdrop-blur-md px-4 py-2.5 rounded-xl border self-start sm:self-auto"
                    style={{
                      borderColor:
                        'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
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
              </AnimatePresence>
            </div>

            {/* Row 2: Category Pills Row */}
            <div
              ref={scrollContainerRef}
              {...catDrag}
              className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 cursor-grab active:cursor-grabbing select-none py-1"
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

          {/* Content */}
          <div className="min-h-[1360px] flex flex-col">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <GallerySkeleton />
              </motion.div>
            ) : posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 min-h-[900px] flex flex-col items-center justify-center select-none"
              >
                {/* Illustration with glassmorphic elements and glowing ambient effect */}
                <div className="relative mb-8 group">
                  {/* Glowing background ambient blur */}
                  <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-brand-600/35 to-fuchsia-600/35 blur-3xl opacity-80 group-hover:scale-105 transition-transform duration-700" />

                  {/* Image */}
                  <img
                    src="/empty_gallery_illustration.png"
                    alt="Empty gallery"
                    className="relative w-64 h-64 object-contain mx-auto rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-md hover:rotate-1 transition-transform duration-500 ease-out"
                  />

                  {/* Floating camera overlay icons */}
                  <div className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 backdrop-blur-md flex items-center justify-center text-lg shadow-lg shadow-brand-500/20 animate-bounce duration-1000">
                    📷
                  </div>
                  <div className="absolute -bottom-3 -left-3 z-10 w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30 backdrop-blur-md flex items-center justify-center text-lg shadow-lg shadow-fuchsia-500/20 animate-pulse">
                    ✨
                  </div>
                </div>

                {activeTab === 'following' ? (
                  <>
                    <h3 className="text-foreground font-black text-2xl mb-3 pj tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                      Chưa follow ai cả
                    </h3>
                    <p className="text-foreground/50 text-sm max-w-sm mx-auto pj mb-6 leading-relaxed">
                      Follow những creator bạn yêu thích để cập nhật ngay những
                      tác phẩm mới nhất của họ tại đây.
                    </p>
                    <Link
                      to="/search"
                      className="inline-flex items-center gap-2 btn-primary text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all"
                    >
                      Khám phá ngay <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-foreground font-black text-2xl mb-3 pj tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                      {currentCategoryName === 'Tất cả'
                        ? 'Không tìm thấy tác phẩm'
                        : `Danh mục ${currentCategoryName} trống`}
                    </h3>
                    <p className="text-foreground/50 text-sm max-w-md mx-auto pj mb-6 leading-relaxed">
                      Hiện tại chưa có bức ảnh nào trong danh mục này. Hãy trở
                      thành người tiên phong đăng tải những tác phẩm xuất sắc
                      của bạn!
                    </p>
                    <Link
                      to="/upload"
                      className="inline-flex items-center gap-2 btn-primary text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all"
                    >
                      Đăng ảnh ngay <ArrowRight size={14} />
                    </Link>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col justify-between"
              >
                {/* 
                  Magazine Grid starting from the very top.
                  Uses getFewPostsPattern to override grid spans when posts.length <= 4,
                  allowing few posts to occupy the top row beautifully without vertical centering shifts.
                */}
                <div
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                  style={{ gridAutoRows: '200px' }}
                >
                  <AnimatePresence initial={false}>
                    {posts.map((post, i) => {
                      const p = getFewPostsPattern(posts.length, i)
                      return (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, filter: 'blur(4px)', y: 15 }}
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
                  </AnimatePresence>
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-12">
                    {posts.length >= 24 ? (
                      <Link
                        to={`/explore?tab=${activeTab}&postType=${activePostType}&category=${activeCategory}`}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl
                          bg-surface-50 border border-[var(--color-border)] text-foreground/60
                          hover:bg-surface-100 hover:text-foreground transition-all text-sm font-semibold pj cursor-pointer select-none active:scale-95"
                      >
                        <ArrowRight size={16} />
                        Xem thêm tại Khám phá
                      </Link>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => fetchPosts(false)}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl
                          bg-surface-50 border border-[var(--color-border)] text-foreground/60
                          hover:bg-surface-100 hover:text-foreground transition-all text-sm font-semibold pj
                          disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <ArrowRight size={16} />
                        )}
                        {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                      </motion.button>
                    )}
                  </div>
                )}

                {!hasMore && posts.length > 0 && (
                  <div className="text-center mt-12 mb-6 pj flex flex-col items-center gap-2 select-none">
                    <p className="text-foreground/30 text-xs italic">
                      — Đã hiển thị tất cả {posts.length} kết quả của danh mục{' '}
                      {currentCategoryName} —
                    </p>
                    <Link
                      to="/upload"
                      className="text-brand-500 hover:text-brand-400 text-xs font-semibold hover:underline transition-colors mt-1 cursor-pointer"
                    >
                      Bạn là một creator? Hãy chia sẻ những tác phẩm nghệ thuật
                      tuyệt vời của bạn tới cộng đồng ngay!
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* View all link */}
          {!loading && posts.length > 0 && (
            <div className="flex justify-end mt-6">
              <Link
                to="/explore"
                className="flex items-center gap-2 text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-white font-bold transition-colors group text-sm shrink-0 pj"
              >
                Xem tất cả
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          )}
        </div>
      </section>

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

/* ─── Main Page ──────────────────────────────────────────── */
const HomePage = () => {
  const heroRef = useRef(null)
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(0)

  const [homepageData, setHomepageData] = useState(null)
  const [homepageLoading, setHomepageLoading] = useState(true)
  const [viewsInput, setViewsInput] = useState(5000)
  const [downloadsInput, setDownloadsInput] = useState(100)
  const [freeDownloadsInput, setFreeDownloadsInput] = useState(500)
  const [selectedPostId, setSelectedPostId] = useState(null)

  // Carousel Trending Community
  const [trendingIndex, setTrendingIndex] = useState(0)
  const [visibleCards, setVisibleCards] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setVisibleCards(3)
      else if (window.innerWidth >= 768) setVisibleCards(2)
      else setVisibleCards(1)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const trendingList = homepageData?.trending || []
  const maxTrendingIndex = Math.max(0, trendingList.length - visibleCards)

  const handleTrendingNext = () => {
    setTrendingIndex((prev) => (prev >= maxTrendingIndex ? 0 : prev + 1))
  }

  const handleTrendingPrev = () => {
    setTrendingIndex((prev) => (prev === 0 ? maxTrendingIndex : prev - 1))
  }

  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderPeriod, setLeaderPeriod] = useState('all') // 'week' | 'month' | 'year' | 'all'
  const [leaderType, setLeaderType] = useState('followers') // 'followers' | 'views' | 'downloads'

  const [showLeaderModal, setShowLeaderModal] = useState(false)
  const [modalCreators, setModalCreators] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalPeriod, setModalPeriod] = useState('all')
  const [modalType, setModalType] = useState('followers')

  const { splashExtraMs, trendingCarouselInterval } = useSettings()

  // Autoplay for community trending carousel
  useEffect(() => {
    if (
      !trendingCarouselInterval ||
      trendingCarouselInterval <= 0 ||
      trendingList.length === 0
    )
      return

    const timer = setInterval(() => {
      setTrendingIndex((prev) => (prev >= maxTrendingIndex ? 0 : prev + 1))
    }, trendingCarouselInterval)

    return () => clearInterval(timer)
  }, [trendingCarouselInterval, trendingList.length, maxTrendingIndex])

  const fetchLeaderboard = useCallback(
    async (period, type, limit = 4, target = 'local') => {
      try {
        if (target === 'local') setLeaderboardLoading(true)
        else setModalLoading(true)

        const { data } = await api.get('/users/leaderboard', {
          params: { period, type, limit },
        })

        if (target === 'local') {
          setLeaderboard(data.creators || [])
          setLeaderboardLoading(false)
        } else {
          setModalCreators(data.creators || [])
          setModalLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
        if (target === 'local') setLeaderboardLoading(false)
        else setModalLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    api
      .get('/posts/homepage-data')
      .then(({ data }) => {
        // Lấy thời gian cộng thêm từ API response, fallback về context settings
        const extra = data.splashExtraMs ?? splashExtraMs ?? 0

        // Chờ thêm khoảng thời gian setting sau khi dữ liệu đã được tải xong
        setTimeout(() => {
          setHomepageData(data)
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard)
          }
          setHomepageLoading(false)
        }, extra)
      })
      .catch(() => {
        setHomepageLoading(false)
      })
  }, []) // eslint-disable-line

  // Fetch local leaderboard when type/period changes (skip first load since payload has it)
  useEffect(() => {
    if (homepageData) {
      fetchLeaderboard(leaderPeriod, leaderType, 4, 'local')
    }
  }, [leaderPeriod, leaderType, fetchLeaderboard]) // eslint-disable-line

  // Fetch modal leaderboard when open, type/period changes
  useEffect(() => {
    if (showLeaderModal) {
      fetchLeaderboard(modalPeriod, modalType, 20, 'modal')
    }
  }, [showLeaderModal, modalPeriod, modalType, fetchLeaderboard])

  // ── Sync follow state across tabs ──────────────────────────────
  useEffect(() => {
    const channel = new BroadcastChannel('picspy_follow_sync')
    const handleMessage = (event) => {
      const { creatorId, isFollowing } = event.data

      const updateList = (prev) =>
        prev.map((c) =>
          c._id === creatorId
            ? {
                ...c,
                isFollowing: isFollowing,
                stats: {
                  ...c.stats,
                  followersCount: Math.max(
                    0,
                    (c.stats?.followersCount || 0) + (isFollowing ? 1 : -1)
                  ),
                },
              }
            : c
        )

      setLeaderboard(updateList)
      setModalCreators(updateList)
      setHomepageData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          leaderboard: updateList(prev.leaderboard || []),
        }
      })
    }
    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [])

  const [unfollowTarget, setUnfollowTarget] = useState(null)

  const confirmUnfollow = async (creatorId) => {
    try {
      const { data } = await api.post(`/users/${creatorId}/follow`)
      toast.success(data.message)

      const updateList = (prev) =>
        prev.map((c) =>
          c._id === creatorId
            ? {
                ...c,
                isFollowing: data.following,
                stats: {
                  ...c.stats,
                  followersCount: Math.max(
                    0,
                    (c.stats?.followersCount || 0) + (data.following ? 1 : -1)
                  ),
                },
              }
            : c
        )

      setLeaderboard(updateList)
      setModalCreators(updateList)

      setHomepageData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          leaderboard: updateList(prev.leaderboard || []),
        }
      })

      // Broadcast sự kiện sync cho các tab khác
      const channel = new BroadcastChannel('picspy_follow_sync')
      channel.postMessage({ creatorId, isFollowing: data.following })
      channel.close()
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Không thể hủy theo dõi nghệ sĩ'
      )
    } finally {
      setUnfollowTarget(null)
    }
  }

  const handleFollowCreator = async (creator) => {
    if (creator.isFollowing) {
      setUnfollowTarget(creator)
    } else {
      // Follow instantly
      try {
        const { data } = await api.post(`/users/${creator._id}/follow`)
        toast.success(data.message)

        const updateList = (prev) =>
          prev.map((c) =>
            c._id === creator._id
              ? {
                  ...c,
                  isFollowing: data.following,
                  stats: {
                    ...c.stats,
                    followersCount: Math.max(
                      0,
                      (c.stats?.followersCount || 0) + (data.following ? 1 : -1)
                    ),
                  },
                }
              : c
          )

        setLeaderboard(updateList)
        setModalCreators(updateList)

        setHomepageData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            leaderboard: updateList(prev.leaderboard || []),
          }
        })

        // Broadcast sự kiện sync cho các tab khác
        const channel = new BroadcastChannel('picspy_follow_sync')
        channel.postMessage({
          creatorId: creator._id,
          isFollowing: data.following,
        })
        channel.close()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không thể theo dõi nghệ sĩ')
      }
    }
  }

  const collageImages = useMemo(() => {
    const defaultCollage = [
      'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=70&fm=webp',
      'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=500&q=70&fm=webp',
    ]
    if (!homepageData?.collage || homepageData.collage.length < 8)
      return defaultCollage
    return homepageData.collage
  }, [homepageData])

  const statsList = useMemo(() => {
    return [
      {
        value: homepageData?.stats?.totalPosts || 0,
        label: 'Wallpapers',
        color: '#a78bfa',
        format: '+',
      },
      {
        value: homepageData?.stats?.totalDownloads || 0,
        label: 'Downloads',
        color: '#60a5fa',
        format: '',
      },
      {
        value: homepageData?.stats?.totalCreators || 0,
        label: 'Creators',
        color: '#f59e0b',
        format: '',
      },
      {
        value: homepageData?.stats?.totalCoinsPaid || 0,
        label: 'VNĐ đã trả',
        color: '#34d399',
        format: '+',
      },
    ]
  }, [homepageData])

  const categoriesToRender = useMemo(() => {
    const style = homepageData?.categoryStyle || 'style-1'
    if (!homepageData?.categories || homepageData.categories.length === 0) {
      return CATEGORIES.slice(0, 6).map((c) => ({
        key: c.label.toLowerCase(),
        label: c.label,
        count: 0,
        emoji: c.emoji,
        posts: [],
        style,
      }))
    }
    return homepageData.categories.map((c) => ({
      key: c.key,
      label: c.label || c.key,
      emoji: c.emoji || '🏷️',
      count: c.count || 0,
      posts: c.posts || [],
      style,
    }))
  }, [homepageData])

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96])

  if (homepageLoading) {
    return createPortal(
      <div
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{ backgroundColor: '#0c0c0e' }}
      >
        {/* Subtle glowing radial blob */}
        <div
          className="absolute w-[320px] h-[320px] rounded-full blur-[130px] pointer-events-none"
          style={{
            backgroundColor:
              'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.18)',
          }}
        />
        {/* Loader */}
        <div className="relative z-10">
          <ContentLoader size="lg" />
        </div>
        {/* Debug label */}
        <p className="absolute bottom-8 text-[10px] font-mono text-white/20 tracking-widest uppercase">
          Loading&hellip;
        </p>
      </div>,
      document.body
    )
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden pj"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <FontLoader />

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex flex-col items-center justify-center
          text-center px-4 pt-20 pb-0 overflow-hidden hero-grid"
      >
        {/* Ambient orbs */}
        <Orb
          className="orb-float-1 top-[-10%] left-[-5%] w-[40vw] h-[40vw]
          blur-[130px] rounded-full"
          style={{
            backgroundColor:
              'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.1)',
          }}
        />
        <Orb
          className="orb-float-2 bottom-[0%] right-[-8%] w-[35vw] h-[35vw]
          bg-blue-500/10 blur-[130px] rounded-full"
        />
        <Orb
          className="orb-float-3 top-[30%] left-[60%]  w-[22vw] h-[22vw]
          bg-fuchsia-500/07 blur-[100px] rounded-full"
        />

        {/* Hero background collage — 8 ảnh đa dạng, 2 hàng so le */}
        <div className="absolute inset-0 -z-10 opacity-20 overflow-hidden">
          <div className="flex flex-col gap-4 rotate-[10deg] scale-[1.35] -translate-y-8 w-full">
            {/* Hàng 1 */}
            <div className="flex gap-4">
              {collageImages.slice(0, 4).map((src, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-2xl overflow-hidden border border-white/5
                  ${i % 2 === 0 ? 'h-72' : 'h-56'}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            {/* Hàng 2 — dịch ngang */}
            <div className="flex gap-4 -translate-x-16">
              {collageImages.slice(4, 8).map((src, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-2xl overflow-hidden border border-white/5
                  ${i % 2 === 0 ? 'h-56' : 'h-72'}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="max-w-5xl mx-auto relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8
              liquid-glass text-brand-600 dark:text-brand-300 text-[11px] font-bold tracking-[0.2em] uppercase"
          >
            <Sparkles size={11} className="animate-pulse" />
            AI-Powered Visual Curator #1 Việt Nam
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.75,
              delay: 0.1,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black
              tracking-tighter leading-[1.1] mb-8"
          >
            <span className="block text-foreground">
              Chia sẻ <span className="hero-gradient-text">sáng tạo,</span>
            </span>
            <span className="block text-foreground">
              Kiếm tiền từ{' '}
              <span className="relative inline-block">
                <span className="hero-gradient-text inline-block pr-[2px]">
                  đam mê
                </span>
                <motion.span
                  animate={{ scaleX: [0, 1] }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute -bottom-1 left-0 right-0 h-0.5
                    bg-gradient-brand origin-left block"
                />
              </span>
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-foreground/60 text-lg md:text-xl
              font-light leading-relaxed mb-12"
          >
            Nền tảng nghệ thuật số hàng đầu nơi các nhà sáng tạo nội dung trình
            diễn kiệt tác và kết nối với cộng đồng toàn cầu.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-5 rounded-full font-bold text-white text-base w-full sm:w-auto
                  bg-gradient-brand
                  transition-shadow duration-300 flex items-center gap-2 justify-center"
                style={{
                  boxShadow:
                    '0 0 50px hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.35)',
                }}
              >
                Bắt đầu ngay <ArrowRight size={18} />
              </motion.button>
            </Link>
            <Link to="/explore">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-5 rounded-full font-bold text-base w-full sm:w-auto
                  liquid-glass transition-all duration-300
                  text-foreground/80 hover:text-foreground
                  dark:text-white/80 dark:hover:text-white"
                style={{ '--tw-bg-opacity': 1 }}
              >
                Khám phá Gallery
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero bottom image strip — curved top */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 w-full max-w-6xl mx-auto px-4 relative z-10"
        >
          <div
            className="relative rounded-t-[2rem] overflow-hidden
            border-t border-x border-white/12
            shadow-[0_-24px_80px_rgba(124,58,237,0.18)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
            {/* Multi-image strip: 3 cột nổi bật */}
            <div className="flex h-[400px] md:h-[520px]">
              {/* <img
                src="https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=85"
                alt="" className="flex-1 object-cover object-center opacity-60" loading="eager"
              />
              <img
                src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=85"
                alt="" className="flex-[1.5] object-cover object-center opacity-65" loading="eager"
              />
              <img
                src="https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800&q=85"
                alt="" className="flex-1 object-cover object-center opacity-60" loading="eager"
              /> */}
              <img
                src={
                  homepageData?.heroBannerImage ||
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85'
                }
                alt="PICSPY hero"
                className="w-full h-[400px] md:h-[520px] object-cover object-center opacity-50"
                loading="eager"
              />
            </div>
            {/* Floating badges on hero img */}
            <div className="absolute top-6 left-6 z-20">
              <LiquidCard className="px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-foreground/80 dark:text-white/80 pj">
                  50K+ wallpaper đang chờ bạn
                </span>
              </LiquidCard>
            </div>
            <div className="absolute top-6 right-6 z-20">
              <LiquidCard className="px-4 py-2 flex items-center gap-2">
                <TrendingUp size={14} className="text-brand-400" />
                <span className="text-sm font-medium text-foreground/80 dark:text-white/80 pj">
                  +340 ảnh hôm nay
                </span>
              </LiquidCard>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════
          STATS STRIP — floating overlap
      ════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <LiquidCard strong className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[var(--color-border)]">
            {statsList.map(({ value, label, color, format }) => (
              <div
                key={label}
                className="text-center px-6 py-2 group cursor-default"
              >
                <p
                  className="text-3xl md:text-4xl font-black pj mb-1.5 transition-transform
                  duration-300 group-hover:scale-110"
                >
                  <AnimatedCounter
                    targetValue={value}
                    format={format}
                    color={color}
                  />
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#6D6255] dark:text-white/45 pj">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </LiquidCard>
      </section>

      {/* ════════════════════════════════════════
          FEATURED CATEGORIES
      ════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6"
          >
            <div>
              <p className="text-brand-600 dark:text-brand-400 text-[11px] font-bold tracking-widest uppercase mb-3 pj">
                🎯 Danh mục nổi bật
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3 pj">
                Danh mục nổi bật
              </h2>
              <p className="text-foreground/60 dark:text-white/40 max-w-md text-base leading-relaxed pj">
                Khám phá kho lưu trữ được phân loại chuyên nghiệp bởi cộng đồng.
              </p>
            </div>
            <Link
              to="/categories"
              className="flex items-center gap-2 text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-white
                font-bold transition-colors group text-sm shrink-0 pj"
            >
              Xem tất cả danh mục
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </motion.div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoriesToRender.map((cat, i) => (
              <CategoryCard
                key={cat.key}
                label={cat.label}
                count={cat.count}
                emoji={cat.emoji}
                posts={cat.posts}
                style={cat.style}
                delay={i * 0.07}
                onClick={() => navigate(`/search?category=${cat.key}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TRENDING COMMUNITY
      ════════════════════════════════════════ */}
      <section className="py-24 bg-surface-50/50 border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-14">
            <div>
              <p className="text-brand-600 dark:text-blue-400 text-[11px] font-bold tracking-widest uppercase mb-3 pj">
                🔥 Trending tuần này
              </p>
              <h2 className="text-4xl font-black tracking-tight pj">
                Xu hướng cộng đồng
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTrendingPrev}
                className="w-11 h-11 rounded-full liquid-glass flex items-center justify-center
                text-foreground/50 hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/5"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleTrendingNext}
                className="w-11 h-11 rounded-full liquid-glass flex items-center justify-center
                text-foreground/50 hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/5"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Sliding Carousel viewport */}
          <div className="overflow-hidden w-full py-4 -my-4">
            {trendingList.length === 0 ? (
              <div className="text-center text-white/40 py-12 pj">
                Đang tải xu hướng...
              </div>
            ) : (
              <motion.div
                className="flex gap-6 w-full"
                animate={{
                  x: `calc(-${(trendingIndex * 100) / visibleCards}% - ${(trendingIndex * 24) / visibleCards}px)`,
                }}
                transition={{ type: 'spring', damping: 28, stiffness: 150 }}
              >
                {trendingList.map((post, i) => (
                  <TrendingCard
                    key={post._id}
                    post={post}
                    index={i}
                    delay={i * 0.05}
                    onClick={() => setSelectedPostId(post._id)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          COMMUNITY GALLERY — Real DB Data
      ════════════════════════════════════════ */}
      <CommunityGallerySection />

      {/* ════════════════════════════════════════
          MASONRY DROPS + LEADERBOARD
      ════════════════════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Latest Drops — masonry */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-10"
            >
              <div>
                <p className="text-amber-400 text-[11px] font-bold tracking-widest uppercase mb-2 pj">
                  🏆 Nổi bật
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight pj">
                  Top ảnh tuần này
                </h2>
              </div>
              <span className="text-foreground/45 dark:text-white/30 text-sm font-bold pj flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />{' '}
                Live Feed
              </span>
            </motion.div>

            <div className="columns-2 gap-5">
              {homepageData?.newCollections?.map((post, i) => (
                <MasonryCard
                  key={post._id}
                  post={post}
                  index={i}
                  onClick={() => setSelectedPostId(post._id)}
                />
              )) || (
                <div className="text-center text-white/40 py-10">
                  Đang tải top ảnh tuần...
                </div>
              )}
            </div>
          </div>

          {/* Right: Leaderboard */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <LiquidCard strong className="p-8 sticky top-28">
                <h2 className="text-2xl font-black tracking-tight mb-4 pj">
                  Bảng xếp hạng
                </h2>

                {/* Filter Pills */}
                <div className="flex flex-col gap-3 mb-6 border-b border-white/5 pb-5 items-center justify-center">
                  {/* Metric Tab Segmented Control */}
                  <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/10 w-full justify-between gap-1">
                    {[
                      { key: 'followers', label: 'Người theo dõi' },
                      { key: 'views', label: 'Lượt xem' },
                      { key: 'downloads', label: 'Lượt tải xuống' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setLeaderType(t.key)}
                        className={`flex-1 text-center py-2.5 rounded-full text-[10px] font-black transition-all cursor-pointer select-none whitespace-nowrap px-1 ${
                          leaderType === t.key
                            ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)] scale-[1.02]'
                            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Period Tab Segmented Control */}
                  <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/10 w-full justify-between max-w-[250px]">
                    {[
                      { key: 'week', label: 'Tuần' },
                      { key: 'month', label: 'Tháng' },
                      { key: 'all', label: 'Tất cả' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setLeaderPeriod(t.key)}
                        className={`flex-1 text-center py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer select-none ${
                          leaderPeriod === t.key
                            ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)] scale-[1.03]'
                            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leaderboard Rows */}
                <div className="divide-y divide-[var(--color-border)] h-[320px] flex flex-col justify-between overflow-hidden">
                  {leaderboardLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
                      <motion.div
                        className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </div>
                  ) : leaderboard.length > 0 ? (
                    leaderboard.map((c, i) => (
                      <div
                        key={c._id}
                        className="py-1.5 flex-1 flex flex-col justify-center"
                      >
                        <LeaderRow
                          c={c}
                          rank={i + 1}
                          delay={i * 0.08}
                          onFollow={handleFollowCreator}
                          metricType={leaderType}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-white/40 py-6 pj">
                      Không có dữ liệu xếp hạng
                    </div>
                  )}
                </div>

                {/* Show Top 20 Modal Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setModalPeriod(leaderPeriod)
                    setModalType(leaderType)
                    setShowLeaderModal(true)
                  }}
                  className="w-full mt-8 py-4 liquid-glass rounded-full text-sm font-bold pj
                    text-foreground/60 hover:text-foreground dark:text-white/60 dark:hover:text-white transition-all cursor-pointer"
                >
                  Xem top 20 creators 🏆
                </motion.button>
              </LiquidCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CREATOR CTA SECTION — Gradient card
      ════════════════════════════════════════ */}
      <section className="py-24 px-4 relative overflow-hidden">
        <Orb
          className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[60vw] h-[60vw] blur-[150px] orb-float-1"
          style={{
            backgroundColor:
              'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.12)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-6xl mx-auto"
        >
          {/* Creator CTA — Dark glass card với tint xanh tím nhẹ */}
          <div
            className="relative rounded-[2.5rem] overflow-hidden p-12 md:p-20 noise"
            style={{
              background: 'var(--cta-bg)',
              backdropFilter: 'blur(48px) saturate(160%)',
              WebkitBackdropFilter: 'blur(48px) saturate(160%)',
              border: '1px solid var(--cta-border)',
              boxShadow: 'inset 0 1px 0 var(--cta-inset), var(--cta-shadow)',
            }}
          >
            {/* Subtle violet tint blob */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
              rounded-full blur-[100px] pointer-events-none"
              style={{
                backgroundColor:
                  'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.12)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-80 h-80
              bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"
            />
            {/* Border gradient glow */}
            <div
              className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 100%)',
              }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              {/* Left text */}
              <div className="max-w-xl text-center lg:text-left flex-1">
                <p className="text-brand-600 dark:text-brand-400 text-[11px] font-bold tracking-widest uppercase mb-4 pj">
                  🚀 Creator Program
                </p>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-6 leading-tight pj">
                  Bạn là nhà sáng tạo nghệ thuật?
                </h2>
                <p className="text-foreground/70 text-base mb-8 leading-relaxed pj">
                  Gia nhập đội ngũ PICSPY Creators ngay. Hệ thống phân phối và
                  chia sẻ doanh thu bằng tiền mặt VNĐ minh bạch, trả lại giá trị
                  thực xứng đáng với tài năng của bạn.
                </p>

                {/* Revenue Payout Calculator */}
                <div className="space-y-4 mb-8 w-full max-w-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-foreground/50 tracking-widest pj">
                      Ước tính doanh thu của bạn
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6 text-left relative overflow-hidden">
                    {(() => {
                      const minViews =
                        freeDownloadsInput * 5 + downloadsInput * 15
                      const effectiveViews = Math.max(viewsInput, minViews)
                      const viewPayout =
                        effectiveViews *
                        (homepageData?.rates?.payoutRatePerView || 10)
                      const freeDownloadPayout = freeDownloadsInput * 100
                      const premiumDownloadPayout =
                        downloadsInput *
                        20000 *
                        ((homepageData?.rates?.creatorSharePercent || 70) / 100)
                      const totalPayout =
                        viewPayout + freeDownloadPayout + premiumDownloadPayout

                      return (
                        <>
                          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-white/[0.05]">
                            <div>
                              <p className="text-[9px] font-bold text-foreground/55 mb-1 uppercase tracking-wide pj">
                                Lượt xem ước tính
                              </p>
                              <p className="text-lg font-black text-foreground tabular-nums leading-none pj">
                                {effectiveViews.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-foreground/55 mb-1 uppercase tracking-wide pj">
                                Lượt tải ảnh thường
                              </p>
                              <p className="text-lg font-black text-foreground tabular-nums leading-none pj">
                                {freeDownloadsInput.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-foreground/55 mb-1 uppercase tracking-wide pj">
                                Lượt tải Premium
                              </p>
                              <p className="text-lg font-black text-foreground tabular-nums leading-none pj">
                                {downloadsInput.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Views Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase">
                                <span>
                                  Lượt xem (tối thiểu{' '}
                                  {minViews.toLocaleString()})
                                </span>
                                <span className="text-brand-400 font-bold">
                                  {viewPayout.toLocaleString()}đ
                                </span>
                              </div>
                              <input
                                type="range"
                                min={minViews}
                                max="100000"
                                step="500"
                                value={effectiveViews}
                                onChange={(e) =>
                                  setViewsInput(
                                    Math.max(parseInt(e.target.value), minViews)
                                  )
                                }
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                style={{
                                  background: `linear-gradient(to right, var(--color-brand-500) 0%, var(--color-brand-500) ${effectiveViews / 1000}%, rgba(255,255,255,0.1) ${effectiveViews / 1000}%, rgba(255,255,255,0.1) 100%)`,
                                }}
                              />
                            </div>

                            {/* Free Downloads Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase">
                                <span>
                                  Lượt tải ảnh thường (Khuyến khích tương tác
                                  100đ/tải)
                                </span>
                                <span className="text-brand-400 font-bold">
                                  {freeDownloadPayout.toLocaleString()}đ
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="10000"
                                step="50"
                                value={freeDownloadsInput}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value)
                                  setFreeDownloadsInput(newVal)
                                  const newMin =
                                    newVal * 5 + downloadsInput * 15
                                  if (viewsInput < newMin) {
                                    setViewsInput(newMin)
                                  }
                                }}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                style={{
                                  background: `linear-gradient(to right, var(--color-brand-500) 0%, var(--color-brand-500) ${freeDownloadsInput / 100}%, rgba(255,255,255,0.1) ${freeDownloadsInput / 100}%, rgba(255,255,255,0.1) 100%)`,
                                }}
                              />
                            </div>

                            {/* Downloads Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase">
                                <span>
                                  Lượt tải Premium (Ví dụ bán 20k/tải - nhận
                                  70%)
                                </span>
                                <span className="text-brand-400 font-bold">
                                  {premiumDownloadPayout.toLocaleString()}đ
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1000"
                                step="5"
                                value={downloadsInput}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value)
                                  setDownloadsInput(newVal)
                                  const newMin =
                                    freeDownloadsInput * 5 + newVal * 15
                                  if (viewsInput < newMin) {
                                    setViewsInput(newMin)
                                  }
                                }}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                style={{
                                  background: `linear-gradient(to right, var(--color-brand-500) 0%, var(--color-brand-500) ${downloadsInput / 10}%, rgba(255,255,255,0.1) ${downloadsInput / 10}%, rgba(255,255,255,0.1) 100%)`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground/55 pj">
                              Ước tính Doanh thu nhận về
                            </span>
                            <p className="text-3xl font-black text-emerald-400 tabular-nums pj">
                              {totalPayout.toLocaleString('vi-VN')} đ
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Right: Creator Payout Ticker */}
              <div
                className="liquid-glass rounded-[2rem] p-8 max-w-sm w-full border border-white/10 shadow-2xl relative overflow-hidden"
                style={{
                  background: 'rgba(10, 10, 25, 0.4)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Neon glow effect behind */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 uppercase">
                      <TrendingUp
                        size={15}
                        className="text-emerald-400 animate-pulse"
                      />{' '}
                      Tỷ giá Creator
                    </h3>
                    <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider mt-0.5">
                      Cập nhật hôm nay
                    </p>
                  </div>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: 'Tỷ giá Lượt xem (View)',
                      value: `${homepageData?.rates?.payoutRatePerView || 10}đ / view`,
                      desc: 'Tính trên mỗi view hợp lệ (Quyết toán đêm 00:00)',
                      indicator: '📈 +3.2%',
                      indicatorColor:
                        'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    },
                    {
                      label: 'Doanh thu bán ảnh Premium',
                      value: `${homepageData?.rates?.creatorSharePercent || 70}%`,
                      desc: 'Tỷ lệ chia sẻ doanh thu trực tiếp cho tác giả',
                      indicator: '🛡️ Ổn định',
                      indicatorColor:
                        'text-brand-400 bg-brand-500/10 border-brand-500/20',
                    },
                    {
                      label: 'Hạn mức rút tối thiểu',
                      value: `${(50000).toLocaleString('vi-VN')}đ`,
                      desc: 'Chuyển khoản trực tiếp về ngân hàng của bạn',
                      indicator: '💳 Instant',
                      indicatorColor:
                        'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    },
                    {
                      label: 'Phí giao dịch rút ví',
                      value: '2% + 10.000đ',
                      desc: 'Chi trả phí liên ngân hàng & kiểm duyệt viên',
                      indicator: '🏦 Sàn thu',
                      indicatorColor:
                        'text-white/40 bg-white/5 border-white/10',
                    },
                  ].map((rate, idx) => (
                    <div
                      key={idx}
                      className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-white/55">
                          {rate.label}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${rate.indicatorColor} tracking-wide`}
                        >
                          {rate.indicator}
                        </span>
                      </div>
                      <p className="text-xl font-black text-white leading-none tracking-tight mb-1">
                        {rate.value}
                      </p>
                      <p className="text-[9px] text-white/30 leading-normal">
                        {rate.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="bg-surface-50 border-t border-[var(--color-border)] pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand */}
            <div className="col-span-2">
              <div className="mb-5 flex items-center">
                <BrandLogo size="sm" />
              </div>
              <p className="text-foreground/60 max-w-xs mb-7 leading-relaxed text-sm pj">
                Nền tảng curator nghệ thuật số lớn nhất Việt Nam, kết nối hàng
                triệu trái tim yêu cái đẹp thông qua công nghệ AI.
              </p>
              <div className="flex gap-3">
                {['🌐', '🎬', '📸'].map((icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center
                      text-sm hover:scale-110 transition-transform"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: 'Khám phá',
                links: [
                  'Gallery cộng đồng',
                  'Bảng xếp hạng',
                  'Top ảnh tuần này',
                  'Creator PRO',
                ],
              },
              {
                title: 'Nền tảng',
                links: [
                  'Về PICSPY',
                  'Điều khoản',
                  'Bảo mật',
                  'Hướng dẫn dùng Token',
                ],
              },
              {
                title: 'Hỗ trợ',
                links: [
                  'Trung tâm trợ giúp',
                  'Báo cáo vi phạm',
                  'Liên hệ',
                  'Blog sáng tạo',
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-bold mb-5 text-foreground text-sm uppercase tracking-wider pj">
                  {title}
                </h4>
                <ul className="space-y-3 text-sm text-foreground/50">
                  {links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors pj"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row
            justify-between items-center gap-4"
          >
            <p className="text-foreground/40 text-xs font-bold tracking-widest uppercase pj">
              © 2026 PICSPY Vietnam. All rights reserved.
            </p>
            <p className="text-foreground/40 text-xs font-bold pj flex items-center gap-1">
              Made with{' '}
              <Heart size={11} className="text-red-400 fill-red-400 mx-1" /> in
              Vietnam
            </p>
          </div>
        </div>
      </footer>

      {/* Post Detail Modal cho Trending và New Collections */}
      <AnimatePresence>
        {selectedPostId && (
          <PostDetailModal
            postId={selectedPostId}
            onClose={() => setSelectedPostId(null)}
          />
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderModal && (
          <LeaderboardModal
            open={showLeaderModal}
            onClose={() => setShowLeaderModal(false)}
            creators={modalCreators}
            loading={modalLoading}
            period={modalPeriod}
            setPeriod={setModalPeriod}
            type={modalType}
            setType={setModalType}
            onFollow={handleFollowCreator}
          />
        )}
      </AnimatePresence>

      {/* Unfollow Confirm Dialog */}
      <ConfirmModal
        isOpen={!!unfollowTarget}
        onClose={() => setUnfollowTarget(null)}
        onConfirm={() => confirmUnfollow(unfollowTarget?._id)}
        title="Hủy theo dõi?"
        message={
          unfollowTarget ? (
            <>
              Bạn có chắc chắn muốn hủy theo dõi{' '}
              <span className="text-white font-bold whitespace-nowrap">
                {unfollowTarget.displayName || unfollowTarget.username}
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
        zIndex={250}
      />
    </div>
  )
}

/* ─── Leaderboard Modal Component ─────────────────────────── */
const LeaderboardModal = ({
  open,
  onClose,
  creators,
  loading,
  period,
  setPeriod,
  type,
  setType,
  onFollow,
}) => {
  // Body-scroll-lock: freeze body in place without layout shift
  useEffect(() => {
    if (!open) return
    const body = document.body
    const scrollY = window.scrollY
    // Must use exact measured width — NOT '100%'.
    // position:fixed + '100%' = full viewport width (scrollbar included),
    // which is wider than the body was → content shifts left.
    const lockedWidth = body.getBoundingClientRect().width

    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = `${lockedWidth}px`

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      window.scrollTo({ top: scrollY, behavior: 'instant' })
    }
  }, [open])

  if (!open) return null

  const periodTabs = [
    { key: 'week', label: 'Tuần này' },
    { key: 'month', label: 'Tháng này' },
    { key: 'year', label: 'Năm này' },
    { key: 'all', label: 'Tất cả' },
  ]

  const typeTabs = [
    { key: 'followers', label: 'Người theo dõi' },
    { key: 'views', label: 'Lượt xem' },
    { key: 'downloads', label: 'Lượt tải xuống' },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      {/* Click outside overlay */}
      <div className="fixed inset-0 w-full h-full" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-[#121225]/95 border border-white/10 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[720px] max-h-[85vh] z-10 noise"
        style={{ backdropFilter: 'blur(32px)' }}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white pj">
              Bảng Xếp Hạng Creators
            </h3>
            <p className="text-xs text-white/40 font-bold pj">
              Top 20 nghệ sĩ nổi bật nhất
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters Panel */}
        <div className="p-6 py-5 bg-white/[0.02] border-b border-white/5 flex flex-col lg:flex-row items-center justify-center gap-4">
          {/* Period Tabs */}
          <div className="flex bg-white/[0.03] p-1.5 rounded-full border border-white/10 w-full lg:w-auto justify-between min-w-[310px] gap-1">
            {periodTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                className={`flex-1 text-center py-2.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                  period === t.key
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)] scale-[1.03]'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Type Tabs */}
          <div className="flex bg-white/[0.03] p-1.5 rounded-full border border-white/10 w-full lg:w-auto justify-between min-w-[390px] gap-1">
            {typeTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex-1 text-center py-2.5 rounded-full text-[11px] sm:text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap px-1.5 ${
                  type === t.key
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)] scale-[1.03]'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <motion.div
                className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-xs text-white/40 font-bold pj">
                Đang tải bảng xếp hạng...
              </p>
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center text-white/40 py-20 pj">
              Không tìm thấy dữ liệu xếp hạng
            </div>
          ) : (
            <div className="divide-y divide-white/5 space-y-3">
              {creators.map((c, i) => (
                <div key={c._id} className={i > 0 ? 'pt-3 border-white/5' : ''}>
                  <LeaderRow
                    c={c}
                    rank={i + 1}
                    delay={i * 0.04}
                    onFollow={onFollow}
                    metricType={type}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default HomePage
