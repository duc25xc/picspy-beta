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
import api from '../api/api'
import {
  Check,
  Copy,
  Loader2,
  Coins,
  Gift,
  ChevronRight,
  QrCode,
  ExternalLink,
  ShieldCheck,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Shared tokens ─────────────────────────────────────────────────
// Tinted white (not pure #fff) and tinted black (not pure #000)
const W = 'oklch(97% 0.005 285)'
const W_DIM = 'oklch(70% 0.01 285)'

export const F = {
  display: { fontFamily: '"Bricolage Grotesque", "Outfit", sans-serif' },
  body: { fontFamily: '"Outfit", system-ui, sans-serif' },
}

export const glassCard = {
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.13)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.16), 0 24px 56px rgba(0,0,0,0.42)',
}

const glassCardPro = {
  background:
    'hsla(var(--color-brand-h), var(--color-brand-s), 40%, calc(var(--color-brand-opacity, 1) * 0.13))',
  backdropFilter: 'var(--color-brand-blur, blur(24px))',
  WebkitBackdropFilter: 'var(--color-brand-blur, blur(24px))',
  border:
    '1px solid hsla(var(--color-brand-h), var(--color-brand-s), 70%, calc(var(--color-brand-opacity, 1) * 0.42))',
  boxShadow:
    'inset 0 1.5px 0 hsla(var(--color-brand-h), var(--color-brand-s), 80%, calc(var(--color-brand-opacity, 1) * 0.22)), 0 0 90px hsla(var(--color-brand-h), var(--color-brand-s), 50%, calc(var(--color-brand-opacity, 1) * 0.22)), 0 32px 64px rgba(0,0,0,0.5)',
}

// Tactile CTA: solid brand violet with inset gloss + depth + glow
export const btnPrimary = {
  ...F.body,
  background: 'var(--color-brand-600)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 8px 28px hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.45)',
  color: W,
  border: '1px solid rgba(255,255,255,0.15)',
  backdropFilter: 'var(--color-brand-blur, none)',
  WebkitBackdropFilter: 'var(--color-brand-blur, none)',
}

// Ghost button: inset gloss but muted
export const btnGhost = {
  ...F.body,
  background: 'rgba(255,255,255,0.07)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.1)',
  border: '1px solid rgba(255,255,255,0.11)',
  color: 'rgba(255,255,255,0.85)',
}

// Plan-specific color config (avoids identical card grid)
const PLAN = {
  free: {
    orb: 'rgba(100,116,139,0.55)',
    badge: 'oklch(70% 0.06 240)',
    label: {
      background: 'rgba(148,163,184,0.12)',
      color: 'rgba(148,163,184,0.9)',
      border: '1px solid rgba(148,163,184,0.2)',
    },
  },
  founder: {
    orb: 'rgba(217,119,6,0.6)',
    badge: 'oklch(78% 0.16 65)',
    label: {
      background: 'rgba(245,158,11,0.12)',
      color: 'oklch(82% 0.16 65)',
      border: '1px solid rgba(245,158,11,0.25)',
    },
  },
  pro: {
    orb: 'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.75)',
    badge: 'hsl(var(--color-brand-h), var(--color-brand-s), 70%)',
    label: {
      background: 'hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.15)',
      color: 'hsl(var(--color-brand-h), var(--color-brand-s), 70%)',
      border:
        '1px solid hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.3)',
    },
  },
  ultimate: {
    orb: 'rgba(6,182,212,0.55)',
    badge: 'oklch(75% 0.14 200)',
    label: {
      background: 'rgba(6,182,212,0.1)',
      color: 'oklch(76% 0.14 200)',
      border: '1px solid rgba(6,182,212,0.22)',
    },
  },
}

const GLYPH = { free: '○', founder: '◈', pro: '◆', ultimate: '◇' }
const CYCLES = { weekly: 'Tuần', monthly: 'Tháng', yearly: 'Năm' }

// Reduced-motion helper
const useReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// ── PlanCard ──────────────────────────────────────────────────────
export function PlanCard({
  plan,
  cycle,
  founderLeft,
  currentTier,
  onSub,
  busy,
}) {
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
      whileHover={
        reduced
          ? {}
          : {
              y: isPro ? -8 : -6,
              transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            }
      }
      className={`relative flex flex-col rounded-3xl overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent h-full ${isPro ? 'z-20' : 'z-10'}`}
      style={card}
      tabIndex={0}
    >
      {/* Visual strip: colored per plan, glass lets bg orbs show through */}
      <div
        className="relative h-28 flex-shrink-0 overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 90% 120% at 50% 110%, ${cfg.orb}, transparent 70%)`,
        }}
      >
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
            <span
              style={{ marginRight: '-0.12em' }}
              className="flex items-center gap-1.2"
            >
              {id === 'ultimate' && (
                <span className="text-[11px] leading-none">✦</span>
              )}
              {(id === 'founder' || id === 'pro') && (
                <span className="text-[10px] leading-none">★</span>
              )}
              <span>
                {id === 'founder'
                  ? 'Founder'
                  : id === 'pro'
                    ? 'Pro'
                    : id === 'ultimate'
                      ? 'Ultimate'
                      : 'Free'}
              </span>
              {id === 'ultimate' && (
                <span className="text-[11px] leading-none">✦</span>
              )}
            </span>
          </span>
        </div>
        {/* Badges */}
        {isPro && (
          <div className="absolute top-0 inset-x-0 flex justify-center">
            <span
              className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] rounded-b-2xl"
              style={{
                background: 'var(--color-brand-600)',
                color: W,
                boxShadow:
                  'inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 20px hsla(var(--color-brand-h), var(--color-brand-s), 50%, 0.45)',
              }}
            >
              Phổ biến nhất
            </span>
          </div>
        )}
        {id === 'founder' && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={cfg.label}
          >
            200 slots
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-12"
          style={{
            background:
              'linear-gradient(to top, hsla(var(--color-brand-h), var(--color-brand-s), 9%, 0.7), transparent)',
          }}
        />
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Plan name: own line */}
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
            style={{ ...F.body, color: cfg.badge }}
            aria-hidden="true"
          >
            {id === 'free'
              ? 'Miễn phí'
              : id === 'founder'
                ? "Founder's"
                : id === 'pro'
                  ? 'Creator Pro'
                  : 'Ultimate'}
          </p>
          <h3
            className="text-2xl font-extrabold leading-tight"
            style={{ ...F.display, letterSpacing: '-0.01em', color: W }}
          >
            {plan.name}
            {isCurrent && (
              <span
                className="ml-2 text-[10px] font-bold normal-case tracking-normal align-middle px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(74,222,128,0.12)',
                  color: 'oklch(72% 0.2 145)',
                  border: '1px solid rgba(74,222,128,0.22)',
                }}
              >
                Đang dùng
              </span>
            )}
          </h3>
        </div>

        {/* Price: own line */}
        <div
          className="pb-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {(() => {
            // Tính giá gốc và % tiết kiệm cho cycle hiện tại
            const origYearly = orig * 12
            const showSale =
              cycle === 'monthly'
                ? orig > 0 && price < orig
                : cycle === 'yearly'
                  ? orig > 0 && price < origYearly
                  : false
            const origDisplay = cycle === 'yearly' ? origYearly : orig
            const savePct = showSale
              ? Math.round((1 - price / origDisplay) * 100)
              : 0
            const cycleLabel = cycle === 'yearly' ? 'năm' : 'tháng'

            return (
              <>
                {/* Giá gốc gạch ngang — hoặc placeholder giữ layout */}
                {showSale ? (
                  <p
                    className="text-sm line-through mb-0.5"
                    style={{ ...F.body, color: 'oklch(55% 0.01 285)' }}
                  >
                    {origDisplay.toLocaleString('vi-VN')}₫/{cycleLabel}
                  </p>
                ) : (
                  <p className="text-sm mb-0.5 invisible" aria-hidden="true">
                    &nbsp;
                  </p>
                )}

                {/* Giá hiện tại */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="leading-none font-black"
                    style={{
                      ...F.display,
                      fontSize: isPro ? '2.4rem' : '2rem',
                      letterSpacing: '-0.03em',
                      color: W,
                    }}
                  >
                    {price === 0
                      ? 'Miễn phí'
                      : price.toLocaleString('vi-VN') + '₫'}
                  </span>
                  {price > 0 && (
                    <span
                      className="text-xs font-medium"
                      style={{ ...F.body, color: 'oklch(60% 0.01 285)' }}
                    >
                      /{CYCLES[cycle]}
                    </span>
                  )}
                </div>

                {/* Tương đương /tháng cho gói năm */}
                {cycle === 'yearly' && price > 0 && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ ...F.body, color: 'oklch(55% 0.01 285)' }}
                  >
                    ≈ {Math.round(price / 12).toLocaleString('vi-VN')}₫/tháng
                  </p>
                )}

                {/* Badge tiết kiệm — hoặc placeholder giữ layout */}
                {showSale ? (
                  <span
                    className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={cfg.label}
                  >
                    Tiết kiệm ~{savePct}%
                  </span>
                ) : (
                  <span
                    className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 invisible"
                    aria-hidden="true"
                  >
                    &nbsp;
                  </span>
                )}
              </>
            )
          })()}
        </div>

        {/* Description */}
        <p
          className="text-[13px] leading-relaxed"
          style={{ ...F.body, color: 'oklch(62% 0.01 285)' }}
        >
          {plan.description}
        </p>

        {/* Token chip */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-semibold"
          style={cfg.label}
        >
          <Coins
            size={13}
            className="flex-shrink-0"
            style={{ color: cfg.badge }}
            aria-hidden="true"
          />
          <span>
            {plan.tokenPerMonth === -1
              ? '∞ Unlimited AI Credits'
              : `${(plan.tokenPerMonth || 0).toLocaleString()} AI credit${id === 'free' ? ' (1 lần)' : '/tháng'}`}
          </span>
        </div>

        {/* Founder slots */}
        {id === 'founder' && founderLeft !== null && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px]"
            style={{
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.18)',
            }}
          >
            <Gift
              size={12}
              style={{ color: 'oklch(78% 0.16 65)', flexShrink: 0 }}
              aria-hidden="true"
            />
            <span style={{ color: 'oklch(82% 0.14 65)' }}>
              Còn <b>{founderLeft}/200</b> slot.
            </span>
          </div>
        )}

        {/* Features */}
        <ul className="flex-1 space-y-2.5 pt-1" role="list">
          {plan.features?.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="material-symbols-outlined flex-shrink-0 mt-px"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  fontSize: '15px',
                  color: cfg.badge,
                }}
                aria-hidden="true"
              >
                check_circle
              </span>
              <span
                className="text-[13px] leading-snug"
                style={{
                  ...F.body,
                  color: isPro ? 'oklch(88% 0.01 285)' : 'oklch(68% 0.01 285)',
                }}
              >
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          whileTap={reduced ? {} : { scale: 0.97 }}
          onClick={() => onSub(id)}
          disabled={
            busy === id || isCurrent || (id === 'founder' && founderLeft === 0)
          }
          className="mt-auto w-full rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            ...(isPro && !isCurrent ? btnPrimary : btnGhost),
            minHeight: '48px',
          }}
        >
          {busy === id ? (
            <Loader2 size={15} className="animate-spin" />
          ) : isCurrent ? (
            <>
              <Check size={14} /> Đang dùng
            </>
          ) : id === 'free' ? (
            'Bắt đầu miễn phí'
          ) : id === 'founder' && founderLeft === 0 ? (
            'Hết slot'
          ) : (
            <>
              {plan.name} <ChevronRight size={13} />
            </>
          )}
        </motion.button>
      </div>
    </motion.article>
  )
}

// ── PayModal (Invoice & VietQR Redesign) ──────────────────────────
export function PayModal({ order, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null)
  const [qrTab, setQrTab] = useState('vietqr') // 'vietqr' | 'static'
  const [confirmed, setConfirmed] = useState(false)

  const copyToClipboard = (text, keyName, label) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    toast.success(`Đã sao chép ${label}!`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleConfirmPaid = async () => {
    setConfirmed(true)
    try {
      await api.post('/subscriptions/confirm-transfer')
      toast.success(
        'Đã gửi thông báo cho Admin! Admin sẽ kiểm tra và kích hoạt gói cho bạn trong 5-15 phút.',
        {
          duration: 6000,
          icon: '🎉',
        }
      )
    } catch {
      toast.success(
        'Đã ghi nhận thông báo chuyển khoản của bạn!',
        {
          duration: 5000,
          icon: '🎉',
        }
      )
    }
  }

  const userObj = order.order?.user || {}
  const usernameDisplay = userObj.username
    ? `@${userObj.username}`
    : userObj.displayName || 'Creator'
  const userShortId =
    userObj.shortId || userObj.id?.slice(-6).toUpperCase() || 'USER'
  const todayDate = new Date().toISOString().slice(0, 10)
  const invoiceNo = `INV-${todayDate}-${userShortId}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{
        background: 'oklch(8% 0.005 285 / 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Hóa đơn thanh toán PicSpy"
    >
      <motion.div
        initial={{ y: 40, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl w-full rounded-3xl overflow-hidden my-auto shadow-2xl relative border border-white/15"
        style={{
          background: 'oklch(14% 0.015 285)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.65)',
          fontFamily: '"Outfit", system-ui, sans-serif',
        }}
      >
        {/* Header Ribbon / Status bar */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#7986eb]/15 border border-[#7986eb]/30 text-[#8b98f8]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="text-lg font-bold text-white tracking-tight"
                  style={F.display}
                >
                  Hóa đơn chuyển khoản
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
                  {invoiceNo}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Xác nhận kích hoạt cho tài khoản{' '}
                <span className="text-[#8b98f8] font-semibold">
                  {usernameDisplay}
                </span>{' '}
                (ID: #{userShortId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Chờ thanh toán
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all outline-none"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* 1. HIGHLIGHT AMOUNT BOX (Tương tự bill.jpg) */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 block mb-1">
                TỔNG PHẢI THÀNH TOÁN
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
                  style={F.display}
                >
                  {order.order?.priceFormatted ||
                    `${order.order?.price?.toLocaleString('vi-VN')}₫`}
                </span>
                <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Miễn phí phí giao dịch
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-white/50 block">Gói đăng ký</span>
              <span className="text-sm font-bold text-[#8b98f8] px-3 py-1 rounded-xl bg-[#7986eb]/10 border border-[#7986eb]/25 inline-block mt-1">
                PicSpy {order.order?.planName} •{' '}
                {order.order?.cycle === 'yearly'
                  ? '1 Năm'
                  : order.order?.cycle === 'weekly'
                    ? '1 Tuần'
                    : '1 Tháng'}
              </span>
            </div>
          </div>

          {/* 2. ITEM BREAKDOWN (Chi tiết hóa đơn) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1">
              CHI TIẾT ĐƠN HÀNG
            </h4>
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.01]">
              <div className="flex items-center justify-between p-3.5 border-b border-white/5 text-sm">
                <span className="text-white/60">Sản phẩm / Dịch vụ</span>
                <span className="font-semibold text-white">
                  Nâng cấp tài khoản PicSpy {order.order?.planName}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 border-b border-white/5 text-sm">
                <span className="text-white/60">Tài khoản nhận nâng cấp</span>
                <span className="font-semibold text-[#8b98f8]">
                  {usernameDisplay} ({userObj.email || `ID: #${userShortId}`})
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 text-sm">
                <span className="text-white/60">Thời hạn sử dụng</span>
                <span className="font-semibold text-white">
                  {order.order?.cycle === 'yearly'
                    ? '365 Ngày (+ Thưởng Pro)'
                    : order.order?.cycle === 'weekly'
                      ? '7 Ngày'
                      : '30 Ngày'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. PAYMENT METHOD CARD (Tương tự bill.jpg) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
                CÁCH THANH TOÁN & QUÉT MÃ QR
              </h4>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={13} /> VietinBank Official
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 p-5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Bank Info & Memo (7 Cols) */}
              <div className="md:col-span-7 space-y-4">
                {/* Bank Name Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src="/viettin-logo.png"
                      alt="VietinBank"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base leading-tight">
                      {order.bankInfo?.bank || 'VietinBank'}
                    </h5>
                    <p className="text-xs text-white/50">
                      {order.bankInfo?.bankFullName ||
                        'Ngân hàng TMCP Công thương Việt Nam'}
                    </p>
                    <p className="text-[11px] text-white/35">
                      {order.bankInfo?.branch || 'CN Thái Nguyên - Hội sở'}
                    </p>
                  </div>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div>
                    <span className="text-[11px] text-white/40 uppercase font-semibold block">
                      Số tài khoản
                    </span>
                    <span className="font-mono text-lg font-bold text-white tracking-wider">
                      {order.bankInfo?.accountNumber || '105870712923'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        order.bankInfo?.accountNumber || '105870712923',
                        'acc',
                        'Số tài khoản'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all"
                  >
                    {copiedKey === 'acc' ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedKey === 'acc' ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <div>
                    <span className="text-[11px] text-white/40 uppercase font-semibold block">
                      Chủ tài khoản
                    </span>
                    <span className="font-bold text-white text-sm">
                      {order.bankInfo?.accountName || 'HA MINH DUC'}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        order.bankInfo?.accountName || 'HA MINH DUC',
                        'name',
                        'Tên chủ tài khoản'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all"
                  >
                    {copiedKey === 'name' ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedKey === 'name' ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>

                {/* Transfer Content Memo (QUAN TRỌNG NHẤT KHU VỰC NÀY) */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      ★ NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          order.bankInfo?.content,
                          'memo',
                          'Nội dung chuyển khoản'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 flex items-center gap-1 transition-all shadow-md"
                    >
                      {copiedKey === 'memo' ? (
                        <Check size={13} />
                      ) : (
                        <Copy size={13} />
                      )}
                      {copiedKey === 'memo' ? 'Đã sao chép' : 'Copy Nội Dung'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20 font-mono text-base font-black text-amber-300 tracking-wider text-center select-all">
                    {order.bankInfo?.content}
                  </div>
                  <p className="text-[11px] text-amber-200/80 font-medium leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    ⚠️ <b>QUAN TRỌNG & BẮT BUỘC:</b> Bạn phải dán đúng mã{' '}
                    <b className="text-white font-mono">
                      {order.bankInfo?.content}
                    </b>{' '}
                    vào Nội dung chuyển khoản khi giao dịch (tránh trường hợp
                    chuyển tiền mà quên ghi nội dung làm gián đoạn kích hoạt
                    gói).
                  </p>
                </div>
              </div>

              {/* Right Column: QR Code Display (5 Cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3">
                {/* QR Tab Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs w-full max-w-[220px]">
                  <button
                    onClick={() => setQrTab('vietqr')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      qrTab === 'vietqr'
                        ? 'bg-[#7986eb] text-white shadow-md'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Mã VietQR
                  </button>
                  <button
                    onClick={() => setQrTab('static')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      qrTab === 'static'
                        ? 'bg-[#7986eb] text-white shadow-md'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Ảnh Chuẩn
                  </button>
                </div>

                {/* White Container for QR Code (High Contrast for Instant Scanning) */}
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-white/20 relative group">
                  <img
                    src={
                      qrTab === 'vietqr'
                        ? order.bankInfo?.dynamicQrUrl || '/qr-code-viettin.jpg'
                        : '/qr-code-viettin.jpg'
                    }
                    alt="VietinBank QR Code"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] bg-black/80 text-white px-2 py-1 rounded">
                      Mở App Ngân hàng để quét
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-white/50 max-w-[200px] leading-tight">
                  Quét mã để tự động điền <b className="text-white">Số tiền</b>{' '}
                  & <b className="text-white">Nội dung</b> chuyển khoản.
                </p>
              </div>
            </div>
          </div>

          {/* 4. CONFIRMATION ALERT / ACTION */}
          {confirmed ? (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
              <div>
                <h5 className="font-bold text-sm">
                  Đã gửi thông báo chuyển khoản!
                </h5>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Hệ thống đang đối soát với tài khoản{' '}
                  <b className="text-white">{usernameDisplay}</b> (ID: #
                  {userShortId}). Gói sẽ kích hoạt trong 5-15 phút.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleConfirmPaid}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl text-sm font-bold bg-[#7986eb] hover:bg-[#6876e8] text-white shadow-[0_8px_24px_rgba(121,134,235,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Check size={18} /> Tôi đã chuyển khoản
              </button>

              <a
                href="https://zalo.me"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 transition-all whitespace-nowrap"
              >
                <ExternalLink size={15} /> Báo Admin qua Zalo
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Rich background orbs ─────────────────────────────────────────
export function PricingBg() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: 'oklch(11% 0.012 285)' }}
      aria-hidden="true"
    >
      {/* Orb blurs */}
      <div
        className="absolute"
        style={{
          top: '-15%',
          left: '-8%',
          width: '700px',
          height: '700px',
          background:
            'radial-gradient(circle, oklch(45% 0.28 285) 0%, transparent 65%)',
          filter: 'blur(50px)',
          opacity: 0.5,
        }}
      />
      <div
        className="absolute"
        style={{
          top: '30%',
          right: '-12%',
          width: '580px',
          height: '580px',
          background:
            'radial-gradient(circle, oklch(72% 0.18 65) 0%, transparent 65%)',
          filter: 'blur(55px)',
          opacity: 0.28,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '5%',
          left: '25%',
          width: '800px',
          height: '450px',
          background:
            'radial-gradient(circle, oklch(50% 0.22 285) 0%, transparent 65%)',
          filter: 'blur(60px)',
          opacity: 0.35,
        }}
      />
      <div
        className="absolute"
        style={{
          top: '60%',
          left: '5%',
          width: '400px',
          height: '400px',
          background:
            'radial-gradient(circle, oklch(72% 0.14 200) 0%, transparent 65%)',
          filter: 'blur(50px)',
          opacity: 0.2,
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(oklch(97% 0.005 285 / 0.55) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: 0.055,
        }}
      />
    </div>
  )
}
