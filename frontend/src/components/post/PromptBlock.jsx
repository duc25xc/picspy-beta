/**
 * PromptBlock.jsx — Tier-aware prompt display.
 *
 * Variants: 'prompt' | 'negative' | 'parameters' | 'json'
 * Tier behavior:
 *   free     → prompt truncated ~100 chars, negative/params/json locked (upsell)
 *   pro/founder → full prompt + copy + negative + params
 *   ultimate → everything + JSON download
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, ChevronDown, ChevronUp,
  Lock, Download, FileJson, ExternalLink, Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import useTierAccess from '../../hooks/useTierAccess'

/* ─── Config per variant ────────────────────────────────────── */
const VARIANT_CONFIG = {
  prompt: {
    label: 'PROMPT',
    color: '#7986eb',        // Gallery Periwinkle
    bg: 'rgba(121,134,235,0.07)',
    border: 'rgba(121,134,235,0.18)',
    icon: null,
  },
  negative: {
    label: 'NEGATIVE',
    color: '#f87171',        // Soft red
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.18)',
    icon: null,
  },
  parameters: {
    label: 'PARAMETERS',
    color: '#34d399',        // Emerald
    bg: 'rgba(52,211,153,0.07)',
    border: 'rgba(52,211,153,0.18)',
    icon: null,
  },
  json: {
    label: 'JSON WORKFLOW',
    color: '#06b6d4',        // Cyan — Ultimate only
    bg: 'rgba(6,182,212,0.07)',
    border: 'rgba(6,182,212,0.18)',
    icon: FileJson,
  },
}

/* ─── Upsell CTA (dành cho locked tiers) ────────────────────── */
const UpsellGate = ({ message, ctaLabel = 'Nâng cấp ngay', ctaTo = '/pricing' }) => (
  <div
    className="rounded-xl p-4 flex items-center justify-between gap-3"
    style={{ background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(255,255,255,0.1)' }}
  >
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(109,40,217,0.25)' }}
      >
        <Lock size={13} style={{ color: '#7986eb' }} />
      </div>
      <p className="text-xs text-white/40" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {message}
      </p>
    </div>
    <Link
      to={ctaTo}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
        whitespace-nowrap flex-shrink-0 transition-all duration-150 hover:brightness-110"
      style={{
        background: 'oklch(52% 0.28 285)',
        color: '#f5f3ff',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.24), 0 4px 12px rgba(109,40,217,0.35)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <Zap size={10} />
      {ctaLabel}
    </Link>
  </div>
)

/* ─── JSON Export Button — Ultimate only ────────────────────── */
const JsonExportButton = ({ text }) => {
  const [done, setDone] = useState(false)

  const handleExport = () => {
    try {
      // Parse nếu là JSON string, fallback wrap vào object
      let obj
      try { obj = JSON.parse(text) }
      catch { obj = { workflow: text, exported_by: 'PicSpy', version: '1.0' } }

      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'picspy_workflow.json'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-xs font-bold transition-all duration-200"
      style={{
        background: done ? 'rgba(52,211,153,0.15)' : 'rgba(6,182,212,0.12)',
        border: `1px solid ${done ? 'rgba(52,211,153,0.3)' : 'rgba(6,182,212,0.25)'}`,
        color: done ? '#34d399' : '#06b6d4',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {done
          ? <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
              <Check size={11} /> Đã lưu!
            </motion.span>
          : <motion.span key="dl" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
              <Download size={11} /> Tải JSON
            </motion.span>
        }
      </AnimatePresence>
    </motion.button>
  )
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function PromptBlock({
  text,
  variant = 'prompt',
  collapseAfter = 6,     // số dòng trước khi collapse
  isLocked = false,      // override external — nếu true luôn hiện upsell
  lockMessage,
  postId,                // dùng cho future analytics
}) {
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.prompt
  const IconComp = cfg.icon
  const tierAccess = useTierAccess()

  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  /* ── Tier gates ──────────────────────────────────────────── */
  const locked = isLocked ||
    (variant === 'prompt' && !tierAccess.canSeeFullPrompt) ||
    (variant === 'negative' && !tierAccess.canSeeWorkflowDetails) ||
    (variant === 'parameters' && !tierAccess.canSeeWorkflowDetails) ||
    (variant === 'json' && !tierAccess.canExportJson)

  const canCopy = tierAccess.canCopyPrompt && !locked

  // Free: hiện 100 chars đầu, blur phần còn lại
  const FREE_LIMIT = 100
  const isTruncatedByTier = variant === 'prompt' && !tierAccess.canSeeFullPrompt
  const displayText = isTruncatedByTier
    ? text?.slice(0, FREE_LIMIT) + '…'
    : text

  // Collapse logic (chỉ áp dụng khi đã có quyền xem full)
  const lines = (displayText || '').split('\n')
  const shouldCollapse = !isTruncatedByTier && lines.length > collapseAfter && !expanded
  const visibleText = shouldCollapse ? lines.slice(0, collapseAfter).join('\n') : displayText

  /* ── Copy handler ─────────────────────────────────────────── */
  const handleCopy = useCallback(async () => {
    if (!canCopy || !text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }, [text, canCopy])

  /* ── Empty guard ──────────────────────────────────────────── */
  if (!text && !locked) return null

  /* ── Upsell block hoàn toàn (negative/params/json locked) ── */
  if (locked && variant !== 'prompt') {
    const messages = {
      negative: 'Negative Prompt bị ẩn — Nâng cấp Pro để xem đầy đủ công thức AI',
      parameters: 'Seed, CFG, Steps bị ẩn — Nâng cấp Pro để copy 1-click workflow',
      json: 'JSON Workflow chỉ dành cho gói Ultimate — import thẳng vào ComfyUI',
    }
    const ctas = {
      negative: { label: 'Lên Pro', to: '/pricing#pro' },
      parameters: { label: 'Lên Pro', to: '/pricing#pro' },
      json: { label: 'Lên Ultimate', to: '/pricing#ultimate' },
    }
    return (
      <UpsellGate
        message={lockMessage || messages[variant]}
        ctaLabel={ctas[variant]?.label}
        ctaTo={ctas[variant]?.to}
      />
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {IconComp && <IconComp size={12} style={{ color: cfg.color }} />}
          <span
            className="text-[10px] font-black tracking-widest uppercase"
            style={{ color: cfg.color, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.12em' }}
          >
            {cfg.label}
          </span>
          {/* Tier badge — hiện khi bị giới hạn bởi tier */}
          {isTruncatedByTier && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(109,40,217,0.2)',
                color: '#7986eb',
                border: '1px solid rgba(109,40,217,0.3)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              Basic
            </span>
          )}
        </div>

        {/* ── Right: Copy button or Locked or JSON export ──── */}
        <div className="flex items-center gap-2">
          {/* JSON Export — Ultimate only */}
          {variant === 'json' && tierAccess.canExportJson && (
            <JsonExportButton text={text} />
          )}

          {/* Copy button */}
          {canCopy ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCopy}
              title="Copy prompt"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                text-xs font-semibold transition-all duration-200"
              style={{
                background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#34d399' : 'rgba(255,255,255,0.5)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied
                  ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1">
                      <Check size={11} /> Đã copy!
                    </motion.span>
                  : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1">
                      <Copy size={11} /> Copy
                    </motion.span>
                }
              </AnimatePresence>
            </motion.button>
          ) : (
            /* Locked copy — Free user */
            <Link
              to={tierAccess.upgradeTarget}
              title={tierAccess.upgradeLabel}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                text-xs font-semibold transition-all duration-150 hover:brightness-110"
              style={{
                background: 'rgba(109,40,217,0.15)',
                border: '1px solid rgba(109,40,217,0.25)',
                color: '#7986eb',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <Lock size={10} />
              {tierAccess.upgradeLabel}
            </Link>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-3.5 pb-3 relative">
        <pre
          className="text-xs leading-relaxed whitespace-pre-wrap break-words m-0"
          style={{
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            color: 'rgba(245,243,255,0.75)',
            // Blur & gradient mask cho free truncated
            maskImage: isTruncatedByTier
              ? 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
              : 'none',
            WebkitMaskImage: isTruncatedByTier
              ? 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
              : 'none',
          }}
        >
          {visibleText}
        </pre>

        {/* Fade gradient khi collapsed nhưng KHÔNG bị tier lock */}
        {shouldCollapse && !isTruncatedByTier && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${cfg.bg})` }}
          />
        )}

        {/* Upsell overlay cho free truncated */}
        {isTruncatedByTier && (
          <div className="mt-1">
            <UpsellGate
              message="Xem toàn bộ prompt & copy 1-click với gói Pro"
              ctaLabel="Nâng cấp Pro"
              ctaTo="/pricing#pro"
            />
          </div>
        )}

        {/* Expand/Collapse toggle — chỉ khi không bị tier lock */}
        {!isTruncatedByTier && lines.length > collapseAfter && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 mt-2 text-[10px] font-semibold
              uppercase tracking-widest transition-colors duration-150"
            style={{ color: cfg.color, opacity: 0.7, fontFamily: 'Outfit, sans-serif' }}
          >
            {expanded
              ? <><ChevronUp size={11} /> Thu gọn</>
              : <><ChevronDown size={11} /> Xem thêm ({lines.length - collapseAfter} dòng)</>
            }
          </button>
        )}
      </div>
    </div>
  )
}
