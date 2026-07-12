import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ShieldAlert, Clock } from 'lucide-react'
import { verifyPin } from '../../api/security.api'

// ─── PIN Dot Display ──────────────────────────────────────────────────────────
const PinDot = ({ filled, active, error }) => (
  <motion.div
    animate={{
      scale: filled ? [0.85, 1.08, 1] : 1,
      borderColor: error
        ? 'oklch(62% 0.24 25)'
        : active
          ? 'oklch(62% 0.16 270)'
          : filled
            ? 'oklch(62% 0.16 270)'
            : 'rgba(255,255,255,0.15)',
      backgroundColor: filled
        ? error
          ? 'oklch(62% 0.24 25)'
          : 'oklch(62% 0.16 270)'
        : 'transparent',
    }}
    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    style={{
      width: 16,
      height: 16,
      borderRadius: '50%',
      border: '2px solid',
      flexShrink: 0,
    }}
  />
)

// ─── Lockout Countdown ───────────────────────────────────────────────────────
const LockoutCountdown = ({ lockedUntil }) => {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const ms = new Date(lockedUntil) - Date.now()
      if (ms <= 0) { setRemaining('00:00'); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  return (
    <div className="flex items-center gap-2 text-sm"
      style={{ color: 'oklch(72% 0.18 65)' }}>
      <Clock size={14} />
      <span>Thử lại sau <span className="font-mono font-bold">{remaining}</span></span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TransactionPinModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Xác nhận giao dịch',
  description = 'Nhập mã PIN 6 số để tiếp tục.',
}) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)         // { message, retriesLeft }
  const [isLocked, setIsLocked] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [shake, setShake] = useState(false)

  const inputRef = useRef(null)

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetState()
      setTimeout(focusInput, 50)
    }
  }, [isOpen, focusInput])

  const resetState = () => {
    setPin('')
    setError(null)
    setShake(false)
    setIsLoading(false)
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleInputChange = (e) => {
    if (isLoading || isLocked) return
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(val)
    setError(null)
    if (val.length === 6) {
      handleSubmit(val)
    }
  }

  const handleSubmit = async (pinValue) => {
    if (isLoading || isLocked) return
    const p = pinValue || pin
    if (p.length !== 6) return

    setIsLoading(true)
    setError(null)

    try {
      await verifyPin(p)
      onSuccess()
    } catch (err) {
      const code = err?.response?.data?.error
      const msg = err?.response?.data?.message || 'Sai PIN.'
      const data = err?.response?.data?.data

      triggerShake()
      resetState()
      // Double RAF: ensures DOM updates after state reset before focus attempt
      requestAnimationFrame(() => requestAnimationFrame(focusInput))

      if (code === 'PIN_LOCKED') {
        setIsLocked(true)
        setLockedUntil(data?.lockedUntil || null)
        setError({ message: msg })
      } else {
        setError({
          message: msg,
          retriesLeft: data?.retriesLeft,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(10, 10, 16, 0.85)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => { e.stopPropagation(); focusInput() }}
            style={{
              background: 'rgba(22, 22, 34, 0.94)',
              backdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 32px 80px rgba(0,0,0,0.55)',
              borderRadius: 22,
              padding: '36px 40px',
              width: '100%',
              maxWidth: 420,
              fontFamily: 'Outfit, system-ui, sans-serif',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-3 mb-7">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: isLocked
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(121,134,235,0.12)',
                  border: `1px solid ${isLocked ? 'rgba(239,68,68,0.25)' : 'rgba(121,134,235,0.25)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLocked
                  ? <ShieldAlert size={24} color="oklch(62% 0.24 25)" />
                  : <Lock size={24} color="oklch(62% 0.16 270)" />
                }
              </div>

              <div className="text-center">
                <h2 style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'oklch(97% 0.005 285)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}>
                  {isLocked ? 'PIN bị khóa' : title}
                </h2>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 4,
                  margin: '4px 0 0',
                }}>
                  {isLocked ? 'Nhập sai quá nhiều lần.' : description}
                </p>
              </div>
            </div>

            {/* Hidden Input Overlay for Lag-free Keyboard Capture */}
            <div className="relative mb-6 py-2" onClick={focusInput} style={{ cursor: 'text' }}>
              <motion.div
                animate={shake ? {
                  x: [0, -8, 8, -8, 8, -4, 4, 0],
                } : { x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex justify-center gap-5"
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <PinDot
                    key={idx}
                    filled={pin.length > idx}
                    active={!isLocked && pin.length === idx}
                    error={shake}
                  />
                ))}
              </motion.div>

              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                disabled={isLocked || isLoading}
                aria-label="PIN input"
              />
            </div>

            {/* Error / Status message */}
            <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 20 }}>
              <AnimatePresence mode="wait">
                {isLocked && lockedUntil ? (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-center"
                  >
                    <LockoutCountdown lockedUntil={lockedUntil} />
                  </motion.div>
                ) : error ? (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: '0.78rem',
                      color: 'oklch(62% 0.24 25)',
                      margin: 0,
                    }}
                  >
                    {error.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isLocked && (
                <button
                  onClick={() => handleSubmit()}
                  disabled={pin.length < 6 || isLoading}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    fontFamily: 'Outfit, system-ui, sans-serif',
                    cursor: pin.length === 6 && !isLoading ? 'pointer' : 'not-allowed',
                    opacity: pin.length === 6 && !isLoading ? 1 : 0.4,
                    background: 'oklch(52% 0.28 285)',
                    color: 'oklch(97% 0.005 285)',
                    border: 'none',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 6px 20px rgba(109,40,217,0.4)',
                    transition: 'opacity 0.15s ease, transform 0.1s ease',
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isLoading ? 'Đang xác minh...' : 'Xác nhận'}
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }}
              >
                Hủy
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
