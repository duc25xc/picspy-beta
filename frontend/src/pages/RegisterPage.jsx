import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, AtSign, CheckCircle2,
  ArrowRight, Sparkles, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/auth.store'

/* ─── CSS đồng bộ with LoginPage & HomePage ──────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

    .pj { font-family: 'Plus Jakarta Sans', sans-serif !important; }

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
        0 32px 80px rgba(0,0,0,0.5);
    }

    .hero-gradient-text {
      background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

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
    .auth-input::placeholder { color: rgba(255,255,255,0.22); }
    .auth-input:focus {
      background: rgba(124,58,237,0.08);
      border-color: rgba(124,58,237,0.5);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 0 0 3px rgba(124,58,237,0.15);
    }
    .auth-input.pr-input { padding-right: 48px; }
    .auth-input.input-error {
      border-color: rgba(239,68,68,0.5) !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important;
    }

    @keyframes float-slow {
      0%,100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-24px) scale(1.04); }
    }
    @keyframes float-medium {
      0%,100% { transform: translateY(0) rotate(0deg); }
      33% { transform: translateY(-16px) rotate(3deg); }
      66% { transform: translateY(8px) rotate(-2deg); }
    }
    @keyframes drift {
      0%,100% { transform: translate(0,0) scale(1); }
      50% { transform: translate(10px,-18px) scale(1.05); }
    }
    .orb-a { animation: float-slow 9s ease-in-out infinite; }
    .orb-b { animation: float-medium 12s ease-in-out infinite; }
    .orb-c { animation: drift 15s ease-in-out infinite; }

    .auth-grid {
      background-image:
        linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
        linear-gradient(90deg,rgba(124,58,237,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    .noise-overlay::after {
      content:'';
      position:absolute;
      inset:0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      border-radius: inherit;
    }

    /* Strength bar transition */
    .strength-bar {
      height: 3px;
      border-radius: 9999px;
      flex: 1;
      transition: background-color 0.4s ease, transform 0.3s ease;
    }

    /* Scrollbar cho form dài trên mobile */
    .auth-scroll::-webkit-scrollbar { display: none; }
    .auth-scroll { -ms-overflow-style: none; scrollbar-width: none; }

    /* Success checkmark pulse */
    @keyframes checkPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
      50%       { box-shadow: 0 0 0 20px rgba(52,211,153,0); }
    }
    .check-pulse { animation: checkPulse 2s ease-in-out infinite; }
  `}</style>
)

/* ─── Perks hiển thị trên left panel ─────────────────────── */
const PERKS = [
  { icon: '🎨', title: 'Upload không giới hạn', sub: 'Chia sẻ wallpaper chất lượng cao' },
  { icon: '💰', title: 'Kiếm Xu từ tác phẩm', sub: 'Mỗi lượt tải = doanh thu thực' },
  { icon: '🌐', title: 'Cộng đồng 50K+ creator', sub: 'Kết nối với nghệ sĩ toàn quốc' },
  { icon: '⚡', title: 'AI-Powered tagging', sub: 'Tự động phân loại siêu chính xác' },
]

/* ─── Input field component ───────────────────────────────── */
const AuthInput = ({ icon: Icon, rightSlot, error, ...inputProps }) => (
  <div className="relative">
    <Icon
      size={17}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10"
    />
    <input
      className={`auth-input ${rightSlot ? 'pr-input' : ''} ${error ? 'input-error' : ''} pj`}
      {...inputProps}
    />
    {rightSlot}
  </div>
)

/* ─── Password strength ───────────────────────────────────── */
const getStrength = (pass) => {
  if (!pass) return 0
  let s = 0
  if (pass.length >= 8)         s++
  if (/[A-Z]/.test(pass))       s++
  if (/[0-9]/.test(pass))       s++
  if (/[^A-Za-z0-9]/.test(pass)) s++
  return s
}

const STRENGTH_META = [
  null,
  { label: 'Yếu',      color: '#ef4444', bg: '#ef444440' },
  { label: 'Trung bình', color: '#f59e0b', bg: '#f59e0b40' },
  { label: 'Khá',      color: '#a78bfa', bg: '#a78bfa40' },
  { label: 'Mạnh 💪',  color: '#34d399', bg: '#34d39940' },
]

/* ═══════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════ */
const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [success, setSuccess] = useState(false)
  const { register, isLoading } = useAuthStore()

  const strength  = getStrength(form.password)
  const meta      = STRENGTH_META[strength]
  const mismatch  = form.confirm && form.password !== form.confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mismatch) { toast.error('Mật khẩu xác nhận không khớp'); return }
    const result = await register(form.username, form.email, form.password)
    if (result.success) setSuccess(true)
    else toast.error(result.message)
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 auth-grid pj"
        style={{ background: '#0d0d12', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <FontLoader />
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="lg-glass-strong noise-overlay rounded-3xl p-10 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 check-pulse"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            <CheckCircle2 size={40} style={{ color: '#34d399' }} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-3xl font-black tracking-tight text-white pj mb-3"
          >
            Đăng ký thành công! 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-white/40 text-sm pj leading-relaxed mb-8"
          >
            Chúng tôi đã gửi link kích hoạt đến{' '}
            <span className="text-violet-400 font-bold">{form.email}</span>.
            <br />Vui lòng kiểm tra hộp thư để hoàn tất đăng ký.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm text-white pj"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                boxShadow: '0 10px 30px -5px rgba(124,58,237,0.4)',
              }}
            >
              Đến trang đăng nhập <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  /* ── Main form ── */
  return (
    <div
      className="min-h-screen flex overflow-x-hidden auth-grid pj"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#0d0d12' }}
    >
      <FontLoader />

      {/* ══ LEFT PANEL — Perks (desktop) ══ */}
      <motion.section
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="hidden lg:flex flex-1 relative flex-col items-center justify-center overflow-hidden px-12"
        style={{ background: 'rgba(10,9,14,0.98)' }}
      >
        {/* Orbs */}
        <div className="orb-a absolute top-[-8%] left-[-6%] w-[50%] h-[50%] rounded-full pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.12)', filter: 'blur(120px)' }} />
        <div className="orb-b absolute bottom-[-10%] right-[-8%] w-[45%] h-[45%] rounded-full pointer-events-none"
          style={{ background: 'rgba(52,211,153,0.08)', filter: 'blur(110px)' }} />
        <div className="orb-c absolute top-[40%] left-[60%] w-[22%] h-[22%] rounded-full pointer-events-none"
          style={{ background: 'rgba(217,70,239,0.07)', filter: 'blur(90px)' }} />

        <div className="relative z-10 max-w-sm w-full">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-2xl shadow-brand-900/40 p-2">
                <img src="/picspy-icon.svg" alt="PicSpy Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter hero-gradient-text pj">PICSPY</h1>
            </div>
            <p className="text-white/30 text-sm mt-2 pj">The AI-Powered Visual Universe</p>
          </motion.div>

          {/* Perks */}
          <div className="space-y-4">
            {PERKS.map((perk, i) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                className="lg-glass noise-overlay rounded-2xl px-5 py-4 flex items-center gap-4
                  transition-all duration-400 hover:-translate-x-1
                  hover:shadow-[0_8px_32px_rgba(124,58,237,0.15)]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  {perk.icon}
                </div>
                <div>
                  <p className="font-bold text-sm text-white pj">{perk.title}</p>
                  <p className="text-[11px] text-white/35 pj mt-0.5">{perk.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-10 lg-glass rounded-2xl px-5 py-4 flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {['HN','LP','KD','TA'].map((a) => (
                <div
                  key={a}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white pj border border-white/10"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}
                >
                  {a}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-bold text-white/70 pj">8.5K+ creator đã tham gia</p>
              <p className="text-[10px] text-white/30 pj">Hôm nay +124 thành viên mới</p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ══ RIGHT PANEL — Register Form ══ */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-hidden overflow-y-auto auth-scroll">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.05)', filter: 'blur(100px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md relative z-10 py-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg p-1.5">
                <img src="/picspy-icon.svg" alt="PicSpy Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter hero-gradient-text pj">PICSPY</h1>
            </div>
            <p className="text-white/30 text-sm mt-1 pj text-center">Visual curator platform</p>
          </div>

          {/* Header */}
          <div className="mb-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 lg-glass
                text-violet-300 text-[10px] font-bold tracking-[0.18em] uppercase pj"
            >
              <Sparkles size={10} className="animate-pulse" />
              Tạo tài khoản mới
            </motion.div>
            <h2 className="text-3xl font-black tracking-tight text-white pj">
              Bắt đầu hành trình<br />
              <span className="hero-gradient-text">creator của bạn 🚀</span>
            </h2>
            <p className="text-white/35 mt-2 text-sm pj">
              Miễn phí · Không cần thẻ tín dụng
            </p>
          </div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="lg-glass-strong noise-overlay rounded-3xl p-7 space-y-5"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 ml-1 pj">
                  Username
                </label>
                <AuthInput
                  icon={AtSign}
                  type="text"
                  placeholder="creator_vn"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  pattern="[a-z0-9_]+"
                  minLength={3}
                  maxLength={30}
                  required
                />
                <p className="text-[10px] text-white/20 mt-1.5 ml-1 pj">
                  Chỉ chữ thường, số và dấu gạch dưới
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 ml-1 pj">
                  Email
                </label>
                <AuthInput
                  icon={Mail}
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 ml-1 pj">
                  Mật khẩu
                </label>
                <AuthInput
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
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
                {/* Strength indicator */}
                <AnimatePresence>
                  {form.password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 space-y-1.5"
                    >
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="strength-bar"
                            style={{
                              background: i <= strength
                                ? meta?.color
                                : 'rgba(255,255,255,0.08)',
                              transform: i <= strength ? 'scaleY(1.4)' : 'scaleY(1)',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] pj ml-0.5" style={{ color: meta?.color || 'rgba(255,255,255,0.3)' }}>
                        Mật khẩu: <span className="font-bold">{meta?.label}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 ml-1 pj">
                  Xác nhận mật khẩu
                </label>
                <AuthInput
                  icon={Lock}
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  error={mismatch}
                  required
                />
                <AnimatePresence>
                  {mismatch && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] pj mt-1.5 ml-1"
                      style={{ color: '#ef4444' }}
                    >
                      ✕ Mật khẩu không khớp
                    </motion.p>
                  )}
                  {form.confirm && !mismatch && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] pj mt-1.5 ml-1"
                      style={{ color: '#34d399' }}
                    >
                      ✓ Mật khẩu khớp
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Terms */}
              <p className="text-[10px] text-white/20 pj leading-relaxed">
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <Link to="/terms" className="text-violet-400 hover:text-violet-300 transition-colors">Điều khoản sử dụng</Link>
                {' '}và{' '}
                <Link to="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">Chính sách bảo mật</Link>.
              </p>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white pj
                  flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
                  minHeight: '52px',
                  boxShadow: '0 10px 30px -5px rgba(124,58,237,0.4)',
                }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>TẠO TÀI KHOẢN <ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-white/30 mt-6 text-sm pj"
          >
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Đăng nhập
            </Link>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center items-center gap-2 mt-6"
          >
            <ShieldCheck size={12} className="text-white/15" />
            <span className="text-[10px] text-white/15 font-bold uppercase tracking-widest pj">
              Bảo mật SSL · Dữ liệu được mã hoá
            </span>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}

export default RegisterPage
