import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AtSign, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/auth.store'

const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [success, setSuccess] = useState(false)
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const passwordStrength = (pass) => {
    if (!pass) return 0
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    return score
  }

  const strength = passwordStrength(form.password)
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    const result = await register(form.username, form.email, form.password)
    if (result.success) {
      setSuccess(true)
    } else {
      toast.error(result.message)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Đăng ký thành công!</h2>
          <p className="text-white/60 mb-6">
            Chúng tôi đã gửi link xác thực đến <strong>{form.email}</strong>.
            Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.
          </p>
          <Link to="/login" className="btn-primary inline-flex">Đến trang đăng nhập</Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/50">
            <span className="text-white font-bold text-sm">👁</span>
          </div>
          <span className="font-display font-bold text-xl gradient-text tracking-wide">PICSPY</span>
        </div>

        <h2 className="text-2xl font-display font-bold mb-2">Tạo tài khoản</h2>
        <p className="text-white/50 mb-8">Bắt đầu hành trình creator của bạn hôm nay 🚀</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Username</label>
            <div className="relative">
              <AtSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                className="input pl-10"
                placeholder="creator_vn"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                pattern="[a-z0-9_]+"
                minLength={3}
                maxLength={30}
                required
              />
            </div>
            <p className="text-xs text-white/30 mt-1">Chỉ chữ thường, số và dấu gạch dưới</p>
          </div>

          <div>
            <label className="input-label">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                className="input pl-10"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Password strength indicator */}
            {form.password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="text-xs text-white/40">Độ mạnh: <span className="text-white/70">{strengthLabels[strength]}</span></p>
              </div>
            )}
          </div>

          <div>
            <label className="input-label">Xác nhận mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                className={`input pl-10 ${form.confirm && form.password !== form.confirm ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </div>
            {form.confirm && form.password !== form.confirm && (
              <p className="text-xs text-red-400 mt-1">Mật khẩu không khớp</p>
            )}
          </div>

          <p className="text-xs text-white/30">
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Link to="/terms" className="text-brand-400">Điều khoản sử dụng</Link> và{' '}
            <Link to="/privacy" className="text-brand-400">Chính sách bảo mật</Link>
          </p>

          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="btn-full">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Tạo tài khoản'}
          </motion.button>
        </form>

        <p className="text-center text-white/50 mt-6 text-sm">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Đăng nhập
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterPage
