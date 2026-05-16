import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Lock, Loader2, Coins, CheckCircle2 } from 'lucide-react'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'
import toast from 'react-hot-toast'

/**
 * DownloadButton — Nút tải ảnh với full premium token flow
 * - Free: gọi API lấy signed URL → trigger download
 * - Premium: kiểm tra balance → confirm → trừ token → signed URL → download
 * - Sau download premium: refreshMe() để sync token balance realtime
 */
const DownloadButton = ({
  postId,
  isPremium = false,
  priceInTokens = 10,
  className = '',
  variant = 'default', // 'default' | 'compact'
}) => {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const isLoggedIn = !!user && !!accessToken
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)

  const doDownload = async () => {
    setShowConfirm(false)
    setLoading(true)
    try {
      const { data } = await api.post(`/posts/${postId}/download`)

      if (data.downloadUrl) {
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.download = `picspy-${postId}.jpg`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        setDone(true)
        setTimeout(() => setDone(false), 3000)

        if (data.tokensSpent > 0) {
          toast.success(`Đã trừ ${data.tokensSpent} token. Đang tải ảnh...`, { duration: 4000 })
          // Sync lại token balance ngay lập tức
          await refreshMe()
        } else {
          toast.success('Đang tải xuống...')
        }
      }
    } catch (err) {
      const errData = err.response?.data
      if (err.response?.status === 402) {
        if (errData?.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `Không đủ token! Cần ${errData.required} token, bạn có ${errData.balance} token.`,
            { duration: 5000 }
          )
        } else {
          toast.error(errData?.message || 'Cần token để tải ảnh này')
        }
      } else {
        toast.error(errData?.message || 'Không thể tải ảnh')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      toast('Đăng nhập để tải ảnh 💜', { icon: '🔒' })
      return
    }
    // Premium → hiện confirm modal với thông tin xu
    if (isPremium) {
      const balance = user?.tokenBalance || 0
      if (balance < priceInTokens) {
        toast.error(`Không đủ token! Cần ${priceInTokens} token, bạn có ${balance} token.`)
        return
      }
      setShowConfirm(true)
      return
    }
    doDownload()
  }

  // ─── Compact variant (dùng trong modal toolbar) ──────────
  if (variant === 'compact') {
    return (
      <>
        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.9 }}
          disabled={loading}
          className={`flex items-center gap-1.5 text-white/50 hover:text-white transition-colors ${className}`}
          title={isPremium ? `Premium: ${priceInTokens} token` : 'Tải miễn phí'}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : done ? (
            <CheckCircle2 size={16} className="text-green-400" />
          ) : isPremium ? (
            <Lock size={16} />
          ) : (
            <Download size={16} />
          )}
        </motion.button>

        <ConfirmModal
          open={showConfirm}
          price={priceInCoins}
          balance={user?.coinBalance || 0}
          onConfirm={doDownload}
          onCancel={() => setShowConfirm(false)}
        />
      </>
    )
  }

  // ─── Default variant ──────────────────────────────────────
  return (
    <>
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
          ${done
            ? 'bg-green-600/20 border border-green-500/30 text-green-400'
            : isPremium
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_24px_rgba(124,58,237,0.3)]'
          }
          disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : done ? (
          <CheckCircle2 size={16} />
        ) : isPremium ? (
          <Coins size={16} />
        ) : (
          <Download size={16} />
        )}
        {done ? 'Đã tải!' : isPremium ? `${priceInTokens} token` : 'Tải miễn phí'}
      </motion.button>

      <ConfirmModal
        open={showConfirm}
        price={priceInTokens}
        balance={user?.tokenBalance || 0}
        onConfirm={doDownload}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}

/* ─── Confirm Purchase Dialog ───────────────────────────────── */
const ConfirmModal = ({ open, price, balance, onConfirm, onCancel }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        >
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
              <Coins size={28} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Xác nhận mua ảnh</h3>
            <p className="text-white/50 text-sm">Ảnh Premium chất lượng gốc</p>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex justify-between items-center py-2 border-b border-white/8">
              <span className="text-white/50 text-sm">Giá ảnh</span>
              <span className="text-amber-400 font-bold">{price} token</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/50 text-sm">Số dư của bạn</span>
              <span className="text-white font-semibold">{balance} token</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-white/8">
              <span className="text-white/50 text-sm">Số dư còn lại</span>
              <span className={`font-bold ${balance - price < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {balance - price} token
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
            >
              Hủy
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Mua & Tải xuống
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default DownloadButton
