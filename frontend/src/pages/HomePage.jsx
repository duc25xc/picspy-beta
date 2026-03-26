import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Camera, TrendingUp, Users, Zap, ArrowRight, Sparkles, Download, Heart } from 'lucide-react'

// Dữ liệu placeholder cho demo — Phase 2 sẽ kết nối API thật
const DEMO_POSTS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', likes: 1240, cat: '🌿 Nature' },
  { id: 2, img: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400', likes: 890, cat: '🚀 Space' },
  { id: 3, img: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400', likes: 2100, cat: '🌈 Gradient' },
  { id: 4, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', likes: 745, cat: '🌃 City' },
  { id: 5, img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400', likes: 1560, cat: '✨ Minimal' },
  { id: 6, img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400', likes: 3200, cat: '🚀 Space' },
]

const STATS = [
  { icon: Camera, label: 'Wallpapers', value: '50K+' },
  { icon: Users, label: 'Creator', value: '8K+' },
  { icon: Download, label: 'Downloads', value: '1M+' },
  { icon: Heart, label: 'Lượt thích', value: '5M+' },
]

const PostCard = ({ post, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className="group relative overflow-hidden rounded-2xl bg-surface-50 cursor-pointer"
  >
    <div className="relative overflow-hidden">
      <img
        src={post.img}
        alt="wallpaper"
        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{post.cat}</span>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <Heart size={14} className="text-red-400" />
            {post.likes.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
)

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="page-container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/60 border border-brand-700/50 text-brand-300 text-sm font-medium mb-6">
              <Sparkles size={14} />
              Nền tảng wallpaper AI-powered #1 Việt Nam
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              Chia sẻ <span className="gradient-text">sáng tạo</span>
              <br />
              Kiếm tiền từ{' '}
              <span className="relative">
                <span className="gradient-text">đam mê</span>
                <motion.div
                  animate={{ scaleX: [0, 1] }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-brand origin-left"
                />
              </span>
            </h1>

            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload wallpaper AI-generated hoặc ảnh chụp của bạn, nhận xu từ lượt like &amp; download,
              rút về MoMo/banking khi đạt threshold.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5">
                Bắt đầu ngay
                <ArrowRight size={18} />
              </Link>
              <Link to="/search" className="btn-secondary text-base px-8 py-3.5">
                Khám phá wallpaper
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="px-4 py-8 border-y border-white/5">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ icon: Icon, label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="card p-5 text-center"
              >
                <Icon size={24} className="text-brand-400 mx-auto mb-2" />
                <p className="text-2xl font-display font-bold gradient-text">{value}</p>
                <p className="text-white/50 text-sm">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRENDING POSTS ===== */}
      <section className="px-4 py-10">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-400" />
                Trending hôm nay
              </h2>
              <p className="text-white/40 text-sm mt-0.5">Các wallpaper được yêu thích nhất</p>
            </div>
            <Link to="/search?feed=hot" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            {DEMO_POSTS.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA — Become Creator ===== */}
      <section className="px-4 py-12">
        <div className="page-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-surface-50 p-8 md:p-12 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/30 via-transparent to-transparent" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={28} className="text-brand-300" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
                Bắt đầu kiếm tiền từ hôm nay
              </h2>
              <p className="text-white/60 mb-6 max-w-lg mx-auto">
                Mỗi lượt like = <strong className="text-brand-300">5 xu</strong> •
                Mỗi download = <strong className="text-brand-300">10–200 xu</strong> •
                Rút về MoMo khi đạt <strong className="text-brand-300">100.000 xu</strong>
              </p>
              <Link to="/register" className="btn-primary inline-flex text-base px-8">
                Tạo tài khoản miễn phí
                <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
