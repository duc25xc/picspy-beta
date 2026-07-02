import React from 'react'
import { useSettings } from '../../context/SettingsContext'

/**
 * BrandLogo — Logo chữ PICSPY (wave nhỹ dùng trong Navbar/Footer)
 * Sử dụng text-wave-loader CSS - luôn hiển thị đúng size, đúng phong cách, không bị lổi UX.
 */
export const BrandLogo = ({ size = 'sm', className = '' }) => {
  const sizeCls =
    size === 'sm' ? 'size-sm' : size === 'lg' ? 'size-lg' : 'size-md'
  return (
    <div className={`text-wave-loader ${sizeCls} ${className}`} aria-label="PICSPY">
      <span>P I C S P Y</span>
      <span>P I C S P Y</span>
    </div>
  )
}

/**
 * ContentLoader — Hiển thị Loading theo cấu hình Admin hoặc forceType
 * @param {string} size         - 'sm' | 'md' | 'lg'
 * @param {string} className    - class bổ sung
 * @param {string} forceType    - 'wave' | 'banter' | 'text-wave'  (bủa qua global setting nếu truyền vào)
 */
const ContentLoader = ({ size = 'md', className = '', forceType }) => {
  let loaderType = 'wave'
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useSettings()
    if (ctx?.globalLoaderType) loaderType = ctx.globalLoaderType
  } catch {
    // context not ready yet (e.g. SSR or test)
  }

  const effectiveType = forceType || loaderType

  // ── Banter Star Grid (Lá cờ Việt Nam) ────────────────────────────────────
  if (effectiveType === 'banter') {
    const scale = size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-[1.8]' : 'scale-110'
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`banter-loader-container ${scale} select-none`}
          style={{ backgroundColor: '#0b0f19' }}
        >
          <div className="banter-loader">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="banter-loader__box" />
            ))}
          </div>
          <div className="photo-overlay" />
        </div>
      </div>
    )
  }

  // ── Pro Liquid Wave Text (PICSPY chữ nước) — style 2 / đặt tên 'wave' ─────
  if (effectiveType === 'wave') {
    const letterSize = size === 'sm' ? '18px' : size === 'lg' ? '48px' : '32px'
    return (
      <div className={`liquid-loader select-none ${className}`} aria-label="PICSPY">
        {['P','I','C','S','P','Y'].map((ch, i) => {
          const cls = ['p1','i','c','s','p2','y'][i]
          return (
            <div key={i} className="letter" style={{ fontSize: letterSize }}>
              <span className="bg">{ch}</span>
              <span className={`fg ${cls}`}>{ch}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Text Wave Loader — style 3 (glow scan line water effect) ─────────────
  // effectiveType === 'text-wave'
  const sizeCls = size === 'sm' ? 'size-sm' : size === 'lg' ? 'size-lg' : 'size-md'
  return (
    <div className={`text-wave-loader ${sizeCls} ${className}`} aria-label="PICSPY">
      <span>P I C S P Y</span>
      <span>P I C S P Y</span>
    </div>
  )
}

export default ContentLoader
