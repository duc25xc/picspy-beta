import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'
import Category from '../models/Category.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Loại bỏ tiếng Việt có dấu
 */
export function removeAccents(str = '') {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/**
 * Smart Category Classification & Proposal Engine
 * 1. Matches active system categories: nature, anime, minimal, abstract, city, space, dark, light, gradient, y2k, streetwear
 * 2. Matches active custom categories in MongoDB (Category model)
 * 3. If no match -> proposes new category with 3 AI suggestions and submits for Admin Review (status: 'pending')
 */

/**
 * Helper to extract clean hashtag/tag strings from raw category or tag fields.
 * Converts CSV category strings (e.g. "[Đề xuất] Chân dung & Thời trang") into individual tags.
 */
export function extractTagsFromCsvCategory(rawCategory = '', rawTags = '') {
  const combined = (rawCategory + ' ' + rawTags).trim()
  if (!combined) return []

  // Clean brackets like [Đề xuất] or special punctuation
  const cleanStr = combined.replace(/\[.*?\]/g, ' ').replace(/^["']|["']$/g, '')
  const parts = cleanStr.split(/[,;|/\s]+/)
  const cleanTags = parts
    .map((p) => p.trim().replace(/^#+/, '').replace(/[\/\\()]/g, ''))
    .filter((p) => p.length >= 2 && p.toLowerCase() !== 'other' && p.toLowerCase() !== 'khac' && p.toLowerCase() !== 'de' && p.toLowerCase() !== 'xuat')

  return Array.from(new Set(cleanTags))
}

/**
 * Helper to detect valid AI Tool slug from prompt, URL, model, or category text
 */
export function detectAiTool(prompt = '', url = '', model = '', category = '') {
  const combined = (prompt + ' ' + url + ' ' + model + ' ' + category).toLowerCase()

  if (combined.includes('midjourney') || combined.includes('mj') || combined.includes('--v 6') || combined.includes('--ar')) return 'midjourney'
  if (combined.includes('dall-e') || combined.includes('dalle')) return 'dalle-3'
  if (combined.includes('flux')) return 'flux'
  if (combined.includes('stable diffusion') || combined.includes('sdxl') || combined.includes('sd 1.5') || combined.includes('sd3')) return 'stable-diffusion'
  if (combined.includes('chatgpt') || combined.includes('gpt-4')) return 'chatgpt'
  if (combined.includes('grok')) return 'grok'
  if (combined.includes('seedream')) return 'seedream'
  if (combined.includes('gemini')) return 'gemini-nano-banana-pro'

  return 'midjourney' // default fallback AI tool
}

export function classifySystemCategory(rawCategory = '', prompt = '', authorName = '', title = '', activeCategoriesDocs = [], tags = []) {
  // ── 0. Clean rawCategory (remove [Đề xuất], [Khác], etc.) ──────────────────
  const cleanedRawCategory = rawCategory
    .replace(/\[.*?\]/g, '')          // remove [Đề xuất], [Gợi ý], ...
    .replace(/^["']|["']$/g, '')
    .trim()

  const tagsStr = Array.isArray(tags) ? tags.join(' ') : (tags || '')

  // ── 1. Build weighted combined signals ─────────────────────────────────────
  //   category (×3) + title (×2) + tags (×1.5) + prompt (×1) + author (×0.5)
  const catClean   = removeAccents(cleanedRawCategory.toLowerCase())
  const titleClean = removeAccents(title.toLowerCase())
  const tagsClean  = removeAccents(tagsStr.toLowerCase())
  const promptClean = removeAccents((prompt || '').substring(0, 500).toLowerCase())  // first 500 chars of prompt
  const authorClean = removeAccents((authorName || '').toLowerCase())

  // For strict keyword matching we use a combined string with repetition weighting
  const weightedCombined = [
    catClean, catClean, catClean,               // ×3
    titleClean, titleClean,                     // ×2
    tagsClean, tagsClean,                       // ×2
    promptClean,                                // ×1
    authorClean,                                // ×0.5 (just appended once)
  ].join(' ')

  const combined = weightedCombined  // used for keyword tests below

  // ── 2. Human / Portrait detection (needs title + prompt signals too) ───────
  const humanKeywords = [
    'chan dung', 'nguoi mau', 'phu nu', 'co gai', 'nhieu anh', 'girl', 'woman',
    'female', 'portrait', 'fashion', 'outfit', 'dress', 'beauty', 'model',
    'selfie', 'full body', 'toan than', 'face', 'headshot', 'anh tu chup',
    'mat hang thoi trang', 'pose', 'quy quyen', 'hot girl', 'asian girl',
    'japanese girl', 'korean girl', 'viet girl', 'lady', 'feminine',
    'chiffon dress', 'qipao', 'ao dai',
  ]
  const isHumanPortrait = humanKeywords.some((kw) => combined.includes(kw))

  // ── 3. System category rules (priority order) ─────────────────────────────
  const systemCategoryRules = [
    {
      slug: 'streetwear',
      keywords: ['streetwear', 'thoi trang duong pho', 'hoodie', 'sneakers', 'hypebeast', 'skate culture', 'urban fashion', 'mat hang thoi trang', 'oversized', 'cargo pants'],
    },
    {
      slug: 'y2k',
      keywords: ['y2k', '2000s', 'retro 2000', 'retrofuturism', 'cyber 2000', 'glitch 2000', 'pop punk 2000', 'y2k aesthetic', 'early 2000'],
    },
    {
      slug: 'anime',
      keywords: ['anime', 'manga', 'nhan vat', 'character', 'chibi', '2d', 'illust', 'vtuber', 'otaku', 'waifu', 'cosplay', 'ghibli', 'shoujo', 'shonen'],
    },
    {
      slug: 'space',
      keywords: ['vu tru', 'space', 'galaxy', 'sci-fi', 'planet', 'astronaut', 'cosmos', 'star', 'nebula', 'scifi', 'interstellar', 'spacecraft'],
    },
    {
      slug: 'dark',
      keywords: ['dark aesthetic', 'gothic', 'shadow art', 'horror', 'demon', 'skull', 'creepy', 'sinister', 'grim', 'occult', 'dystopian', 'dark fantasy', 'dark art', 'toi tam'],
    },
    {
      slug: 'light',
      keywords: ['light', 'sunlight', 'bright', 'golden hour', 'soft lighting', 'radiant', 'glow', 'luminous', 'ethereal light'],
    },
    {
      slug: 'minimal',
      keywords: ['minimal', 'minimalist', 'toi gian', 'clean lines', 'simple background', 'flat design', 'white space', 'negative space'],
    },
    {
      slug: 'abstract',
      keywords: ['abstract', 'surreal', 'pattern', 'triet hoc', 'truu tuong', 'geometric', 'psychedelic', 'fractal', 'generative art', 'glitch art'],
    },
    {
      slug: 'gradient',
      keywords: ['gradient', 'color transition', 'chromatic', 'holographic', 'iridescent', 'ombre', 'spectrum'],
    },
    {
      slug: 'nature',
      keywords: ['thien nhien', 'nature', 'landscape', 'phong canh', 'forest', 'mountain', 'sea', 'flower', 'ocean', 'sunset', 'waterfall', 'fauna', 'flora', 'animal', 'botanical', 'sakura', 'cherry blossom', 'garden'],
    },
    {
      slug: 'city',
      keywords: ['thanh pho', 'city', 'street', 'do thi', 'building', 'cyberpunk', 'kien truc', 'urban', 'skyline', 'metropolis', 'rooftop', 'neon city'],
    },
  ]

  // ── 4. Merge active DB Categories into rules ───────────────────────────────
  if (Array.isArray(activeCategoriesDocs)) {
    for (const catDoc of activeCategoriesDocs) {
      const slug = catDoc.slug?.toLowerCase()
      const name = catDoc.name?.toLowerCase()
      if (!slug || slug === 'other' || slug === 'khac') continue
      const cleanName = removeAccents(name || slug)
      const existingRule = systemCategoryRules.find((r) => r.slug === slug)
      if (existingRule) {
        if (!existingRule.keywords.includes(cleanName)) existingRule.keywords.push(cleanName)
      } else {
        systemCategoryRules.push({
          slug,
          keywords: [cleanName, slug.replace(/-/g, ' ')],
        })
      }
    }
  }

  // ── A. Exact match: cleaned rawCategory vs active DB category ─────────────
  if (catClean) {
    const matchedDoc = activeCategoriesDocs.find(
      (c) => c.slug === catClean || removeAccents(c.name).toLowerCase() === catClean
    )
    if (matchedDoc) {
      return {
        category: matchedDoc.slug,
        isMatched: true,
        requestedCategory: null,
        suggestedCategories: Array.from(new Set([matchedDoc.name, deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1)].filter(Boolean))).slice(0, 3),
        confidence: 97,
      }
    }
  }

  // ── B. Human Portrait / Fashion: special priority pathway ─────────────────
  if (isHumanPortrait) {
    for (const specSlug of ['streetwear', 'y2k', 'anime']) {
      const rule = systemCategoryRules.find((r) => r.slug === specSlug)
      if (rule && rule.keywords.some((kw) => combined.includes(kw))) {
        const matchedDoc = activeCategoriesDocs.find((c) => c.slug === specSlug)
        return {
          category: specSlug,
          isMatched: true,
          requestedCategory: null,
          suggestedCategories: Array.from(new Set([matchedDoc?.name || specSlug, 'Chân dung & Thời trang', deriveTopicCategory(prompt, title, combined, 0)])).slice(0, 3),
          confidence: 94,
        }
      }
    }

    const portraitDbCategory = activeCategoriesDocs.find((c) => {
      const s = c.slug.toLowerCase()
      const n = removeAccents(c.name).toLowerCase()
      return s.includes('chan-dung') || s.includes('portrait') || s.includes('fashion') || n.includes('chan dung') || n.includes('thoi trang')
    })

    if (portraitDbCategory) {
      return {
        category: portraitDbCategory.slug,
        isMatched: true,
        requestedCategory: null,
        suggestedCategories: Array.from(new Set([portraitDbCategory.name, 'Nhiếp ảnh Người mẫu', deriveTopicCategory(prompt, title, combined, 0)])).slice(0, 3),
        confidence: 95,
      }
    }

    // Not in DB -> propose Portrait/Fashion category
    return {
      category: 'other',
      isMatched: false,
      requestedCategory: 'Chân dung & Thời trang',
      suggestedCategories: ['Chân dung & Thời trang', 'Nhiếp ảnh Người mẫu', 'Lối sống Đô thị'],
      confidence: 90,
    }
  }

  // ── C. Keyword scoring across all system + DB rules ───────────────────────
  //   Instead of first-match wins, score each rule and pick the highest scorer
  const ruleScores = systemCategoryRules.map((rule) => {
    let score = 0
    for (const kw of rule.keywords) {
      // Keyword found in category field → higher weight
      if (catClean.includes(kw)) score += 30
      // In title → moderate weight
      if (titleClean.includes(kw)) score += 20
      // In tags → moderate weight
      if (tagsClean.includes(kw)) score += 15
      // In prompt → lower weight (prompt is long, noisier)
      if (promptClean.includes(kw)) score += 8
    }
    return { rule, score }
  }).filter((s) => s.score > 0)

  if (ruleScores.length > 0) {
    ruleScores.sort((a, b) => b.score - a.score)
    const best = ruleScores[0]

    // Only accept a system match if it got signal from category/title/tags (score > 8)
    // A score of ≤8 means the ONLY match was in the noisy prompt field → prefer semantic proposal
    if (best.score > 8) {
      const matchedDoc = activeCategoriesDocs.find((c) => c.slug === best.rule.slug)
      const matchedName = matchedDoc ? matchedDoc.name : best.rule.slug.charAt(0).toUpperCase() + best.rule.slug.slice(1)
      const confidence = Math.min(98, 70 + Math.round(best.score / 4))
      return {
        category: best.rule.slug,
        isMatched: true,
        requestedCategory: null,
        suggestedCategories: Array.from(new Set([matchedName, deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1)].filter(Boolean))).slice(0, 3),
        confidence,
      }
    }
  }


  // ── D. No match → Semantic proposal from Title + Prompt + Tags ────────────
  //   Generate the most meaningful category name possible (not just rawCategory)
  const semanticProposal = deriveNewCategoryProposal(cleanedRawCategory, title, prompt, tagsStr)
  const cand2 = deriveTopicCategory(prompt, title, combined, 0)
  const cand3 = deriveTopicCategory(prompt, title, combined, 1)
  const suggestedCategories = Array.from(new Set([semanticProposal, cand2, cand3].filter(Boolean))).slice(0, 3)

  return {
    category: 'other',
    isMatched: false,
    requestedCategory: semanticProposal,
    suggestedCategories,
    confidence: semanticProposal && semanticProposal !== 'Sáng tạo mới' ? 62 : 40,
  }
}


/**
 * Helper to derive AI category suggestions based on prompt/title semantic context
 */
function deriveTopicCategory(prompt = '', title = '', cleanText = '', offset = 0) {
  const text = (cleanText || (prompt + ' ' + title)).toLowerCase()
  const topics = []

  if (text.includes('chan dung') || text.includes('portrait') || text.includes('phu nu') || text.includes('girl')) {
    topics.push('Chân dung & Thời trang', 'Nhiếp ảnh Người mẫu')
  }
  if (text.includes('thoi trang') || text.includes('fashion') || text.includes('outfit')) {
    topics.push('Thời trang & Lối sống')
  }
  if (text.includes('cyberpunk') || text.includes('futuristic') || text.includes('neon')) {
    topics.push('Cyberpunk & Viễn tưởng')
  }
  if (text.includes('fantasy') || text.includes('magic') || text.includes('goddess')) {
    topics.push('Nghệ thuật Huyền bí')
  }
  if (text.includes('3d') || text.includes('render') || text.includes('octane') || text.includes('unreal')) {
    topics.push('Đồ họa 3D Render')
  }
  if (text.includes('car') || text.includes('vehicle') || text.includes('automotive') || text.includes('xe')) {
    topics.push('Xe hơi & Xe thể thao')
  }
  if (text.includes('food') || text.includes('drink') || text.includes('dish') || text.includes('am thuc')) {
    topics.push('Ẩm thực & Dinh dưỡng')
  }
  if (text.includes('architecture') || text.includes('interior') || text.includes('kien truc')) {
    topics.push('Kiến trúc & Nội thất')
  }

  if (topics.length > offset) return topics[offset]
  const defaults = ['Nhiếp ảnh Nghệ thuật', 'Sáng tạo Đồ họa', 'Phong cách Sống động']
  return defaults[offset % defaults.length]
}

/**
 * Derives the most semantically meaningful category proposal name when no existing category matches.
 * Priority: rawCategory (cleaned) > semantic detection from title/tags > prompt excerpt > fallback
 */
function deriveNewCategoryProposal(cleanedRawCategory = '', title = '', prompt = '', tagsStr = '') {
  const text = removeAccents((title + ' ' + tagsStr + ' ' + (prompt || '').substring(0, 300)).toLowerCase())

  // 1. If rawCategory (already cleaned of [Đề xuất]) is meaningful, use it directly
  const rawClean = cleanedRawCategory.trim()
  const genericFallbacks = new Set(['other', 'khac', 'khác', 'undefined', 'none', 'n/a', 'na', 'unknown', 'de xuat'])
  if (rawClean && !genericFallbacks.has(removeAccents(rawClean.toLowerCase())) && rawClean.length >= 3) {
    // Capitalize nicely
    const proposal = rawClean.charAt(0).toUpperCase() + rawClean.slice(1)
    return proposal.length > 50 ? proposal.substring(0, 47) + '...' : proposal
  }

  // 2. Semantic detection from title + tags + prompt
  const semanticMap = [
    { pattern: ['car', 'vehicle', 'automotive', 'supercar', 'xe hoi', 'xe the thao', 'sports car'], label: 'Xe hơi & Xe thể thao' },
    { pattern: ['food', 'drink', 'dish', 'coffee', 'cuisine', 'recipe', 'am thuc', 'nha hang', 'banh'], label: 'Ẩm thực & Đồ uống' },
    { pattern: ['architecture', 'interior', 'room', 'house', 'building design', 'noi that', 'kien truc', 'living room'], label: 'Kiến trúc & Nội thất' },
    { pattern: ['fantasy', 'magic', 'goddess', 'dragon', 'wizard', 'elf', 'mythical', 'huyen bi'], label: 'Nghệ thuật Huyền bí' },
    { pattern: ['3d', 'render', 'octane', 'blender', 'unreal engine', 'cgi', 'cinema 4d', 'zbrush'], label: 'Đồ họa 3D Render' },
    { pattern: ['cyberpunk', 'futuristic', 'neon sign', 'tech noir', 'vien tuong', 'hologram'], label: 'Cyberpunk & Viễn tưởng' },
    { pattern: ['product', 'commercial', 'advertisement', 'brand', 'packaging', 'san pham', 'quang cao'], label: 'Sản phẩm & Thương mại' },
    { pattern: ['pet', 'cat', 'dog', 'animal portrait', 'thu cung', 'meo', 'cho'], label: 'Thú cưng & Động vật' },
    { pattern: ['baby', 'child', 'kid', 'newborn', 'family', 'tre em', 'gia dinh'], label: 'Gia đình & Trẻ em' },
    { pattern: ['logo', 'icon', 'branding', 'typography', 'poster', 'banner', 'thiep', 'infographic'], label: 'Thiết kế Đồ hoạ' },
    { pattern: ['travel', 'tourism', 'vacation', 'du lich', 'resort', 'beach life', 'exploring'], label: 'Du lịch & Khám phá' },
    { pattern: ['wedding', 'bride', 'couple', 'romance', 'love story', 'cuoi', 'tinh yeu'], label: 'Tình yêu & Đám cưới' },
    { pattern: ['sport', 'fitness', 'gym', 'athlete', 'workout', 'the thao', 'van dong vien'], label: 'Thể thao & Vận động' },
    { pattern: ['music', 'band', 'concert', 'album cover', 'âm nhac', 'ca si', 'nhac cu'], label: 'Âm nhạc & Nghệ sĩ' },
  ]

  for (const { pattern, label } of semanticMap) {
    if (pattern.some((kw) => text.includes(kw))) {
      return label
    }
  }

  // 3. Use first meaningful chunk from title
  if (title && title.trim().length >= 3) {
    const chunk = title.trim().split(/[-–:|,]/)[0].trim()
    if (chunk.length >= 3 && chunk.length <= 40) {
      return chunk.charAt(0).toUpperCase() + chunk.slice(1)
    }
  }

  // 4. Use first tags
  const firstTag = (tagsStr || '').split(/[\s,;|]+/).find((t) => t.length >= 4)
  if (firstTag) return firstTag.charAt(0).toUpperCase() + firstTag.slice(1)

  return 'Sáng tạo mới'
}

/**
 * Tạo bảng mã màu 6 màu chuẩn hài hòa cho từng danh mục / bài viết
 */
function generateHarmonious6ColorPalette(category = 'other') {
  const palettes = {
    anime: ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
    city: ['#0ea5e9', '#6366f1', '#ec4899', '#64748b', '#334155', '#38bdf8'],
    nature: ['#10b981', '#059669', '#34d399', '#fbbf24', '#0284c7', '#4f46e5'],
    space: ['#4c1d95', '#6d28d9', '#8b5cf6', '#c084fc', '#e879f9', '#38bdf8'],
    dark: ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#a855f7', '#d946ef'],
    light: ['#f59e0b', '#fbbf24', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'],
    minimal: ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#0f172a'],
    abstract: ['#d946ef', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
    gradient: ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'],
    y2k: ['#ec4899', '#06b6d4', '#a855f7', '#f43f5e', '#3b82f6', '#e11d48'],
    streetwear: ['#f97316', '#eab308', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444'],
    other: ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'],
  }
  return palettes[category] || palettes.other
}

export const REQUIRED_CSV_FIELDS = [
  'post_id',
  'url',
  'title',
  'ai_model',
  'author_name',
  'author_url',
  'author_avatar_url',
  'original_post_url',
  'image_urls',
  'image_paths',
  'prompt',
  'published_date',
  'original_language',
  'category',
  'source_category',
  'likes_count',
  'views_count',
  'shares_count',
  'comments_count',
  'saved_count',
  'cited_from',
  'created_at',
]

/**
 * Robust RFC 4180 CSV parser handling quoted values, escaped quotes (""), commas within quotes, and multiline content
 */
export function parseCSV(csvText = '') {
  if (!csvText || typeof csvText !== 'string') return []
  const clean = csvText.replace(/^\uFEFF/, '').trim()
  if (!clean) return []

  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\r') {
        if (nextChar === '\n') i++
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
      } else if (char === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  if (rows.length === 0) return []

  const rawHeaders = rows[0]
  const headers = rawHeaders.map((h) =>
    h.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/^\uFEFF/, '')
  )

  const result = []
  for (let k = 1; k < rows.length; k++) {
    const vals = rows[k]
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue

    const rowObj = {}
    headers.forEach((h, idx) => {
      let rawVal = vals[idx] !== undefined ? vals[idx] : ''
      rawVal = rawVal.replace(/^["']|["']$/g, '').trim()
      rowObj[h] = rawVal
    })

    if (
      rowObj.post_id ||
      rowObj.url ||
      rowObj.title ||
      rowObj.prompt ||
      rowObj.image_urls ||
      rowObj.author_name ||
      rowObj.original_post_url
    ) {
      result.push(rowObj)
    }
  }

  return result
}

/**
  * Kiểm tra hợp lệ các trường của file CSV
  */
export function validateCsvHeaders(csvText = '') {
  const cleanText = (csvText || '').replace(/^\uFEFF/, '')
  const rows = parseCSV(cleanText)
  if (!rows || rows.length === 0) {
    console.warn('⚠️ [CSV VALIDATE] File rỗng hoặc không phân tích được dòng nào!')
    return { valid: false, missingFields: REQUIRED_CSV_FIELDS, totalRows: 0 }
  }
  const headers = Object.keys(rows[0] || {}).map((h) => h.replace(/^\uFEFF/, '').trim().toLowerCase())
  const missingFields = REQUIRED_CSV_FIELDS.filter(
    (field) => !headers.includes(field.toLowerCase())
  )

  console.log(`🔍 [CSV VALIDATE] Found ${headers.length} headers. Valid: ${missingFields.length === 0}`)
  if (missingFields.length > 0) {
    console.warn('⚠️ [CSV VALIDATE] Missing fields:', missingFields)
    console.log('   - Actual Headers:', headers)
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    totalRows: rows.length,
    headers,
  }
}

/**
 * Parse danh sách ảnh từ chuỗi JSON hoặc chuỗi đơn.
 * Hỗ trợ online image_urls làm ảnh hiển thị chính, và image_paths dưới dạng local path/fallback (plant/datas/images).
 */
function parseImageLists(imageUrlsStr = '', imagePathsStr = '', localImagesBasePath = '', rawRow = {}) {
  let urls = []
  let paths = []

  const urlInput = ensureString(imageUrlsStr || rawRow.image_url || rawRow.urls)
  const pathInput = ensureString(imagePathsStr || rawRow.image_path || rawRow.paths)

  if (urlInput) {
    if (urlInput.startsWith('[') || urlInput.startsWith('{')) {
      try {
        urls = JSON.parse(urlInput)
      } catch {
        urls = [urlInput]
      }
    } else {
      urls = urlInput.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
    }
  }

  if (pathInput) {
    if (pathInput.startsWith('[') || pathInput.startsWith('{')) {
      try {
        paths = JSON.parse(pathInput)
      } catch {
        paths = [pathInput]
      }
    } else {
      paths = pathInput.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
    }
  }

  if (!Array.isArray(urls)) urls = [urls]
  if (!Array.isArray(paths)) paths = [paths]

  // Filter valid HTTP/HTTPS URLs — ignore invalid strings or local paths put in URL columns
  urls = urls.filter((u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
  paths = paths.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)

  // Fallback 1: Check dedicated image-specific fields only (image_url, thumbnail_url, preview_url)
  if (urls.length === 0 && paths.length === 0) {
    const imgCandidate = ensureString(rawRow.image_url || rawRow.thumbnail_url || rawRow.preview_url)
    if (imgCandidate && (imgCandidate.startsWith('http://') || imgCandidate.startsWith('https://'))) {
      urls.push(imgCandidate)
    }
  }

  // Fallback 2: Generate placeholder SVG when truly no image source exists
  if (urls.length === 0 && paths.length === 0 && (rawRow.post_id || rawRow.title || rawRow.prompt)) {
    const seed = encodeURIComponent(ensureString(rawRow.title || rawRow.post_id || rawRow.author_name || 'ai_artwork'))
    urls.push(`https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`)
  }

  const maxLen = Math.max(urls.length, paths.length, 1)
  const result = []

  for (let i = 0; i < maxLen; i++) {
    const onlineUrl = urls[i] || urls[0] || ''
    let rawPath = paths[i] || paths[0] || ''

    let localPath = rawPath
    let localServeUrl = ''

    if (rawPath) {
      const fileName = rawPath.split(/[/\\]/).pop()
      const basePath = localImagesBasePath ? localImagesBasePath.trim().replace(/[/\\]+$/, '') : 'plant/datas/images'
      localPath = `${basePath}/${fileName}`
      localServeUrl = `/datas/images/${fileName}`
    }

    // Display URL preference: online HTTP URL if available, else local serve URL (/datas/images/filename)
    const displayUrl = onlineUrl || localServeUrl || undefined

    if (displayUrl || localPath) {
      result.push({
        url: displayUrl,
        thumbnailUrl: displayUrl,
        previewUrl: displayUrl,
        localPath: localPath || undefined,
        format: 'jpg',
      })
    }
  }

  return result
}

/**
 * Chuyển đổi an toàn bất kỳ giá trị nào thành Chuỗi (String) để tránh CastError của Mongoose (VD: array negative_prompt)
 */
function ensureString(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val.trim()
  if (Array.isArray(val)) {
    return val.map((v) => ensureString(v)).filter(Boolean).join(', ')
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

/**
 * Safely parse a date string. Returns null if the value is empty or results in an Invalid Date.
 * Prevents Mongoose ValidationError when CSV rows have missing/malformed date fields.
 */
function safeDate(val) {
  if (!val || typeof val !== 'string' || val.trim() === '' || val.trim().toLowerCase() === 'n/a') return null
  const d = new Date(val.trim())
  return isNaN(d.getTime()) ? null : d
}

/**
 * Trích xuất Username từ author_url (vd: https://x.com/dreamydigiarts -> @dreamydigiarts)
 * Giúp tạo handle @username duy nhất cho tác giả trên toàn project.
 */
function extractUsername(rawAuthorName = '', authorUrl = '') {
  let uname = ''
  const reservedXWords = new Set(['status', 'intent', 'search', 'home', 'explore', 'settings', 'i', 'hashtag', 'notifications', 'messages', 'share', 'tos', 'privacy'])

  if (authorUrl && typeof authorUrl === 'string') {
    try {
      const match = authorUrl.match(/(?:x\.com|twitter\.com|instagram\.com|civitai\.com|user\/|@)\/?([a-zA-Z0-9_-]+)/i)
      if (match && match[1] && !reservedXWords.has(match[1].toLowerCase())) {
        uname = match[1].toLowerCase().trim()
      }
    } catch {
      // ignore
    }
  }

  if (!uname && rawAuthorName && typeof rawAuthorName === 'string') {
    uname = removeAccents(rawAuthorName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '')
  }

  if (!uname || uname.length < 3) {
    uname = 'creator_' + Math.random().toString(36).substring(2, 7)
  }

  return uname.substring(0, 30)
}

/**
 * Creates a JSON snapshot backup of existing post metadata before performing bulk import
 */
export async function createDatabaseBackupSnapshot() {
  try {
    const backupsDir = path.join(__dirname, '../../../backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const totalPosts = await Post.countDocuments()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `snapshot_${timestamp}`
    const fileName = `${backupId}.json`
    const filePath = path.join(backupsDir, fileName)

    const backupData = {
      backupId,
      timestamp: new Date(),
      totalPosts,
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8')
    console.log(`🛡️ [BACKUP CREATED] ${backupId} (${totalPosts} posts metadata saved)`)
    return backupData
  } catch (err) {
    console.error('❌ Error creating backup snapshot:', err)
    return { backupId: `snapshot_${Date.now()}`, totalPosts: 0 }
  }
}

/**
 * Undoes/Reverts all posts imported in a specific batchImportId
 */
export async function undoImportBatch(batchImportId) {
  if (!batchImportId) {
    throw new Error('Thiếu batchImportId để hoàn tác đợt import')
  }

  const posts = await Post.find({ batchImportId }).select('_id authorId').lean()
  if (posts.length === 0) {
    return { undoneCount: 0, message: 'Đợt import này đã được hoàn tác trước đó hoặc không còn bài viết nào để xóa.' }
  }

  const postIds = posts.map((p) => p._id)
  const authorIds = [...new Set(posts.map((p) => p.authorId?.toString()).filter(Boolean))]

  const deleteRes = await Post.deleteMany({ _id: { $in: postIds } })

  // Clean up CSV author users that have 0 posts left
  let deletedUserCount = 0
  for (const authorId of authorIds) {
    const remainingPosts = await Post.countDocuments({ authorId })
    if (remainingPosts === 0) {
      const userObj = await User.findById(authorId)
      if (userObj && userObj.email && userObj.email.endsWith('@picspy.ai')) {
        await User.deleteOne({ _id: authorId })
        deletedUserCount++
      }
    }
  }

  console.log(`⏪ [UNDO BATCH COMPLETE] Reverted batch ${batchImportId}: ${deleteRes.deletedCount} posts & ${deletedUserCount} orphan CSV users deleted.`)

  return {
    undoneCount: deleteRes.deletedCount || postIds.length,
    deletedUserCount,
    message: `Đã hoàn tác và xóa thành công ${deleteRes.deletedCount || postIds.length} bài viết và ${deletedUserCount} tài khoản tác giả từ đợt import (${batchImportId})`
  }
}

/**
 * Service chính xử lý import tập tin CSV với đầy đủ ánh xạ theo chuẩn yêu cầu:
 * - author_url: Trích xuất @username từ URL X/Twitter/Instagram (vd: https://x.com/dreamydigiarts -> @dreamydigiarts)
 * - image_urls: Mảng ảnh online kết quả
 * - image_paths: Mảng ảnh local fallback (plant/datas/images)
 * - published_date: Ngày xuất bản gốc
 * - original_language: Ngôn ngữ prompt (EN, VI, ...)
 * - category: Chuyển thành các tags của bài đăng
 * - source_category: Tên model AI tạo ra ảnh
 * - stats (likes_count, views_count, shares_count, comments_count, saved_count): Tự động tăng từ chỉ số gốc khi user tương tác
 */
export async function processCsvImport(csvContent, options = {}) {
  const { localImagesBasePath = '', onProgress, batchImportId: customBatchId } = options
  const batchImportId = customBatchId || `batch_${Date.now()}`
  const rows = parseCSV(csvContent)
  console.log(`📊 Parsed ${rows.length} rows from CSV for processing (Batch ID: ${batchImportId})`)

  const defaultPasswordHash = await bcrypt.hash('Minhduc@123', 12)

  // Pre-extract identifiers for high-performance batch DB lookup
  const externalIds = []
  const sourceUrls = []
  const usernames = new Set()
  const emails = new Set()

  for (const row of rows) {
    const extId = ensureString(row.post_id)
    const srcUrl = ensureString(row.original_post_url || row.author_url || row.url)
    const rawUrl = ensureString(row.url)
    const rawAuthorName = ensureString(row.author_name || 'AI Creator')
    const uname = extractUsername(rawAuthorName, row.author_url)

    if (extId) externalIds.push(extId)
    if (srcUrl) sourceUrls.push(srcUrl)
    if (rawUrl) sourceUrls.push(rawUrl)
    if (uname) {
      usernames.add(uname)
      emails.add(`${uname}@picspy.ai`)
    }
  }

  const [existingPosts, existingUsers] = await Promise.all([
    Post.find({
      $or: [
        { isExternal: true },
        { externalId: { $exists: true, $ne: null } },
        { sourceUrl: { $exists: true, $ne: null } }
      ]
    }).select('externalId sourceUrl citedFrom caption').lean(),
    User.find({
      $or: [
        { username: { $in: Array.from(usernames) } },
        { email: { $in: Array.from(emails) } }
      ]
    })
  ])

  const existingPostExtIds = new Set(existingPosts.map((p) => p.externalId).filter(Boolean))
  const existingPostSrcUrls = new Set(existingPosts.map((p) => p.sourceUrl).filter(Boolean))
  const existingPostCitedFrom = new Set(existingPosts.map((p) => p.citedFrom).filter(Boolean))
  const existingPostCaptions = new Set(existingPosts.map((p) => (p.caption || '').toLowerCase().trim()).filter(Boolean))

  const userCacheMap = new Map()
  for (const u of existingUsers) {
    if (u.username) userCacheMap.set(u.username.toLowerCase(), u)
    if (u.email) userCacheMap.set(u.email.toLowerCase(), u)
  }
  const activeCategoriesDocs = await Category.find({ isActive: true }).select('name slug').lean().catch(() => [])

  let importedCount = 0
  let skippedCount = 0
  let createdUsersCount = 0
  let errorCount = 0
  const rowErrors = []

  let rowIndex = 0
  const totalRows = rows.length
  for (const row of rows) {
    rowIndex++

    if (onProgress && (rowIndex % 5 === 0 || rowIndex === totalRows)) {
      onProgress({
        current: rowIndex,
        total: totalRows,
        importedCount,
        skippedCount,
        createdUsersCount,
      })
    }

    try {
      const externalId = ensureString(row.post_id)
      const sourceUrl = ensureString(row.original_post_url || row.author_url || row.url)
      const rawUrl = ensureString(row.url)
      const citedFrom = ensureString(row.url || row.cited_from || 'https://youmind.com')
      const rawCategory = ensureString(row.category)
      const rowTitle = ensureString(row.title)

      // [DEBUG] Log raw row values for first 3 rows to detect column misalignment
      if (rowIndex <= 3) {
        console.log(`\n📋 [CSV RAW ROW ${rowIndex}/${totalRows}]`)
        console.log(`   post_id:          "${externalId}"`)
        console.log(`   title:            "${rowTitle}"`)
        console.log(`   published_date:   "${String(row.published_date || '').substring(0, 40)}"`)
        console.log(`   original_language:"${String(row.original_language || '')}"`)
        console.log(`   category:         "${String(row.category || '').substring(0, 60)}"`)
        console.log(`   source_category:  "${String(row.source_category || '').substring(0, 30)}"`)
        console.log(`   likes_count:      "${String(row.likes_count || '')}"`)
        console.log(`   views_count:      "${String(row.views_count || '')}"`)
        console.log(`   prompt (30ch):    "${String(row.prompt || '').substring(0, 30)}"`)
        console.log(`   image_urls(60ch): "${String(row.image_urls || '').substring(0, 60)}"`)
        console.log(`   image_paths(60ch):"${String(row.image_paths || '').substring(0, 60)}"`)
      }

      const generatedImages = parseImageLists(row.image_urls, row.image_paths, localImagesBasePath, row)

      // [DEBUG] Log image parsing for first 3 rows
      if (rowIndex <= 3) {
        console.log(`🖼️ [CSV Row ${rowIndex}] image_urls="${String(row.image_urls || '').substring(0, 80)}", image_paths="${String(row.image_paths || '').substring(0, 60)}", result=${generatedImages.length} img, url[0]="${generatedImages[0]?.url || '(none)'}"`)
      }

      if (generatedImages.length === 0 && !externalId) {
        skippedCount++
        continue
      }

      // 1. Deduplication check: Bỏ qua nếu post đã tồn tại (Instant Set check)
      const isExisting =
        (externalId && existingPostExtIds.has(externalId)) ||
        (sourceUrl && existingPostSrcUrls.has(sourceUrl)) ||
        (rawUrl && (existingPostSrcUrls.has(rawUrl) || existingPostCitedFrom.has(rawUrl))) ||
        (citedFrom && existingPostCitedFrom.has(citedFrom)) ||
        (rowTitle && existingPostCaptions.has(rowTitle.toLowerCase().trim()))

      if (isExisting) {
        skippedCount++
        continue
      }

      // 2. Author processing & Username extraction from X profile URL (vd: https://x.com/dreamydigiarts -> @dreamydigiarts)
      const rawAuthorName = ensureString(row.author_name || 'AI Creator')
      const username = extractUsername(rawAuthorName, row.author_url)
      const email = `${username}@picspy.ai`
      const avatarUrl = ensureString(row.author_avatar_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawAuthorName)}`

      let user = userCacheMap.get(username.toLowerCase()) || userCacheMap.get(email.toLowerCase())

      if (!user) {
        user = await User.create({
          username,
          displayName: rawAuthorName || username,
          email,
          passwordHash: defaultPasswordHash,
          avatar: avatarUrl,
          role: 'user',
          status: 'active',
          isVerified: true,
          socialLinks: {
            tiktok: '',
            instagram: '',
            twitter: ensureString(row.author_url),
            x: ensureString(row.author_url),
            facebook: ensureString(row.author_url)
          }
        })
        createdUsersCount++
        userCacheMap.set(username.toLowerCase(), user)
        userCacheMap.set(email.toLowerCase(), user)
      } else {
        let updated = false
        if (row.author_avatar_url && user.avatar?.includes('dicebear.com')) {
          user.avatar = ensureString(row.author_avatar_url)
          updated = true
        }
        if (row.author_url && (!user.socialLinks?.twitter || !user.socialLinks?.x)) {
          if (!user.socialLinks) user.socialLinks = {}
          user.socialLinks.twitter = ensureString(row.author_url)
          user.socialLinks.x = ensureString(row.author_url)
          updated = true
        }
        if (updated) await user.save()
      }

      // 3. Prompt & AI Model parsing (source_category = tên model AI tạo ra ảnh)
      let rawPromptText = ensureString(row.prompt)
      if (rawPromptText.startsWith('http://') || rawPromptText.startsWith('https://')) {
        console.warn(`⚠️ [CSV Row ${rowIndex}] prompt field contains a URL — ignoring. Use image_urls for images. Value: "${rawPromptText.substring(0, 80)}"`)
        rawPromptText = ''
      }
      let promptText = rawPromptText
      let negativePromptText = ''
      let aiModelText = ensureString(row.ai_model || row.source_category || 'v1.0')
      let parametersText = ''

      if (promptText.startsWith('{') || promptText.startsWith('```')) {
        try {
          let cleanJsonStr = promptText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
          const parsed = JSON.parse(cleanJsonStr)
          if (parsed.prompt) promptText = ensureString(parsed.prompt)
          if (parsed.negative_prompt) negativePromptText = ensureString(parsed.negative_prompt)
          if (parsed.model) aiModelText = ensureString(parsed.model)
          const params = []
          if (parsed.steps) params.push(`steps: ${parsed.steps}`)
          if (parsed.sampler_name) params.push(`sampler: ${parsed.sampler_name}`)
          if (parsed.cfg_scale) params.push(`cfg: ${parsed.cfg_scale}`)
          if (parsed.seed) params.push(`seed: ${parsed.seed}`)
          if (params.length > 0) parametersText = params.join(', ')
        } catch {
          // Keep raw promptText if not valid JSON
        }
      }

      promptText = ensureString(promptText)
      negativePromptText = ensureString(negativePromptText)
      aiModelText = ensureString(aiModelText)
      parametersText = ensureString(parametersText)

      if (!promptText || promptText.trim().length < 2) {
        promptText = `AI Artwork generated by @${username}`
      }

      // Truncate to schema limit safely
      if (promptText.length > 7990) {
        promptText = promptText.substring(0, 7987) + '...'
      }
      if (negativePromptText.length > 990) {
        negativePromptText = negativePromptText.substring(0, 987) + '...'
      }
      if (aiModelText.length > 200) {
        aiModelText = aiModelText.substring(0, 197) + '...'
      }
      if (parametersText.length > 1000) {
        parametersText = parametersText.substring(0, 997) + '...'
      }

      // 4. Caption generation: Ưu tiên dùng `title` từ CSV
      let captionText = ensureString(rowTitle || promptText)
      if (captionText.length > 490) {
        captionText = captionText.substring(0, 487) + '...'
      }

      // 5. Category -> Chuyển thành tags của bài đăng & phân loại hệ thống
      const tags = extractTagsFromCsvCategory(rawCategory, ensureString(row.tags || row.hashtags || ''))
      const categoryResult = classifySystemCategory(rawCategory, promptText, rawAuthorName, rowTitle, activeCategoriesDocs, tags)

      let postStatus = 'approved'
      let categorySlug = categoryResult.category
      let requestedCategory = null
      let requestedCategoryStatus = 'none'

      if (!categoryResult.isMatched && categoryResult.requestedCategory) {
        postStatus = 'pending'
        categorySlug = 'other'
        requestedCategory = categoryResult.requestedCategory
        requestedCategoryStatus = 'pending'
      }

      const colorPalette = generateHarmonious6ColorPalette(categorySlug)

      // 6. Timestamps & Base Stats (published_date, original_language, interaction stats)
      const originalCreatedAt = safeDate(row.created_at)
      const publishedAt = safeDate(row.published_date)
      const originalLanguage = ensureString(row.original_language).trim() || 'EN'

      const baseLikes = Math.max(0, Number(row.likes_count) || 0)
      const baseViews = Math.max(0, Number(row.views_count) || 0)
      const baseShares = Math.max(0, Number(row.shares_count) || 0)
      const baseComments = Math.max(0, Number(row.comments_count) || 0)
      const baseBookmarks = Math.max(0, Number(row.saved_count) || 0)

      // [DEBUG LOGGING] Log full row mapping for initial rows
      if (rowIndex <= 5) {
        console.log(`🔍 [CSV ROW ${rowIndex}/${totalRows} PARSED METADATA]`)
        console.log(`   - Title: "${captionText.substring(0, 40)}..."`)
        console.log(`   - Author: @${username} (socialUrl: "${row.author_url || 'none'}")`)
        console.log(`   - Category: "${rawCategory}" -> System: "${categorySlug}", Tags (${tags.length}): [${tags.slice(0, 5).join(', ')}]`)
        console.log(`   - AI Model: "${aiModelText}" (source_category: "${row.source_category || 'none'}")`)
        console.log(`   - Dates: published_date="${row.published_date}" -> ${publishedAt?.toISOString() || 'null'}, lang="${originalLanguage}"`)
        console.log(`   - Stats: Views=${baseViews}, Likes=${baseLikes}, Comments=${baseComments}, Shares=${baseShares}, Saved=${baseBookmarks}`)
        console.log(`   - Images (${generatedImages.length}): Primary URL="${generatedImages[0]?.url || 'none'}", LocalPath="${generatedImages[0]?.localPath || 'none'}"`)
      }

      // 7. Post creation — stats & baseStats khởi tạo từ các chỉ số gốc để user tương tác tăng dần
      await Post.create({
        authorId: user._id,
        caption: captionText,
        prompt: promptText,
        negativePrompt: negativePromptText,
        aiTool: detectAiTool(promptText, sourceUrl, aiModelText, row.source_category),
        aiModel: aiModelText || 'v1.0',
        parameters: parametersText,
        postType: 'ai',
        category: categorySlug,
        requestedCategory: requestedCategory || undefined,
        requestedCategoryStatus,
        tags,
        generatedImages,
        isExternal: true,
        externalId: externalId || undefined,
        batchImportId,
        sourceUrl: sourceUrl || undefined,
        authorUrl: row.author_url || undefined,
        citedFrom: citedFrom || undefined,
        originalLanguage,
        originalCreatedAt: originalCreatedAt || undefined,
        publishedAt: publishedAt || undefined,
        status: postStatus,
        isPremium: false,
        accessTier: 'free',
        colorPalette,
        baseStats: {
          likesCount: baseLikes,
          viewsCount: baseViews,
          sharesCount: baseShares,
          commentsCount: baseComments,
          bookmarksCount: baseBookmarks
        },
        stats: {
          likesCount: baseLikes,
          viewsCount: baseViews,
          sharesCount: baseShares,
          commentsCount: baseComments,
          bookmarksCount: baseBookmarks
        }
      })

      // Add to Sets to prevent intra-file duplicates
      if (externalId) existingPostExtIds.add(externalId)
      if (sourceUrl) existingPostSrcUrls.add(sourceUrl)
      if (rawUrl) existingPostSrcUrls.add(rawUrl)
      if (citedFrom) existingPostCitedFrom.add(citedFrom)
      if (rowTitle) existingPostCaptions.add(rowTitle.toLowerCase().trim())

      importedCount++
      console.log(`✅ [CSV IMPORT Row ${rowIndex}/${rows.length}] Created Post (@${username}, ExtID: ${externalId || 'none'}) - "${captionText.substring(0, 30)}..."`)
    } catch (rowErr) {
      errorCount++
      console.error(`❌ [CSV IMPORT Row ${rowIndex}/${rows.length}] ERROR:`, rowErr.message, rowErr.stack)
      rowErrors.push({
        row: rowIndex,
        title: row.title || row.post_id || `Dòng ${rowIndex}`,
        error: rowErr.message,
      })
    }
  }

  console.log(`🎉 [CSV PROCESS IMPORT DONE] Total: ${rows.length} | Imported: ${importedCount} | Skipped: ${skippedCount} | Errors: ${errorCount} | New Users: ${createdUsersCount}`)

  return {
    totalRows: rows.length,
    importedCount,
    skippedCount,
    createdUsersCount,
    errorCount,
    errors: rowErrors.slice(0, 50),
    status: errorCount === 0 ? 'success' : importedCount > 0 ? 'partial' : 'failed',
  }
}

/**
 * Fast Dry-Run Analysis for CSV Import before performing actual DB writes/Cloudinary uploads
 */
export async function analyzeCsvImport(csvContent, options = {}) {
  const rows = parseCSV(csvContent)
  if (!rows || rows.length === 0) {
    return {
      totalRows: 0,
      newPostsCount: 0,
      existingPostsCount: 0,
      newUsersCount: 0,
      existingUsersCount: 0,
      errorRowsCount: 0,
      alreadyImported: true,
      fileName: options.fileName || 'CSV Export',
      message: 'Tập tin CSV rỗng hoặc không chứa dòng dữ liệu hợp lệ',
    }
  }

  const externalIds = []
  const sourceUrls = []
  const usernames = new Set()
  const emails = new Set()
  let errorRowsCount = 0

  for (const row of rows) {
    const extId = ensureString(row.post_id)
    const srcUrl = ensureString(row.original_post_url || row.author_url || row.url)
    const rawUrl = ensureString(row.url)
    const rawAuthorName = ensureString(row.author_name || 'AI Creator')
    const uname = extractUsername(rawAuthorName, row.author_url)

    if (extId) externalIds.push(extId)
    if (srcUrl) sourceUrls.push(srcUrl)
    if (rawUrl) sourceUrls.push(rawUrl)

    if (uname) {
      usernames.add(uname)
      emails.add(`${uname}@picspy.ai`)
    }

    const generatedImages = parseImageLists(row.image_urls, row.image_paths, options.localImagesBasePath || '', row)
    if (generatedImages.length === 0 && !extId && !srcUrl) {
      errorRowsCount++
    }
  }

  const [existingPosts, existingUsers, activeCategoriesDocs] = await Promise.all([
    Post.find({
      $or: [
        { isExternal: true },
        { externalId: { $exists: true, $ne: null } },
        { sourceUrl: { $exists: true, $ne: null } }
      ]
    }).select('externalId sourceUrl citedFrom caption').lean(),
    User.find({
      $or: [
        { username: { $in: Array.from(usernames) } },
        { email: { $in: Array.from(emails) } }
      ]
    }).select('username email').lean(),
    Category.find({ isActive: true }).select('name slug').lean().catch(() => [])
  ])

  const existingPostExtIds = new Set(existingPosts.map((p) => p.externalId).filter(Boolean))
  const existingPostSrcUrls = new Set(existingPosts.map((p) => p.sourceUrl).filter(Boolean))
  const existingPostCitedFrom = new Set(existingPosts.map((p) => p.citedFrom).filter(Boolean))
  const existingPostCaptions = new Set(existingPosts.map((p) => p.caption?.toLowerCase()?.trim()).filter(Boolean))
  const existingUsernamesSet = new Set(existingUsers.map((u) => u.username))

  let newPostsCount = 0
  let existingPostsCount = 0
  let matchedCategoriesCount = 0
  let proposedCategoriesCount = 0
  const newPostRowsList = []

  for (const row of rows) {
    const extId = ensureString(row.post_id)
    const srcUrl = ensureString(row.original_post_url || row.author_url || row.url)
    const rawUrl = ensureString(row.url)
    const citedFrom = ensureString(row.url || row.cited_from || '')
    const rawCategory = ensureString(row.category)
    const rowTitle = ensureString(row.title)
    const promptText = ensureString(row.prompt)

    const isExisting =
      (extId && existingPostExtIds.has(extId)) ||
      (srcUrl && existingPostSrcUrls.has(srcUrl)) ||
      (rawUrl && (existingPostSrcUrls.has(rawUrl) || existingPostCitedFrom.has(rawUrl))) ||
      (citedFrom && existingPostCitedFrom.has(citedFrom)) ||
      (rowTitle && existingPostCaptions.has(rowTitle.toLowerCase().trim()))

    if (isExisting) {
      existingPostsCount++
    } else {
      newPostsCount++
      const tags = extractTagsFromCsvCategory(rawCategory, ensureString(row.tags || row.hashtags || ''))
      const catRes = classifySystemCategory(rawCategory, promptText, row.author_name, rowTitle, activeCategoriesDocs, tags)
      if (catRes.isMatched) {
        matchedCategoriesCount++
      } else {
        proposedCategoriesCount++
      }

      newPostRowsList.push({
        post_id: extId,
        url: rawUrl || srcUrl,
        title: rowTitle || promptText || 'No Title',
        author: row.author_name || 'AI Creator',
        category: catRes.isMatched ? catRes.category : `[Đề xuất] ${catRes.requestedCategory}`
      })
      if (extId) existingPostExtIds.add(extId)
      if (srcUrl) existingPostSrcUrls.add(srcUrl)
      if (rawUrl) existingPostSrcUrls.add(rawUrl)
      if (citedFrom) existingPostCitedFrom.add(citedFrom)
      if (rowTitle) existingPostCaptions.add(rowTitle.toLowerCase().trim())
    }
  }

  let newUsersCount = 0
  let existingUsersCount = 0

  for (const uname of usernames) {
    if (existingUsernamesSet.has(uname)) {
      existingUsersCount++
    } else {
      newUsersCount++
    }
  }

  const alreadyImported = newPostsCount === 0 && rows.length > 0

  console.log(`📊 [CSV ANALYZE SUMMARY] Total: ${rows.length} | New: ${newPostsCount} | Existing: ${existingPostsCount} | Matched Cats: ${matchedCategoriesCount} | Proposed Cats: ${proposedCategoriesCount}`)
  if (newPostsCount > 0) {
    console.log(`🔍 [CSV ANALYZE NEW ROWS] Total New Rows: ${newPostsCount}, Sample:`, newPostRowsList.slice(0, 3))
  }

  return {
    totalRows: rows.length,
    dbTotalPosts: existingPosts.length,
    newPostsCount,
    existingPostsCount,
    matchedCategoriesCount,
    proposedCategoriesCount,
    newUsersCount,
    existingUsersCount,
    errorRowsCount,
    alreadyImported,
    sampleNewPosts: newPostRowsList.slice(0, 5),
    fileName: options.fileName || 'CSV Export',
    message: alreadyImported
      ? 'Dữ liệu trong tập tin CSV này đã được hệ thống Import hoàn tất trước đó. Không có bài viết hay dữ liệu mới nào.'
      : `Phân tích hoàn tất: Sẵn sàng nạp +${newPostsCount} bài viết mới. (${matchedCategoriesCount} bài tự động vào danh mục có sẵn, ${proposedCategoriesCount} bài đề xuất tạo danh mục mới cho Admin duyệt).`,
  }
}
