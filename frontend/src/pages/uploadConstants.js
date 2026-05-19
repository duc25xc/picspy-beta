/**
 * uploadConstants.js
 * Shared constants + pure helpers cho UploadPage
 */

// ── AI Tools ─────────────────────────────────────────────────────
export const AI_TOOLS = [
  { value: 'midjourney', label: 'Midjourney', color: '#7c3aed', icon: '◆' },
  { value: 'dalle-3', label: 'DALL·E 3', color: '#10a37f', icon: '◉' },
  {
    value: 'stable-diffusion',
    label: 'Stable Diffusion',
    color: '#3b82f6',
    icon: '◈',
  },
  { value: 'flux', label: 'Flux', color: '#f59e0b', icon: '◇' },
  { value: 'leonardo', label: 'Leonardo AI', color: '#ef4444', icon: '★' },
  { value: 'firefly', label: 'Adobe Firefly', color: '#ff6900', icon: '◎' },
  { value: 'ideogram', label: 'Ideogram', color: '#8b5cf6', icon: '○' },
  { value: 'bing-creator', label: 'Bing Creator', color: '#0078d4', icon: '◐' },
  { value: 'playground', label: 'Playground AI', color: '#06b6d4', icon: '▲' },
  { value: 'canva-ai', label: 'Canva AI', color: '#00c4cc', icon: '◑' },
  { value: 'comfyui', label: 'ComfyUI', color: '#64748b', icon: '⬡' },

  // ── Gemini / Banana / ChatGPT / DeepSeek / Grok (tools) ──
  {
    value: 'gemini-flash',
    label: 'Gemini 3.1 Flash',
    color: '#10b981',
    icon: '◎',
  },
  {
    value: 'gemini-think',
    label: 'Gemini Tư Duy',
    color: '#22c55e',
    icon: '◈',
  },
  { value: 'gemini-pro', label: 'Gemini Pro', color: '#06b6d4', icon: '⬡' },
  {
    value: 'gemini-nano-banana',
    label: 'Nano Banana',
    color: '#f97316',
    icon: '🍌',
  },
  {
    value: 'gemini-nano-banana-pro',
    label: 'Nano Banana Pro',
    color: '#f59e0b',
    icon: '🍌',
  },
  {
    value: 'gemini-nano-banana-2',
    label: 'Nano Banana 2',
    color: '#fb923c',
    icon: '🍌',
  },

  { value: 'chatgpt', label: 'ChatGPT', color: '#6366f1', icon: '◍' },
  { value: 'deepseek', label: 'DeepSeek', color: '#0ea5e9', icon: '◎' },
  { value: 'grok', label: 'Grok', color: '#ef4444', icon: '◉' },

  { value: 'other', label: 'Khác', color: '#6b7280', icon: '·' },
]

// ── Categories ────────────────────────────────────────────────────
export const FALLBACK_CATEGORIES = [
  { slug: 'nature', name: '🌿 Thiên nhiên' },
  { slug: 'anime', name: '🎌 Anime & Manga' },
  { slug: 'minimal', name: '◻️ Minimal' },
  { slug: 'abstract', name: '🎨 Abstract' },
  { slug: 'portrait', name: '🧑 Chân dung' },
  { slug: 'city', name: '🌃 Thành phố' },
  { slug: 'space', name: '🚀 Vũ trụ' },
  { slug: 'fantasy', name: '🐉 Fantasy' },
  { slug: 'dark', name: '🌑 Dark' },
  { slug: 'gradient', name: '🌈 Gradient' },
  { slug: 'other', name: '✨ Khác' },
]

// ── Aspect ratio detection ─────────────────────────────────────────
const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:3', value: '4:3', ratio: 4 / 3 },
  { label: '3:4', value: '3:4', ratio: 3 / 4 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
  { label: '3:2', value: '3:2', ratio: 3 / 2 },
  { label: '2:3', value: '2:3', ratio: 2 / 3 },
  { label: '21:9', value: '21:9', ratio: 21 / 9 },
]

export const detectDimensions = (file) =>
  new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight
      const maxDim = Math.max(w, h)
      const resolution =
        maxDim >= 3840
          ? '4k'
          : maxDim >= 2048
            ? '2k'
            : maxDim >= 1280
              ? 'hd'
              : 'sd'
      const r = w / h
      const orientation =
        r > 1.15 ? 'landscape' : r < 0.87 ? 'portrait' : 'square'
      // detect aspect ratio
      let best = null,
        minDiff = Infinity
      for (const ar of ASPECT_RATIOS) {
        const diff = Math.abs(r - ar.ratio)
        if (diff < minDiff) {
          minDiff = diff
          best = ar
        }
      }
      const aspectRatio =
        best && minDiff / best.ratio < 0.04 ? best.value : `${w}:${h}`
      URL.revokeObjectURL(url)
      resolve({ width: w, height: h, resolution, orientation, aspectRatio })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }
    img.src = url
  })

// ── File → preview object ─────────────────────────────────────────
export const fileToPreview = (file) => ({
  file,
  preview: URL.createObjectURL(file),
  id: Math.random().toString(36).slice(2),
})

// ── Deduplicate source images by Cloudinary publicId ──────────────
// Trả về danh sách ảnh unique từ lịch sử posts, tránh hiển thị trùng
export const deduplicateByPublicId = (images) => {
  const seen = new Set()
  return images.filter((img) => {
    if (!img.publicId || seen.has(img.publicId)) return false
    seen.add(img.publicId)
    return true
  })
}
