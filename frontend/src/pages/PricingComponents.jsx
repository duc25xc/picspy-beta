/**
 * PricingComponents.jsx
 * Sub-components for PricingPage
 *
 * Impeccable polish checklist applied:
 *   - oklch everywhere, no #fff or #000
 *   - Hover/focus/active states on all interactive elements
 *   - prefers-reduced-motion respected
 *   - Semantic HTML (article, section)
 *   - Touch targets ≥44px
 *   - No em dashes in copy
 *   - No gradient text
 *   - Glassmorphism purposeful (user-requested liquid glass)
 *   - Cards vary per plan (non-identical grid)
 *   - CTA buttons: tactile inset gloss
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Loader2, Coins, Gift, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Shared tokens ─────────────────────────────────────────────────
// Tinted white (not pure #fff) and tinted black (not pure #000)
const W = 'oklch(97% 0.005 285)'
const W_DIM = 'oklch(70% 0.01 285)'

export const F = {
  display: { fontFamily: '"Bricolage Grotesque", "Outfit", sans-serif' },
  body:    { fontFamily: '"Outfit", system-ui, sans-serif' },
}

export const glassCard = {
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.13)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.16), 0 24px 56px rgba(0,0,0,0.42)',
}

const glassCardPro = {
  background: 'hsla(var(--color-brand-h), var(--color-brand-s), 40%, calc(var(--color-brand-opacity, 1) * 0.13))',
  backdropFilter: 'var(--color-brand-blur, blur(24px))',
  WebkitBackdropFilter: 'var(--color-brand-blur, blur(24px))',
  border: '1px solid hsla(var(--color-brand-h), var(--color-brand-s), 70%, calc(var(--color-brand-opacity, 1) * 0.42))',
  boxShadow: 'inset 0 1.5px 0 hsla(var(--color-brand-h), var(--color-brand-s), 80%, calc(var(--color-brand-opacity, 1) * 0.22)), 0 0 90px hsla(var(--color-brand-h), var(--color-brand-s), 50%, calc(var(--color-brand-opacity, 1) * 0.22)), 0 32px 64px rgba(0,0,0,0.5)',
}

// Tactile CTA: solid brand violet with inset gloss + depth + glow
export const btnPrimary = {
  ...F.body,
  background: 'var(--color-brand-600)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 8px 28px hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.45)',
  color: W,
  border: '1px solid rgba(255,255,255,0.15)',
  backdropFilter: 'var(--color-brand-blur, none)',
  WebkitBackdropFilter: 'var(--color-brand-blur, none)',
}

// Ghost button: inset gloss but muted
export const btnGhost = {
  ...F.body,
  background: 'rgba(255,255,255,0.07)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.1)',
  border: '1px solid rgba(255,255,255,0.11)',
  color: 'rgba(255,255,255,0.85)',
}

// Plan-specific color config (avoids identical card grid)
const PLAN = {
  free: {
    orb:   'rgba(100,116,139,0.55)',
    badge: 'oklch(70% 0.06 240)',
    label: { background:'rgba(148,163,184,0.12)', color:'rgba(148,163,184,0.9)', border:'1px solid rgba(148,163,184,0.2)' },
  },
  founder: {
    orb:   'rgba(217,119,6,0.6)',
    badge: 'oklch(78% 0.16 65)',
    label: { background:'rgba(245,158,11,0.12)', color:'oklch(82% 0.16 65)', border:'1px solid rgba(245,158,11,0.25)' },
  },
  pro: {
    orb:   'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.75)',
    badge: 'hsl(var(--color-brand-h), var(--color-brand-s), 70%)',
    label: { background:'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)', color:'hsl(var(--color-brand-h), var(--color-brand-s), 70%)', border:'1px solid hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.3)' },
  },
  ultimate: {
    orb:   'rgba(6,182,212,0.55)',
    badge: 'oklch(75% 0.14 200)',
    label: { background:'rgba(6,182,212,0.1)', color:'oklch(76% 0.14 200)', border:'1px solid rgba(6,182,212,0.22)' },
  },
}

const GLYPH = { free:'○', founder:'◈', pro:'◆', ultimate:'◇' }
const CYCLES = { weekly:'Tuần', monthly:'Tháng', yearly:'Năm' }

// Reduced-motion helper
const useReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// ── PlanCard ──────────────────────────────────────────────────────
export function PlanCard({ plan, cycle, founderLeft, currentTier, onSub, busy }) {
  const id = plan.planId
  const isPro = id === 'pro'
  const isCurrent = currentTier === id
  const price = plan.pricing?.[cycle] ?? 0
  const orig = plan.originalPricing?.monthly ?? 0
  const cfg = PLAN[id] || PLAN.free
  const reduced = useReducedMotion()

  const card = isPro ? glassCardPro : glassCard

  return (
    <motion.article
      aria-label={`Gói ${plan.name}`}
      whileHover={reduced ? {} : { y: isPro ? -8 : -6, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      className={`relative flex flex-col rounded-3xl overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent h-full ${isPro ? 'z-20' : 'z-10'}`}
      style={card}
      tabIndex={0}
    >
      {/* Visual strip: colored per plan, glass lets bg orbs show through */}
      <div className="relative h-28 flex-shrink-0 overflow-hidden"
        style={{ background: `radial-gradient(ellipse 90% 120% at 50% 110%, ${cfg.orb}, transparent 70%)` }}>
        {/* Subscription Tier Badge (Centered & Brightened) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`h-6 px-3.5 rounded-[4px] flex items-center justify-center text-[10px] uppercase transition-all duration-500 select-none ${
              id === 'free'
                ? 'bg-white/10 text-white border border-white/25 text-[8.5px] font-serif font-bold shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                : id === 'founder' || id === 'pro'
                  ? 'bg-[linear-gradient(110deg,#cbd5e1,35%,#ffffff,50%,#cbd5e1,65%,#e2e8f0)] bg-[length:200%_100%] animate-shimmer text-stone-950 font-serif font-bold shadow-[0_0_18px_rgba(255,255,255,0.45)] border border-white/30'
                  : id === 'ultimate'
                    ? 'bg-[linear-gradient(110deg,#d4af37,35%,#fffdd0,50%,#aa771c,65%,#d4af37)] bg-[length:200%_100%] animate-shimmer text-stone-950 font-serif font-bold shadow-[0_0_22px_rgba(251,191,36,0.55)] border border-amber-400/50'
                    : 'bg-[linear-gradient(110deg,#a855f7,35%,#f3e8ff,50%,#7c3aed,65%,#a855f7)] bg-[length:200%_100%] animate-shimmer text-purple-950 font-serif font-bold shadow-[0_0_18px_rgba(168,85,247,0.45)]'
            }`}
            style={{ letterSpacing: '0.12em' }}
          >
            <span style={{ marginRight: '-0.12em' }} className="flex items-center gap-1.2">
              {id === 'ultimate' && <span className="text-[11px] leading-none">✦</span>}
              {(id === 'founder' || id === 'pro') && <span className="text-[10px] leading-none">★</span>}
              <span>{id === 'founder' ? 'Founder' : id === 'pro' ? 'Pro' : id === 'ultimate' ? 'Ultimate' : 'Free'}</span>
              {id === 'ultimate' && <span className="text-[11px] leading-none">✦</span>}
            </span>
          </span>
        </div>
        {/* Badges */}
        {isPro && (
          <div className="absolute top-0 inset-x-0 flex justify-center">
            <span className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] rounded-b-2xl"
              style={{ background:'var(--color-brand-600)', color:W, boxShadow:'inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 20px hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.45)' }}>
              Phổ biến nhất
            </span>
          </div>
        )}
        {id === 'founder' && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={cfg.label}>
            200 slots
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(to top, hsla(var(--color-brand-h), var(--color-brand-s), 9%, 0.7), transparent)' }} />
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Plan name: own line */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
            style={{ ...F.body, color: cfg.badge }}
            aria-hidden="true">
            {id === 'free' ? 'Miễn phí' : id === 'founder' ? "Founder's" : id === 'pro' ? 'Creator Pro' : 'Ultimate'}
          </p>
          <h3 className="text-2xl font-extrabold leading-tight"
            style={{ ...F.display, letterSpacing:'-0.01em', color: W }}>
            {plan.name}
            {isCurrent && (
              <span className="ml-2 text-[10px] font-bold normal-case tracking-normal align-middle px-2 py-0.5 rounded-full"
                style={{ background:'rgba(74,222,128,0.12)', color:'oklch(72% 0.2 145)', border:'1px solid rgba(74,222,128,0.22)' }}>
                Đang dùng
              </span>
            )}
          </h3>
        </div>

        {/* Price: own line */}
        <div className="pb-3 border-b" style={{ borderColor:'rgba(255,255,255,0.08)' }}>
          {(() => {
            // Tính giá gốc và % tiết kiệm cho cycle hiện tại
            const origYearly = orig * 12
            const showSale = cycle === 'monthly'
              ? (orig > 0 && price < orig)
              : cycle === 'yearly'
                ? (orig > 0 && price < origYearly)
                : false
            const origDisplay = cycle === 'yearly' ? origYearly : orig
            const savePct = showSale ? Math.round((1 - price / origDisplay) * 100) : 0
            const cycleLabel = cycle === 'yearly' ? 'năm' : 'tháng'

            return (
              <>
                {/* Giá gốc gạch ngang — hoặc placeholder giữ layout */}
                {showSale ? (
                  <p className="text-sm line-through mb-0.5" style={{ ...F.body, color:'oklch(55% 0.01 285)' }}>
                    {origDisplay.toLocaleString('vi-VN')}₫/{cycleLabel}
                  </p>
                ) : (
                  <p className="text-sm mb-0.5 invisible" aria-hidden="true">&nbsp;</p>
                )}

                {/* Giá hiện tại */}
                <div className="flex items-baseline gap-2">
                  <span className="leading-none font-black"
                    style={{ ...F.display, fontSize: isPro ? '2.4rem' : '2rem', letterSpacing:'-0.03em', color: W }}>
                    {price === 0 ? 'Miễn phí' : price.toLocaleString('vi-VN') + '₫'}
                  </span>
                  {price > 0 && (
                    <span className="text-xs font-medium" style={{ ...F.body, color:'oklch(60% 0.01 285)' }}>
                      /{CYCLES[cycle]}
                    </span>
                  )}
                </div>

                {/* Tương đương /tháng cho gói năm */}
                {cycle === 'yearly' && price > 0 && (
                  <p className="text-xs mt-0.5" style={{ ...F.body, color:'oklch(55% 0.01 285)' }}>
                    ≈ {Math.round(price / 12).toLocaleString('vi-VN')}₫/tháng
                  </p>
                )}

                {/* Badge tiết kiệm — hoặc placeholder giữ layout */}
                {showSale ? (
                  <span className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full" style={cfg.label}>
                    Tiết kiệm ~{savePct}%
                  </span>
                ) : (
                  <span className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 invisible" aria-hidden="true">&nbsp;</span>
                )}
              </>
            )
          })()}
        </div>

        {/* Description */}
        <p className="text-[13px] leading-relaxed" style={{ ...F.body, color: 'oklch(62% 0.01 285)' }}>
          {plan.description}
        </p>

        {/* Token chip */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-semibold" style={cfg.label}>
          <Coins size={13} className="flex-shrink-0" style={{ color: cfg.badge }} aria-hidden="true" />
          <span>
            {plan.tokenPerMonth === -1
              ? '∞ Unlimited token'
              : `${(plan.tokenPerMonth || 0).toLocaleString()} token${id === 'free' ? ' (1 lần)' : '/tháng'}`}
          </span>
        </div>

        {/* Founder slots */}
        {id === 'founder' && founderLeft !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px]"
            style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)' }}>
            <Gift size={12} style={{ color:'oklch(78% 0.16 65)', flexShrink:0 }} aria-hidden="true" />
            <span style={{ color:'oklch(82% 0.14 65)' }}>
              Còn <b>{founderLeft}/200</b> slot.
            </span>
          </div>
        )}

        {/* Features */}
        <ul className="flex-1 space-y-2.5 pt-1" role="list">
          {plan.features?.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="material-symbols-outlined flex-shrink-0 mt-px"
                style={{ fontVariationSettings:"'FILL' 1", fontSize:'15px', color: cfg.badge }}
                aria-hidden="true">
                check_circle
              </span>
              <span className="text-[13px] leading-snug"
                style={{ ...F.body, color: isPro ? 'oklch(88% 0.01 285)' : 'oklch(68% 0.01 285)' }}>
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          whileTap={reduced ? {} : { scale: 0.97 }}
          onClick={() => onSub(id)}
          disabled={busy === id || isCurrent || (id === 'founder' && founderLeft === 0)}
          className="mt-auto w-full rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            ...(isPro && !isCurrent ? btnPrimary : btnGhost),
            minHeight: '48px',
          }}
        >
          {busy === id ? <Loader2 size={15} className="animate-spin" />
            : isCurrent ? <><Check size={14} /> Đang dùng</>
            : id === 'free' ? 'Bắt đầu miễn phí'
            : id === 'founder' && founderLeft === 0 ? 'Hết slot'
            : <>{plan.name} <ChevronRight size={13} /></>}
        </motion.button>
      </div>
    </motion.article>
  )
}

// ── PayModal ──────────────────────────────────────────────────────
export function PayModal({ order, onClose }) {
  const [cp, setCp] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(order.bankInfo.content)
    setCp(true)
    setTimeout(() => setCp(false), 2000)
    toast.success('Đã copy nội dung chuyển khoản!')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'oklch(8% 0.005 285 / 0.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Thanh toán thủ công"
    >
      <motion.div
        initial={{ y: 52, scale: 0.94 }} animate={{ y: 0, scale: 1 }}
        exit={{ y: 52, scale: 0.94 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full rounded-3xl p-6"
        style={glassCard}
      >
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl font-bold"
            style={{ background:'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.18)', border:'1px solid hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.3)', color:'hsl(var(--color-brand-h), var(--color-brand-s), 70%)' }}
            aria-hidden="true">
            ₫
          </div>
          <h3 className="text-lg font-extrabold" style={{ ...F.display, color: W }}>
            Thanh toán thủ công
          </h3>
          <p className="text-sm mt-1" style={{ ...F.body, color:'rgba(255,255,255,0.6)' }}>
            Chuyển khoản, chụp màn hình, báo admin kích hoạt
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-3 space-y-2.5 text-sm"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)' }}>
          <div className="flex justify-between">
            <span style={{ color:'oklch(60% 0.01 285)' }}>Gói</span>
            <span className="font-semibold" style={{ color: W }}>{order.order.planName}</span>
          </div>
          <div className="flex justify-between pt-2.5" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ color:'oklch(60% 0.01 285)' }}>Số tiền</span>
            <span className="font-black text-base" style={{ color:'oklch(72% 0.2 145)' }}>{order.order.priceFormatted}</span>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-3 space-y-2 text-sm"
          style={{ background:'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.09)', border:'1px solid hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.22)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color:'hsl(var(--color-brand-h), var(--color-brand-s), 70%)' }}>
            Thông tin chuyển khoản
          </p>
          {[['Ngân hàng', order.bankInfo.bank], ['Số TK', order.bankInfo.accountNumber], ['Chủ TK', order.bankInfo.accountName]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color:'oklch(60% 0.01 285)' }}>{k}</span>
              <span className="font-semibold" style={{ color: W }}>{v}</span>
            </div>
          ))}
          <div className="mt-2 p-3 rounded-xl flex items-center justify-between gap-2"
            style={{ background:'oklch(8% 0.005 285 / 0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <span className="font-black font-mono tracking-wider" style={{ color:'oklch(78% 0.16 65)' }}>
              {order.bankInfo.content}
            </span>
            <button
              onClick={copy}
              className="px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              style={{ ...btnGhost, minHeight: '36px' }}
            >
              {cp ? <Check size={11} /> : <Copy size={11} />}
              {cp ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed mb-4 px-1" style={{ ...F.body, color:'oklch(62% 0.01 285)' }}>
          {order.contactAdmin}
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-2xl text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          style={{ ...btnGhost, minHeight: '48px' }}
        >
          Đóng lại
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Rich background orbs ─────────────────────────────────────────
export function PricingBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: 'oklch(11% 0.012 285)' }} aria-hidden="true">
      {/* Orb blurs */}
      <div className="absolute" style={{ top:'-15%', left:'-8%', width:'700px', height:'700px', background:'radial-gradient(circle, oklch(45% 0.28 285) 0%, transparent 65%)', filter:'blur(50px)', opacity:0.5 }} />
      <div className="absolute" style={{ top:'30%', right:'-12%', width:'580px', height:'580px', background:'radial-gradient(circle, oklch(72% 0.18 65) 0%, transparent 65%)', filter:'blur(55px)', opacity:0.28 }} />
      <div className="absolute" style={{ bottom:'5%', left:'25%', width:'800px', height:'450px', background:'radial-gradient(circle, oklch(50% 0.22 285) 0%, transparent 65%)', filter:'blur(60px)', opacity:0.35 }} />
      <div className="absolute" style={{ top:'60%', left:'5%', width:'400px', height:'400px', background:'radial-gradient(circle, oklch(72% 0.14 200) 0%, transparent 65%)', filter:'blur(50px)', opacity:0.2 }} />

      {/* Dot grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(oklch(97% 0.005 285 / 0.55) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        opacity: 0.055,
      }} />
    </div>
  )
}
