import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  ImageOff,
  Layers,
  Camera,
} from 'lucide-react'
import { GiCutDiamond } from 'react-icons/gi'
import { AI_TOOLS } from '../../pages/uploadConstants'
import { getOptimizedWebpUrl } from '../../utils/imageUrl'
import { useSettings } from '../../context/SettingsContext'

/**
 * ImageGallery — multi-image viewer cho PostDetail.
 *
 * Props:
 *  generatedImages: [{ url, thumbnailUrl, width, height }]  1-5
 *  sourceImages:    [{ url, thumbnailUrl, width, height }]  0-5
 *  legacyImages:    [{ url, thumbnailUrl, width, height }]  legacy post.images[]
 *  aiTool:          string (enum key)
 *  aiModel:         string (optional)
 *  isPremium:       boolean
 *  isUnlocked:      boolean
 *  caption:         string
 *  onImageChange:   (img, isSource) => void  — callback khi active img thay đổi
 */

// Cloudinary blur transform cho premium
const makeBlurredUrl = (url) => {
  if (!url || !url.includes('/upload/')) return url
  const [base, rest] = url.split('/upload/')
  return `${base}/upload/w_600,q_10,e_blur:2000/${rest}`
}

// Lấy AI tool meta từ enum value
const getToolMeta = (value) =>
  AI_TOOLS.find((t) => t.value === value) || {
    label: value,
    color: '#6b7280',
    icon: '·',
  }

// Component hiển thị thumbnail kèm cơ chế fallback nếu ảnh tối ưu hóa trả về lỗi 404
const ThumbnailImage = ({ imgObj, index, isGen, showBlurred }) => {
  const defaultSrc = imgObj.thumbnailUrl || getOptimizedWebpUrl(imgObj.url, 150)
  const [src, setSrc] = useState(defaultSrc)

  useEffect(() => {
    setSrc(imgObj.thumbnailUrl || getOptimizedWebpUrl(imgObj.url, 150))
  }, [imgObj])

  return (
    <img
      src={src}
      alt={`${isGen ? 'Kết quả' : 'Ảnh gốc'} ${index + 1}`}
      className="w-full h-full object-cover"
      loading="lazy"
      style={{
        filter: showBlurred ? 'blur(4px)' : 'none',
      }}
      onError={() => {
        if (imgObj.url && src !== imgObj.url) {
          setSrc(imgObj.url)
        }
      }}
    />
  )
}

export default function ImageGallery({
  generatedImages = [],
  sourceImages = [],
  legacyImages = [],
  aiTool,
  aiModel,
  isPremium = false,
  isUnlocked = false,
  caption = '',
  onImageChange,
  isMultiModel = false,
  modelComparisons = [],
  maxImageHeight = 'max-h-[78vh]',
}) {
  const { blurPremiumImages } = useSettings()
  // activeKey: 'gen-0' ... 'gen-4' | 'src-0' ... 'src-4'
  // Fallback: nếu cả hai rỗng, dùng legacy images[] vào slot gen
  // Hợp nhất ảnh chính (primary model) và ảnh từ các so sánh khác, tránh trùng lặp
  const allGen = (() => {
    const list = []

    // 1. Thêm các ảnh chính từ generatedImages (model primary)
    if (generatedImages && generatedImages.length > 0) {
      generatedImages.forEach((img) => {
        list.push({
          ...img,
          aiTool: aiTool,
          aiModel: aiModel,
          isPrimary: true,
        })
      })
    } else if (legacyImages && legacyImages.length > 0) {
      legacyImages.forEach((img) => {
        list.push({
          ...img,
          isPrimary: true,
        })
      })
    }

    // 2. Thêm các ảnh từ modelComparisons (nếu ở chế độ multi-model)
    if (isMultiModel && modelComparisons && modelComparisons.length > 0) {
      modelComparisons.forEach((comp) => {
        if (comp.generatedImages && comp.generatedImages.length > 0) {
          comp.generatedImages.forEach((img) => {
            // Lọc trùng lặp theo publicId hoặc URL để tránh lặp slot 0 trong updatePost
            const exists = list.some(
              (existing) =>
                (existing.publicId && existing.publicId === img.publicId) ||
                (existing.url && existing.url === img.url)
            )
            if (!exists) {
              list.push({
                ...img,
                aiTool: comp.aiTool,
                aiModel: comp.aiModel,
                isPrimary: false,
              })
            }
          })
        }
      })
    }

    return list
  })()
  const allSrc = sourceImages.slice(0, 5)
  const hasSource = allSrc.length > 0
  const hasThumbs = allGen.length > 1 || hasSource
  const isLegacy = generatedImages.length === 0 && legacyImages.length > 0

  const [activeKey, setActiveKey] = useState(() =>
    allGen.length > 0 ? 'gen-0' : allSrc.length > 0 ? 'src-0' : 'gen-0'
  )
  const [imgLoaded, setImgLoaded] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back

  // Đồng bộ/Reset activeKey khi dữ liệu thay đổi (ví dụ đổi bài viết hoặc dữ liệu load bất đồng bộ)
  useEffect(() => {
    const allKeys = [
      ...allGen.map((_, i) => `gen-${i}`),
      ...allSrc.map((_, i) => `src-${i}`),
    ]
    if (!allKeys.includes(activeKey)) {
      setActiveKey(
        allGen.length > 0 ? 'gen-0' : allSrc.length > 0 ? 'src-0' : 'gen-0'
      )
    }
  }, [allGen, allSrc, activeKey])

  // Resolve active image object
  const resolveActive = useCallback(
    (key) => {
      const [type, idxStr] = key.split('-')
      const idx = parseInt(idxStr, 10)
      if (type === 'gen')
        return { img: allGen[idx] || allGen[0], isSource: false }
      return { img: allSrc[idx] || allSrc[0], isSource: true }
    },
    [allGen, allSrc]
  )

  const { img: activeImg, isSource: activeIsSource } = resolveActive(activeKey)

  // Keyboard navigation — flat array of all keys
  const allKeys = [
    ...allGen.map((_, i) => `gen-${i}`),
    ...allSrc.map((_, i) => `src-${i}`),
  ]
  const activeIdx = allKeys.indexOf(activeKey)

  const navigate = useCallback(
    (delta) => {
      const nextIdx = (activeIdx + delta + allKeys.length) % allKeys.length
      setDirection(delta)
      setImgLoaded(false)
      setActiveKey(allKeys[nextIdx])
    },
    [activeIdx, allKeys]
  )

  useEffect(() => {
    const handler = (e) => {
      const isEditable =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      if (isEditable) return

      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const selectKey = useCallback(
    (key) => {
      const currIdx = allKeys.indexOf(activeKey)
      const nextIdx = allKeys.indexOf(key)
      setDirection(nextIdx >= currIdx ? 1 : -1)
      setImgLoaded(false)
      setActiveKey(key)
    },
    [activeKey, allKeys]
  )

  // Notify parent when active image changes
  useEffect(() => {
    if (onImageChange && activeImg) {
      onImageChange(activeImg, activeIsSource)
    }
  }, [activeKey]) // eslint-disable-line

  const currentAiTool = activeImg?.aiTool || aiTool
  const currentAiModel = activeImg?.aiModel || aiModel
  const toolMeta = currentAiTool ? getToolMeta(currentAiTool) : null
  const showBlurred = isPremium && !isUnlocked && blurPremiumImages
  const displayUrl = showBlurred
    ? makeBlurredUrl(
        activeImg?.previewUrl || getOptimizedWebpUrl(activeImg?.url, 1200) || activeImg?.thumbnailUrl
      )
    : activeImg?.previewUrl || getOptimizedWebpUrl(activeImg?.url, 1200) || activeImg?.thumbnailUrl

  const [imageSrc, setImageSrc] = useState('')

  useEffect(() => {
    setImageSrc(displayUrl)
    setImgLoaded(false)
  }, [activeKey, displayUrl])

  const handleImageError = () => {
    if (activeImg?.url && imageSrc !== activeImg.url) {
      console.warn('Optimized image failed to load, falling back to original URL:', activeImg.url)
      setImageSrc(activeImg.url)
    }
  }

  const altText = activeIsSource
    ? `Ảnh tham khảo cho "${caption}"`
    : isLegacy
      ? caption || 'Ảnh'
      : `${caption || 'Ảnh AI'} — tạo bằng ${currentAiTool || 'AI'}`

  // slide variants
  const slideVariants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Main view ─────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{ background: 'oklch(11% 0.012 285)' }}
      >
        {/* Ambient glow bg from active image */}
        {imageSrc && (
          <div
            className="absolute inset-0 opacity-15 scale-110 pointer-events-none"
            style={{
              backgroundImage: `url(${activeImg?.thumbnailUrl || imageSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(28px)',
            }}
          />
        )}

        {/* Image crossfade */}
        <div className="relative z-10 w-full flex items-center justify-center h-[320px] sm:h-[460px] md:h-[540px] lg:h-[580px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeKey}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full h-full flex items-center justify-center"
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={altText}
                  draggable={false}
                  onLoad={() => setImgLoaded(true)}
                  onError={handleImageError}
                  onContextMenu={(e) => showBlurred && e.preventDefault()}
                  className="block max-w-full max-h-full object-contain transition-all duration-500"
                  style={{
                    filter: showBlurred
                      ? 'blur(20px) brightness(0.45)'
                      : 'none',
                    opacity: imgLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease, filter 0.4s ease',
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-64 w-full">
                  <ImageOff size={32} className="text-white/15" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Image loading pulse */}
          {!imgLoaded && imageSrc && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div
                className="w-12 h-12 rounded-xl animate-pulse"
                style={{ background: 'oklch(19% 0.01 285)' }}
              />
            </div>
          )}
        </div>

        {/* Premium overlay */}
        {showBlurred && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-2xl p-6 text-center border border-white/10 backdrop-blur-sm mx-6"
              style={{ background: 'rgba(10,9,14,0.75)' }}
            >
              <GiCutDiamond size={32} className="text-amber-400 mx-auto mb-3" />
              <p
                className="text-white font-semibold text-sm mb-1"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Nội dung Premium
              </p>
              <p
                className="text-white/50 text-xs"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Tải xuống để xem chất lượng gốc
              </p>
            </div>
          </div>
        )}

        {/* ── Top-left: AI tool badge + source label ──── */}
        <div
          className="absolute top-3 left-3 z-20 flex items-center gap-2"
          style={{ marginTop: 24 }}
        >
          {toolMeta && !activeIsSource && !isLegacy && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border border-white/10"
              style={{
                background: `${toolMeta.color}22`,
                color: toolMeta.color,
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <span className="text-[13px] leading-none">{toolMeta.icon}</span>
              {toolMeta.label}
              {currentAiModel && (
                <span className="opacity-60 font-normal">{currentAiModel}</span>
              )}
            </span>
          )}
          {activeIsSource && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border border-white/10"
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <Camera size={11} />
              Ảnh gốc
            </span>
          )}
        </div>

        {/* ── Top-right: position counter ──── */}
        {allKeys.length > 1 && (
          <div className="absolute top-3 right-3 z-20">
            <span
              className="px-2 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md border border-white/8"
              style={{
                background: 'rgba(10,9,14,0.6)',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {activeIdx + 1} / {allKeys.length}
            </span>
          </div>
        )}

        {/* ── Bottom controls ──── */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between">
          {/* Dimensions */}
          {activeImg?.width && !showBlurred && (
            <span
              className="px-2 py-1 rounded-lg text-[11px] backdrop-blur-md border border-white/8"
              style={{
                background: 'rgba(10,9,14,0.55)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {activeImg.width}×{activeImg.height}
            </span>
          )}
          <div className="flex-1" />
          {/* Open full size */}
          {(activeImg?.previewUrl || activeImg?.url) && !showBlurred && (
            <a
              href={activeImg.previewUrl || activeImg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/8 transition-colors duration-150 hover:border-white/20"
              style={{
                background: 'rgba(10,9,14,0.55)',
                color: 'rgba(255,255,255,0.45)',
              }}
              title="Xem full size"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* ── Prev / Next arrow buttons ──── */}
        {allKeys.length > 1 && (
          <>
            <button
              onClick={() => navigate(-1)}
              aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20
                w-9 h-9 rounded-full flex items-center justify-center
                backdrop-blur-md border border-white/10
                text-white/50 hover:text-white hover:border-white/25
                transition-all duration-150"
              style={{ background: 'rgba(10,9,14,0.55)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Ảnh tiếp"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20
                w-9 h-9 rounded-full flex items-center justify-center
                backdrop-blur-md border border-white/10
                text-white/50 hover:text-white hover:border-white/25
                transition-all duration-150"
              style={{ background: 'rgba(10,9,14,0.55)' }}
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnails ─────────────────────────────────── */}
      {hasThumbs && (
        <div className="space-y-2">
          {/* Generated results group */}
          {allGen.length > 0 && (
            <div>
              {hasSource && (
                <p
                  className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <Layers size={9} className="text-[#7986eb]/60" />
                  Ảnh kết quả
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {allGen.map((img, i) => {
                  const key = `gen-${i}`
                  const isActive = activeKey === key
                  return (
                    <motion.button
                      key={key}
                      onClick={() => selectKey(key)}
                      whileTap={{ scale: 0.94 }}
                      aria-label={`Kết quả AI ${i + 1}`}
                      className="relative overflow-hidden rounded-lg flex-shrink-0 transition-all duration-150"
                      style={{
                        width: 56,
                        height: 56,
                        outline: isActive
                          ? '2px solid #7986eb'
                          : '2px solid transparent',
                        outlineOffset: 1,
                        opacity: isActive ? 1 : 0.55,
                      }}
                    >
                      {img.thumbnailUrl || img.url ? (
                        <>
                          <ThumbnailImage
                            imgObj={img}
                            index={i}
                            isGen={true}
                            showBlurred={showBlurred}
                          />
                          {isMultiModel && img.aiTool && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-[8px] text-white/90 font-bold text-center truncate px-1 uppercase tracking-tight">
                              {getToolMeta(img.aiTool).label}
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'oklch(19% 0.01 285)' }}
                        >
                          <ImageOff size={14} className="text-white/20" />
                        </div>
                      )}
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="thumb-ring"
                          className="absolute inset-0 rounded-lg"
                          style={{ boxShadow: 'inset 0 0 0 2px #7986eb' }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Source images group */}
          {hasSource && (
            <div>
              <p
                className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1.5"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <Camera size={9} className="text-white/30" />
                Ảnh gốc / Tham khảo
              </p>
              <div className="flex gap-2 flex-wrap">
                {allSrc.map((img, i) => {
                  const key = `src-${i}`
                  const isActive = activeKey === key
                  return (
                    <motion.button
                      key={key}
                      onClick={() => selectKey(key)}
                      whileTap={{ scale: 0.94 }}
                      aria-label={`Ảnh gốc ${i + 1}`}
                      className="relative overflow-hidden rounded-lg flex-shrink-0 transition-all duration-150"
                      style={{
                        width: 56,
                        height: 56,
                        outline: isActive
                          ? '2px solid rgba(255,255,255,0.4)'
                          : '2px solid transparent',
                        outlineOffset: 1,
                        opacity: isActive ? 1 : 0.55,
                      }}
                    >
                      {img.thumbnailUrl || img.url ? (
                        <ThumbnailImage
                          imgObj={img}
                          index={i}
                          isGen={false}
                          showBlurred={false}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'oklch(19% 0.01 285)' }}
                        >
                          <Camera size={14} className="text-white/20" />
                        </div>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="thumb-ring"
                          className="absolute inset-0 rounded-lg"
                          style={{
                            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.45)',
                          }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
