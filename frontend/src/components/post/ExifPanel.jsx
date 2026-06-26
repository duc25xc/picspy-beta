import { useMemo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Aperture, Zap, Focus, Timer, Calendar, Cpu, Crosshair, Copy, Check,
  SunDim, ZapOff, Sun,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────── */

/** HEX → { h, s, l } (0-360, 0-100, 0-100) */
const hexToHsl = (hex) => {
  const c = hex.replace('#', '')
  let r = parseInt(c.slice(0, 2), 16) / 255
  let g = parseInt(c.slice(2, 4), 16) / 255
  let b = parseInt(c.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      default: h = ((r - g) / d + 4) / 6
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Suy ra tên màu xấp xỉ từ HSL */
const getColorName = ({ h, s, l }) => {
  if (l < 12) return 'Đen'
  if (l > 88) return 'Trắng'
  if (s < 12) return l < 50 ? 'Xám đậm' : 'Xám nhạt'
  if (h < 15 || h >= 345) return 'Đỏ'
  if (h < 40)  return 'Cam'
  if (h < 65)  return 'Vàng'
  if (h < 150) return 'Xanh lá'
  if (h < 185) return 'Xanh lam nhạt'
  if (h < 255) return 'Xanh dương'
  if (h < 285) return 'Tím'
  if (h < 320) return 'Hồng tím'
  return 'Hồng'
}

/** HEX → { r, g, b } */
const hexToRgb = (hex) => {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  }
}

/* ─────────────────────────────────────────────────────────────────
   MiniHistogram — SVG gradient RGB chart
───────────────────────────────────────────────────────────────── */
const MiniHistogram = ({ histogram }) => {
  const W = 260, H = 72

  const makeAreaPath = useCallback((data) => {
    if (!data?.length) return ''
    const step = W / (data.length - 1)
    let d = `M0,${H}`
    data.forEach((val, i) => {
      const x = i * step
      const y = H - (val / 100) * H
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`
    })
    d += ` L${W},${H} Z`
    return d
  }, [])

  const rPath = useMemo(() => makeAreaPath(histogram?.r), [histogram?.r])
  const gPath = useMemo(() => makeAreaPath(histogram?.g), [histogram?.g])
  const bPath = useMemo(() => makeAreaPath(histogram?.b), [histogram?.b])

  if (!histogram?.r?.length) return null

  return (
    <div>
      <p className="text-[10px] text-white/25 mb-2 font-medium tracking-wider uppercase">
        Histogram
      </p>
      <div className="bg-black/50 rounded-xl border border-white/8 overflow-hidden">
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradient fill cho từng kênh */}
            <linearGradient id="grad-r" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(239,68,68)"  stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="grad-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34,197,94)"  stopOpacity="0.45" />
              <stop offset="100%" stopColor="rgb(34,197,94)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="grad-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.50" />
              <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Grid ngang */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line key={pct}
              x1="0" x2={W} y1={H * pct} y2={H * pct}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
            />
          ))}
          {/* Grid dọc (chia 4 vùng 0/64/128/192/255) */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line key={`v-${pct}`}
              x1={W * pct} x2={W * pct} y1="0" y2={H}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"
            />
          ))}

          {/* Kênh Blue — vẽ đầu tiên (dưới cùng) */}
          <motion.path d={bPath} fill="url(#grad-b)" stroke="rgba(99,102,241,0.7)" strokeWidth="1"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
          {/* Kênh Green */}
          <motion.path d={gPath} fill="url(#grad-g)" stroke="rgba(34,197,94,0.6)" strokeWidth="1"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }} />
          {/* Kênh Red — vẽ trên cùng */}
          <motion.path d={rPath} fill="url(#grad-r)" stroke="rgba(239,68,68,0.7)" strokeWidth="1"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} />

          {/* Trục X labels */}
          {['0', '64', '128', '192', '255'].map((label, i) => (
            <text key={label}
              x={i === 0 ? 2 : i === 4 ? W - 2 : (W / 4) * i}
              y={H - 2}
              fontSize="7" fill="rgba(255,255,255,0.2)"
              textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            >
              {label}
            </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-white/6 justify-center">
          {[
            { label: 'R', color: 'bg-red-500' },
            { label: 'G', color: 'bg-green-500' },
            { label: 'B', color: 'bg-indigo-500' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-[9px] text-white/30">
              <span className={`w-2 h-2 rounded-sm ${color} opacity-70`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Color Palette Table — nâng cấp full
───────────────────────────────────────────────────────────────── */
const ColorPaletteTable = ({ palette }) => {
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleCopy = useCallback((hex, idx) => {
    navigator.clipboard?.writeText(hex).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }, [])

  if (!palette?.length) return null

  const colors = palette.slice(0, 6).map((hex) => {
    const rgb = hexToRgb(hex)
    const hsl = hexToHsl(hex)
    return { hex, rgb, hsl, name: getColorName(hsl) }
  })

  return (
    <div>
      <p className="text-[10px] text-white/25 mb-2 font-medium tracking-wider uppercase">
        Bảng mã màu
      </p>
      <div className="bg-black/50 rounded-xl border border-white/8 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[28px_1fr_72px_68px] gap-0 border-b border-white/8 px-2 py-1.5">
          {['', 'HEX / Tên', 'RGB', 'HSL'].map((h) => (
            <span key={h} className="text-[9px] text-white/20 font-medium uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {colors.map(({ hex, rgb, hsl, name }, i) => (
          <motion.div
            key={hex}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 + 0.15 }}
            onClick={() => handleCopy(hex, i)}
            className="grid grid-cols-[28px_1fr_72px_68px] gap-0 items-center px-2 py-2
              border-b border-white/5 last:border-0
              hover:bg-white/5 active:bg-white/8 cursor-pointer transition-colors group"
            title="Click để copy HEX"
          >
            {/* Swatch */}
            <div className="flex items-center">
              <div
                className="w-5 h-5 rounded-md border border-white/15 shadow-md flex-shrink-0"
                style={{ backgroundColor: hex }}
              />
            </div>

            {/* HEX + Name */}
            <div className="min-w-0 pr-1">
              <p className="text-[11px] text-white/65 font-mono leading-none">{hex.toUpperCase()}</p>
              <p className="text-[9px] text-white/30 mt-0.5 leading-none">{name}</p>
            </div>

            {/* RGB */}
            <div>
              <p className="text-[9px] text-white/30 font-mono leading-snug">
                {rgb.r},{rgb.g},{rgb.b}
              </p>
            </div>

            {/* HSL + Copy icon */}
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] text-white/25 font-mono leading-snug">
                {hsl.h}°{hsl.s}%{hsl.l}%
              </p>
              <AnimatePresence mode="wait">
                {copiedIdx === i ? (
                  <motion.span key="check"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="text-emerald-400 flex-shrink-0"
                  >
                    <Check size={10} />
                  </motion.span>
                ) : (
                  <motion.span key="copy"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="text-white/0 group-hover:text-white/30 transition-colors flex-shrink-0"
                  >
                    <Copy size={10} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   ExifStat Card — nổi bật với color-coded badge
───────────────────────────────────────────────────────────────── */

/** Map từng loại thông số → màu accent + style */
const STAT_STYLES = {
  'ISO':       { ring: 'border-amber-500/40',  icon: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-300',   mono: true  },
  'Khẩu độ':  { ring: 'border-violet-500/40', icon: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-300', mono: true  },
  'Tốc độ':   { ring: 'border-cyan-500/40',   icon: 'text-cyan-400',    badge: 'bg-cyan-500/15 text-cyan-300',     mono: true  },
  'Tiêu cự':  { ring: 'border-emerald-500/40',icon: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300',mono: true },
  'EV':        { ring: 'border-orange-500/40', icon: 'text-orange-400',  badge: 'bg-orange-500/15 text-orange-300', mono: true  },
  'Flash':     { ring: 'border-yellow-500/40', icon: 'text-yellow-400',  badge: 'bg-yellow-500/15 text-yellow-300', mono: false },
  'Thiết bị': { ring: 'border-white/15',      icon: 'text-white/50',    badge: 'bg-white/8 text-white/60',         mono: false },
  'Ống kính': { ring: 'border-white/12',      icon: 'text-white/40',    badge: 'bg-white/6 text-white/50',         mono: false },
  'Ngày chụp':{ ring: 'border-slate-500/30',  icon: 'text-slate-400',   badge: 'bg-slate-500/15 text-slate-300',   mono: false },
  'Phần mềm': { ring: 'border-white/10',      icon: 'text-white/35',    badge: 'bg-white/5 text-white/40',         mono: false },
  'Cân bằng trắng': { ring: 'border-amber-500/30', icon: 'text-amber-300',  badge: 'bg-amber-500/10 text-amber-200',   mono: false },
}

const ExifStatCard = ({ icon: Icon, label, value, delay = 0 }) => {
  const style = STAT_STYLES[label] || STAT_STYLES['Phần mềm']
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className={`relative flex flex-col gap-1.5 p-2.5 rounded-xl border
        bg-white/[0.03] backdrop-blur-sm
        hover:bg-white/[0.06] transition-colors cursor-default
        ${style.ring}`}
    >
      {/* Icon + Label */}
      <div className="flex items-center gap-1.5">
        <Icon size={11} className={`flex-shrink-0 ${style.icon}`} />
        <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium leading-none">
          {label}
        </span>
      </div>
      {/* Value Badge */}
      <span className={`inline-block px-2 py-1 rounded-lg text-[11px] font-semibold leading-none
        ${style.badge} ${style.mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Section Divider
───────────────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p className="text-[9px] text-white/20 mb-2 font-semibold tracking-[0.12em] uppercase flex items-center gap-2">
    <span className="flex-1 h-px bg-white/8" />
    {children}
    <span className="flex-1 h-px bg-white/8" />
  </p>
)

/* ─────────────────────────────────────────────────────────────────
   Main ExifPanel
   compact = true → hiện dạng inline pills gọn (dùng trong modal)
   compact = false → hiện full grid + histogram + color table (dùng trong detail page)
───────────────────────────────────────────────────────────────── */
const ExifPanel = ({ exifData, histogram, colorPalette, compact = false }) => {
  const hasExif      = exifData && Object.keys(exifData).length > 0
  const hasHistogram = histogram?.r?.length > 0
  const hasColorTable = colorPalette?.length > 0

  if (!hasExif && !hasHistogram && !hasColorTable) return null

  /* Danh sách stats ưu tiên theo thứ tự quan trọng */
  const primaryStats = []   // ISO, Aperture, Shutter, Focal → grid 2 cột
  const secondaryStats = [] // Camera, Lens, Date, Software → grid 1 cột nhỏ

  if (exifData?.iso)          primaryStats.push({ icon: Zap,       label: 'ISO',      value: `ISO ${exifData.iso}` })
  if (exifData?.aperture)     primaryStats.push({ icon: Aperture,  label: 'Khẩu độ', value: exifData.aperture })
  if (exifData?.shutterSpeed) primaryStats.push({ icon: Timer,     label: 'Tốc độ',  value: exifData.shutterSpeed })
  if (exifData?.focalLength)  primaryStats.push({ icon: Crosshair, label: 'Tiêu cự', value: exifData.focalLength })
  if (exifData?.ev !== undefined) primaryStats.push({ icon: SunDim, label: 'EV', value: `EV ${exifData.ev > 0 ? '+' : ''}${exifData.ev}` })
  if (exifData?.flash !== undefined) primaryStats.push({ icon: ZapOff, label: 'Flash', value: exifData.flash ? 'Đã bật đèn' : 'Không đèn' })
  if (exifData?.whiteBalance) primaryStats.push({ icon: Sun, label: 'Cân bằng trắng', value: exifData.whiteBalance })

  if (exifData?.camera)     secondaryStats.push({ icon: Camera,   label: 'Thiết bị',  value: exifData.camera })
  if (exifData?.lensModel)  secondaryStats.push({ icon: Focus,    label: 'Ống kính',  value: exifData.lensModel })
  if (exifData?.dateTaken)  secondaryStats.push({ icon: Calendar, label: 'Ngày chụp', value: new Date(exifData.dateTaken).toLocaleDateString('vi-VN') })
  if (exifData?.software)   secondaryStats.push({ icon: Cpu,      label: 'Phần mềm', value: exifData.software })

  const allStats = [...primaryStats, ...secondaryStats]

  /* ═══════════ COMPACT MODE (Modal xem nhanh) ═══════════════ */
  if (compact) {
    if (!hasExif) return null
    return (
      <div className="px-5 py-2.5 border-b border-white/8">
        <div className="flex flex-wrap gap-1.5">
          {allStats.slice(0, 6).map((s, i) => (
            <motion.span
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg
                bg-white/[0.04] border border-white/8
                text-[10px] text-white/50 font-medium"
            >
              <s.icon size={10} className="text-white/30 flex-shrink-0" />
              {s.value}
            </motion.span>
          ))}
        </div>
      </div>
    )
  }

  /* ═══════════ FULL MODE (Detail Page) ═══════════════════════ */
  return (
    <div className="px-4 py-3 border-b border-white/8 space-y-4">

      {/* ── EXIF Stats ── */}
      {allStats.length > 0 && (
        <div>
          <SectionLabel>📷 Thông số chụp</SectionLabel>

          {/* Primary: ISO / Aperture / Shutter / FocalLength — nổi bật */}
          {primaryStats.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              {primaryStats.map((s, i) => (
                <ExifStatCard key={s.label} icon={s.icon} label={s.label} value={s.value} delay={i * 0.05} />
              ))}
            </div>
          )}

          {/* Secondary: Camera / Lens / Date / Software — nhỏ hơn */}
          {secondaryStats.length > 0 && (
            <div className="space-y-0">
              {secondaryStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (primaryStats.length + i) * 0.05 + 0.1, duration: 0.25 }}
                  className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/8
                    flex items-center justify-center flex-shrink-0">
                    <s.icon size={11} className="text-white/40" />
                  </div>
                  <span className="text-[9px] text-white/25 uppercase tracking-wider w-14 flex-shrink-0">
                    {s.label}
                  </span>
                  <span className="text-[11px] text-white/65 font-medium truncate flex-1 min-w-0">
                    {s.value}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Histogram ── */}
      {hasHistogram && (
        <div>
          <MiniHistogram histogram={histogram} />
        </div>
      )}

      {/* ── Color Palette Table ── */}
      {hasColorTable && (
        <div>
          <ColorPaletteTable palette={colorPalette} />
        </div>
      )}
    </div>
  )
}

export default ExifPanel

