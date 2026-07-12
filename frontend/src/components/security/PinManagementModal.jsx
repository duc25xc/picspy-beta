import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, AlertCircle, RefreshCw, Key, Eye, EyeOff } from 'lucide-react'
import { changePin, resetPinRequest, resetPinVerify, disablePin, verifyPin } from '../../api/security.api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.store'

const WEAK_PINS = new Set([
  '000000','111111','222222','333333','444444','555555',
  '666666','777777','888888','999999','123456','654321',
  '012345','098765','123123','456456','789789',
])
function isWeakPin(p) {
  if (WEAK_PINS.has(p)) return true
  const d = p.split('').map(Number)
  return d.every((v,i) => i===0 || v===d[i-1]+1) || d.every((v,i) => i===0 || v===d[i-1]-1)
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

// ─── PIN Row Container ────────────────────────────────────────────────────────
const PinRow = ({ val, active, error, label, onFocus }) => (
  <div onClick={onFocus} className="cursor-text py-3 relative">
    {label && (
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.04em', fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: '0 0 10px', textAlign: 'center' }}>
        {label}
      </p>
    )}
    <motion.div
      animate={error ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.42 }}
      className="flex justify-center gap-4"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <PinDot
          key={i}
          filled={val.length > i}
          active={active && val.length === i}
          error={error}
        />
      ))}
    </motion.div>
  </div>
)

// ─── OTP 6-box Input ──────────────────────────────────────────────────────────
const OtpRow = ({ otp, setOtp, autoFocus }) => {
  const refs = Array.from({ length: 6 }, () => useRef(null)) // eslint-disable-line

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => refs[0].current?.focus(), 80)
    }
  }, [autoFocus]) // eslint-disable-line

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) refs[i + 1].current?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus()
  }
  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      refs[5].current?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-2.5">
      {otp.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center',
            borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'oklch(97% 0.005 285)',
            fontSize: '1.15rem', fontWeight: 700,
            fontFamily: 'monospace',
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'oklch(62% 0.16 270)'; e.currentTarget.style.background = 'rgba(121,134,235,0.06)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = v ? 'oklch(62% 0.16 270)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        />
      ))}
    </div>
  )
}

// ─── Timer Format ─────────────────────────────────────────────────────────────
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '9px 0',
      borderRadius: 10, border: 'none',
      fontFamily: 'Outfit, system-ui, sans-serif',
      fontSize: '0.82rem', fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      background: active ? 'rgba(121,134,235,0.15)' : 'transparent',
      color: active ? 'oklch(72% 0.12 270)' : 'rgba(255,255,255,0.35)',
      transition: 'all 0.18s ease',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </button>
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PinManagementModal({ isOpen, onClose, onSuccess, defaultTab = 'change' }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tab, setTab] = useState(defaultTab)

  // ── Change PIN states ──
  const [chgStep, setChgStep] = useState(1)  // 1=current, 2=new, 3=confirm
  const [chgCurrent, setChgCurrent] = useState('')
  const [chgNew, setChgNew] = useState('')
  const [chgConfirm, setChgConfirm] = useState('')
  const [chgWeak, setChgWeak] = useState(false)
  const [chgAcceptWeak, setChgAcceptWeak] = useState(false)
  const [chgShake, setChgShake] = useState(false)
  const [chgError, setChgError] = useState(null)
  const [chgLoading, setChgLoading] = useState(false)
  const [chgDone, setChgDone] = useState(false)

  // ── Disable PIN states ──
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [disError, setDisError] = useState(null)
  const [disLoading, setDisLoading] = useState(false)
  const [disDone, setDisDone] = useState(false)

  // ── Forgot PIN states ──
  const [fgtStep, setFgtStep] = useState(1)  // 1=request email, 2=verify OTP, 3=new PIN, 4=confirm PIN
  const [otp, setOtp] = useState(['','','','','',''])
  const [fgtNew, setFgtNew] = useState('')
  const [fgtConfirm, setFgtConfirm] = useState('')
  const [fgtWeak, setFgtWeak] = useState(false)
  const [fgtAcceptWeak, setFgtAcceptWeak] = useState(false)
  const [fgtShake, setFgtShake] = useState(false)
  const [fgtError, setFgtError] = useState(null)
  const [fgtLoading, setFgtLoading] = useState(false)
  const [fgtDone, setFgtDone] = useState(false)
  const [devBypass, setDevBypass] = useState(null)
  const [otpTimeLeft, setOtpTimeLeft] = useState(600) // 10 minutes

  const inputRef = useRef(null)

  const focusInput = useCallback(() => {
    if (tab === 'change' || (tab === 'forgot' && fgtStep >= 3)) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [tab, fgtStep])

  // Sync defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab)
      resetAll()
    }
  }, [isOpen]) // eslint-disable-line

  // Auto-focus on tab or step changes
  useEffect(() => {
    if (!isOpen) return
    if (tab === 'change') {
      const t = setTimeout(() => requestAnimationFrame(() => inputRef.current?.focus()), 80)
      return () => clearTimeout(t)
    } else if (tab === 'forgot' && fgtStep >= 3) {
      const t = setTimeout(() => requestAnimationFrame(() => inputRef.current?.focus()), 80)
      return () => clearTimeout(t)
    }
  }, [tab, chgStep, fgtStep, isOpen])

  // OTP countdown timer
  useEffect(() => {
    if (tab !== 'forgot' || fgtStep !== 2 || otpTimeLeft <= 0) return
    const timer = setInterval(() => {
      setOtpTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [tab, fgtStep, otpTimeLeft])

  const resetAll = () => {
    setChgStep(1); setChgCurrent(''); setChgNew(''); setChgConfirm('')
    setChgWeak(false); setChgAcceptWeak(false); setChgShake(false); setChgError(null); setChgLoading(false); setChgDone(false)
    setPassword(''); setShowPass(false); setDisError(null); setDisLoading(false); setDisDone(false)
    setFgtStep(1); setOtp(['','','','','','']); setFgtNew(''); setFgtConfirm('')
    setFgtWeak(false); setFgtAcceptWeak(false); setFgtShake(false); setFgtError(null); setFgtLoading(false); setFgtDone(false); setDevBypass(null)
    setOtpTimeLeft(600)
  }

  const triggerChgShake = () => {
    setChgShake(true)
    setTimeout(() => setChgShake(false), 500)
  }

  const triggerFgtShake = () => {
    setFgtShake(true)
    setTimeout(() => setFgtShake(false), 500)
  }

  // ── Verify Current PIN before advancing in Change flow ───────────────────────
  const verifyCurrentPin = async (currentVal) => {
    setChgLoading(true)
    setChgError(null)
    try {
      await verifyPin(currentVal)
      // Correct! Transition to step 2 with a processing delay
      setTimeout(() => {
        setChgStep(2)
        setChgLoading(false)
        // Double RAF: ensures DOM updates from step change settle before focus
        requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()))
      }, 300)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Mã PIN hiện tại không chính xác.'
      setChgError(msg)
      triggerChgShake()
      setChgCurrent('')
      setChgLoading(false)
      // Double RAF after setChgLoading(false) so readOnly is removed before focus
      requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()))
    }
  }

  // ── Input change handlers (Lag-free single input method) ──────────────────────
  const handleChgInputChange = (e) => {
    if (chgLoading || chgDone) return
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)

    if (chgStep === 1) {
      setChgCurrent(val)
      setChgError(null)
      if (val.length === 6) {
        verifyCurrentPin(val)
      }
    } else if (chgStep === 2) {
      setChgNew(val)
      setChgError(null)
      const weakCheck = isWeakPin(val)
      setChgWeak(weakCheck)
      if (!weakCheck) {
        setChgAcceptWeak(false)
      }
      if (val.length === 6 && !weakCheck) {
        setTimeout(() => {
          setChgStep(3)
        }, 300)
      }
    } else {
      setChgConfirm(val)
      setChgError(null)
      if (val.length === 6) {
        setTimeout(() => {
          submitChange(val)
        }, 300)
      }
    }
  }

  const handleFgtNewInputChange = (e) => {
    if (fgtLoading || fgtDone) return
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)

    if (fgtStep === 3) {
      setFgtNew(val)
      setFgtError(null)
      const weakCheck = isWeakPin(val)
      setFgtWeak(weakCheck)
      if (!weakCheck) {
        setFgtAcceptWeak(false)
      }
      if (val.length === 6 && !weakCheck) {
        setTimeout(() => {
          setFgtStep(4)
        }, 300)
      }
    } else {
      setFgtConfirm(val)
      setFgtError(null)
      if (val.length === 6) {
        setTimeout(() => {
          submitFgtReset(val)
        }, 300)
      }
    }
  }

  // ── Change PIN submission ───────────────────────────────────────────────────
  const advanceChgNew = () => {
    if (isWeakPin(chgNew) && !chgAcceptWeak) {
      triggerChgShake()
      setChgError('Mã PIN có độ bảo mật thấp. Vui lòng xác nhận để tiếp tục.')
      return
    }
    setChgStep(3)
    setChgError(null)
  }

  const submitChange = async (confirmValue) => {
    const nw = chgNew
    const cur = chgCurrent
    const conf = confirmValue || chgConfirm
    if (conf !== nw) {
      triggerChgShake()
      setChgConfirm('')
      setChgError('Mã PIN xác nhận không khớp. Nhập lại.')
      return
    }

    setChgLoading(true)
    setChgError(null)
    try {
      await changePin(cur, nw, chgAcceptWeak)
      setChgDone(true)
      toast.success('Đã đổi mã PIN thành công!')
      setTimeout(() => onSuccess(), 1400)
    } catch (err) {
      const code = err?.response?.data?.error
      const msg = err?.response?.data?.message || 'Đổi PIN thất bại.'
      triggerChgShake()
      setChgError(msg)
      // If error is incorrect current PIN, reset to Step 1
      if (code === 'WRONG_PIN') {
        setChgCurrent('')
        setChgNew('')
        setChgConfirm('')
        setChgStep(1)
      } else {
        setChgConfirm('')
      }
    } finally {
      setChgLoading(false)
    }
  }

  // ── Disable PIN submission ───────────────────────────────────────────────────
  const handleDisable = async (e) => {
    e.preventDefault()
    if (!password) return
    setDisLoading(true)
    setDisError(null)
    try {
      await disablePin(password)
      setDisDone(true)
      toast.success('Đã tắt mã PIN giao dịch!')
      setTimeout(() => onSuccess(), 1400)
    } catch (err) {
      console.error(err)
      const errCode = err.response?.data?.code
      const errMsg = err.response?.data?.message || 'Mật khẩu xác minh không đúng.'
      if (errCode === 'GOOGLE_USER_NO_PASSWORD' || err.response?.status === 403) {
        setDisError('GOOGLE_USER_NO_PASSWORD')
      } else {
        setDisError(errMsg)
      }
    } finally {
      setDisLoading(false)
    }
  }

  // ── Forgot PIN OTP actions ───────────────────────────────────────────────────
  const handleFgtRequestOtp = async () => {
    setFgtLoading(true)
    setFgtError(null)
    try {
      const { data } = await resetPinRequest()
      setDevBypass(data._devBypass || null)
      toast.success('Đã gửi mã xác minh về email của bạn!')
      setFgtStep(2)
      setOtpTimeLeft(600)
      setOtp(['','','','','',''])
    } catch (err) {
      setFgtError(err?.response?.data?.message || 'Không thể gửi email.')
    } finally {
      setFgtLoading(false)
    }
  }

  const handleFgtVerifyOtp = () => {
    const code = otp.join('')
    if (code.length !== 6) {
      setFgtError('Nhập đủ 6 số OTP.')
      return
    }
    setFgtStep(3)
    setFgtError(null)
  }

  const handleBypassClick = () => {
    if (!devBypass) return
    const code = devBypass.match(/\d+/)?.[0] || '000000'
    setOtp(code.split(''))
  }

  const advanceFgtNew = () => {
    if (isWeakPin(fgtNew) && !fgtAcceptWeak) {
      triggerFgtShake()
      setFgtError('Mã PIN có độ bảo mật thấp. Vui lòng xác nhận để tiếp tục.')
      return
    }
    setFgtStep(4)
    setFgtError(null)
  }

  const submitFgtReset = async (confirmValue) => {
    const nw = fgtNew
    const conf = confirmValue || fgtConfirm
    if (conf !== nw) {
      triggerFgtShake()
      setFgtConfirm('')
      setFgtError('Mã PIN xác nhận không khớp. Nhập lại.')
      return
    }

    setFgtLoading(true)
    setFgtError(null)
    try {
      await resetPinVerify(otp.join(''), nw, fgtAcceptWeak)
      setFgtDone(true)
      toast.success('Đặt lại PIN thành công!')
      setTimeout(() => onSuccess(), 1400)
    } catch (err) {
      setFgtError(err?.response?.data?.message || 'Không đặt lại được mã PIN.')
      triggerFgtShake()
      setFgtConfirm('')
    } finally {
      setFgtLoading(false)
    }
  }

  // Active values for key event capture
  const activeInputVal = tab === 'change'
    ? (chgStep === 1 ? chgCurrent : (chgStep === 2 ? chgNew : chgConfirm))
    : (fgtStep === 3 ? fgtNew : fgtConfirm)

  const anyDone = chgDone || disDone || fgtDone
  const anyLoading = chgLoading || disLoading || fgtLoading

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(10,10,16,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22,1,0.36,1] }}
            onClick={(e) => { e.stopPropagation(); focusInput() }}
            style={{
              background: 'rgba(22,22,34,0.94)', backdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 32px 80px rgba(0,0,0,0.55)',
              borderRadius: 22, padding: '32px 36px', width: '100%', maxWidth: 440,
              fontFamily: 'Outfit, system-ui, sans-serif', position: 'relative',
            }}
          >
            {/* Hidden Input Overlay for Lag-free Keyboard Capture */}
            {/* IMPORTANT: use readOnly not disabled — disabled causes browser to steal focus */}
            {(tab === 'change' || (tab === 'forgot' && fgtStep >= 3)) && (
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={activeInputVal}
                onChange={tab === 'change' ? handleChgInputChange : handleFgtNewInputChange}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                style={{ position:'absolute', opacity:0, width:1, height:1, pointerEvents:'none' }}
                aria-label="PIN manager input overlay"
                readOnly={anyLoading}
              />
            )}

            {/* Header Row: Title & Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Bảo mật giao dịch
              </span>
              {!anyLoading && !anyDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClose() }}
                  style={{
                    background:'rgba(255,255,255,0.06)', border:'none',
                    borderRadius: 10, width: 32, height: 32,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', color:'rgba(255,255,255,0.4)',
                    transition:'background 0.15s, color 0.15s',
                    zIndex: 20,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='rgba(255,255,255,0.7)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.4)' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Tab switch navigation */}
            {!anyDone && (
              <>
                <style>{`.tab-scroll-hide::-webkit-scrollbar { display: none; }`}</style>
                <div
                  className="tab-scroll-hide"
                  style={{
                    display:'flex', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4, marginBottom: 24,
                    overflowX: 'auto',
                  }}
                >
                  <TabBtn active={tab==='change'} onClick={(e)=>{e.stopPropagation();setTab('change');resetAll()}}>Đổi PIN</TabBtn>
                  <TabBtn active={tab==='disable'} onClick={(e)=>{e.stopPropagation();setTab('disable');resetAll()}}>Tắt PIN</TabBtn>
                  <TabBtn active={tab==='forgot'} onClick={(e)=>{e.stopPropagation();setTab('forgot');resetAll()}}>Quên PIN</TabBtn>
                </div>
              </>
            )}

            <AnimatePresence mode="wait">

              {/* ══════════════ TAB 1: CHANGE PIN ══════════════ */}
              {tab === 'change' && (
                <motion.div key="change" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.2}}>
                  {chgDone ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div style={{ width:56,height:56,borderRadius:18,background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                        <ShieldCheck size={26} color="oklch(72% 0.2 145)" />
                      </div>
                      <p style={{ fontWeight:700, fontSize:'1rem', color:'oklch(97% 0.005 285)', margin:0, textAlign:'center' }}>PIN đã đổi thành công!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p style={{ fontSize:'0.72rem',letterSpacing:'0.04em',fontWeight:600,color:'rgba(255,255,255,0.3)',textAlign:'center',margin:0 }}>
                        BƯỚC {chgStep}/3 — {['PIN HIỆN TẠI','PIN MỚI','XÁC NHẬN PIN MỚI'][chgStep-1]}
                      </p>

                      <PinRow
                        val={chgStep === 1 ? chgCurrent : (chgStep === 2 ? chgNew : chgConfirm)}
                        active={!chgLoading}
                        error={chgShake}
                        onFocus={focusInput}
                      />

                      {/* Error & Weak warning */}
                      <div style={{ minHeight:22, textAlign:'center' }}>
                        {chgError ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <AlertCircle size={12} color="oklch(62% 0.24 25)" />
                            <p style={{ fontSize:'0.75rem',color:'oklch(62% 0.24 25)',margin:0 }}>{chgError}</p>
                          </div>
                        ) : chgWeak && chgStep === 2 && chgNew.length === 6 ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-left space-y-2"
                          >
                            <div className="flex gap-2 text-[11px] text-amber-400 font-semibold">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              <span>Mã PIN có độ bảo mật thấp (dễ đoán).</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={chgAcceptWeak}
                                onChange={(e) => {
                                  setChgAcceptWeak(e.target.checked)
                                  setChgError(null)
                                }}
                                className="w-3.5 h-3.5 rounded bg-white/5 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0"
                              />
                              <span className="text-[10px] text-white/50 hover:text-white/80">
                                Tôi vẫn muốn sử dụng mã PIN này
                              </span>
                            </label>
                          </motion.div>
                        ) : null}
                      </div>

                      <button
                        onClick={() => chgStep === 1
                          ? (chgCurrent.length === 6 && verifyCurrentPin(chgCurrent))
                          : chgStep === 2 ? advanceChgNew() : submitChange()
                        }
                        disabled={
                          chgLoading ||
                          (chgStep === 1 ? chgCurrent.length < 6 :
                            chgStep === 2 ? (chgNew.length < 6 || (chgWeak && !chgAcceptWeak)) :
                            chgConfirm.length < 6)
                        }
                        style={{
                          width:'100%', padding:'12px 0', borderRadius:12, fontWeight:700, fontSize:'0.9rem',
                          fontFamily:'Outfit, system-ui, sans-serif',
                          cursor: !chgLoading && (chgStep === 1 ? chgCurrent.length === 6 : chgStep === 2 ? (chgNew.length === 6 && (!chgWeak || chgAcceptWeak)) : chgConfirm.length === 6) ? 'pointer' : 'not-allowed',
                          opacity: !chgLoading && (chgStep === 1 ? chgCurrent.length === 6 : chgStep === 2 ? (chgNew.length === 6 && (!chgWeak || chgAcceptWeak)) : chgConfirm.length === 6) ? 1 : 0.4,
                          background:'oklch(52% 0.28 285)', color:'oklch(97% 0.005 285)', border:'none',
                          boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(109,40,217,0.4)',
                          transition:'opacity 0.15s',
                        }}
                      >
                        {chgLoading ? 'Đang xử lý...' : chgStep < 3 ? 'Tiếp tục' : 'Hoàn tất'}
                      </button>

                      {chgStep > 1 && (
                        <button
                          onClick={() => {
                            if (chgStep === 2) {
                              setChgStep(1)
                              setChgNew('')
                            } else {
                              setChgStep(2)
                              setChgConfirm('')
                            }
                            setChgError(null)
                          }}
                          style={{
                            width: '100%', padding: '9px 0',
                            borderRadius: 12, fontWeight: 500, fontSize: '0.8rem',
                            fontFamily: 'Outfit, system-ui, sans-serif',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.15s',
                          }}
                        >
                          ← Quay lại
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════ TAB 2: DISABLE PIN ══════════════ */}
              {tab === 'disable' && (
                <motion.div key="disable" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.2}}>
                  {disDone ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div style={{ width:56,height:56,borderRadius:18,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                        <X size={26} color="oklch(62% 0.24 25)" />
                      </div>
                      <p style={{ fontWeight:700, fontSize:'1rem', color:'oklch(97% 0.005 285)', margin:0, textAlign:'center' }}>
                        Đã tắt mã PIN giao dịch!
                      </p>
                    </div>
                  ) : disError === 'GOOGLE_USER_NO_PASSWORD' ? (
                    <div className="space-y-4">
                      <p className="text-xs text-white/60 leading-relaxed">
                        Tài khoản của bạn đăng nhập qua Google và <strong className="text-white">chưa thiết lập mật khẩu</strong>.
                        Để tắt mã PIN, bạn bắt buộc phải tạo mật khẩu tài khoản trước.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          if (user?.username) {
                            navigate(`/profile/${user.username}?edit=true&tab=password`)
                          }
                        }}
                        style={{
                          width:'100%',padding:'12px 0',borderRadius:12,fontWeight:700,fontSize:'0.9rem',
                          fontFamily:'Outfit, system-ui, sans-serif',
                          cursor: 'pointer',
                          background:'oklch(52% 0.28 285)',color:'oklch(97% 0.005 285)',border:'none',
                          boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(109,40,217,0.4)',
                        }}
                      >
                        Đặt mật khẩu ngay
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleDisable} className="space-y-4">
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Để tắt mã PIN, vui lòng xác nhận mật khẩu tài khoản. Sau khi tắt, yêu cầu rút tiền sẽ không cần PIN.
                      </p>

                      <div className="relative">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 z-10" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          placeholder="Mật khẩu đăng nhập"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 42px 12px 38px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 12,
                            color: '#fff',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                        >
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {disError && (
                        <div className="flex justify-center gap-1.5 text-center">
                          <AlertCircle size={12} color="oklch(62% 0.24 25)" className="mt-0.5 shrink-0" />
                          <p style={{ fontSize:'0.75rem',color:'oklch(62% 0.24 25)',margin:0 }}>{disError}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!password || disLoading}
                        style={{
                          width:'100%',padding:'12px 0',borderRadius:12,fontWeight:700,fontSize:'0.9rem',
                          fontFamily:'Outfit, system-ui, sans-serif',
                          cursor: password && !disLoading ? 'pointer' : 'not-allowed',
                          opacity: password && !disLoading ? 1 : 0.4,
                          background:'oklch(62% 0.24 25)',color:'oklch(97% 0.005 285)',border:'none',
                          boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(239,68,68,0.25)',
                          transition:'opacity 0.15s',
                        }}
                      >
                        {disLoading ? 'Đang thực hiện...' : 'Xác nhận tắt PIN'}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ══════════════ TAB 3: FORGOT PIN ══════════════ */}
              {tab === 'forgot' && (
                <motion.div key="forgot" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.2}}>
                  {fgtDone ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                      <div style={{ width:56,height:56,borderRadius:18,background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                        <ShieldCheck size={26} color="oklch(72% 0.2 145)" />
                      </div>
                      <p style={{ fontWeight:700,fontSize:'1rem',color:'oklch(97% 0.005 285)',margin:0,textAlign:'center' }}>PIN đã được đặt lại!</p>
                    </div>
                  ) : fgtStep === 1 ? (
                    /* Step 1: Request OTP */
                    <div className="flex flex-col gap-4">
                      <p style={{ fontSize:'0.82rem',color:'rgba(255,255,255,0.55)',margin:0,textAlign:'center',lineHeight:1.6 }}>
                        Một mã xác minh sẽ được gửi đến hòm thư liên kết của tài khoản.
                      </p>
                      <button onClick={handleFgtRequestOtp} disabled={fgtLoading}
                        style={{
                          width:'100%',padding:'12px 0',borderRadius:12,fontWeight:700,fontSize:'0.9rem',
                          fontFamily:'Outfit, system-ui, sans-serif', cursor:fgtLoading?'not-allowed':'pointer',
                          opacity:fgtLoading?0.5:1, background:'oklch(52% 0.28 285)',
                          color:'oklch(97% 0.005 285)',border:'none',
                          boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(109,40,217,0.4)',
                          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                        }}>
                        {fgtLoading ? 'Đang gửi...' : <><RefreshCw size={14} /> Gửi mã xác minh</>}
                      </button>
                      {fgtError && <p style={{ fontSize:'0.75rem',color:'oklch(62% 0.24 25)',textAlign:'center',margin:0 }}>{fgtError}</p>}
                    </div>
                  ) : fgtStep === 2 ? (
                    /* Step 2: OTP verify — with countdown, bypass, and resend */
                    <div className="flex flex-col gap-4">
                      <div className="text-center">
                        <p style={{ fontSize:'0.82rem',color:'rgba(255,255,255,0.5)',margin:'0 0 4px' }}>
                          Nhập mã 6 số được gửi trong hòm thư của bạn.
                        </p>
                      </div>

                      <OtpRow otp={otp} setOtp={setOtp} autoFocus={fgtStep === 2} />

                      {/* Timer countdown */}
                      <div className="flex justify-between items-center text-xs px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <span>Mã có hiệu lực trong:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: otpTimeLeft <= 60 ? 'oklch(62% 0.24 25)' : 'oklch(62% 0.16 270)' }}>
                          {formatTime(otpTimeLeft)}
                        </span>
                      </div>

                      {devBypass && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={handleBypassClick}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: '10px 14px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(121,134,235,0.08)'; e.currentTarget.style.borderColor = 'rgba(121,134,235,0.2)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                        >
                          <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.35)', margin:'0 0 4px', fontWeight: 500 }}>Dev Bypass — Click để tự động nhập</p>
                          <code style={{
                            fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
                            color: 'oklch(72% 0.14 270)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '3px 10px', borderRadius: 6,
                            letterSpacing: '0.15em',
                          }}>
                            {devBypass.match(/\d+/)?.[0] || '000000'}
                          </code>
                        </motion.div>
                      )}

                      {fgtError && <p style={{ fontSize:'0.75rem',color:'oklch(62% 0.24 25)',textAlign:'center',margin:0 }}>{fgtError}</p>}

                      <div className="flex flex-col gap-2">
                        <button onClick={handleFgtVerifyOtp} disabled={otp.filter(Boolean).length<6||fgtLoading}
                          style={{
                            width:'100%',padding:'12px 0',borderRadius:12,fontWeight:700,fontSize:'0.9rem',
                            fontFamily:'Outfit, system-ui, sans-serif',
                            cursor:otp.filter(Boolean).length===6&&!fgtLoading?'pointer':'not-allowed',
                            opacity:otp.filter(Boolean).length===6&&!fgtLoading?1:0.4,
                            background:'oklch(52% 0.28 285)',color:'oklch(97% 0.005 285)',border:'none',
                            boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(109,40,217,0.4)',
                            transition:'opacity 0.15s',
                          }}>
                          Xác minh mã
                        </button>

                        <button
                          onClick={handleFgtRequestOtp}
                          disabled={fgtLoading}
                          style={{
                            width: '100%', padding: '9px 0',
                            borderRadius: 12, fontWeight: 500, fontSize: '0.8rem',
                            fontFamily: 'Outfit, system-ui, sans-serif',
                            cursor: fgtLoading ? 'not-allowed' : 'pointer',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.15s, color 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          <RefreshCw size={12} /> Gửi lại mã
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Steps 3 & 4: New PIN & Confirm */
                    <div className="space-y-4">
                      <p style={{ fontSize:'0.72rem',letterSpacing:'0.04em',fontWeight:600,color:'rgba(255,255,255,0.3)',textAlign:'center',margin:0 }}>
                        BƯỚC {fgtStep}/4 — {fgtStep === 3 ? 'PIN MỚI' : 'XÁC NHẬN PIN MỚI'}
                      </p>

                      <PinRow
                        val={fgtStep === 3 ? fgtNew : fgtConfirm}
                        active={!fgtLoading}
                        error={fgtShake}
                        onFocus={focusInput}
                      />

                      {/* Error & Warning checkbox */}
                      <div style={{ minHeight:22, textAlign:'center' }}>
                        {fgtError ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <AlertCircle size={12} color="oklch(62% 0.24 25)" />
                            <p style={{ fontSize:'0.75rem',color:'oklch(62% 0.24 25)',margin:0 }}>{fgtError}</p>
                          </div>
                        ) : fgtWeak && fgtStep === 3 && fgtNew.length === 6 ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-left space-y-2"
                          >
                            <div className="flex gap-2 text-[11px] text-amber-400 font-semibold">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              <span>Mã PIN có độ bảo mật thấp (dễ đoán).</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={fgtAcceptWeak}
                                onChange={(e) => {
                                  setFgtAcceptWeak(e.target.checked)
                                  setFgtError(null)
                                }}
                                className="w-3.5 h-3.5 rounded bg-white/5 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0"
                              />
                              <span className="text-[10px] text-white/50 hover:text-white/80">
                                Tôi vẫn muốn sử dụng mã PIN này
                              </span>
                            </label>
                          </motion.div>
                        ) : null}
                      </div>

                      <button
                        onClick={() => fgtStep === 3 ? advanceFgtNew() : submitFgtReset()}
                        disabled={
                          fgtLoading ||
                          (fgtStep === 3 ? (fgtNew.length < 6 || (fgtWeak && !fgtAcceptWeak)) : fgtConfirm.length < 6)
                        }
                        style={{
                          width:'100%',padding:'12px 0',borderRadius:12,fontWeight:700,fontSize:'0.9rem',
                          fontFamily:'Outfit, system-ui, sans-serif',
                          cursor: !fgtLoading && (fgtStep === 3 ? (fgtNew.length === 6 && (!fgtWeak || fgtAcceptWeak)) : fgtConfirm.length === 6) ? 'pointer' : 'not-allowed',
                          opacity: !fgtLoading && (fgtStep === 3 ? (fgtNew.length === 6 && (!fgtWeak || fgtAcceptWeak)) : fgtConfirm.length === 6) ? 1 : 0.4,
                          background:'oklch(52% 0.28 285)',color:'oklch(97% 0.005 285)',border:'none',
                          boxShadow:'inset 0 1.5px 0 rgba(255,255,255,0.28),inset 0 -2px 0 rgba(0,0,0,0.22),0 6px 20px rgba(109,40,217,0.4)',
                          transition:'opacity 0.15s',
                        }}
                      >
                        {fgtLoading ? 'Đang lưu...' : fgtStep === 3 ? 'Tiếp tục' : 'Hoàn tất'}
                      </button>

                      {fgtStep === 4 && (
                        <button
                          onClick={() => {
                            setFgtStep(3)
                            setFgtConfirm('')
                            setFgtError(null)
                          }}
                          style={{
                            width: '100%', padding: '9px 0',
                            borderRadius: 12, fontWeight: 500, fontSize: '0.8rem',
                            fontFamily: 'Outfit, system-ui, sans-serif',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.15s',
                          }}
                        >
                          ← Quay lại
                        </button>
                      )}
                    </div>
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
