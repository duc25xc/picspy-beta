/**
 * getOptimizedWebpUrl — Cloudinary on-the-fly dynamic WebP format conversion and sizing helper
 * ────────────────────────────────────────────────────────────────────────────────────────
 * Converts raw heavy Cloudinary URLs (like JPG/PNG) to optimized WebP format with width & quality constraints.
 * Strips EXIF metadata automatically via format conversion, yielding extremely lightweight previews.
 */
export const getOptimizedWebpUrl = (url, width = 1200, quality = 80) => {
  if (!url) return ''
  if (!url.includes('/image/upload/')) return url
  // If it's already a processed WebP thumbnail or preview URL, return it directly
  if (url.includes('_thumb.webp') || url.includes('_preview.webp')) return url

  const [base, path] = url.split('/image/upload/')
  // Apply limit crop, width limit, quality reduction, and webp format conversion
  return `${base}/image/upload/c_limit,w_${width},f_webp,q_${quality}/${path}`
}
