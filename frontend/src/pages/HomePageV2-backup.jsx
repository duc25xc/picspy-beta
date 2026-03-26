import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, TrendingUp, Download, Heart, Sparkles, Users,
  Camera, Star, Zap, Globe
} from 'lucide-react'

// ─── Demo Data ───────────────────────────────────────────
const STATS = [
  { value: '50K+', label: 'Wallpapers', color: 'text-violet-300' },
  { value: '12M',  label: 'Downloads',  color: 'text-blue-300' },
  { value: '8.5K', label: 'Creators',   color: 'text-amber-300' },
  { value: '2M+',  label: 'Xu đã trả',  color: 'text-violet-400' },
]

const FEATURED_POST = {
  img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1400&q=90',
  title: 'Neo-Saigon 2077',
  author: '@minh_creative',
  likes: 4200,
  category: '🌃 City',
}

const SECONDARY_POSTS = [
  {
    img: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&q=80',
    title: 'Liquid Textures Vol.1',
    author: '@liquid_dreams',
    badge: { label: '💎 Premium', cls: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
    likes: 1890,
  },
  {
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    title: 'Silk Dreamscapes',
    author: '@silk_art',
    badge: { label: '✨ Free', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
    likes: 2340,
  },
]

const MASONRY_EXTRAS = [
  { img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80', h: 'tall',  likes: 3200, cat: '🚀 Space' },
  { img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=80', h: 'short', likes: 890,  cat: '🌿 Nature' },
  { img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80', h: 'tall',  likes: 1780, cat: '🌿 Nature' },
  { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', h: 'short', likes: 745,  cat: '🌃 City' },
]

const TOP_CREATORS = [
  { name: 'Minh Creative', handle: '@minh_creative', cnt: '127 ảnh', avatar: 'MC' },
  { name: 'Silk Art',       handle: '@silk_art',       cnt: '89 ảnh',  avatar: 'SA' },
  { name: 'Liquid Dreams',  handle: '@liquid_dreams',  cnt: '203 ảnh', avatar: 'LD' },
]

// ─── Sub-components ──────────────────────────────────────

/** Liquid Glass card dùng backdrop-blur + white/5 */
const GlassCard = ({ className = '', children, ...props }) => (
  <div
    className={`bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-2xl
      hover:bg-white/[0.07] transition-all duration-500 ${className}`}
    {...props}
  >
    {children}
  </div>
)

/** Floating ambient orb */
const Orb = ({ className }) => (
  <div className={`absolute rounded-full pointer-events-none blur-[120px] ${className}`} />
)

// ─── Page ────────────────────────────────────────────────
const HomePageV2 = () => {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY    = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ══════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 pt-16 pb-0 overflow-hidden"
      >
        {/* Ambient orbs */}
        <Orb className="top-[-12%] left-[-8%]  w-[45vw] h-[45vw] bg-violet-600/12" />
        <Orb className="bottom-[-8%] right-[-8%] w-[38vw] h-[38vw] bg-blue-500/10" />
        <Orb className="top-[40%] left-[55%]  w-[25vw] h-[25vw] bg-fuchsia-600/8" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-5xl mx-auto relative z-10"
        >
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full
              bg-white/5 border border-white/10 backdrop-blur-xl
              text-violet-300 text-xs font-bold tracking-[0.18em] uppercase mb-8"
          >
            <Sparkles size={12} className="animate-pulse" />
            Nền tảng wallpaper AI-powered #1 Việt Nam
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black
              font-display tracking-tighter leading-[0.87] mb-8"
          >
            <span className="block text-white">Chia sẻ sáng tạo</span>
            <span className="block bg-gradient-to-r from-violet-400 via-purple-300 to-blue-400
              bg-clip-text text-transparent">
              Kiếm tiền từ đam mê
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xl mx-auto text-white/50 text-lg md:text-xl
              font-light leading-relaxed mb-12"
          >
            Upload ảnh, nhận xu từ like &amp; download, rút về MoMo ngay khi đạt mốc.
            Biến mỗi pixel thành giá trị thực.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="relative px-10 py-4 rounded-full font-bold text-white text-base
                  bg-gradient-to-r from-violet-600 to-blue-600
                  shadow-[0_0_40px_rgba(124,58,237,0.25)]
                  hover:shadow-[0_0_60px_rgba(124,58,237,0.45)]
                  transition-shadow duration-300 flex items-center gap-2"
              >
                Bắt đầu ngay <ArrowRight size={18} />
              </motion.button>
            </Link>
            <Link to="/search">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-10 py-4 border border-white/12 bg-white/5 backdrop-blur-xl
                  rounded-full font-bold text-white/80 hover:bg-white/10
                  hover:text-white transition-all duration-300"
              >
                Khám phá Gallery
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Image Preview — curved top card như template */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 w-full max-w-6xl mx-auto px-4 relative z-10"
        >
          <div className="relative rounded-t-[2.5rem] overflow-hidden border-t border-x border-white/15
            shadow-[0_-20px_80px_rgba(124,58,237,0.15)]">
            {/* Fade bottom overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10" />
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85"
              alt="PICSPY hero preview"
              className="w-full h-[420px] md:h-[540px] object-cover object-center opacity-55"
              loading="eager"
            />
            {/* Floating label trên ảnh */}
            <div className="absolute top-6 left-6 z-20">
              <GlassCard className="px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-white/80">50K+ wallpaper đang chờ bạn</span>
              </GlassCard>
            </div>
            <div className="absolute top-6 right-6 z-20">
              <GlassCard className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-white/80">
                <TrendingUp size={14} className="text-violet-400" />
                +340 ảnh hôm nay
              </GlassCard>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          STATS STRIP — Liquid Glass
      ══════════════════════════════════════ */}
      <section className="py-14 bg-white/[0.02] backdrop-blur-sm border-y border-white/5">
        <div className="page-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(({ value, label, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-7 text-center group cursor-default">
                  <p className={`text-4xl font-black font-display tracking-tight ${color} mb-1
                    group-hover:scale-105 transition-transform duration-300`}>
                    {value}
                  </p>
                  <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                    {label}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BENTO TRENDING GALLERY
      ══════════════════════════════════════ */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6"
          >
            <div>
              <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-3">
                🔥 Trending tuần này
              </p>
              <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight mb-3">
                Xu hướng cộng đồng
              </h2>
              <p className="text-white/45 max-w-md text-base leading-relaxed">
                Những tác phẩm được yêu thích nhất từ các creator hàng đầu trên toàn quốc.
              </p>
            </div>
            <Link
              to="/search?feed=hot"
              className="flex items-center gap-2 text-violet-400 hover:text-white
                font-bold transition-colors group text-sm shrink-0"
            >
              Xem tất cả
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Bento Grid: large feature (col-span 2) + 2 vertical cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* ── Large Feature Card ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-2 group relative rounded-[1.5rem] overflow-hidden
                border border-white/10 bg-surface-50 cursor-pointer
                hover:scale-[1.015] transition-all duration-700
                shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-10" />
              <img
                src={FEATURED_POST.img}
                alt={FEATURED_POST.title}
                className="w-full h-[540px] md:h-[600px] object-cover
                  group-hover:scale-105 transition-transform duration-1000"
                loading="lazy"
              />
              {/* Category badge */}
              <div className="absolute top-5 left-5 z-20">
                <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md
                  border border-white/15 text-xs font-semibold text-white/90">
                  {FEATURED_POST.category}
                </span>
              </div>
              {/* Bottom info — liquid glass footer */}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-6
                bg-white/5 backdrop-blur-xl border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold font-display mb-0.5 text-white">
                      {FEATURED_POST.title}
                    </h3>
                    <p className="text-white/50 text-sm">{FEATURED_POST.author}</p>
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-11 h-11 rounded-full bg-white/10 border border-white/15
                        flex items-center justify-center hover:bg-red-500/30
                        hover:border-red-400/40 transition-all duration-200"
                    >
                      <Heart size={18} className="text-white" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-11 h-11 rounded-full
                        bg-gradient-to-br from-violet-600 to-blue-600
                        flex items-center justify-center
                        shadow-[0_0_20px_rgba(124,58,237,0.4)]"
                    >
                      <Download size={18} className="text-white" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Right column: 2 secondary cards ── */}
            <div className="flex flex-col gap-5">
              {SECONDARY_POSTS.map((post, i) => (
                <motion.div
                  key={post.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="group relative rounded-[1.5rem] overflow-hidden
                    border border-white/10 bg-surface-50 cursor-pointer
                    hover:scale-[1.02] transition-all duration-500 flex-1
                    shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                >
                  <img
                    src={post.img}
                    alt={post.title}
                    className="w-full h-[230px] object-cover
                      group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Hover overlay — liquid glass */}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    flex flex-col items-center justify-center gap-3 px-5 text-center">
                    <p className="font-bold text-base text-white">{post.title}</p>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${post.badge.cls}`}>
                      {post.badge.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-white/60 text-sm">
                      <Heart size={13} className="text-red-400" />
                      {post.likes.toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Masonry Extra Row ── */}
          <div className="mt-5 columns-2 md:columns-4 gap-5 space-y-5">
            {MASONRY_EXTRAS.map((post, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`group relative overflow-hidden rounded-2xl cursor-pointer
                  border border-white/10 break-inside-avoid
                  hover:scale-[1.02] transition-all duration-500
                  ${post.h === 'tall' ? 'aspect-[3/4]' : 'aspect-square'}`}
              >
                <img
                  src={post.img}
                  alt=""
                  className="w-full h-full object-cover
                    group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent
                  to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3
                  translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/80 bg-black/40
                      backdrop-blur-md rounded-full px-2.5 py-1">{post.cat}</span>
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Heart size={12} className="text-red-400" />
                      {post.likes.toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TOP CREATORS STRIP
      ══════════════════════════════════════ */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-2">
                ✨ Creator nổi bật
              </p>
              <h2 className="text-2xl font-black font-display tracking-tight">
                Những nghệ sĩ hàng đầu
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {TOP_CREATORS.map((c, i) => (
                <motion.div
                  key={c.handle}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/profile/${c.handle.replace('@', '')}`}>
                    <GlassCard className="flex items-center gap-3 p-4 cursor-pointer hover:scale-[1.03] transition-transform">
                      {/* Avatar initials */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600
                        flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {c.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-white/40">{c.cnt}</p>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA SECTION — Glass Border Gradient
      ══════════════════════════════════════ */}
      <section className="py-32 px-4 relative overflow-hidden">
        <Orb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15" />

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto relative"
        >
          {/* Glass border gradient container */}
          <div className="relative p-[1px] rounded-[2.5rem] overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 100%)' }}>
            <div className="bg-surface-50/60 backdrop-blur-2xl rounded-[2.5rem] p-12 md:p-20 text-center relative z-10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.12)_0%,transparent_70%)] rounded-[2.5rem]" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15
                  flex items-center justify-center mx-auto mb-6">
                  <Zap size={26} className="text-violet-300" />
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display
                  tracking-tighter mb-6 text-white">
                  Sẵn sàng để tỏa sáng?
                </h2>
                <p className="text-white/50 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
                  Tham gia cùng hàng ngàn creator đang xây dựng tương lai nghệ thuật số
                  tại Việt Nam. Mỗi pixel — một giá trị thực.
                </p>

                {/* Monetization pills */}
                <div className="flex flex-wrap justify-center gap-3 mb-10 text-sm">
                  {[
                    { icon: Heart,    text: '1K like = 5 xu',      cls: 'bg-red-500/15 text-red-300 border-red-500/25' },
                    { icon: Download, text: '1 download = 10–200 xu', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
                    { icon: Globe,    text: 'Rút về MoMo',           cls: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
                  ].map(({ icon: Icon, text, cls }) => (
                    <span key={text} className={`flex items-center gap-2 px-4 py-2 rounded-full border font-semibold ${cls}`}>
                      <Icon size={14} /> {text}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/register">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-12 py-4 bg-white text-black font-black rounded-full
                        text-base hover:bg-violet-100 transition-all duration-300
                        shadow-xl flex items-center gap-2"
                    >
                      Tạo tài khoản miễn phí <ArrowRight size={18} />
                    </motion.button>
                  </Link>
                  <Link to="/search"
                    className="px-10 py-4 border border-white/20 hover:border-white/40
                      rounded-full font-bold text-white/70 hover:text-white transition-all">
                    Tìm hiểu thêm
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="py-20 px-4 border-t border-white/5 bg-black/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600
                flex items-center justify-center shadow-lg shadow-violet-900/50">
                <span className="text-white text-base">👁</span>
              </div>
              <span className="text-2xl font-black tracking-tight font-display
                bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                PICSPY
              </span>
            </div>
            <p className="text-white/40 max-w-xs mb-8 leading-relaxed text-sm">
              Cổng chia sẻ wallpaper và tài nguyên thiết kế lớn nhất Việt Nam.
              Nơi kết nối sáng tạo với giá trị thương mại.
            </p>
            <div className="flex gap-5 text-sm text-white/40">
              {['Facebook', 'Instagram', 'TikTok', 'Dribbble'].map((s) => (
                <a key={s} href="#" className="hover:text-violet-400 transition-colors">{s}</a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-bold mb-5 text-white text-sm uppercase tracking-wider">Khám phá</h4>
            <ul className="space-y-3 text-sm text-white/40">
              {['Thư viện ảnh', 'Creator nổi bật', 'Cuộc thi sáng tạo', 'Blog nghệ thuật'].map((t) => (
                <li key={t}><a href="#" className="hover:text-white transition-colors">{t}</a></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold mb-5 text-white text-sm uppercase tracking-wider">Hỗ trợ</h4>
            <ul className="space-y-3 text-sm text-white/40">
              {['Trung tâm trợ giúp', 'Điều khoản dịch vụ', 'Chính sách bảo mật', 'Liên hệ'].map((t) => (
                <li key={t}><a href="#" className="hover:text-white transition-colors">{t}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5
          flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">© 2026 PICSPY Ecosystem. All rights reserved.</p>
          <p className="text-white/30 text-sm flex items-center gap-1">
            Made with <Heart size={12} className="text-violet-400 fill-violet-400 mx-0.5" /> in Vietnam
          </p>
        </div>
      </footer>

    </div>
  )
}

export default HomePageV2
