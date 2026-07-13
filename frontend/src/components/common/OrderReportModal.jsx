import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ShoppingBag,
  AlertTriangle,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import api from '../../api/api'
import toast from 'react-hot-toast'

// ── Danh mục báo cáo ────────────────────────────────────────────
const REPORT_CATEGORIES = [
  {
    key: 'payment_error',
    emoji: '💳',
    label: 'Thanh toán lỗi',
    desc: 'Bị trừ tiền nhưng không nhận được quyền truy cập file',
  },
  {
    key: 'double_payment',
    emoji: '🔁',
    label: 'Thanh toán 2 lần',
    desc: 'Bị charge 2 lần cho cùng 1 giao dịch',
  },
  {
    key: 'no_file',
    emoji: '📂',
    label: 'Không nhận được file',
    desc: 'Storage lỗi, download fail, link hỏng...',
  },
  {
    key: 'creator_violation',
    emoji: '⚠️',
    label: 'Creator vi phạm',
    desc: 'Đăng AI nhưng ghi Original Photography, nội dung giả mạo...',
  },
  {
    key: 'wrong_description',
    emoji: '📋',
    label: 'Sai mô tả',
    desc: 'Ví dụ ghi "50 RAW files" nhưng chỉ có 5 JPEG',
  },
  {
    key: 'dmca',
    emoji: '⚖️',
    label: 'DMCA / Ảnh ăn cắp',
    desc: 'Nội dung vi phạm bản quyền, ảnh lấy từ nguồn khác',
  },
  {
    key: 'other',
    emoji: '💬',
    label: 'Vấn đề khác',
    desc: 'Mô tả chi tiết vấn đề trong phần ghi chú',
  },
]

// ── Helper: tính ngày còn lại ───────────────────────────────────
function daysRemaining(purchasedAt) {
  if (!purchasedAt) return 0
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(purchasedAt).getTime()
  const remaining = THREE_DAYS_MS - elapsed
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)))
}

// ── Main Modal ───────────────────────────────────────────────────
const OrderReportModal = ({ isOpen, onClose, post, purchasedAt }) => {
  const [step, setStep] = useState(1) // 1=category, 2=detail, 3=success
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const daysLeft = daysRemaining(purchasedAt)

  const handleClose = () => {
    if (submitting) return
    setStep(1)
    setSelectedCategory(null)
    setReason('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error('Vui lòng mô tả vấn đề ít nhất 10 ký tự')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/posts/${post._id}/order-report`, {
        reason: reason.trim(),
        reportCategory: selectedCategory,
      })
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.message || 'Gửi báo cáo thất bại'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const categoryInfo = REPORT_CATEGORIES.find((c) => c.key === selectedCategory)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(145deg, #13132a 0%, #0e0e1f 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ──────────────────────────────────────── */}
              <div
                className="px-6 pt-5 pb-4 flex items-start justify-between gap-4"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background:
                    'linear-gradient(135deg, rgba(234,179,8,0.06) 0%, transparent 60%)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(234,179,8,0.12)',
                      border: '1px solid rgba(234,179,8,0.25)',
                    }}
                  >
                    <ShoppingBag size={17} className="text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base leading-tight">
                      Order Report
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5">
                      Báo cáo vấn đề sau khi mua ảnh
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Post Preview Strip ───────────────────────────── */}
              {post && step !== 3 && (
                <div
                  className="mx-6 mt-4 mb-3 p-3 rounded-xl flex items-center gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {(post.images?.[0]?.thumbnailUrl ||
                    post.generatedImages?.[0]?.thumbnailUrl) && (
                    <img
                      src={
                        post.images?.[0]?.thumbnailUrl ||
                        post.generatedImages?.[0]?.thumbnailUrl
                      }
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/80 truncate">
                      {post.caption || 'Không có tiêu đề'}
                    </p>
                    <p className="text-xs text-white/30">
                      by @{post.authorId?.username || '...'}
                    </p>
                  </div>

                  {/* Deadline badge */}
                  <div
                    className="ml-auto flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{
                      background:
                        daysLeft <= 1
                          ? 'rgba(239,68,68,0.12)'
                          : 'rgba(234,179,8,0.10)',
                      color: daysLeft <= 1 ? '#f87171' : '#fbbf24',
                      border: `1px solid ${daysLeft <= 1 ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.25)'}`,
                    }}
                  >
                    <Clock size={10} />
                    {daysLeft}d còn lại
                  </div>
                </div>
              )}

              {/* ── Body: Step 1 — Chọn loại ──────────────────────── */}
              {step === 1 && (
                <div className="px-6 pb-6">
                  <p className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">
                    Chọn vấn đề bạn gặp phải
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {REPORT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setSelectedCategory(cat.key)
                          setStep(2)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer group"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(234,179,8,0.06)'
                          e.currentTarget.style.borderColor =
                            'rgba(234,179,8,0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.03)'
                          e.currentTarget.style.borderColor =
                            'rgba(255,255,255,0.06)'
                        }}
                      >
                        <span className="text-xl shrink-0">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
                            {cat.label}
                          </p>
                          <p className="text-xs text-white/35 mt-0.5 leading-snug">
                            {cat.desc}
                          </p>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-white/20 group-hover:text-white/60 shrink-0 transition-colors"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Body: Step 2 — Chi tiết ───────────────────────── */}
              {step === 2 && (
                <div className="px-6 pb-6">
                  {/* Selected category */}
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 mb-4 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    <span>←</span>
                    <span className="text-lg">{categoryInfo?.emoji}</span>
                    <span className="font-semibold">{categoryInfo?.label}</span>
                    <span className="text-white/25">· Thay đổi</span>
                  </button>

                  <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
                    Mô tả chi tiết vấn đề *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Mô tả rõ vấn đề bạn gặp phải...\n\nVí dụ: Tôi đã thanh toán thành công nhưng không tải được file. Hệ thống báo lỗi 503 khi click Download.`}
                    rows={6}
                    maxLength={1000}
                    className="w-full text-sm rounded-xl px-4 py-3 resize-none focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(234,179,8,0.4)'
                      e.target.style.background = 'rgba(234,179,8,0.04)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                      e.target.style.background = 'rgba(255,255,255,0.04)'
                    }}
                  />
                  <p className="text-[11px] text-white/25 text-right mt-1">
                    {reason.length}/1000
                  </p>

                  {/* Warning */}
                  <div
                    className="mt-3 p-3 rounded-xl flex items-start gap-2"
                    style={{
                      background: 'rgba(234,179,8,0.05)',
                      border: '1px solid rgba(234,179,8,0.12)',
                    }}
                  >
                    <AlertTriangle
                      size={13}
                      className="text-yellow-500/70 mt-0.5 shrink-0"
                    />
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Báo cáo sẽ được gửi trực tiếp đến Admin để xem xét. Vui
                      lòng cung cấp thông tin chính xác và trung thực.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting || !reason.trim() || reason.trim().length < 10
                    }
                    className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      boxShadow: '0 4px 16px rgba(217,119,6,0.3)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Đang
                        gửi...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={15} /> Gửi Order Report
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── Body: Step 3 — Success ────────────────────────── */}
              {step === 3 && (
                <div className="px-6 pb-8 flex flex-col items-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mt-2"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '2px solid rgba(34,197,94,0.3)',
                    }}
                  >
                    <CheckCircle size={32} className="text-green-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Đã gửi Order Report
                    </h3>
                    <p className="text-sm text-white/45 mt-2 leading-relaxed max-w-sm">
                      Báo cáo của bạn đã được tiếp nhận. Admin sẽ xem xét và
                      liên hệ trong thời gian sớm nhất.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default OrderReportModal
