import { useEffect, useRef, useState } from 'react'
import { decode } from 'blurhash'

/**
 * BlurHashImage — Hiển thị blurhash placeholder cho đến khi ảnh thật load xong
 * Nếu không có blurhash → render img thường
 */
const BlurHashImage = ({
  src,
  blurHash,
  alt = '',
  className = '',
  style = {},
  width = 32,
  height = 32,
  onLoad,
}) => {
  const canvasRef = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Render blurhash vào canvas
  useEffect(() => {
    if (!blurHash || !canvasRef.current) return
    try {
      const pixels = decode(blurHash, width, height)
      const canvas = canvasRef.current
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(pixels)
      ctx.putImageData(imageData, 0, 0)
    } catch {
      // BlurHash decode lỗi → bỏ qua, hiện ảnh thật
    }
  }, [blurHash, width, height])

  const handleLoad = () => {
    setImgLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setImgError(true)
    setImgLoaded(true)
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Canvas blurhash placeholder */}
      {blurHash && !imgLoaded && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'auto', filter: 'blur(8px)', transform: 'scale(1.1)' }}
        />
      )}

      {/* Fallback gradient nếu không có blurhash */}
      {!blurHash && !imgLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-100 to-surface-200 animate-pulse" />
      )}

      {/* Ảnh thật */}
      {!imgError && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Error state */}
      {imgError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-100">
          <span className="text-white/20 text-xs">Không tải được ảnh</span>
        </div>
      )}
    </div>
  )
}

export default BlurHashImage
