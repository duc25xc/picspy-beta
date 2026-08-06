import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Banknote,
  TrendingUp,
  Building2,
  Lock,
  CircleDollarSign,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import TransactionPinModal from '../components/security/TransactionPinModal'
import PinSetupModal from '../components/security/PinSetupModal'
import PinManagementModal from '../components/security/PinManagementModal'
import DisablePinModal from '../components/security/DisablePinModal'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('vi-VN') : '0')

const fmtDate = (d) =>
  new Date(d).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const BANK_INFO = {
  bankName: 'VietinBank',
  bankFullName: 'Ngân hàng TMCP Công thương Việt Nam',
  branch: 'CN Thái Nguyên - Hội sở',
  accountNumber: '105870712923',
  accountHolder: 'HA MINH DUC',
  bin: '970415',
}

const TOPUP_AMOUNTS = [50000, 100000, 200000, 500000]

const VND_TYPES = {
  topup: {
    icon: '💵',
    label: 'Nạp tiền ví',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  purchase_post: {
    icon: '📥',
    label: 'Tải ảnh Premium',
    color: 'text-red-400 bg-red-500/10',
  },
  earn_purchase: {
    icon: '🎨',
    label: 'Bán ảnh Premium',
    color: 'text-teal-400 bg-teal-500/10',
  },
  earn_hold: {
    icon: '⏳',
    label: 'Tạm nhận (Đối soát)',
    color: 'text-yellow-400 bg-yellow-500/10',
  },
  release_hold: {
    icon: '✅',
    label: 'Giải ngân ví khả dụng',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  refund: {
    icon: '↩️',
    label: 'Hoàn tiền',
    color: 'text-orange-400 bg-orange-500/10',
  },
  refund_creator_hold: {
    icon: '↩️',
    label: 'Thu hồi tạm giữ',
    color: 'text-orange-400 bg-orange-500/10',
  },
  earn_views: {
    icon: '👁️',
    label: 'Quyết toán views',
    color: 'text-indigo-400 bg-indigo-500/10',
  },
  withdraw_request: {
    icon: '🏦',
    label: 'Yêu cầu rút tiền',
    color: 'text-amber-400 bg-amber-500/10',
  },
  withdraw_approved: {
    icon: '✅',
    label: 'Rút tiền đã duyệt',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  withdraw_rejected: {
    icon: '❌',
    label: 'Rút tiền từ chối',
    color: 'text-red-400 bg-red-500/10',
  },
}

const TOKEN_TYPES = {
  free_grant: {
    icon: '🎁',
    label: 'Cấp credits miễn phí',
    color: 'text-emerald-400 bg-emerald-500/10',
  },
  monthly_grant: {
    icon: '🔄',
    label: 'Cấp credits hàng tháng',
    color: 'text-blue-400 bg-blue-500/10',
  },
  topup: {
    icon: '💎',
    label: 'Mua credits',
    color: 'text-purple-400 bg-purple-500/10',
  },
  admin_adjust: {
    icon: '🛠️',
    label: 'Admin điều chỉnh',
    color: 'text-amber-400 bg-amber-500/10',
  },
  spend_lensspy: {
    icon: '🔍',
    label: 'Sử dụng LensSpy AI',
    color: 'text-red-400 bg-red-500/10',
  },
  spend_remix: {
    icon: '✨',
    label: 'Tạo ảnh Remix AI',
    color: 'text-rose-400 bg-rose-500/10',
  },
  spend_remix_suggest: {
    icon: '💡',
    label: 'Gợi ý Prompt Remix',
    color: 'text-pink-400 bg-pink-500/10',
  },
  spend_download: {
    icon: '📥',
    label: 'Tải ảnh Premium',
    color: 'text-orange-400 bg-orange-500/10',
  },
  earn_download: {
    icon: '💰',
    label: 'Nhận từ lượt tải',
    color: 'text-teal-400 bg-teal-500/10',
  },
  referral_bonus: {
    icon: '👥',
    label: 'Thưởng giới thiệu',
    color: 'text-cyan-400 bg-cyan-500/10',
  },
  subscription_bonus: {
    icon: '⭐',
    label: 'Bonus nâng gói',
    color: 'text-yellow-400 bg-yellow-500/10',
  },
  refund: {
    icon: '↩️',
    label: 'Hoàn credits',
    color: 'text-indigo-400 bg-indigo-500/10',
  },
}

// ── Helper for Currency Formatting ──────────────────────────────────────────────
const parseNumberStr = (val) => {
  if (!val) return 0
  const digits = val.toString().replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

const formatNumberStr = (num) => {
  if (!num && num !== 0) return ''
  const n = typeof num === 'number' ? num : parseNumberStr(num)
  return n ? n.toLocaleString('vi-VN') : ''
}

// ── Topup Section ─────────────────────────────────────────────────────────────
function TopupSection({ user }) {
  const [amountInput, setAmountInput] = useState('100.000')
  const [debouncedAmount, setDebouncedAmount] = useState(100000)
  const [copied, setCopied] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [qrTab, setQrTab] = useState('vietqr')

  // Handle amount change with automatic thousands dot separator & 500M max limit
  const handleAmountChange = (e) => {
    const raw = e.target.value
    let parsed = parseNumberStr(raw)
    if (parsed > 500000000) {
      parsed = 500000000
      toast.error('Hạn mức nạp tối đa là 500.000.000đ (500 triệu)', {
        id: 'topup-max-limit',
      })
    }
    if (!parsed) {
      setAmountInput('')
    } else {
      setAmountInput(formatNumberStr(parsed))
    }
  }

  // Debounce numeric amount for VietQR URL generation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(parseNumberStr(amountInput))
    }, 350)
    return () => clearTimeout(timer)
  }, [amountInput])

  const shortId = user?._id?.toString().slice(-6).toUpperCase() || 'USER'
  const memoContent = `PICSPY ${shortId}`
  const selectedAmt = debouncedAmount

  const dynamicQrUrl =
    selectedAmt >= 10000
      ? `https://img.vietqr.io/image/${BANK_INFO.bin}-${BANK_INFO.accountNumber}-compact2.jpg?amount=${selectedAmt}&addInfo=${encodeURIComponent(memoContent)}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`
      : `https://img.vietqr.io/image/${BANK_INFO.bin}-${BANK_INFO.accountNumber}-compact2.jpg?addInfo=${encodeURIComponent(memoContent)}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`

  const copy = (text, key, label) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success(`Đã sao chép ${label}!`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConfirm = async () => {
    const num = parseNumberStr(amountInput)
    if (num < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000đ')
      return
    }
    if (num > 500000000) {
      toast.error('Số tiền nạp tối đa là 500.000.000đ (500 triệu)')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/subscriptions/confirm-transfer', {
        amount: num,
        isTopup: true,
      })
    } catch {
      /* silent */
    }
    toast.success(
      'Đã gửi thông báo đến Admin! Số dư sẽ được cộng sau khi xác nhận chuyển khoản.',
      { icon: '💌', duration: 7000 }
    )
    setSubmitted(true)
    setSubmitting(false)
  }

  const handleZalo = () => {
    toast('Đang mở liên hệ Zalo hỗ trợ...', { icon: '💬' })
    window.open('https://zalo.me/0987654321', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
          CÁCH THANH TOÁN & QUÉT MÃ QR
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck size={14} />
          <span>VietinBank Official</span>
        </div>
      </div>

      {/* Select Topup Amount */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
            1. Chọn hoặc nhập số tiền nạp vào ví
          </label>
          <span className="text-[10px] font-semibold text-emerald-400/70">
            Hạn mức: 10.000đ - 500.000.000đ
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          {TOPUP_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmountInput(formatNumberStr(a))}
              className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                parseNumberStr(amountInput) === a
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40'
                  : 'bg-white/[0.03] border-white/10 text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {a.toLocaleString('vi-VN')}đ
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Hoặc nhập số tiền VNĐ (VD: 50.000, 100.000, 500.000.000)..."
            value={amountInput}
            onChange={handleAmountChange}
            className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/60 rounded-xl pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder:text-white/25 font-bold tracking-wide"
          />
          <span className="absolute right-3 text-xs font-black text-emerald-400/80 pointer-events-none">
            VNĐ
          </span>
        </div>
        {parseNumberStr(amountInput) > 0 &&
          parseNumberStr(amountInput) < 10000 && (
            <p className="text-xs text-red-400 mt-1">
              Số tiền nạp tối thiểu là 10.000đ
            </p>
          )}
        {parseNumberStr(amountInput) >= 500000000 && (
          <p className="text-xs text-amber-400 mt-1">
            Đã đạt hạn mức nạp tối đa 500.000.000đ (500 triệu)
          </p>
        )}
      </div>

      {/* 2 Column Main Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Bank info & Transfer Memo */}
        <div className="md:col-span-7 space-y-3">
          {/* Bank Info Header */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shrink-0 shadow-md">
              <img
                src="/viettin-logo.png"
                alt="VietinBank"
                className="w-full h-full object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              <Building2 size={22} className="text-blue-600 hidden" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white leading-tight">
                VietinBank
              </h4>
              <p className="text-[11px] text-white/50 truncate">
                {BANK_INFO.bankFullName}
              </p>
              <p className="text-[10px] text-white/35 truncate">
                {BANK_INFO.branch}
              </p>
            </div>
          </div>

          {/* Account Number Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div>
              <span className="text-[10px] text-white/40 uppercase font-semibold block">
                SỐ TÀI KHOẢN
              </span>
              <span className="font-mono text-base font-bold text-white tracking-wider">
                {BANK_INFO.accountNumber}
              </span>
            </div>
            <button
              onClick={() =>
                copy(BANK_INFO.accountNumber, 'acc', 'Số tài khoản')
              }
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied === 'acc' ? (
                <CheckCircle size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copied === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Account Holder Name Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div>
              <span className="text-[10px] text-white/40 uppercase font-semibold block">
                CHỦ TÀI KHOẢN
              </span>
              <span className="font-bold text-white text-sm tracking-wide">
                {BANK_INFO.accountHolder}
              </span>
            </div>
            <button
              onClick={() =>
                copy(BANK_INFO.accountHolder, 'name', 'Chủ tài khoản')
              }
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied === 'name' ? (
                <CheckCircle size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copied === 'name' ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Golden Transfer Content Box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 shadow-lg shadow-amber-950/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                ★ NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
              </span>
              <button
                onClick={() =>
                  copy(memoContent, 'memo', 'Nội dung chuyển khoản')
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
              >
                {copied === 'memo' ? (
                  <CheckCircle size={13} />
                ) : (
                  <Copy size={13} />
                )}
                <span>
                  {copied === 'memo' ? 'Đã sao chép' : 'Copy Nội Dung'}
                </span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/50 border border-amber-500/25 font-mono text-base font-black text-amber-300 tracking-wider text-center select-all">
              {memoContent}
            </div>

            <p className="text-[11px] text-amber-200/80 font-medium leading-relaxed bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              ⚠️ <b>QUAN TRỌNG & BẮT BUỘC:</b> Bạn phải dán đúng mã{' '}
              <b className="text-white font-mono">{memoContent}</b> vào Nội dung
              chuyển khoản khi giao dịch (tránh trường hợp chuyển tiền mà quên
              ghi nội dung làm gián đoạn kích hoạt số dư).
            </p>
          </div>
        </div>

        {/* Right Column: VietQR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3">
          {/* QR Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs w-full max-w-[220px]">
            <button
              onClick={() => setQrTab('vietqr')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                qrTab === 'vietqr'
                  ? 'bg-[#7986eb] text-white shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Mã VietQR
            </button>
            <button
              onClick={() => setQrTab('static')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                qrTab === 'static'
                  ? 'bg-[#7986eb] text-white shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Ảnh Chuẩn
            </button>
          </div>

          {/* QR Container */}
          <div className="p-3 bg-white rounded-2xl shadow-xl border border-white/20 relative group">
            <img
              src={qrTab === 'vietqr' ? dynamicQrUrl : '/qr-code-viettin.jpg'}
              alt="VietinBank VietQR"
              className="w-48 h-48 object-contain rounded-lg"
              onError={(e) => {
                e.target.src = '/qr-code-viettin.jpg'
              }}
            />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
              <span className="text-[10px] bg-black/80 text-white px-2 py-1 rounded">
                Quét bằng App Ngân hàng
              </span>
            </div>
          </div>

          <p className="text-[11px] text-white/50 max-w-[210px] leading-tight">
            Quét mã để tự động điền <b className="text-white">Số tiền</b> &{' '}
            <b className="text-white">Nội dung</b> chuyển khoản.
          </p>
        </div>
      </div>

      {/* Bottom Action Row */}
      {submitted ? (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
          <CheckCircle size={22} className="shrink-0 text-emerald-400" />
          <div>
            <h5 className="font-bold text-sm">
              Đã gửi thông báo chuyển khoản!
            </h5>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Hệ thống đang đối soát với tài khoản của bạn. Số dư sẽ được cộng
              vào ví trong 5-15 phút.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
            }}
          >
            <CheckCircle size={17} />
            <span>{submitting ? 'Đang gửi...' : 'Tôi đã chuyển khoản'}</span>
          </button>

          <button
            onClick={handleZalo}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ExternalLink size={15} />
            <span>Báo Admin qua Zalo</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Withdraw Section ──────────────────────────────────────────────────────────
function WithdrawSection({
  summary,
  bankAccount,
  onRefresh,
  onNavigateTab,
  pinStatus,
  onRequestPinVerification,
  onRequestPinSetup,
}) {
  const [amountInput, setAmountInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const availableBalance = summary?.currentBalance || 0
  const amt = parseNumberStr(amountInput)

  // Handle withdraw amount change with thousands dot separator & 500M max cap
  const handleWithdrawAmountChange = (e) => {
    const raw = e.target.value
    let parsed = parseNumberStr(raw)
    if (parsed > 500000000) {
      parsed = 500000000
      toast.error('Hạn mức rút tối đa mỗi lần là 500.000.000đ (500 triệu)', {
        id: 'withdraw-max-limit',
      })
    }
    if (!parsed) {
      setAmountInput('')
    } else {
      setAmountInput(formatNumberStr(parsed))
    }
  }

  const percentFee = Math.floor(amt * 0.02)
  const flatFee = 10000
  const totalFee = amt >= 50000 ? percentFee + flatFee : 0
  const netPayout = Math.max(0, amt - totalFee)

  const doWithdraw = async () => {
    console.log('[WITHDRAW_API_CALL]', { amount: amt })
    setSubmitting(true)
    try {
      const { data } = await api.post('/users/me/withdraw', { amount: amt })
      toast.success(
        data.message || 'Yêu cầu rút tiền đã được gửi! Admin sẽ kiểm tra và chuyển khoản trong 24h.',
        {
          icon: '🏦',
          duration: 6000,
        }
      )
      setAmountInput('')
      onRefresh()
    } catch (err) {
      console.error('[WITHDRAW_API_ERROR]', err)
      toast.error(err?.response?.data?.message || 'Rút tiền thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = (e) => {
    e.preventDefault()
    console.log('[WITHDRAW_SUBMIT_CLICK]', { amt, availableBalance, bankAccount, hasPin: pinStatus?.hasPin })

    if (!bankAccount?.accountNumber) {
      toast.error('Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền')
      if (onNavigateTab) onNavigateTab('bank')
      return
    }
    if (amt < 50000) {
      toast.error('Số tiền rút tối thiểu là 50.000đ')
      return
    }
    if (amt > 500000000) {
      toast.error('Hạn mức rút tối đa mỗi lần là 500.000.000đ (500 triệu)')
      return
    }
    if (amt > availableBalance) {
      toast.error(
        `Số dư ví khả dụng không đủ (Hiện có ${fmt(availableBalance)}đ)`
      )
      return
    }

    if (!pinStatus?.hasPin) {
      if (onRequestPinSetup) {
        onRequestPinSetup(
          () => doWithdraw(),
          'Thiết lập PIN & Rút tiền',
          `Vui lòng tạo mã PIN 6 số trước khi gửi yêu cầu rút ${fmt(amt)}đ.`
        )
      } else {
        doWithdraw()
      }
      return
    }

    if (onRequestPinVerification) {
      onRequestPinVerification(
        () => doWithdraw(),
        'Xác nhận rút tiền',
        `Nhập mã PIN 6 số để xác nhận rút ${fmt(amt)}đ về tài khoản ${bankAccount.bankName} (${bankAccount.accountNumber}).`
      )
    } else {
      doWithdraw()
    }
  }

  return (
    <>
      <form onSubmit={handleWithdraw} className="space-y-4">
        {/* Bank Account Status Banner */}
        {!bankAccount?.accountNumber ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={20} className="shrink-0 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-200">
                  Chưa liên kết ngân hàng nhận tiền
                </p>
                <p className="text-[10px] text-amber-300/70">
                  Bạn cần cập nhật STK ngân hàng trước khi gửi yêu cầu rút.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('bank')}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
            >
              Liên kết ngay ➔
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5">
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-wide font-medium">
                Số dư khả dụng
              </p>
              <p className="text-lg font-black text-emerald-400 tabular-nums">
                {fmt(availableBalance)}đ
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/30 uppercase tracking-wide">
                Tài khoản nhận
              </p>
              <p className="text-xs text-white/80 font-semibold">
                {bankAccount.bankName} - {bankAccount.accountHolder}
              </p>
              <p className="text-xs text-white/50 font-mono">
                {bankAccount.accountNumber}
              </p>
            </div>
          </div>
        )}

        {/* Input & Quick Select Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[9px] font-bold text-white/35 uppercase tracking-widest">
              Số tiền muốn rút
            </label>
            <span className="text-[10px] font-semibold text-rose-400/80">
              Hạn mức: 50.000đ - 500.000.000đ
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-2.5">
            {[50000, 100000, 500000, 1000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(formatNumberStr(preset))}
                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  parseNumberStr(amountInput) === preset
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-md'
                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                }`}
              >
                {preset.toLocaleString('vi-VN')}đ
              </button>
            ))}
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Nhập số tiền VNĐ (VD: 50.000, 100.000, 500.000.000)..."
              value={amountInput}
              onChange={handleWithdrawAmountChange}
              className="w-full bg-white/[0.03] border border-white/10 focus:border-rose-500/60 rounded-xl pl-4 pr-24 py-3 text-sm text-white focus:outline-none transition-colors placeholder:text-white/25 font-bold tracking-wide"
            />
            <div className="absolute right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAmountInput(
                    formatNumberStr(Math.min(500000000, availableBalance))
                  )
                }
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer"
              >
                Rút tất cả
              </button>
              <span className="text-xs font-black text-rose-400/80 pointer-events-none">
                VNĐ
              </span>
            </div>
          </div>
          {amt > 0 && amt < 50000 && (
            <p className="text-xs text-rose-400 mt-1">
              Số tiền rút tối thiểu là 50.000đ
            </p>
          )}
          {amt >= 500000000 && (
            <p className="text-xs text-amber-400 mt-1">
              Đã đạt hạn mức rút tối đa 500.000.000đ (500 triệu)
            </p>
          )}
        </div>

        {/* Dynamic Breakdown Card */}
        {amt >= 50000 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-xs space-y-2.5 shadow-md"
          >
            <div className="flex justify-between text-white/50">
              <span>Số tiền yêu cầu rút:</span>
              <span className="font-mono font-bold text-white">
                {fmt(amt)}đ
              </span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Phí dịch vụ rút (2%):</span>
              <span className="font-mono text-rose-400/90">
                -{fmt(percentFee)}đ
              </span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Phí chuyển khoản ngân hàng cố định:</span>
              <span className="font-mono text-rose-400/90">
                -10.000đ
              </span>
            </div>
            <div className="flex justify-between font-bold text-white pt-2.5 border-t border-white/[0.06] text-sm">
              <span>Số tiền thực nhận về STK:</span>
              <span className="text-emerald-400 font-mono text-base">
                {fmt(netPayout)}đ
              </span>
            </div>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={submitting || amt < 50000 || amt > availableBalance}
          className="w-full py-3.5 bg-rose-600/80 hover:bg-rose-600 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          {pinStatus?.hasPin ? <Lock size={14} /> : <ShieldAlert size={14} />}
          {submitting ? 'Đang xử lý...' : 'Gửi yêu cầu rút tiền'}
        </button>
        {!pinStatus?.hasPin && (
          <p className="text-center text-[10px] text-amber-400/70">
            ⚠️ Chưa có mã PIN. Sẽ yêu cầu thiết lập PIN bảo mật trước khi gửi
            yêu cầu rút.
          </p>
        )}
      </form>
    </>
  )
}

// ── Bank Section ──────────────────────────────────────────────────────────────
function BankSection({
  bankAccount,
  onRefresh,
  pinStatus,
  onRequestPinVerification,
  onRequestPinSetup,
}) {
  const [bankName, setBankName] = useState(bankAccount?.bankName || '')
  const [accountNumber, setAccountNumber] = useState(
    bankAccount?.accountNumber || ''
  )
  const [accountHolder, setAccountHolder] = useState(
    bankAccount?.accountHolder || ''
  )
  const [isEditing, setIsEditing] = useState(!bankAccount?.accountNumber)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (bankAccount?.accountNumber) {
      setBankName(bankAccount.bankName || '')
      setAccountNumber(bankAccount.accountNumber || '')
      setAccountHolder(bankAccount.accountHolder || '')
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }, [bankAccount])

  // Automatic uppercase conversion for Bank Name (max 40 chars)
  const handleBankNameChange = (e) => {
    setBankName(e.target.value.toUpperCase().slice(0, 40))
  }

  // Strictly numeric digits for Account Number (6 to 19 digits)
  const handleAccountNumberChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 19)
    setAccountNumber(digitsOnly)
  }

  // Automatic uppercase & accent removal for Account Holder (max 50 chars)
  const handleHolderChange = (e) => {
    const raw = e.target.value.toUpperCase()
    const clean = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'D')
      .replace(/Đ/g, 'D')
      .replace(/[^A-Z\s]/g, '')
      .slice(0, 50)
    setAccountHolder(clean)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!bankName || !accountNumber || !accountHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin tài khoản')
      return
    }
    if (accountNumber.length < 6 || accountNumber.length > 19) {
      toast.error('Số tài khoản ngân hàng tại Việt Nam từ 6 đến 19 chữ số!')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/users/me/bank', {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
      })
      toast.success(
        data.message || 'Đã cập nhật thông tin ngân hàng thành công!'
      )
      setIsEditing(false)
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const doUnlinkBank = async () => {
    setSubmitting(true)
    try {
      await api.post('/users/me/bank', { isUnlink: true })
      toast.success('Đã hủy liên kết tài khoản ngân hàng!', { icon: '🗑️' })
      setBankName('')
      setAccountNumber('')
      setAccountHolder('')
      setIsEditing(true)
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Hủy liên kết thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnlinkClick = () => {
    if (pinStatus?.hasPin) {
      onRequestPinVerification(
        () => doUnlinkBank(),
        'Xác nhận hủy liên kết ngân hàng',
        'Nhập mã PIN 6 số để xác nhận gỡ tài khoản ngân hàng nhận tiền.'
      )
    } else {
      onRequestPinSetup(
        () => doUnlinkBank(),
        'Xác nhận hủy liên kết ngân hàng',
        'Vui lòng cài mã PIN 6 số trước khi gỡ tài khoản ngân hàng.'
      )
    }
  }

  // Helper to format STK into 4-digit groups for beautiful card presentation (e.g. 1058 7071 2923)
  const formatCardStk = (stk) => {
    if (!stk) return ''
    return stk.replace(/(.{4})/g, '$1 ').trim()
  }

  return (
    <div className="space-y-4">
      {/* Existing Linked Bank Account Display Card */}
      {bankAccount?.accountNumber && !isEditing ? (
        <div className="bg-gradient-to-br from-indigo-950/30 via-white/[0.02] to-slate-900/40 border border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white uppercase tracking-wide truncate">
                  {bankAccount.bankName}
                </h4>
                <p className="text-[10px] text-white/40 truncate">
                  Tài khoản nhận tiền rút chính
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle size={11} />
              Đã liên kết
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
            <div className="min-w-0">
              <span className="text-[9px] text-white/35 font-bold uppercase tracking-wider block">
                SỐ TÀI KHOẢN
              </span>
              <span className="font-mono text-sm font-bold text-white tracking-wider mt-0.5 block truncate">
                {formatCardStk(bankAccount.accountNumber)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-white/35 font-bold uppercase tracking-wider block">
                CHỦ TÀI KHOẢN
              </span>
              <span className="text-sm font-bold text-white uppercase mt-0.5 block truncate">
                {bankAccount.accountHolder}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Chỉnh sửa thông tin
            </button>
            <button
              type="button"
              onClick={handleUnlinkClick}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer"
            >
              {submitting ? 'Đang xử lý...' : 'Hủy liên kết tài khoản'}
            </button>
          </div>
        </div>
      ) : (
        /* Edit / Form Mode */
        <form onSubmit={handleSave} className="space-y-3.5">
          {bankAccount?.accountNumber && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">
                Cập nhật thông tin ngân hàng
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-white/40 hover:text-white/80 underline"
              >
                Quay lại
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-white/35 uppercase tracking-widest mb-1.5">
                Tên ngân hàng (Viết hoa)
              </label>
              <input
                type="text"
                maxLength={40}
                placeholder="VD: TECHCOMBANK, VIETINBANK..."
                value={bankName}
                onChange={handleBankNameChange}
                className="w-full bg-white/[0.03] border border-white/10 focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20 uppercase"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-white/35 uppercase tracking-widest mb-1.5">
                Số tài khoản (6 - 19 chữ số)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={19}
                placeholder="VD: 105870712923..."
                value={accountNumber}
                onChange={handleAccountNumberChange}
                className="w-full bg-white/[0.03] border border-white/10 focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20 font-mono tracking-wider"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-white/35 uppercase tracking-widest mb-1.5">
              Tên chủ tài khoản (Viết hoa không dấu)
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="VD: NGUYEN VAN A"
              value={accountHolder}
              onChange={handleHolderChange}
              className="w-full bg-white/[0.03] border border-white/10 focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : 'Lưu tài khoản ngân hàng'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── PIN Section ───────────────────────────────────────────────────────────────
function PinSection({ pinStatus, onOpenSetup, onOpenManage, onOpenDisable }) {
  if (!pinStatus) {
    return (
      <div className="py-8 text-center text-white/20 text-sm">
        Đang tải trạng thái PIN...
      </div>
    )
  }

  return (
    <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          {pinStatus?.hasPin ? (
            <ShieldCheck size={16} className="text-emerald-400" />
          ) : (
            <ShieldAlert size={16} className="text-amber-400" />
          )}
          <span>Bảo mật giao dịch</span>
        </h4>
        {pinStatus?.hasPin ? (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Đã bật
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            Chưa bật
          </span>
        )}
      </div>

      {pinStatus?.hasPin ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400/90 font-semibold">
              Đã thiết lập
            </span>
            <span className="text-white/30 font-mono text-sm tracking-[0.3em]">
              ● ● ● ● ● ●
            </span>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Mã PIN được yêu cầu khi rút tiền, hủy liên kết ngân hàng và thực
            hiện thay đổi thông tin thanh toán.
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenManage('change')}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Đổi PIN
              </button>
              <button
                type="button"
                onClick={() => onOpenManage('forgot')}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/80 text-xs font-semibold transition-all cursor-pointer"
              >
                Quên PIN?
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenDisable}
              className="w-full py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Tắt mã PIN
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-white/40 leading-relaxed">
            Bạn chưa thiết lập mã PIN. PIN sẽ được yêu cầu khi:
          </p>
          <ul className="text-[11px] text-white/35 space-y-1 ml-1 font-medium">
            <li>• Rút tiền về ngân hàng</li>
            <li>• Hủy / Cập nhật tài khoản ngân hàng</li>
            <li>• Thay đổi thông tin bảo mật tài chính</li>
          </ul>
          <button
            type="button"
            onClick={onOpenSetup}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-900/30 cursor-pointer"
          >
            Thiết lập PIN ngay
          </button>
        </div>
      )}
    </div>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function VndRow({ t }) {
  const cfg = VND_TYPES[t.type] || {
    icon: '💸',
    label: 'Giao dịch',
    color: 'text-white/60 bg-white/10',
  }
  const isPositive = t.amount > 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-colors"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${cfg.color}`}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-white/80 truncate">
            {t.description || cfg.label}
          </p>
          <p
            className={`text-xs font-black tabular-nums ml-2 flex-shrink-0 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {isPositive ? '+' : ''}
            {fmt(t.amount)}đ
          </p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.color} opacity-80`}
          >
            {cfg.label}
          </span>
          <span className="text-[9px] text-white/25">
            {fmtDate(t.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function TokenRow({ t }) {
  const cfg = TOKEN_TYPES[t.type] || {
    icon: '⚡',
    label: 'Credits',
    color: 'text-white/60 bg-white/10',
  }
  const isPositive = t.amount > 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:bg-white/[0.04] transition-colors"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${cfg.color}`}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-xs font-semibold text-white/80 truncate">
            {t.description || cfg.label}
          </p>
          <p
            className={`text-xs font-black tabular-nums ml-2 flex-shrink-0 ${isPositive ? 'text-purple-400' : 'text-red-400'}`}
          >
            {isPositive ? '+' : ''}
            {t.amount} credits
          </p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.color} opacity-80`}
          >
            {cfg.label}
          </span>
          <span className="text-[9px] text-white/25">
            {fmtDate(t.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState('topup')
  const [historyTab, setHistoryTab] = useState('vnd')

  const [summary, setSummary] = useState(null)
  const [bankAccount, setBankAccount] = useState(null)
  const [vndTxns, setVndTxns] = useState([])
  const [vndPage, setVndPage] = useState(1)
  const [vndTotal, setVndTotal] = useState(0)
  const [vndLoading, setVndLoading] = useState(false)
  const [vndHasMore, setVndHasMore] = useState(false)

  const [tokenInfo, setTokenInfo] = useState(null)
  const [tokenTxns, setTokenTxns] = useState([])
  const [tokenPage, setTokenPage] = useState(1)
  const [tokenTotal, setTokenTotal] = useState(0)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenHasMore, setTokenHasMore] = useState(false)

  // ── Root PIN Security States ──
  const [pinStatus, setPinStatus] = useState(null)
  const [showPinVerify, setShowPinVerify] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinManage, setShowPinManage] = useState(false)
  const [showPinDisable, setShowPinDisable] = useState(false)
  const [pinManageTab, setPinManageTab] = useState('change')
  const [pinModalTitle, setPinModalTitle] = useState('Xác nhận giao dịch')
  const [pinModalDesc, setPinModalDesc] = useState(
    'Nhập mã PIN 6 số để tiếp tục.'
  )
  const [pendingPinAction, setPendingPinAction] = useState(null)

  const [refreshKey, setRefreshKey] = useState(0)

  const fetchPinStatus = useCallback(async () => {
    try {
      const { getPinStatus } = await import('../api/security.api')
      const { data } = await getPinStatus()
      setPinStatus(data)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    fetchPinStatus()
  }, [fetchPinStatus, refreshKey])

  const handleRequestPinVerification = (
    actionFn,
    title = 'Xác nhận giao dịch',
    desc = 'Nhập PIN 6 số để tiếp tục.'
  ) => {
    setPinModalTitle(title)
    setPinModalDesc(desc)
    setPendingPinAction(() => actionFn)
    setShowPinVerify(true)
  }

  const handleRequestPinSetup = (
    actionFn,
    title = 'Xác nhận giao dịch',
    desc = 'Nhập PIN 6 số để tiếp tục.'
  ) => {
    setPinModalTitle(title)
    setPinModalDesc(desc)
    setPendingPinAction(() => actionFn)
    setShowPinSetup(true)
  }

  const loadVnd = useCallback(async (page = 1, reset = false) => {
    setVndLoading(true)
    try {
      const { data } = await api.get(
        `/users/me/transactions?page=${page}&limit=20`
      )
      setSummary(data.summary)
      setBankAccount(data.bankAccount)
      setVndTotal(data.total)
      setVndHasMore(page < data.totalPages)
      setVndTxns((prev) =>
        reset ? data.transactions : [...prev, ...data.transactions]
      )
      setVndPage(page)
    } catch {
      /* silent */
    } finally {
      setVndLoading(false)
    }
  }, [])

  const loadToken = useCallback(async (page = 1, reset = false) => {
    setTokenLoading(true)
    try {
      const { data } = await api.get(
        `/users/me/token-transactions?page=${page}&limit=20`
      )
      setTokenInfo({
        balance: data.tokenBalance,
        tier: data.subscriptionTier,
        expiry: data.subscriptionExpiry,
      })
      setTokenTotal(data.total)
      setTokenHasMore(page < data.totalPages)
      setTokenTxns((prev) =>
        reset ? data.transactions : [...prev, ...data.transactions]
      )
      setTokenPage(page)
    } catch {
      /* silent */
    } finally {
      setTokenLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVnd(1, true)
    loadToken(1, true)
  }, [refreshKey]) // eslint-disable-line

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  const TIER_LABELS = {
    free: 'Free',
    pro: 'Pro',
    ultimate: 'Ultimate',
    founder: 'Founder',
  }

  const sections = [
    {
      id: 'topup',
      label: 'Nạp tiền',
      icon: ArrowDownLeft,
      color: 'text-emerald-400',
    },
    {
      id: 'withdraw',
      label: 'Rút tiền',
      icon: ArrowUpRight,
      color: 'text-rose-400',
    },
    {
      id: 'bank',
      label: 'Ngân hàng',
      icon: Building2,
      color: 'text-indigo-400',
    },
    {
      id: 'security',
      label: 'Bảo mật PIN',
      icon: ShieldCheck,
      color: 'text-amber-400',
    },
  ]

  const sectionMeta = {
    topup: {
      title: 'Nạp tiền VNĐ',
      sub: 'Chuyển khoản VietinBank · Admin xác nhận trong 5-15 phút',
      icon: ArrowDownLeft,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
    },
    withdraw: {
      title: 'Rút tiền về ngân hàng',
      sub: 'Phí 2% + 10.000đ · Xử lý trong 24h làm việc',
      icon: ArrowUpRight,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    bank: {
      title: 'Liên kết ngân hàng',
      sub: 'Tài khoản nhận tiền khi rút',
      icon: Building2,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15',
    },
    security: {
      title: 'Bảo mật giao dịch',
      sub: 'PIN bảo vệ các thao tác tài chính quan trọng',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
    },
  }

  const meta = sectionMeta[activeSection]
  const MetaIcon = meta.icon

  return (
    <div className="min-h-screen pt-6 pb-24 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <Wallet size={16} className="text-white/70" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Ví của tôi
            </h1>
          </div>
          <p className="text-sm text-white/40 ml-10">
            Quản lý số dư, nạp tiền và lịch sử giao dịch
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/40 hover:text-white transition-all cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: 'Số dư VNĐ',
            value: `${fmt(summary?.currentBalance ?? (user?.vndBalance || 0))}đ`,
            sub: 'Khả dụng để rút',
            color: 'text-emerald-400',
            icon: Banknote,
            bg: 'from-emerald-500/5',
          },
          {
            label: 'Đang tạm giữ',
            value: `${fmt(summary?.holdingBalance ?? (user?.holdingBalance || 0))}đ`,
            sub: 'Đối soát 3 ngày',
            color: 'text-yellow-400',
            icon: Clock,
            bg: 'from-yellow-500/5',
          },
          {
            label: 'AI Credits',
            value: user?.tokenBalance?.toLocaleString() || '0',
            sub: TIER_LABELS[user?.subscriptionTier] + ' plan',
            color: 'text-purple-400',
            icon: Sparkles,
            bg: 'from-purple-500/5',
          },
          {
            label: 'Tổng đã rút',
            value: `${fmt(summary?.totalWithdrawn || 0)}đ`,
            sub: 'Tích lũy về ngân hàng',
            color: 'text-rose-400',
            icon: TrendingUp,
            bg: 'from-rose-500/5',
          },
        ].map(({ label, value, sub, color, icon: Icon, bg }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${bg} via-transparent to-transparent border border-white/[0.07] rounded-2xl p-4`}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Icon size={12} className={color} />
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {label}
              </p>
            </div>
            <p
              className={`text-xl font-black tabular-nums leading-tight ${color}`}
            >
              {value}
            </p>
            <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wide">
              {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: action sections */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1">
            {sections.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === id
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon size={12} className={activeSection === id ? color : ''} />
                <span className="hidden sm:inline truncate">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/[0.015] border border-white/[0.07] rounded-3xl p-5"
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className={`w-7 h-7 rounded-xl ${meta.iconBg} flex items-center justify-center`}
                >
                  <MetaIcon size={14} className={meta.iconColor} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{meta.title}</h3>
                  <p className="text-[10px] text-white/35">{meta.sub}</p>
                </div>
              </div>

              {activeSection === 'topup' && <TopupSection user={user} />}
              {activeSection === 'withdraw' && (
                <WithdrawSection
                  summary={summary}
                  bankAccount={bankAccount}
                  onRefresh={handleRefresh}
                  onNavigateTab={setActiveSection}
                  pinStatus={pinStatus}
                  onRequestPinVerification={handleRequestPinVerification}
                  onRequestPinSetup={handleRequestPinSetup}
                />
              )}
              {activeSection === 'bank' && (
                <BankSection
                  bankAccount={bankAccount}
                  onRefresh={handleRefresh}
                  pinStatus={pinStatus}
                  onRequestPinVerification={handleRequestPinVerification}
                  onRequestPinSetup={handleRequestPinSetup}
                />
              )}
              {activeSection === 'security' && (
                <PinSection
                  pinStatus={pinStatus}
                  onOpenSetup={() => setShowPinSetup(true)}
                  onOpenManage={(tab) => {
                    setPinManageTab(tab)
                    setShowPinManage(true)
                  }}
                  onOpenDisable={() => setShowPinDisable(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: history */}
        <div className="lg:col-span-5">
          <div className="bg-white/[0.015] border border-white/[0.07] rounded-3xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">
                Lịch sử giao dịch
              </h3>
              <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
                {[
                  { id: 'vnd', label: `VNĐ (${vndTotal})` },
                  { id: 'token', label: `AI Credits (${tokenTotal})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setHistoryTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${historyTab === id ? 'bg-white/[0.10] text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
              {historyTab === 'vnd' && (
                <>
                  {vndTxns.length === 0 && !vndLoading && (
                    <div className="py-16 text-center">
                      <CircleDollarSign
                        size={32}
                        className="mx-auto text-white/10 mb-3"
                      />
                      <p className="text-white/25 text-sm">
                        Chưa có giao dịch VNĐ nào
                      </p>
                    </div>
                  )}
                  {vndTxns.map((t) => (
                    <VndRow key={t._id} t={t} />
                  ))}
                  {vndLoading && (
                    <div className="flex justify-center py-4">
                      <RefreshCw
                        size={16}
                        className="text-white/30 animate-spin"
                      />
                    </div>
                  )}
                  {vndHasMore && !vndLoading && (
                    <button
                      onClick={() => loadVnd(vndPage + 1)}
                      className="w-full py-2.5 text-xs font-bold text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/20 rounded-xl transition-all cursor-pointer"
                    >
                      Tải thêm giao dịch VNĐ
                    </button>
                  )}
                </>
              )}

              {historyTab === 'token' && (
                <>
                  {tokenInfo && (
                    <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-sm font-bold text-purple-300">
                          {tokenInfo.balance?.toLocaleString()} credits còn lại
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-purple-400/60 font-semibold uppercase tracking-wide">
                          {TIER_LABELS[tokenInfo.tier]} plan
                        </span>
                        {tokenInfo.expiry && (
                          <p className="text-[9px] text-purple-400/40">
                            HSD:{' '}
                            {new Date(tokenInfo.expiry).toLocaleDateString(
                              'vi-VN'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {tokenTxns.length === 0 && !tokenLoading && (
                    <div className="py-16 text-center">
                      <Sparkles
                        size={32}
                        className="mx-auto text-white/10 mb-3"
                      />
                      <p className="text-white/25 text-sm">
                        Chưa có biến động AI Credits
                      </p>
                    </div>
                  )}
                  {tokenTxns.map((t) => (
                    <TokenRow key={t._id} t={t} />
                  ))}
                  {tokenLoading && (
                    <div className="flex justify-center py-4">
                      <RefreshCw
                        size={16}
                        className="text-white/30 animate-spin"
                      />
                    </div>
                  )}
                  {tokenHasMore && !tokenLoading && (
                    <button
                      onClick={() => loadToken(tokenPage + 1)}
                      className="w-full py-2.5 text-xs font-bold text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/20 rounded-xl transition-all cursor-pointer"
                    >
                      Tải thêm lịch sử credits
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Root PIN Security Modals ── */}
      <TransactionPinModal
        isOpen={showPinVerify}
        onClose={() => {
          setShowPinVerify(false)
          setPendingPinAction(null)
        }}
        onSuccess={() => {
          setShowPinVerify(false)
          if (pendingPinAction) {
            pendingPinAction()
            setPendingPinAction(null)
          }
        }}
        title={pinModalTitle}
        description={pinModalDesc}
      />

      <PinSetupModal
        isOpen={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onSuccess={(pinCreatedAt) => {
          setShowPinSetup(false)
          setPinStatus({ hasPin: true, pinCreatedAt })
          if (pendingPinAction) {
            setShowPinVerify(true)
          }
        }}
      />

      <PinManagementModal
        isOpen={showPinManage}
        onClose={() => setShowPinManage(false)}
        defaultTab={pinManageTab}
        onSuccess={async () => {
          setShowPinManage(false)
          fetchPinStatus()
        }}
      />

      <DisablePinModal
        isOpen={showPinDisable}
        onClose={() => setShowPinDisable(false)}
        onSuccess={async () => {
          setShowPinDisable(false)
          fetchPinStatus()
        }}
      />
    </div>
  )
}
