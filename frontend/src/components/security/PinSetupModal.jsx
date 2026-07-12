import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, AlertCircle } from 'lucide-react'
import { setupPin } from '../../api/security.api'
import toast from 'react-hot-toast'

// ─── Weak PIN set ─────────────────────────────────────────────────────────────
const WEAK_PINS = new Set([
  '000000', '111111', '222222', '333333', '444444',
  '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '098765',
  '123123', '456456', '789789',
])

function isWeakPin(pin) {
  if (WEAK_PINS.has(pin)) return true
  const digits = pin.split('').map(Number)
  const isAsc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1)
  const isDesc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1)
  return isAsc || isDesc
}

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

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepBadge = ({ current, total }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 9999,
    background: 'rgba(121,134,235,0.1)',
    border: '1px solid rgba(121,134,235,0.2)',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'oklch(72% 0.12 270)',
    letterSpacing: '0.04em',
    fontFamily: 'Outfit, system-ui, sans-serif',
  }}>
    BƯỚC {current}/{total}
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PinSetupModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1)  // 1 = Enter new PIN, 2 = Confirm PIN, 3 = Success
  const [pinVal, setPinVal] = useState('')
  const [confirmVal, setConfirmVal] = useState('')
  const [isWeak, setIsWeak] = useState(false)
  const [acceptWeak, setAcceptWeak] = useState(false)
  const [error, setError] = useState(null)
  const [shake, setShake] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const inputRef = useRef(null)

  const focusInput = useCallback(() => {
    console.log('[DEBUG PinSetupModal] focusInput triggered programmatically.');
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetAll()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Re-focus whenever step changes (step 1 → 2 transition)
  useEffect(() => {
    if (!isOpen || done) return
    // Slightly longer delay so AnimatePresence exit animation finishes before focus
    const t = setTimeout(() => {
      requestAnimationFrame(() => inputRef.current?.focus())
    }, 80)
    return () => clearTimeout(t)
  }, [step, isOpen, done])

  const resetAll = () => {
    setStep(1)
    setPinVal('')
    setConfirmVal('')
    setIsWeak(false)
    setAcceptWeak(false)
    setError(null)
    setShake(false)
    setIsLoading(false)
    setIsProcessing(false)
    setDone(false)
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleInputChange = (e) => {
    if (isLoading || done || isProcessing) return
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    
    if (step === 1) {
      setPinVal(val)
      setError(null)
      const weakCheck = isWeakPin(val)
      setIsWeak(weakCheck)
      if (!weakCheck) {
        setAcceptWeak(false)
      }
      
      // Auto advance only if it is NOT weak PIN with 300ms processing delay
      if (val.length === 6 && !weakCheck) {
        setIsProcessing(true)
        setTimeout(() => {
          handleStep1Complete(val)
          setIsProcessing(false)
        }, 300)
      }
    } else {
      setConfirmVal(val)
      setError(null)
      if (val.length === 6) {
        setIsProcessing(true)
        setTimeout(() => {
          handleFinalSubmit(val)
          setIsProcessing(false)
        }, 300)
      }
    }
  }

  const handleStep1Complete = (pinString) => {
    const finalPin = pinString || pinVal
    if (isWeakPin(finalPin) && !acceptWeak) {
      triggerShake()
      setError('Mã PIN có độ bảo mật thấp. Vui lòng xác nhận đồng ý sử dụng.')
      return
    }
    // Proceed to confirmation step
    setStep(2)
    setError(null)
  }

  const handleFinalSubmit = async (confirmString) => {
    const confirmValString = confirmString || confirmVal
    const originalPin = pinVal
    if (confirmValString !== originalPin) {
      triggerShake()
      setConfirmVal('')
      setError('Mã PIN xác thực không khớp. Vui lòng nhập lại.')
      // Double RAF: ensures React finishes re-render then DOM paints before focus
      requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const { data } = await setupPin(originalPin, acceptWeak)
      setDone(true)
      toast.success('Mã PIN đã được thiết lập thành công!')
      setTimeout(() => {
        onSuccess(data?.pinCreatedAt)
      }, 1400)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Thiết lập PIN giao dịch thất bại.'
      setError(msg)
      triggerShake()
      setConfirmVal('')
    } finally {
      setIsLoading(false)
      // Double RAF after isLoading → false (readOnly removed) so browser registers input as focusable
      requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()))
    }
  }

  const activeVal = step === 1 ? pinVal : confirmVal

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
            {/* Close button */}
            {!isLoading && !done && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose() }}
                style={{
                  position: 'absolute', top: 18, right: 18,
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  borderRadius: 10, width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                  transition: 'background 0.15s, color 0.15s',
                  zIndex: 20,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >
                <X size={15} className="m-auto" />
              </button>
            )}

            {/* Hidden Input Overlay for Lag-free Keyboard Capture */}
            {/* NOTE: never set disabled here — browser moves focus away from disabled inputs */}
            {!done && (
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={activeVal}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                aria-label="PIN Setup Input"
                readOnly={isLoading || isProcessing}
              />
            )}

            <AnimatePresence mode="wait">
              {done ? (
                /* ─── Success State ─────────────────────────────────────── */
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-4 py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    style={{
                      width: 64, height: 64, borderRadius: 20,
                      background: 'rgba(74,222,128,0.12)',
                      border: '1px solid rgba(74,222,128,0.3)',
                      display: 'flex', alignItems: 'center', justifyCenter: 'center',
                    }}
                  >
                    <ShieldCheck size={30} color="oklch(72% 0.2 145)" className="m-auto" />
                  </motion.div>
                  <div className="text-center">
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'oklch(97% 0.005 285)', margin: 0 }}>
                      Đã thiết lập mã PIN!
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                      Giao dịch của bạn đã được bảo mật an toàn.
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* ─── Step 1 or 2 ───────────────────────────────────────── */
                <motion.div
                  key={`step-${step}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <StepBadge current={step} total={2} />
                    <div className="text-center">
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'oklch(97% 0.005 285)', letterSpacing: '-0.02em', margin: 0 }}>
                        {step === 1 ? 'Thiết lập PIN giao dịch' : 'Xác nhận mã PIN'}
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {step === 1
                          ? 'Thiết lập mã PIN 6 số để bảo vệ giao dịch của bạn.'
                          : 'Nhập lại mã PIN để xác nhận.'}
                      </p>
                    </div>
                  </div>

                  {/* Input Overlay Container */}
                  <div className="relative mb-2 py-2" onClick={focusInput} style={{ cursor: 'text' }}>
                    <motion.div
                      animate={shake ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="flex justify-center gap-5"
                    >
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <PinDot
                          key={idx}
                          filled={activeVal.length > idx}
                          active={step === 1 ? (pinVal.length === idx) : (confirmVal.length === idx)}
                          error={shake}
                        />
                      ))}
                    </motion.div>
                  </div>

                  {/* Error / Warning Area */}
                  <div style={{ minHeight: 24, textAlign: 'center', margin: '8px 0 16px' }}>
                    <AnimatePresence mode="wait">
                      {error ? (
                        <motion.div
                          key="err"
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <AlertCircle size={12} color="oklch(62% 0.24 25)" />
                          <p style={{ fontSize: '0.75rem', color: 'oklch(62% 0.24 25)', margin: 0 }}>{error}</p>
                        </motion.div>
                      ) : isWeak && step === 1 && pinVal.length === 6 ? (
                        /* Weak PIN UI Checkbox */
                        <motion.div
                          key="weak-warning"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-left space-y-2"
                        >
                          <div className="flex gap-2 text-[11px] text-amber-400 font-semibold">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>Mã PIN này có độ bảo mật thấp (dễ đoán).</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={acceptWeak}
                              onChange={(e) => {
                                setAcceptWeak(e.target.checked)
                                setError(null)
                              }}
                              className="w-3.5 h-3.5 rounded bg-white/5 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-[10px] text-white/50 hover:text-white/80 transition-colors">
                              Tôi vẫn muốn sử dụng mã PIN này
                            </span>
                          </label>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Submit buttons */}
                  <button
                    onClick={() => step === 1
                      ? handleStep1Complete()
                      : handleFinalSubmit()
                    }
                    disabled={activeVal.length < 6 || isLoading || (step === 1 && isWeak && !acceptWeak)}
                    style={{
                      width: '100%', padding: '11px 0',
                      borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
                      fontFamily: 'Outfit, system-ui, sans-serif',
                      cursor: activeVal.length === 6 && !isLoading && !(step === 1 && isWeak && !acceptWeak) ? 'pointer' : 'not-allowed',
                      opacity: activeVal.length === 6 && !isLoading && !(step === 1 && isWeak && !acceptWeak) ? 1 : 0.4,
                      background: 'oklch(52% 0.28 285)',
                      color: 'oklch(97% 0.005 285)',
                      border: 'none',
                      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.22), 0 6px 20px rgba(109,40,217,0.4)',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isLoading ? 'Đang lưu...' : step === 1 ? 'Tiếp tục' : 'Hoàn tất'}
                  </button>

                  {step === 2 && (
                    <button
                      onClick={() => {
                        setStep(1)
                        setConfirmVal('')
                        setError(null)
                        setTimeout(focusInput, 50)
                      }}
                      style={{
                        width: '100%', padding: '9px 0', marginTop: 8,
                        borderRadius: 12, fontWeight: 500, fontSize: '0.82rem',
                        fontFamily: 'Outfit, system-ui, sans-serif',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.4)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      ← Nhập lại PIN mới
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
