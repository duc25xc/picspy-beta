import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Gift, AlertCircle, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import useAuthStore from '../store/auth.store'
import { PlanCard, PayModal, PricingBg, F, glassCard, btnPrimary, btnGhost } from './PricingComponents'

const CYCLES = { weekly: 'Tuần', monthly: 'Tháng', yearly: 'Năm' }

// Tinted white token (not pure #fff)
const W = 'oklch(97% 0.005 285)'

const FAQS = [
  {
    q: 'Token hoạt động như thế nào?',
    a: 'Token là đơn vị dịch vụ nội bộ của PicSpy; dùng để mở khóa LensSpy AI và tải ảnh Premium. Mỗi gói trả phí nhận token định kỳ hàng tháng. Token Free cấp 1 lần duy nhất, không reset.'
  },
  {
    q: "Founder's Plan có gì đặc biệt?",
    a: "Giới hạn 200 slot toàn cầu. Sau khi đăng ký, giá 39.000₫/tháng được lock vĩnh viễn; kể cả khi nền tảng tăng giá cho người mới. Cơ hội dành cho 200 người đầu tiên tin vào PicSpy."
  },
  {
    q: 'Thanh toán và kích hoạt ra sao?',
    a: 'Chuyển khoản ngân hàng theo đúng nội dung hiển thị, chụp màn hình xác nhận, gửi admin qua Zalo. Gói được kích hoạt trong 2 giờ làm việc. Cổng thanh toán tự động đang phát triển.'
  },
]

// Reduced-motion helper
const useReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Fade-up wrapper (respects reduced motion)
const Up = ({ children, delay = 0, className = '' }) => {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// FAQ accordion item (uses grid-template-rows for expand, not height)
function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 + index * 0.07, duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={glassCard}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full text-left px-5 flex items-center justify-between gap-4 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
        style={{ minHeight: '52px' }}
      >
        <span className="font-semibold text-[15px]" style={{ ...F.display, color: W }}>{q}</span>
        <span
          className="text-xl leading-none flex-shrink-0"
          style={{
            color: 'oklch(73% 0.22 285)',
            transform: open ? 'rotate(45deg)' : 'none',
            transition: reduced ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      {/* Expand via grid-template-rows (no layout-property animation on height) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: reduced ? 'none' : 'grid-template-rows 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p className="px-5 pb-5 text-sm leading-relaxed" style={{ ...F.body, color: 'oklch(62% 0.01 285)' }}>
            {a}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function PricingPage() {
  const { user, refreshMe } = useAuthStore()
  const nav = useNavigate()
  const [plans, setPlans]             = useState([])
  const [founderLeft, setFounderLeft] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [cycle, setCycle]             = useState('monthly')
  const [busy, setBusy]               = useState(null)
  const [payOrder, setPayOrder]       = useState(null)
  const [claiming, setClaiming]       = useState(false)

  useEffect(() => {
    api.get('/subscriptions/plans')
      .then(({ data }) => { setPlans(data.plans); setFounderLeft(data.founderSlotsLeft) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleSub = async (planId) => {
    if (planId === 'free') return
    if (!user) { toast('Vui lòng đăng nhập', { icon: '🔒' }); nav('/login'); return }
    setBusy(planId)
    try {
      const { data } = await api.post('/subscriptions/subscribe', { planId, cycle })
      setPayOrder(data)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lỗi xử lý yêu cầu')
    } finally {
      setBusy(null)
    }
  }

  const handleClaim = async () => {
    if (!user) { nav('/login'); return }
    setClaiming(true)
    try {
      const { data } = await api.post('/subscriptions/claim-free-tokens')
      toast.success(data.message, { duration: 5000 })
      await refreshMe()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không thể nhận token')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <PricingBg />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* ── Hero (left-aligned, not centered stack) ── */}
        <Up>
          <section className="mb-14 max-w-3xl" aria-labelledby="pricing-heading">
            <p className="text-xs font-bold uppercase tracking-[0.18em] mb-5"
              style={{ ...F.body, color: 'oklch(73% 0.22 285)' }}>
              ⚡ Ưu đãi ra mắt
            </p>
            <h1
              id="pricing-heading"
              style={{ ...F.display, fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.06, color: W }}
            >
              Pricing that{' '}
              <span style={{ color: 'oklch(73% 0.22 285)' }}>Scales</span>
              <br />
              <span style={{ color: W }}>with your ambition.</span>
            </h1>
            <p className="text-base leading-relaxed max-w-xl mt-5"
              style={{ ...F.body, color: 'oklch(62% 0.01 285)' }}>
              Khám phá, copy và kiếm tiền từ prompt AI chất lượng cao.
              Creator Việt Nam đầu tiên được trả trực tiếp từ nền tảng.
            </p>
          </section>
        </Up>

        {/* ── Free token banner ── */}
        {user && !user.freeTokenGranted && user.subscriptionTier === 'free' && (
          <Up delay={0.08} className="mb-10">
            <div
              className="px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ background: 'rgba(217,119,6,0.09)', border: '1px solid rgba(245,158,11,0.24)' }}
              role="alert"
            >
              <div className="flex items-center gap-3">
                <Gift size={20} style={{ color: 'oklch(78% 0.16 65)', flexShrink: 0 }} aria-hidden="true" />
                <div>
                  <p className="font-bold text-sm" style={{ ...F.display, color: 'oklch(84% 0.14 65)' }}>
                    Bạn chưa nhận 100 token khởi điểm
                  </p>
                  <p className="text-xs mt-0.5" style={{ ...F.body, color: 'oklch(70% 0.12 65)' }}>
                    Token dùng thử 1 lần.
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleClaim}
                disabled={claiming}
                className="flex items-center gap-2 px-5 rounded-full text-sm font-bold whitespace-nowrap disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                style={{
                  background: 'oklch(72% 0.18 65)',
                  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.15), 0 8px 24px rgba(217,119,6,0.45)',
                  color: W,
                  ...F.display,
                  minHeight: '44px',
                }}
              >
                {claiming ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                Nhận ngay
              </motion.button>
            </div>
          </Up>
        )}

        {/* ── Cycle toggle ── */}
        <Up delay={0.12} className="flex justify-center mb-10">
          <div className="flex items-center gap-1 p-1 rounded-2xl" style={glassCard} role="radiogroup" aria-label="Chu kỳ thanh toán">
            {Object.entries(CYCLES).map(([k, l]) => {
              // Tính số gói có giá cho cycle này (không kể Free)
              const paidPlansForCycle = plans.filter(p => p.planId !== 'free' && Number(p.pricing?.[k] ?? 0) > 0).length
              const isDisabled = plans.length > 0 && paidPlansForCycle === 0
              return (
                <button
                  key={k}
                  onClick={() => !isDisabled && setCycle(k)}
                  role="radio"
                  aria-checked={cycle === k}
                  disabled={isDisabled}
                  title={isDisabled ? 'Không có gói cho chu kỳ này' : undefined}
                  className="px-8 min-w-[130px] rounded-xl text-sm font-bold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    minHeight: '44px',
                    lineHeight: '1',
                    fontWeight: 800,
                    ...(cycle === k
                    ? { 
                        background: 'oklch(52% 0.28 285)', 
                        color: W, 
                        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -1.5px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(109,40,217,0.45)' 
                      }
                    : { 
                        background: 'transparent', // Hoặc để trống
                        color: 'oklch(55% 0.01 285)',
                        // Ghi đè các thuộc tính của F.display nếu cần để làm nút mờ đi khi không chọn
                        opacity: 0.8 
                      }
                  ),
                    // ...(cycle === k
                    //   ? { ...F.display, background: 'oklch(52% 0.28 285)', color: W, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -1.5px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(109,40,217,0.45)' }
                    //   : { ...F.body, color: 'oklch(55% 0.01 285)' }),
                    
                  }}
                >
                  {l}
                  {k === 'yearly' && (
                    <span className="ml-1.5 text-[10px] font-black" style={{ color: 'oklch(72% 0.2 145)' }}>
                      -33%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Up>

        {/* ── Plans grid ── */}
        <section aria-label="Các gói dịch vụ">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="h-[580px] rounded-3xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  aria-hidden="true" />
              ))}
            </div>
          ) : error ? (
            /* Error state: API failure */
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <AlertCircle size={36} style={{ color: 'oklch(65% 0.2 25)' }} />
              <p className="text-base font-semibold" style={{ ...F.display, color: W }}>
                Không tải được danh sách gói
              </p>
              <p className="text-sm" style={{ ...F.body, color: 'oklch(55% 0.01 285)' }}>
                Kiểm tra kết nối mạng và thử lại.
              </p>
              <button
                onClick={() => { setError(false); setLoading(true); api.get('/subscriptions/plans').then(({data})=>{setPlans(data.plans);setFounderLeft(data.founderSlotsLeft)}).catch(()=>setError(true)).finally(()=>setLoading(false)) }}
                className="px-6 rounded-2xl text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                style={{ ...btnGhost, minHeight: '44px' }}
              >
                Thử lại
              </button>
            </div>
          ) : (() => {
            // Tính danh sách gói hiển thị cho cycle hiện tại
            // Tuần: Pro, Ultimate | Tháng: đủ 4 gói | Năm: Founder, Pro, Ultimate
            const visiblePlans = plans.filter(plan => {
              const id = plan.planId
              const price = Number(plan.pricing?.[cycle] ?? 0)
              if (cycle === 'weekly')  return id !== 'free' && id !== 'founder' && price > 0
              if (cycle === 'yearly')  return id !== 'free' && price > 0
              return true // monthly: hiện tất cả
            })
            const count = visiblePlans.length
            // Dynamic grid: 2→2 cột, 3→3 cột, 4→4 cột, fill đều
            const gridCols = count <= 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
              : count <= 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'

            return (
              <motion.div
                layout
                className={`grid ${gridCols} gap-5 items-stretch`}
                style={{ transition: 'grid-template-columns 0.4s cubic-bezier(0.22,1,0.36,1)' }}
              >
                <AnimatePresence mode="popLayout">
                  {visiblePlans.map((plan, i) => (
                    <motion.div
                      key={plan.planId}
                      layout
                      className="h-full"
                      initial={{ opacity: 0, y: 40, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{
                        delay: 0.06 + i * 0.1,
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                        layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      }}
                    >
                      <PlanCard
                        plan={plan}
                        cycle={cycle}
                        founderLeft={founderLeft}
                        currentTier={user?.subscriptionTier}
                        onSub={handleSub}
                        busy={busy}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )
          })()}
        </section>

        {/* ── FAQ accordion ── */}
        <Up delay={0.38}>
          <section className="mt-24 max-w-2xl mx-auto" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-2xl font-extrabold mb-6 text-center"
              style={{ ...F.display, letterSpacing: '-0.025em', color: W }}
            >
              Câu hỏi thường gặp
            </h2>
            <div className="space-y-2.5">
              {FAQS.map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} index={i} />
              ))}
            </div>
          </section>
        </Up>

        {/* ── Bottom CTA ── */}
        <Up delay={0.55}>
          <section className="mt-20 pb-8">
            <div className="pt-14 border-t relative text-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-32"
                style={{ background: 'oklch(52% 0.28 285)' }}
                aria-hidden="true" />
              <h2
                className="text-2xl font-extrabold mb-6 max-w-md mx-auto"
                style={{ ...F.display, letterSpacing: '-0.025em', lineHeight: 1.15, color: W }}
              >
                Sẵn sàng chia sẻ prompt và kiếm tiền từ đam mê?
              </h2>
              <motion.button
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => user ? nav('/') : nav('/register')}
                className="px-8 rounded-2xl text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{ ...btnPrimary, minHeight: '52px' }}
              >
                {user ? 'Khám phá ngay →' : 'Tạo tài khoản miễn phí →'}
              </motion.button>
            </div>
          </section>
        </Up>
      </div>

      {/* ── Footer ── */}
      <footer className="relative z-10 bg-black/40 border-t border-white/5 pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
                  <span className="text-white text-base">👁</span>
                </div>
                <span className="text-2xl font-black tracking-tight" style={{ ...F.display, background: 'linear-gradient(to right, oklch(73% 0.22 285), oklch(70% 0.18 250))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PICSPY</span>
              </div>
              <p className="text-white/35 max-w-xs mb-7 leading-relaxed text-sm" style={F.body}>
                Nền tảng curator nghệ thuật số lớn nhất Việt Nam, kết nối hàng triệu trái tim yêu cái đẹp thông qua công nghệ AI.
              </p>
              <div className="flex gap-3">
                {['🌐', '🎬', '📸'].map((icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform" style={glassCard}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>
            {/* Links */}
            {[
              { title: 'Khám phá', links: [{ label: 'Gallery cộng đồng', to: '/' }, { label: 'Bảng xếp hạng', to: '/search' }, { label: 'Bộ sưu tập mới', to: '/search' }, { label: 'Gói đăng ký', to: '/pricing' }] },
              { title: 'Nền tảng', links: [{ label: 'Về PICSPY', to: '#' }, { label: 'Điều khoản', to: '#' }, { label: 'Bảo mật', to: '#' }, { label: 'Hướng dẫn Token', to: '#' }] },
              { title: 'Hỗ trợ', links: [{ label: 'Trung tâm trợ giúp', to: '#' }, { label: 'Báo cáo vi phạm', to: '#' }, { label: 'Liên hệ', to: '#' }, { label: 'Blog sáng tạo', to: '#' }] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-bold mb-5 text-white text-sm uppercase tracking-wider" style={F.display}>{title}</h4>
                <ul className="space-y-3 text-sm text-white/35" style={F.body}>
                  {links.map(l => (
                    <li key={l.label}>
                      <Link to={l.to} className="hover:text-violet-400 transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/25 text-xs font-bold tracking-widest uppercase" style={F.body}>
              © 2026 PICSPY Vietnam. All rights reserved.
            </p>
            <p className="text-white/25 text-xs font-bold flex items-center gap-1" style={F.body}>
              Made with <Heart size={11} className="text-red-400 fill-red-400 mx-1" /> in Vietnam
            </p>
          </div>
        </div>
      </footer>

      {/* Payment modal */}
      <AnimatePresence>
        {payOrder && <PayModal order={payOrder} onClose={() => setPayOrder(null)} />}
      </AnimatePresence>
    </div>
  )
}
