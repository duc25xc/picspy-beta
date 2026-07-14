import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Lock,
  Camera,
  Lightbulb,
  Palette,
  Target,
  MessageSquare,
  ShoppingBag,
  ChevronRight,
  Loader2,
  Eye,
  Compass,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/api'
import useAuthStore from '../../store/auth.store'

/**
 * Parse cối **bold** trong text AI trả về thành React elements.
 * Ví dụ: "**Thiết lập máy ảnh:** f/1.8" → <strong>Thiết lập máy ảnh:</strong> f/1.8
 */
const renderMarkdownBold = (text) => {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-white/90 font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

/* ─────────────────────────────────────────────────────────────────
   SECTION ICONS & COLORS MAP
───────────────────────────────────────────────────────────────── */
const SECTION_META = {
  cameraAndLens: {
    icon: Camera,
    color: 'violet',
    label: '📷 Ống Kính & Máy Ảnh',
  },
  lighting: { icon: Lightbulb, color: 'amber', label: '💡 Sơ Đồ  Ánh Sáng' },
  compositionAndPose: {
    icon: Target,
    color: 'cyan',
    label: '📐 Bố Cục & Dáng Chụp',
  },
  colorGrading: {
    icon: Palette,
    color: 'emerald',
    label: '🎨 Phân Tích Màu & Hậu Kỳ',
  },
}

const COLOR_CLASSES = {
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    text: 'text-violet-400',
    accent: 'text-violet-300',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    text: 'text-amber-400',
    accent: 'text-amber-300',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    text: 'text-cyan-400',
    accent: 'text-cyan-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    text: 'text-emerald-400',
    accent: 'text-emerald-300',
  },
}

/* ─────────────────────────────────────────────────────────────────
   Analysis Section Card — Từng khối phân tích hiển thị dạng card
───────────────────────────────────────────────────────────────── */
const AnalysisSection = ({ sectionKey, data, delay = 0 }) => {
  const meta = SECTION_META[sectionKey]
  if (!meta || !data) return null

  const cls = COLOR_CLASSES[meta.color]
  const Icon = meta.icon

  // Duyệt object, render từng cặp key-value
  // Bỏ qua: null, undefined, string rỗng, string 'null', việc type (dùng badge riêng)
  const entries = Object.entries(data).filter(([k, v]) => {
    if (k === 'type') return false
    if (v === null || v === undefined) return false
    if (
      typeof v === 'string' &&
      (v.trim() === '' ||
        v.toLowerCase() === 'null' ||
        v.toLowerCase() === 'undefined')
    )
      return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`rounded-2xl border ${cls.border} ${cls.bg} p-4 space-y-3`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls.bg} border ${cls.border}`}
        >
          <Icon size={14} className={cls.text} />
        </div>
        <h3 className={`text-sm font-bold ${cls.accent}`}>{meta.label}</h3>
      </div>

      {/* Lighting type badge nếu có */}
      {sectionKey === 'lighting' && data.type && (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold
          bg-amber-500/20 border border-amber-500/30 text-amber-300 uppercase tracking-wider`}
        >
          <Lightbulb size={10} />
          {data.type}
        </span>
      )}

      {/* Content entries */}
      <div className="space-y-2.5">
        {entries.map(([key, value]) => {
          // vibeKeywords là mảng → render dạng tag cloud
          if (key === 'vibeKeywords' && Array.isArray(value)) {
            return (
              <div key={key}>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-1.5">
                  Vibe
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {value.map((kw, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${cls.bg} border ${cls.border} ${cls.text}`}
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )
          }

          // Format nhãn hiển thị từ camelCase
          const labelMap = {
            evaluation: 'Đánh giá',
            focusPoint: 'Điểm nét',
            dofAnalysis: 'Chiều sâu (DOF)',
            evAnalysis: 'Phơi sáng (EV)',
            keyLight: 'Ánh sáng chính',
            fillLight: 'Bù sáng',
            rimLight: 'Sáng viền',
            mood: 'Cảm xúc',
            lightingDiagram: 'Sơ đồ đèn',
            ruleUsed: 'Quy tắc bố cục',
            cameraAngle: 'Góc máy',
            subjectDistance: 'Khoảng cách',
            poseAnalysis: 'Phân tích dáng',
            vibe: 'Phong cách',
            technique: 'Kỹ thuật',
            whiteBalance: 'Cân bằng trắng',
            filterRecommend: 'Bộ lọc đề xuất',
            lutSuggestion: 'LUT gợi ý',
          }
          const displayLabel = labelMap[key] || key

          return (
            <div key={key}>
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-0.5">
                {displayLabel}
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                {renderMarkdownBold(String(value))}
              </p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Gear Suggestion Card — Thiết bị gợi ý (Affiliate-ready)
───────────────────────────────────────────────────────────────── */
const GearCard = ({ gear, index }) => {
  const typeIcons = {
    lens: Camera,
    light: Lightbulb,
    reflector: Eye,
    filter: Palette,
    tripod: Compass,
    accessory: Zap,
  }
  const Icon = typeIcons[gear.type] || ShoppingBag

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 + 0.6 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8
        hover:bg-white/[0.06] hover:border-white/15 transition-all group cursor-pointer"
    >
      <div
        className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-500/20
        border border-rose-500/25 flex items-center justify-center flex-shrink-0"
      >
        <Icon size={14} className="text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 font-semibold truncate">
          {gear.name}
        </p>
        <p className="text-[10px] text-white/40 leading-snug mt-0.5">
          {gear.reason}
        </p>
        {gear.searchKeyword && (
          <a
            href={`https://shopee.vn/search?keyword=${encodeURIComponent(gear.searchKeyword)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full
              bg-rose-500/15 border border-rose-500/25 text-rose-400 text-[9px] font-bold
              hover:bg-rose-500/25 transition-colors uppercase tracking-wider"
            onClick={(e) => e.stopPropagation()}
          >
            <ShoppingBag size={9} />
            Tìm trên Shopee
            <ChevronRight size={9} />
          </a>
        )}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   MAIN: LensSpyPanel
   Hiển thị Paywall hoặc Kết quả phân tích AI
───────────────────────────────────────────────────────────────── */
const LENSSPY_COST = 2

const LensSpyPanel = ({ postId }) => {
  const user = useAuthStore((s) => s.user)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('') // Trạng thái phân tích AI
  const [checking, setChecking] = useState(true)
  const [hasCache, setHasCache] = useState(false)

  // Kiểm tra xem user đã mở khoá chưa (chạy khi mount)
  const checkAnalysis = useCallback(async () => {
    try {
      const { data } = await api.get(`/ai/lensspy/${postId}`)
      if (data.hasUnlocked && data.analysis) {
        setAnalysis(data.analysis)
        setHasCache(true)
      }
    } catch {
      // Ignore
    } finally {
      setChecking(false)
    }
  }, [postId])

  // Bug fix: dùng useEffect thay vì useState — mới chạy đúng khi component mount
  useEffect(() => {
    checkAnalysis()
  }, [checkAnalysis])

  // Cảnh báo khi user đang load AI mà có ý định đóng/rời trang
  useEffect(() => {
    if (!loading) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue =
        'LensSpy AI đang phân tích ảnh. Rời trang bây giờ có thể mất xu mà không nhận được kết quả!'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [loading])

  // Kích hoạt phân tích AI (tốn xu)
  const handleUnlock = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để sử dụng LensSpy AI')
      return
    }
    if (loading) return
    setLoading(true)
    setLoadingStep('Đang gửi ảnh lên AI...')

    // Dùng timeout 90s riêng — AI phân tích ảnh thường mất 20-60 giây
    const STEPS = [
      { ms: 3000, text: 'AI đang nhận dạng bố cục ảnh...' },
      { ms: 8000, text: 'Đang phân tích ánh sáng & màu sắc...' },
      { ms: 18000, text: 'Đang tổng hợp lời khuyên thực chiến...' },
      { ms: 30000, text: 'Gần xong! AI đang viết phân tích chi tiết...' },
    ]
    const timers = STEPS.map(({ ms, text }) =>
      setTimeout(() => setLoadingStep(text), ms)
    )
    const clearTimers = () => timers.forEach(clearTimeout)

    try {
      const { data } = await api.post(
        `/ai/lensspy/${postId}`,
        {},
        {
          timeout: 90000, // 90 giây — AI mất thời gian phân tích ảnh lớn
        }
      )
      clearTimers()
      setAnalysis(data.analysis)
      setHasCache(true)
      if (data.fromCache) {
        toast.success('Đã tải phân tích từ bộ nhớ (miễn phí)!')
      } else {
        toast.success(
          `LensSpy phân tích xong! Đã trừ ${data.tokensCost} AI Credits.`
        )
      }
    } catch (err) {
      clearTimers()
      const code = err.response?.data?.error
      const msg = err.response?.data?.message
      if (code === 'INSUFFICIENT_TOKENS') {
        toast.error(msg || 'Bạn không đủ AI Credits. Vui lòng nạp thêm.')
      } else if (
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout')
      ) {
        toast.error('AI đang bận, vui lòng thử lại sau ít phút.')
      } else {
        toast.error(msg || 'Không thể phân tích. Thử lại sau.')
      }
    } finally {
      setLoadingStep('')
      setLoading(false)
    }
  }

  // Loading check
  if (checking) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-6 animate-pulse">
        <div className="h-4 w-48 bg-white/10 rounded-lg mb-3" />
        <div className="h-3 w-64 bg-white/5 rounded-lg" />
      </div>
    )
  }

  /* ═════════ PAYWALL — Chưa có phân tích ═════════════════════════ */
  if (!analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-violet-500/20"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-blue-600/10" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 p-6 text-center space-y-4">
          {/* Icon */}
          <div
            className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20
            border border-violet-500/30 flex items-center justify-center"
          >
            <Sparkles size={24} className="text-violet-400" />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              🔮 LensSpy AI — Giải Phẫu Bức Ảnh
            </h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
              AI sẽ phân tích góc máy, ánh sáng, bố cục, hậu kỳ và chỉ bạn cách
              chụp lại y hệt bức ảnh này.
            </p>
          </div>

          {/* Sample preview (blurred) */}
          <div className="relative rounded-xl bg-white/[0.03] border border-white/8 p-4 mx-auto max-w-xs overflow-hidden">
            <div className="filter blur-[6px] select-none pointer-events-none space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-violet-500/30" />
                <span className="text-[10px] text-white/30">
                  Ống kính 85mm f/1.4 tạo bokeh...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-amber-500/30" />
                <span className="text-[10px] text-white/30">
                  Key light cửa sổ hướng 45°...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-cyan-500/30" />
                <span className="text-[10px] text-white/30">
                  Rule of Thirds, mắt ở giao điểm...
                </span>
              </div>
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <Lock size={20} className="text-white/50" />
            </div>
          </div>

          {/* Unlock button */}
          <div className="w-full max-w-xs mx-auto space-y-2">
            <motion.button
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              onClick={handleUnlock}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl
                bg-gradient-to-r from-violet-600 to-indigo-600
                hover:from-violet-500 hover:to-indigo-500
                text-white font-bold text-sm
                shadow-[0_0_30px_rgba(124,58,237,0.3)]
                hover:shadow-[0_0_40px_rgba(124,58,237,0.4)]
                transition-all disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                  <span className="truncate">
                    {loadingStep || 'AI đang khởi động...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Mở Khóa LensSpy Masterclass · {LENSSPY_COST} AI Credits
                </>
              )}
            </motion.button>

            {/* Progress indicator khi đang loading */}
            {loading && (
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                  initial={{ width: '5%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 55, ease: 'linear' }}
                />
              </div>
            )}
            {loading && (
              <p className="text-center text-[10px] text-white/30">
                AI phân tích ảnh mất ~30-60 giây, vui lòng không đóng trang
              </p>
            )}
          </div>

          {user && (
            <p className="text-[11px] text-white/25">
              Số dư: {user.tokenBalance ?? 0} AI Credits
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  /* ═════════ RESULT — Hiển thị kết quả phân tích ═════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/25
          border border-violet-500/30 flex items-center justify-center"
        >
          <Sparkles size={16} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            LensSpy AI
            {hasCache && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                Cached
              </span>
            )}
          </h3>
          <p className="text-[10px] text-white/30">
            Phân tích chuyên sâu bởi AI
          </p>
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="space-y-3">
        {Object.keys(SECTION_META).map((key, i) => (
          <AnalysisSection
            key={key}
            sectionKey={key}
            data={analysis[key]}
            delay={i * 0.1}
          />
        ))}
      </div>

      {/* Actionable Advice */}
      {analysis.actionableAdvice?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-blue-400" />
            <h3 className="text-sm font-bold text-blue-300">
              💡 Lời Khuyên Thực Chiến
            </h3>
          </div>
          <ul className="space-y-2">
            {analysis.actionableAdvice.map((advice, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 + 0.6 }}
                className="flex items-start gap-2 text-[12px] text-white/70 leading-relaxed"
              >
                <span
                  className="mt-0.5 w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/25
                  flex items-center justify-center flex-shrink-0 text-blue-400 text-[10px] font-bold"
                >
                  {i + 1}
                </span>
                <span>{renderMarkdownBold(advice)}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Gear Suggestions */}
      {analysis.gearSuggestions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} className="text-rose-400" />
            <h3 className="text-sm font-bold text-rose-300">
              🛒 Thiết Bị Gợi Ý
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.gearSuggestions.map((gear, i) => (
              <GearCard key={i} gear={gear} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default LensSpyPanel
