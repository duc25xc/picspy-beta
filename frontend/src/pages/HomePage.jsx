import { useRef, useEffect, useState, useCallback } from 'react'
import api from '../api/api'
import { Link, useNavigate } from 'react-router-dom'
import PostDetailModal from '../components/post/PostDetailModal'
import ContentLoader from '../components/ui/ContentLoader'
import useModalUrl from '../hooks/useModalUrl'
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
} from 'lucide-react'
import useAuthStore from '../store/auth.store'

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
        0 8px 32px var(--color-glass-shadow);
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .liquid-glass-strong {
      background: var(--color-glass-strong-bg);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      border: 1px solid var(--color-glass-strong-border);
      box-shadow:
        inset 0 1px 0 var(--color-glass-strong-inset),
        0 20px 60px var(--color-glass-shadow);
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
        0 0 40px var(--color-glass-hover-glow);
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
  { value: '2M+', label: 'Xu đã trả', color: '#34d399' },
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
        {value}
      </p>
      <p className="text-foreground/45 dark:text-white/45 text-[10px] font-bold tracking-widest uppercase pj relative z-10">
        {label}
      </p>
    </LiquidCard>
  </motion.div>
)

/* Category card */
const CategoryCard = ({ label, count, emoji, img, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.93 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
    className="group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer img-card-glow transition-all duration-500"
  >
    <img
      src={img}
      alt={label}
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      loading="lazy"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    {/* Floating label */}
    <div className="absolute bottom-5 left-4 right-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-400">
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

/* Trending image card */
const TrendingCard = ({ item, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    className="group relative rounded-2xl overflow-hidden cursor-pointer img-card-glow transition-all duration-500"
  >
    <img
      src={item.img}
      alt={item.title}
      className="w-full aspect-[16/10] object-cover group-hover:opacity-70 transition-all duration-500"
      loading="lazy"
    />
    {/* Hover overlay */}
    <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="liquid-glass rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500
            flex items-center justify-center text-white text-xs font-black pj"
          >
            {item.avatar}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground pj">
              {item.author}
            </p>
            <p className="text-[11px] text-foreground/60 pj">{item.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground/80">
          <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
            <Heart size={14} className="fill-red-400 text-red-400" />
            <span className="font-bold pj">
              {(item.likes / 1000).toFixed(1)}k
            </span>
          </button>
          <button className="hover:text-violet-400 transition-colors">
            <Bookmark size={14} />
          </button>
        </div>
      </div>
    </div>
  </motion.div>
)

/* Masonry drop card */
const MasonryCard = ({ item, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.07, duration: 0.5 }}
    className={`group relative overflow-hidden rounded-2xl cursor-pointer break-inside-avoid
      img-card-glow transition-all duration-500 mb-5
      ${item.h === 'tall' ? 'aspect-[3/4]' : 'aspect-square'}`}
  >
    <img
      src={item.img}
      alt=""
      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
      loading="lazy"
    />
    <div
      className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent
      to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    />
    {item.badge && (
      <div className="absolute top-3 left-3">
        <span
          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
          bg-violet-600/80 text-white backdrop-blur-md border border-violet-400/30 pj"
        >
          {item.badge}
        </span>
      </div>
    )}
    <div
      className="absolute bottom-0 left-0 right-0 p-3
      translate-y-full group-hover:translate-y-0 transition-transform duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/70 text-xs pj">
          <Eye size={11} /> {(Math.random() * 5 + 1).toFixed(1)}k views
        </div>
        <button className="flex items-center gap-1 text-white/70 text-xs hover:text-red-400 transition-colors">
          <Heart size={11} />
        </button>
      </div>
    </div>
  </motion.div>
)

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
const CommunityPostCard = ({ post, index, onClick }) => {
  const img = post.generatedImages?.[0] || post.images?.[0]
  const author = post.authorId
  const glowColor = post.colors?.[0]?.hex || '#7c3aed'
  const pattern = CARD_PATTERN[index % CARD_PATTERN.length]
  const alwaysShow = pattern.type === 'hero' || pattern.type === 'tall'

  // Smart crop URL: Cloudinary AI tìm điểm đẹp nhất đúng với tỷ lệ card
  const { w, h, face } = CARD_THUMB[pattern.type]
  const sourceUrl = img?.previewUrl || img?.thumbnailUrl || img?.url
  const displayUrl = sourceUrl
    ? getSmartCropUrl(sourceUrl, w, h, face)
    : null

  return (
    <div
      onClick={() => onClick?.(post, index)}
      className="group relative w-full h-full overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-500 ease-out hover:-translate-y-0.5"
    >
      {/* Image — object-cover chỉ align, thumbnail đã được AI pre-crop */}
      <div className="absolute inset-0">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={post.caption || 'Wallpaper'}
            className="w-full h-full object-cover
              group-hover:scale-[1.06] transition-transform duration-700 ease-out"
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
      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
        {post.isPremium && (
          <span
            className="relative overflow-hidden flex items-center gap-1
            px-2.5 py-1 rounded-full text-[10px] font-black pj
            bg-gradient-to-r from-amber-500 to-orange-400 text-white"
          >
            {/* shimmer sweep on hover */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full
              transition-transform duration-700
              bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
            💎 PRO
          </span>
        )}
        {post.aiTool && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold
            bg-violet-600/90 text-white backdrop-blur-sm pj"
          >
            ✨ AI
          </span>
        )}
        {post.resolution && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
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
                className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500
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
            <span className="flex items-center gap-0.5">
              <Heart size={9} className="text-red-400" />
              {(post.stats?.likesCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5">
              <Eye size={9} className="text-blue-300" />
              {(post.stats?.viewsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
        {/* Caption chỉ ở hero */}
        {pattern.type === 'hero' && post.caption && (
          <p className="text-white/70 text-xs mt-1.5 line-clamp-1 pj font-medium">
            {post.caption}
          </p>
        )}
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

/* Leaderboard row */
const LeaderRow = ({ c, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: 16 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.4 }}
    className="flex items-center justify-between group cursor-pointer py-2"
  >
    <div className="flex items-center gap-4">
      <span className="text-foreground/30 font-black italic text-xl w-7 pj">
        {c.rank}
      </span>
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-500
          flex items-center justify-center text-white text-sm font-black pj border border-[var(--color-border)]"
        >
          {c.avatar}
        </div>
        {c.pro && (
          <span
            className="absolute -bottom-1 -right-1 bg-violet-600 text-[8px] font-black
            px-1.5 py-0.5 rounded-sm text-white pj tracking-wide"
          >
            PRO
          </span>
        )}
      </div>
      <div>
        <div className="font-bold text-sm text-foreground pj">{c.name}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider pj">
          {c.followers} followers
        </div>
      </div>
    </div>
    <button
      className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center
      text-foreground/30 group-hover:text-brand-600 dark:group-hover:text-violet-400 transition-colors"
    >
      <Plus size={14} />
    </button>
  </motion.div>
)

/* ─── Community Gallery Section với Feed Tabs ────────────── */
const FEED_TABS = [
  {
    key: 'new',
    label: '✨ Mới nhất',
    endpoint: '/posts',
    params: { sort: 'new' },
    needAuth: false,
  },
  {
    key: 'hot',
    label: '🔥 Hot',
    endpoint: '/posts',
    params: { sort: 'hot' },
    needAuth: false,
  },
  {
    key: 'following',
    label: '💜 Following',
    endpoint: '/posts/following',
    params: {},
    needAuth: true,
  },
]

const CommunityGallerySection = () => {
  const isLoggedIn = useAuthStore((s) => !!s.user && !!s.accessToken)
  const [activeTab, setActiveTab] = useState('new')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isEmpty, setIsEmpty] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(null)

  const tab = FEED_TABS.find((t) => t.key === activeTab)

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setIsEmpty(false)
      } else setLoadingMore(true)

      try {
        const params = { limit: 12, ...tab.params }
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
      } catch {
        if (reset) setPosts([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, cursor, tab]
  )

  useEffect(() => {
    fetchPosts(true)
  }, [activeTab]) // eslint-disable-line

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
              {FEED_TABS.map(({ key, label, needAuth }) => (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all pj
                    ${
                      activeTab === key
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-foreground/50 hover:text-foreground'
                    }
                    ${needAuth && !isLoggedIn ? 'opacity-60' : ''}
                  `}
                >
                  {label}
                  {needAuth && !isLoggedIn && (
                    <span className="ml-1 text-[9px] opacity-40">🔒</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <GallerySkeleton />
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-3xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💜</span>
              </div>
              <h3 className="text-foreground font-bold text-lg mb-2 pj">
                Chưa follow ai cả
              </h3>
              <p className="text-foreground/50 text-sm max-w-xs mx-auto pj">
                Follow những creator bạn yêu thích để xem ảnh của họ tại đây.
              </p>
              <Link
                to="/search"
                className="mt-5 inline-flex items-center gap-2 btn-primary text-sm"
              >
                Khám phá ngay <ArrowRight size={14} />
              </Link>
            </motion.div>
          ) : posts.length === 0 ? null : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/*
                CARD_PATTERN editorial grid — mỗi card có span cố định
                AnimatePresence initial={false} + KHÔNG có mode="wait"
                → item MỚI fade-in riêng, grid KHÔNG collapse/re-expand
              */}
              <div
                className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                style={{ gridAutoRows: '200px' }}
              >
                <AnimatePresence initial={false}>
                  {posts.map((post, i) => {
                    const p = CARD_PATTERN[i % CARD_PATTERN.length]
                    return (
                      <motion.div
                        key={post._id}
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{
                          duration: 0.45,
                          // Chỉ delay khi batch LOAD MORE (i >= 8), batch đầu vẫn nhanh
                          delay: i < 12 ? i * 0.04 : (i % 6) * 0.06,
                          ease: 'easeOut',
                        }}
                        className={`col-span-1 row-span-1 ${p.col} ${p.row}`}
                      >
                        <CommunityPostCard
                          post={post}
                          index={i}
                          onClick={handleOpenPost}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-12">
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
                </div>
              )}

              {!hasMore && posts.length >= 12 && (
                <p className="text-center text-foreground/30 text-xs mt-10 pj italic">
                  — Đã xem hết {posts.length} ảnh —
                </p>
              )}
            </motion.div>
          )}

          {/* View all link */}
          {!loading && posts.length > 0 && (
            <div className="flex justify-end mt-6">
              <Link
                to="/search"
                className="flex items-center gap-2 text-brand-600 hover:text-brand-500 dark:text-violet-400 dark:hover:text-white font-bold transition-colors group text-sm shrink-0 pj"
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
  const [activeCategory, setActiveCategory] = useState(0)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96])

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
          bg-violet-600/10 blur-[130px] rounded-full"
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
              {[
                'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=500&q=70',
                'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=500&q=70',
                'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&q=70',
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=70',
              ].map((src, i) => (
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
              {[
                'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&q=70',
                'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=500&q=70',
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=70',
                'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=500&q=70',
              ].map((src, i) => (
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
              liquid-glass text-brand-600 dark:text-violet-300 text-[11px] font-bold tracking-[0.2em] uppercase"
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
                <span class="hero-gradient-text inline-block pr-[2px]">
                  đam mê
                </span>
                <motion.span
                  animate={{ scaleX: [0, 1] }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute -bottom-1 left-0 right-0 h-0.5
                    bg-gradient-to-r from-violet-400 to-blue-400 origin-left block"
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
                  bg-gradient-to-r from-violet-600 to-blue-600
                  shadow-[0_0_50px_rgba(124,58,237,0.3)]
                  hover:shadow-[0_0_70px_rgba(124,58,237,0.5)]
                  transition-shadow duration-300 flex items-center gap-2 justify-center"
              >
                Bắt đầu ngay <ArrowRight size={18} />
              </motion.button>
            </Link>
            <Link to="/search">
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
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85"
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
                <TrendingUp size={14} className="text-violet-400" />
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
            {STATS.map(({ value, label, color }, i) => (
              <div
                key={label}
                className="text-center px-6 py-2 group cursor-default"
              >
                <p
                  className="text-3xl md:text-4xl font-black pj mb-1.5 transition-transform
                  duration-300 group-hover:scale-110"
                  style={{ color, textShadow: `0 0 20px ${color}50` }}
                >
                  {value}
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
              <p className="text-brand-600 dark:text-violet-400 text-[11px] font-bold tracking-widest uppercase mb-3 pj">
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
              to="/search"
              className="flex items-center gap-2 text-brand-600 hover:text-brand-500 dark:text-violet-400 dark:hover:text-white
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
            {CATEGORIES.map((cat, i) => (
              <CategoryCard key={cat.label} {...cat} delay={i * 0.07} />
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
                className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center
                text-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center
                text-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* 3-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRENDING_COMMUNITY.map((item, i) => (
              <TrendingCard key={item.title} item={item} delay={i * 0.1} />
            ))}
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
                  ✨ Mới nhất
                </p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight pj">
                  Bộ sưu tập mới
                </h2>
              </div>
              <span className="text-foreground/45 dark:text-white/30 text-sm font-bold pj">
                Cập nhật 5 phút trước
              </span>
            </motion.div>

            <div className="columns-2 gap-5">
              {MASONRY_DROPS.map((item, i) => (
                <MasonryCard key={i} item={item} index={i} />
              ))}
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
                <h2 className="text-2xl font-black tracking-tight mb-8 pj">
                  Bảng xếp hạng
                </h2>
                <div className="space-y-4 divide-y divide-[var(--color-border)]">
                  {LEADERBOARD.map((c, i) => (
                    <div key={c.rank} className={i > 0 ? 'pt-4' : ''}>
                      <LeaderRow c={c} delay={i * 0.08} />
                    </div>
                  ))}
                </div>
                <Link to="/creators">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-8 py-4 liquid-glass rounded-full text-sm font-bold pj
                      text-foreground/60 hover:text-foreground dark:text-white/60 dark:hover:text-white transition-all"
                  >
                    Xem tất cả creator
                  </motion.button>
                </Link>
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
          w-[60vw] h-[60vw] bg-violet-700/12 blur-[150px] orb-float-1"
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
              bg-violet-600/12 rounded-full blur-[100px] pointer-events-none"
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
                  'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 100%)',
              }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              {/* Left text */}
              <div className="max-w-xl text-center lg:text-left">
                <p className="text-brand-600 dark:text-violet-400 text-[11px] font-bold tracking-widest uppercase mb-4 pj">
                  🚀 Creator Program
                </p>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter mb-6 leading-tight pj">
                  Bạn là nhà sáng tạo nghệ thuật AI?
                </h2>
                <p className="text-foreground/70 text-base mb-8 leading-relaxed pj">
                  Gia nhập đội ngũ PICSPY Creators ngay. Hệ thống Coin minh bạch
                  giúp bạn nhận lại giá trị xứng đáng từ mỗi lượt yêu thích.
                </p>

                {/* Coin equation */}
                <div className="flex items-center justify-center lg:justify-start gap-5 mb-8">
                  <div className="liquid-glass rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-foreground pj">
                      1,000
                    </div>
                    <div className="text-[10px] font-bold uppercase text-foreground/50 pj">
                      Lượt thích
                    </div>
                  </div>
                  <div className="text-foreground/60 text-2xl font-black pj">
                    =
                  </div>
                  <div className="liquid-glass rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black hero-gradient-text pj">
                      5 Xu
                    </div>
                    <div className="text-[10px] font-bold uppercase text-foreground/50 pj">
                      Coin
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: PRO card */}
              <div
                className="liquid-glass rounded-2xl p-8 max-w-sm w-full"
                style={{ borderColor: 'var(--cta-border)' }}
              >
                <div className="text-center mb-7">
                  <div
                    className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center
                    mx-auto mb-4 border border-violet-500/20"
                  >
                    <Star size={26} className="text-amber-300" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground pj">
                    Trở thành Creator PRO
                  </h3>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Tỷ lệ chuyển đổi Xu cao hơn',
                    'Huy hiệu PRO xác minh',
                    'Ưu tiên hiển thị Trending',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-foreground/75 pj"
                    >
                      <div
                        className="w-5 h-5 rounded-full bg-brand-500/10 dark:bg-violet-500/20 border border-brand-500/20 dark:border-violet-400/30
                        flex items-center justify-center shrink-0"
                      >
                        <div className="w-2 h-2 rounded-full bg-brand-600 dark:bg-violet-300" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 font-black rounded-full pj
                      bg-gradient-to-r from-violet-600 to-blue-600 text-white
                      shadow-[0_0_30px_rgba(124,58,237,0.3)]
                      hover:shadow-[0_0_50px_rgba(124,58,237,0.45)]
                      transition-shadow duration-300"
                  >
                    Đăng ký ngay
                  </motion.button>
                </Link>
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
                <ContentLoader size="sm" />
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
                  'Bộ sưu tập mới',
                  'Creator PRO',
                ],
              },
              {
                title: 'Nền tảng',
                links: ['Về PICSPY', 'Điều khoản', 'Bảo mật', 'Hướng dẫn Coin'],
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
                        className="hover:text-brand-600 dark:hover:text-violet-400 transition-colors pj"
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
    </div>
  )
}

export default HomePage
