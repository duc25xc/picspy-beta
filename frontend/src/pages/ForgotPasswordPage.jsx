import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowLeft, Key, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'

/* ─── Custom Font and Glass Styles ────────────────────── */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
    .pj { font-family: 'Plus Jakarta Sans', sans-serif !important; }

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

    .auth-grid {
      background-image:
        radial-gradient(at 0% 0%, hsla(var(--color-brand-h, 258), var(--color-brand-s, 90%), 15%, 0.12) 0, transparent 50%),
        radial-gradient(at 100% 0%, hsla(200, 80%), 15%, 0.08) 0, transparent 50%),
        radial-gradient(at 50% 100%, hsla(280, 80%), 12%, 0.1) 0, transparent 55%),
        linear-gradient(rgba(255,255,255,0.003) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.003) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 100% 100%, 48px 48px, 48px 48px;
      background-color: #08080c;
    }
  `}</style>
)

/* ── Input field component ── */
const AuthInput = ({ icon: Icon, error, ...inputProps }) => (
  <div className="relative">
    <Icon
      size={17}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none z-10"
      style={{ transition: 'color 0.25s' }}
    />
    <input
      className={`auth-input pj pr-4 ${error ? 'border-red-500/50 focus:border-red-500/50 focus:box-shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
      {...inputProps}
    />
  </div>
)

/* ── OTP 6-box input ── */
const OtpRow = ({ otp, setOtp, error }) => {
  const refs = Array.from({ length: 6 }, () => useRef(null)) // eslint-disable-line

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) refs[i + 1].current?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      refs[5].current?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-3">
      {otp.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center rounded-xl bg-white/[0.03] border text-xl font-bold text-white transition-all outline-none focus:bg-violet-600/5 ${
            error
              ? 'border-red-500/40 focus:border-red-500'
              : 'border-white/10 focus:border-violet-500'
          }`}
        />
      ))}
    </div>
  )
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1) // 1 = Enter Email, 2 = Enter OTP, 3 = New Password, 4 = Success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [devBypass, setDevBypass] = useState(null)

  // Countdown timer for OTP expiry
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds

  const navigate = useNavigate()

  useEffect(() => {
    let timer
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [step, timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setDevBypass(data._devBypass || null)
      setStep(2)
      setTimeLeft(600) // reset 10m
      toast.success('Đã gửi mã xác minh về email!')
    } catch (err) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số.')
      return
    }
    // Step forward to password reset
    setStep(3)
    setError(null)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: otp.join(''),
        password,
      })
      setStep(4)
      toast.success('Mật khẩu đã được thay đổi thành công!')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể đặt lại mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden auth-grid pj px-4 py-16">
      <FontLoader />

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-violet-600/10 blur-[130px] orb-a pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[150px] orb-b pointer-events-none" />

      {/* Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md lg-glass-strong rounded-3xl p-8 md:p-10 relative z-10"
      >
        {/* Back Link */}
        {step < 4 && (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white/80 transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Trở lại đăng nhập
          </Link>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            /* ══════════════ STEP 1: Enter Email ══════════════ */
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Quên mật khẩu?</h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Nhập email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi mã OTP xác minh.
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 mx-1">
                    Email tài khoản
                  </label>
                  <AuthInput
                    icon={Mail}
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    error={!!error}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/40 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-violet-900/20 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi mã xác minh'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            /* ══════════════ STEP 2: Verify OTP ══════════════ */
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 text-[11px] text-violet-300 font-semibold mb-3">
                  <Sparkles size={12} />
                  <span>Đã gửi mã xác minh</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Nhập mã xác minh</h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Vui lòng kiểm tra email của bạn và nhập mã xác minh gồm 6 số.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <OtpRow otp={otp} setOtp={setOtp} error={!!error} />

                {/* Expiry countdown */}
                <div className="flex justify-between items-center text-xs text-white/40 px-1">
                  <span>Mã có hiệu lực trong:</span>
                  <span className="font-mono font-bold text-violet-400">{formatTime(timeLeft)}</span>
                </div>

                {devBypass && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
                    <p className="text-[11px] text-white/40 mb-1">Dev Mode Bypass Code:</p>
                    <code className="font-mono text-sm font-bold text-violet-300 bg-white/5 px-2 py-0.5 rounded">
                      {devBypass.match(/\d+/)?.[0] || '000000'}
                    </code>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={otp.filter(Boolean).length < 6}
                    className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/40 text-white font-bold text-sm tracking-wide transition-all shadow-lg cursor-pointer disabled:cursor-not-allowed"
                  >
                    Tiếp tục
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-white/60 hover:text-white transition-all text-xs font-semibold"
                  >
                    Gửi lại mã
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            /* ══════════════ STEP 3: Enter New Password ══════════════ */
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Mật khẩu mới</h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Thiết lập mật khẩu mới an toàn cho tài khoản của bạn.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 mx-1">
                    Mật khẩu mới
                  </label>
                  <AuthInput
                    icon={Lock}
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-2 mx-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <AuthInput
                    icon={Lock}
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/40 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-violet-900/20 cursor-pointer"
                >
                  {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 4 && (
            /* ══════════════ STEP 4: Reset Success ══════════════ */
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center py-6"
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={36} />
                </div>
              </div>

              <h1 className="text-2xl font-black text-white mb-2">Đổi mật khẩu thành công!</h1>
              <p className="text-sm text-white/50 leading-relaxed mb-8 px-4">
                Mật khẩu của bạn đã được thay đổi. Hãy sử dụng mật khẩu mới này để đăng nhập lại vào PicSpy.
              </p>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-violet-900/20 cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
