import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/auth.store'

/* ─── Font + CSS đồng bộ với HomePage ────────────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

    .pj { font-family: 'Plus Jakarta Sans', sans-serif !important; }

    /* Liquid Glass core — dùng chính xác class như HomePage */
    .lg-glass {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.09);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.12),
        0 8px 32px rgba(0,0,0,0.35),
        0 0 0 0.5px rgba(255,255,255,0.04);
    }

    .lg-glass-strong {
      background: rgba(22,21,26,0.65);
      backdrop-filter: blur(48px) saturate(200%);
      -webkit-backdrop-filter: blur(48px) saturate(200%);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.14),
        inset 0 -1px 0 rgba(0,0,0,0.3),
        0 32px 80px rgba(0,0,0,0.5),
        0 0 0 0.5px rgba(255,255,255,0.05);
    }

    /* Gradient text — giống homepage */
    .hero-gradient-text {
      background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Input glass style */
    .auth-input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px;
      color: rgba(255,255,255,0.9);
      font-size: 15px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 14px 14px 14px 48px;
      outline: none;
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
      min-height: 52px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .auth-input::placeholder {
      color: rgba(255,255,255,0.25);
    }
    .auth-input:focus {
      background: rgba(124,58,237,0.08);
      border-color: rgba(124,58,237,0.5);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 0 0 3px rgba(124,58,237,0.15);
    }
    .auth-input.pr-input {
      padding-right: 48px;
    }
    .auth-input.input-error {
      border-color: rgba(239,68,68,0.5);
      box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
    }

    /* Floating orbs */
    @keyframes float-slow {
      0%,100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-28px) scale(1.04); }
    }
    @keyframes float-medium {
      0%,100% { transform: translateY(0) rotate(0deg); }
      33% { transform: translateY(-18px) rotate(4deg); }
      66% { transform: translateY(10px) rotate(-3deg); }
    }
    @keyframes drift {
      0%,100% { transform: translate(0,0) scale(1); }
      50% { transform: translate(12px,-20px) scale(1.06); }
    }
    .orb-a { animation: float-slow 9s ease-in-out infinite; }
    .orb-b { animation: float-medium 12s ease-in-out infinite; }
    .orb-c { animation: drift 16s ease-in-out infinite; }

    /* Background grid — giống homepage */
    .auth-grid {
      background-image:
        linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
        linear-gradient(90deg,rgba(124,58,237,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    /* Floating cards on left */
    @keyframes floatCard {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    /* Noise overlay */
    .noise-overlay::after {
      content:'';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      border-radius: inherit;
    }
  `}</style>
)

/* ── Hình ảnh cho left panel ── */
const SHOWCASE_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=85',
    label: 'Neon Dreamscape',
    tag: 'Featured',
    delay: 0,
  },
  {
    src: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=85',
    label: 'Neo Tokyo',
    tag: null,
    delay: 0.4,
  },
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=85',
    label: 'Silent Peaks',
    tag: null,
    delay: 0.8,
  },
  {
    src: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=600&q=85',
    label: 'Cosmic Silk',
    tag: 'Hot',
    delay: 1.2,
  },
]

/* ── Input field tái sử dụng ── */
const AuthInput = ({ icon: Icon, rightSlot, error, ...inputProps }) => (
  <div className="relative">
    <Icon
      size={17}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10"
      style={{ transition: 'color 0.25s' }}
    />
    <input
      className={`auth-input pr-input pj ${error ? 'input-error' : ''}`}
      {...inputProps}
    />
    {rightSlot}
  </div>
)

/* ─────────────────────────── Main ─────────────────────────── */
const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(form.email, form.password)
    if (result.success) {
      toast.success('Chào mừng trở lại! 🎉')
      navigate(from, { replace: true })
    } else {
      toast.error(result.message)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/v1'}/auth/google`
  }

  return (
    <div
      className="min-h-screen flex overflow-x-hidden auth-grid pj"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#0d0d12' }}
    >
      <FontLoader />

      {/* ══════════════════════════════════════
          LEFT PANEL — Visual Showcase (desktop)
      ══════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden"
        style={{ background: 'rgba(10,9,14,0.98)' }}
      >
        {/* Ambient orbs */}
        <div className="orb-a absolute top-[-8%] left-[-6%] w-[55%] h-[55%] rounded-full pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.12)', filter: 'blur(120px)' }} />
        <div className="orb-b absolute bottom-[-10%] right-[-8%] w-[45%] h-[45%] rounded-full pointer-events-none"
          style={{ background: 'rgba(59,130,246,0.10)', filter: 'blur(110px)' }} />
        <div className="orb-c absolute top-[35%] left-[55%] w-[25%] h-[25%] rounded-full pointer-events-none"
          style={{ background: 'rgba(217,70,239,0.07)', filter: 'blur(90px)' }} />

        {/* Image cards masonry */}
        <div className="relative z-10 w-full max-w-lg px-10 grid grid-cols-2 gap-5">
          {/* Col 1 — offset top */}
          <div className="space-y-5 pt-14">
            {SHOWCASE_IMAGES.slice(0, 2).map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay + 0.3, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                style={{ animation: `floatCard ${5 + i * 1.5}s ease-in-out infinite`, animationDelay: `${i * 0.8}s` }}
                className="lg-glass noise-overlay rounded-2xl overflow-hidden group cursor-pointer
                  transition-all duration-500 hover:-translate-y-2
                  hover:shadow-[0_20px_60px_rgba(124,58,237,0.2)]"
              >
                <div className={`overflow-hidden ${i === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}>
                  <img
                    src={item.src} alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3">
                  {item.tag && (
                    <span className="text-[9px] uppercase tracking-widest font-black text-violet-400 pj">
                      {item.tag}
                    </span>
                  )}
                  <p className="text-sm font-bold text-white/80 pj mt-0.5">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Col 2 — offset bottom */}
          <div className="space-y-5 pb-14">
            {SHOWCASE_IMAGES.slice(2).map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay + 0.3, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                style={{ animation: `floatCard ${6 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 1.2}s` }}
                className="lg-glass noise-overlay rounded-2xl overflow-hidden group cursor-pointer
                  transition-all duration-500 hover:-translate-y-2
                  hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)]"
              >
                <div className={`overflow-hidden ${i === 0 ? 'aspect-square' : 'aspect-[4/5]'}`}>
                  <img
                    src={item.src} alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3">
                  {item.tag && (
                    <span className="text-[9px] uppercase tracking-widest font-black text-blue-400 pj">
                      {item.tag}
                    </span>
                  )}
                  <p className="text-sm font-bold text-white/80 pj mt-0.5">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Branding bottom-left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-10 left-10 z-20"
        >
          <h1 className="text-5xl font-black tracking-tighter hero-gradient-text pj">PICSPY</h1>
          <p className="text-white/30 text-sm mt-1.5 max-w-xs font-medium pj">
            Curate your visual universe with AI-powered precision.
          </p>
        </motion.div>
      </motion.section>

      {/* ══════════════════════════════════════
          RIGHT PANEL — Login Form
      ══════════════════════════════════════ */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle ambient glow behind form */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.06)', filter: 'blur(100px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:hidden mb-10"
          >
            <h1 className="text-4xl font-black tracking-tighter hero-gradient-text pj">PICSPY</h1>
            <p className="text-white/30 text-sm mt-1 pj">Visual curator platform</p>
          </motion.div>

          {/* Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 lg-glass
                text-violet-300 text-[10px] font-bold tracking-[0.18em] uppercase"
            >
              <Sparkles size={10} className="animate-pulse" />
              Đăng nhập tài khoản
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black tracking-tight text-white pj"
            >
              Chào mừng<br />
              <span className="hero-gradient-text">trở lại! 👋</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="text-white/35 mt-2 text-sm pj"
            >
              Nhập thông tin để tiếp tục hành trình creator của bạn.
            </motion.p>
          </div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="lg-glass-strong noise-overlay rounded-3xl p-8 space-y-6"
          >
            {/* Google login */}
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl
                transition-all duration-300 font-semibold text-sm text-white/80 pj"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: '52px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Tiếp tục với Google
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 pj">hoặc email</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 pj ml-1">
                  Email
                </label>
                <AuthInput
                  icon={Mail}
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 mx-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-violet-400/80 pj">
                    Mật khẩu
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[10px] font-bold text-white/30 hover:text-violet-400 transition-colors pj"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <AuthInput
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors z-10"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white pj
                  flex items-center justify-center gap-2 mt-2"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  minHeight: '52px',
                  boxShadow: '0 10px 30px -5px rgba(124,58,237,0.4)',
                }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>ĐĂNG NHẬP <ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Footer link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-white/30 mt-6 text-sm pj"
          >
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Đăng ký ngay
            </Link>
          </motion.p>

          {/* Terms */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-5 mt-8"
          >
            {['Điều khoản', 'Quyền riêng tư', 'Hỗ trợ'].map((t) => (
              <Link
                key={t}
                to="#"
                className="text-[10px] font-bold uppercase tracking-widest text-white/15 hover:text-violet-400 transition-colors pj"
              >
                {t}
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}

export default LoginPage
