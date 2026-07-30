/**
 * imageUrl.js — Cloudinary AI Smart Crop & WebP Optimization Helper
 * ──────────────────────────────────────────────────────────────────
 * Provides AI Saliency & Subject Gravity (`g_auto:subject,g_auto:person,g_auto:faces,g_auto`)
 * to automatically detect human faces, anime/artistic characters, animals, and focal objects,
 * ensuring portrait crops never cut off heads, faces, or key visual elements.
 */

export const getSmartCropUrl = (url, w = 600, h = 600, preferFace = true) => {
  if (!url) return ''
  if (!url.includes('/image/upload/') && !url.includes('/upload/')) return url

  // Ensure Cloudinary upload path split works for both /image/upload/ and /upload/
  const splitKeyword = url.includes('/image/upload/') ? '/image/upload/' : '/upload/'
  const [base, path] = url.split(splitKeyword)

  // Strip any existing version prefix like v12345/ if present in path
  const cleanPath = path.replace(/^v\d+\//, '')

  const gravity = preferFace
    ? 'g_auto:subject,g_auto:person,g_auto:faces,g_auto'
    : 'g_auto:subject,g_auto'

  return `${base}${splitKeyword}c_fill,${gravity},w_${w},h_${h},q_75,f_auto/${cleanPath}`
}

export const getOptimizedWebpUrl = (url, width = 1200, quality = 80, height = null) => {
  if (!url) return ''
  if (!url.includes('/image/upload/') && !url.includes('/upload/')) return url
  if (url.includes('_thumb.webp') || url.includes('_preview.webp')) return url

  const splitKeyword = url.includes('/image/upload/') ? '/image/upload/' : '/upload/'
  const [base, path] = url.split(splitKeyword)
  const cleanPath = path.replace(/^v\d+\//, '')

  if (height) {
    return `${base}${splitKeyword}c_fill,g_auto:subject,g_auto:person,g_auto:faces,g_auto,w_${width},h_${height},f_webp,q_${quality}/${cleanPath}`
  }
  return `${base}${splitKeyword}c_limit,w_${width},f_webp,q_${quality}/${cleanPath}`
}
