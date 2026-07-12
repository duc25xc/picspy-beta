import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, Key, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { disablePin } from '../../api/security.api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function DisablePinModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorState, setErrorState] = useState(null) // null | 'GOOGLE_USER_NO_PASSWORD' | string

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setShowPassword(false)
      setErrorState(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      toast.error('Vui lòng nhập mật khẩu')
      return
    }

    setSubmitting(true)
    setErrorState(null)
    try {
      await disablePin(password)
      toast.success('🔒 Đã tắt mã PIN giao dịch thành công')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error(err)
      const errCode = err.response?.data?.code
      const errMsg = err.response?.data?.message || 'Không thể tắt mã PIN'
      
      if (errCode === 'GOOGLE_USER_NO_PASSWORD' || err.response?.status === 403) {
        setErrorState('GOOGLE_USER_NO_PASSWORD')
      } else {
        setErrorState(errMsg)
        toast.error(errMsg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoToSetPassword = () => {
    onClose()
    if (user?.username) {
      navigate(`/profile/${user.username}?edit=true&tab=password`)
    } else {
      toast.error('Không tìm thấy thông tin tài khoản')
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121216] p-6 shadow-2xl font-body"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Icon Header */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert size={24} />
          </div>

          <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
            Tắt mã PIN giao dịch
          </h3>
          
          {errorState === 'GOOGLE_USER_NO_PASSWORD' ? (
            <div className="space-y-4">
              <p className="text-sm text-white/60 leading-relaxed">
                Tài khoản của bạn đăng nhập qua Google và <strong className="text-white">chưa thiết lập mật khẩu</strong>.
                Để tắt mã PIN, bạn bắt buộc phải tạo mật khẩu tài khoản trước.
              </p>
              
              <button
                onClick={handleGoToSetPassword}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Đặt mật khẩu ngay <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-white/50 leading-relaxed">
                Để tắt mã PIN giao dịch, vui lòng nhập mật khẩu tài khoản của bạn để xác minh danh tính.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/35 uppercase tracking-wide">
                  Mật khẩu tài khoản
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-white/30">
                    <Key size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu của bạn..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-brand-500 rounded-xl pl-9 pr-10 py-3 text-sm text-white focus:outline-none placeholder:text-white/25"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/35 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorState && errorState !== 'GOOGLE_USER_NO_PASSWORD' && (
                <p className="text-xs text-red-400 font-semibold mt-1">
                  * {errorState}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/70 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận tắt'
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
