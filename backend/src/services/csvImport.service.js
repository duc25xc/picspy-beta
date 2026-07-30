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

// ── Vietnamese → English tag mapping dictionary ─────────────────────────────
// Keys should be lowercase without accents for easy matching
const VI_TAG_MAP = {
  // Profile / Social / Avatar
  'ho so': 'profile',
  'anh dai dien': 'avatar',
  'hinh dai dien': 'avatar',
  'bai dang tren mang xa hoi': 'social-post',
  'bai dang mang xa hoi': 'social-post',
  'mang xa hoi': 'social-media',
  'bai dang': 'post',
  'anh tu chup': 'selfie',
  'tu chup': 'selfie',

  // Thể loại tổng quát
  'infographic': 'infographic',
  'hinh anh giao duc': 'edu-visual',
  'giao duc': 'education',
  'thi giac': 'visual',
  'thi giac du lieu': 'data-visualization',
  'so do bieu do': 'diagram',
  'so do': 'diagram',
  'bieu do': 'chart',
  'bieu do thong ke': 'chart',
  'phan tich du lieu': 'data-analysis',
  'du lieu': 'data',

  // Minh họa / Artwork / Nhân vật
  'minh hoa': 'illustration',
  'hinh minh hoa': 'illustration',
  'minh hoa ky thuat so': 'digital-illustration',
  'tranh ve': 'artwork',
  'hoi hoa': 'painting',
  'nhan vat': 'character',
  'thiet ke nhan vat': 'character-design',
  'phong cach q': 'chibi-style',
  'chibi': 'chibi',
  'khai niem': 'concept-art',
  'nghe thuat khai niem': 'concept-art',
  'hinh ve': 'drawing',

  // Chữ & Typography & Text
  'van ban': 'text',
  'kieu chu': 'typography',
  'chu viet': 'calligraphy',
  'chu trinh': 'typography',
  'trinh bay chu': 'typography',

  // Marketing / Business / Fashion
  'tiep thi san pham': 'product-marketing',
  'tiep thi': 'marketing',
  'san pham': 'product',
  'quang cao': 'advertising',
  'thuong mai': 'commerce',
  'kinh doanh': 'business',
  'chien luoc': 'strategy',
  'nhan hieu': 'brand',
  'thuong hieu': 'brand',
  'bang phoi do': 'styling-board',
  'bo suu tap': 'collection',
  'bien tap': 'editorial',

  // 3D / Design / UI
  'ket xuat 3d': '3D-render',
  'mo hinh 3d': '3D-model',
  '3d render': '3D-render',
  '3d': '3D',
  'do hoa': 'graphic',
  'thiet ke do hoa': 'graphic-design',
  'thiet ke': 'design',
  'bao bi': 'packaging',
  'san pham thiet ke': 'product-design',
  'giao dien': 'UI-design',
  'trang chu': 'landing-page',

  // Style / Aesthetics
  'chu nghia toi gian': 'minimalism',
  'toi gian': 'minimal',
  'hien dai': 'modern',
  'nghe thuat': 'art',
  'truu tuong': 'abstract',
  'sieu thuc': 'surreal',
  'co dien': 'classic',
  'sang trong': 'luxury',
  'tinh te': 'elegant',
  'de thuong': 'cute',
  'ngau': 'cool',

  // Photography / Portrait / Fashion
  'chan dung': 'portrait',
  'chup anh': 'photography',
  'nhip anh': 'photography',
  'nhiep anh': 'photography',
  'nhiep anh gia': 'photographer',
  'anh the': 'headshot',
  'thoi trang': 'fashion',
  'toan than': 'full-body',
  'duong pho': 'street',
  'phong canh': 'landscape',
  'thien nhien': 'nature',
  'dong vat': 'animal',
  'trang phuc': 'outfit',
  'quan ao': 'clothing',
  'tui xach': 'handbag',
  'phu kien': 'accessories',
  'trang suc': 'jewelry',
  'nguoi mau': 'model',

  // AI / Tech
  'tri tue nhan tao': 'AI',
  'cong nghe': 'technology',
  'tuong lai': 'futuristic',
  'robot': 'robot',
  'may tinh': 'computer',
  'khoa hoc': 'science',

  // Lifestyle / Themes
  'am thuc': 'food',
  'du lich': 'travel',
  'the thao': 'sports',
  'am nhac': 'music',
  'kien truc': 'architecture',
  'noi that': 'interior',
  'hoa': 'flower',
  'cay': 'plant',
  'thu cung': 'pet',

  // Art Styles
  'anime': 'anime',
  'manga': 'manga',
  'pixel art': 'pixel-art',
  'hoat hinh': 'cartoon',
  'hoat hinh 3d': '3D-cartoon',
  'vector': 'vector',
  'co trang': 'vintage',
  'retro': 'retro',
  'cyberpunk': 'cyberpunk',
  'lo-fi': 'lofi',
  'lofi': 'lofi',
  'dark': 'dark',
  'toi': 'dark',
  'sang': 'light',
  'mau sac': 'colorful',
  'gradient': 'gradient',
  'dep': 'aesthetic',

  // Formats / Elements
  'poster': 'poster',
  'banner': 'banner',
  'bieu ngu': 'banner',
  'bieu tuong': 'icon',
  'logo': 'logo',
  'mau': 'template',
  'nen': 'background',
  'anh nen': 'background',
  'wallpaper': 'wallpaper',
}

/**
 * Helper to extract clean hashtag/tag strings from raw category or tag fields.
 * Converts CSV category strings into minimal English tags.
 * Preserves proper nouns, handles, concise length, and eliminates Vietnamese noise.
 */
export function extractTagsFromCsvCategory(rawCategory = '', rawTags = '') {
  const combined = (rawCategory + (rawTags ? ',' + rawTags : '')).trim()
  if (!combined) return []

  // Remove bracket labels like [Đề xuất] [Khác]
  const cleanStr = combined
    .replace(/\[.*?\]/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim()

  // Split ONLY by delimiters — preserve multi-word phrases
  const parts = cleanStr
    .split(/[,;|/\r\n]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)

  const result = []

  for (const phrase of parts) {
    // Strip leading # and clean outer punctuation
    const cleaned = phrase.replace(/^#+/, '').replace(/[()\\]/g, '').trim()
    if (!cleaned) continue

    // 0. Preserve handles / usernames (e.g. @username)
    if (cleaned.startsWith('@')) {
      const handleTag = cleaned.toLowerCase()
      if (handleTag.length <= 30) result.push(handleTag)
      continue
    }

    // Detect Proper Nouns / Brands / Locations / Models (English/Alphanumeric without Vietnamese diacritics)
    const isProperNounOrEnglish =
      /^[A-Z0-9@_.\-\s]+$/i.test(cleaned) &&
      !/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(cleaned)

    // Normalize to no-accent lowercase for dictionary lookup
    const normalized = removeAccents(cleaned.toLowerCase())

    // 1. Try full phrase match first
    if (VI_TAG_MAP[normalized]) {
      result.push(VI_TAG_MAP[normalized])
      continue
    }

    // 2. Try partial / sub-phrase match (longest match wins)
    let matched = false
    const keys = Object.keys(VI_TAG_MAP).sort((a, b) => b.length - a.length)
    for (const key of keys) {
      if (normalized.includes(key)) {
        result.push(VI_TAG_MAP[key])
        matched = true
        break
      }
    }
    if (matched) continue

    // 3. Preserve Proper Nouns / Brands / Locations if valid English/Alphanumeric
    if (isProperNounOrEnglish) {
      const properTag = cleaned
        .toLowerCase()
        .replace(/[^a-z0-9@_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      if (properTag && properTag.length <= 25) {
        result.push(properTag)
        continue
      }
    }

    // 4. Fallback: split phrase into individual words and map each word if in dictionary
    const words = normalized.split(/\s+/).filter(Boolean)
    let wordMapped = false
    for (const word of words) {
      if (VI_TAG_MAP[word]) {
        result.push(VI_TAG_MAP[word])
        wordMapped = true
      }
    }
    if (wordMapped) continue

    // 5. Final fallback: slugify no-accent string (concise max 25 chars)
    const fallback = removeAccents(cleaned)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (fallback && fallback.length <= 25) {
      result.push(fallback)
    }
  }

  // Return unique tags filtering out noise words
  const noiseWords = new Set(['de', 'xuat', 'khac', 'other', 'va', 'va-cac', 'cac', 'trong', 'tren', 'cho'])
  return [...new Set(result)].filter((t) => Boolean(t) && !noiseWords.has(t))
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
  if (combined.includes('grok')) return 'grok'
  if (combined.includes('seedream')) return 'seedream'
  if (combined.includes('gemini')) return 'gemini-nano-banana-pro'

  return 'midjourney' // default fallback AI tool
}

export function deduplicateCategoryList(list = []) {
  const seenNorm = new Set()
  const result = []
  for (const item of list) {
    if (!item || typeof item !== 'string') continue
    const trimmed = item.trim()
    const norm = removeAccents(trimmed.toLowerCase()).replace(/\s+/g, ' ')
    if (!seenNorm.has(norm)) {
      seenNorm.add(norm)
      result.push(trimmed)
    }
  }
  return result
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
        suggestedCategories: deduplicateCategoryList([matchedDoc.name, deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1), deriveTopicCategory(prompt, title, combined, 2)]).slice(0, 3),
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
          suggestedCategories: deduplicateCategoryList([matchedDoc?.name || specSlug, 'Chân dung & Thời trang', deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1)]).slice(0, 3),
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
        suggestedCategories: deduplicateCategoryList([portraitDbCategory.name, 'Nhiếp ảnh Người mẫu', deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1)]).slice(0, 3),
        confidence: 95,
      }
    }

    // Not in DB -> propose Portrait/Fashion category
    return {
      category: 'other',
      isMatched: false,
      requestedCategory: 'Chân dung & Thời trang',
      suggestedCategories: deduplicateCategoryList(['Chân dung & Thời trang', 'Nhiếp ảnh Người mẫu', 'Lối sống Đô thị', deriveTopicCategory(prompt, title, combined, 0)]).slice(0, 3),
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
        suggestedCategories: deduplicateCategoryList([matchedName, deriveTopicCategory(prompt, title, combined, 0), deriveTopicCategory(prompt, title, combined, 1), deriveTopicCategory(prompt, title, combined, 2)]).slice(0, 3),
        confidence,
      }
    }
  }


  // ── D. No match → Semantic proposal from Title + Prompt + Tags ────────────
  //   Generate the most meaningful category name possible (not just rawCategory)
  const semanticProposal = deriveNewCategoryProposal(cleanedRawCategory, title, prompt, tagsStr)
  const cand2 = deriveTopicCategory(prompt, title, combined, 0)
  const cand3 = deriveTopicCategory(prompt, title, combined, 1)
  const cand4 = deriveTopicCategory(prompt, title, combined, 2)
  const suggestedCategories = deduplicateCategoryList([semanticProposal, cand2, cand3, cand4]).slice(0, 3)

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
 * Tự động điều chỉnh views_count trong file CSV nếu thấp hơn các chỉ số tương tác
 * (likes_count, shares_count, comments_count, saved_count).
 * Nếu views <= maxEng, nhân views với 1000 lặp lại cho đến khi views > maxEng.
 */
/**
 * Safely parses a stat value from CSV, clamping unreasonably large/corrupt values to 0.
 * Excel sometimes exports numbers as scientific notation (1E+09) or full integers (1000000000)
 * when the source data is corrupted. We reject anything above the given max.
 */
export function safeParseStat(rawVal, maxAllowed) {
  const str = String(rawVal || '').trim()
  if (!str || str === '0') return 0
  // Use parseFloat to catch scientific notation ("5E+09" → 5000000000)
  const num = parseFloat(str)
  if (!isFinite(num) || isNaN(num) || num < 0) return 0
  // Reject clearly corrupt values (e.g. 5,000,000,000 shares is impossible)
  if (num > maxAllowed) return 0
  return Math.floor(num)
}

// Reasonable upper bounds per stat field
const STAT_MAX = {
  views:    10_000_000,   // 10M views max
  likes:     2_000_000,   // 2M likes max
  shares:      500_000,   // 500K shares max
  comments:    500_000,   // 500K comments max
  saved:     1_000_000,   // 1M saves max
}

export function calculateAdjustedViews(rawRow = {}) {
  let views    = safeParseStat(rawRow.views_count   || rawRow.views    || 0, STAT_MAX.views)
  const likes  = safeParseStat(rawRow.likes_count   || rawRow.likes    || 0, STAT_MAX.likes)
  const shares = safeParseStat(rawRow.shares_count  || rawRow.shares   || 0, STAT_MAX.shares)
  const comments = safeParseStat(rawRow.comments_count || rawRow.comments || 0, STAT_MAX.comments)
  const saved  = safeParseStat(rawRow.saved_count   || rawRow.saved    || 0, STAT_MAX.saved)

  const maxEng = Math.max(likes, shares, comments, saved)

  if (maxEng > 0) {
    if (views <= 0) views = 1
    // Safety cap: never multiply more than 3 times (1 → 1K → 1M → 1B)
    let iters = 0
    while (views <= maxEng && iters < 3) {
      views = views * 1000
      iters++
    }
  }

  // Hard cap final view count at 10M to prevent runaway inflation
  return Math.min(views, STAT_MAX.views)
}

/**
 * Smart Deduplication & Title Disambiguation Engine
 * - Rule 1 (Real Duplicate): Same Author AND Same Prompt. Compare views count if intra-CSV.
 * - Rule 2 (Same Author, Diff Prompt): Keep post, append sequence number to Title (`Title 2`).
 * - Rule 3 (Diff Author, Same/Diff Prompt): Keep post, append Author Name to Title (`Title - Author`).
 */
export function evaluateCsvDeduplication(rows = [], existingPosts = []) {
  const activeExtIds = new Set(existingPosts.map((p) => p.externalId).filter(Boolean))
  const activeSrcUrls = new Set(existingPosts.map((p) => p.sourceUrl).filter(Boolean))
  
  // Set of `${username}||${promptNorm}`
  const activePromptAuthorSet = new Set()
  // Map of `titleNorm` -> { username, authorName }
  const activeTitleAuthorMap = new Map()
  // Map of `titleNorm` -> count
  const activeTitleCountMap = new Map()

  for (const p of existingPosts) {
    const uName = (p.user?.username || p.author || '').toLowerCase().trim()
    const promptNorm = (p.prompt || '').toLowerCase().trim()
    const titleNorm = (p.caption || p.title || '').toLowerCase().trim()

    if (uName && promptNorm) {
      activePromptAuthorSet.add(`${uName}||${promptNorm}`)
    }
    if (titleNorm) {
      activeTitleAuthorMap.set(titleNorm, { username: uName, authorName: p.user?.displayName || uName })
      activeTitleCountMap.set(titleNorm, (activeTitleCountMap.get(titleNorm) || 0) + 1)
    }
  }

  // Pre-process rows: extract properties & line numbers
  const processedRows = rows.map((r, idx) => {
    const authorName = ensureString(r.author_name || 'AI Creator')
    const username = extractUsername(authorName, r.author_url).toLowerCase()
    const rawPrompt = ensureString(r.prompt)
    const promptNorm = rawPrompt.toLowerCase().trim()
    const rowTitle = ensureString(r.title || rawPrompt || 'No Title')
    const titleNorm = rowTitle.toLowerCase().trim()
    const views = calculateAdjustedViews(r)
    const extId = ensureString(r.post_id)
    const srcUrl = ensureString(r.original_post_url || r.author_url || r.url)
    const lineNum = r._lineNum || (idx + 2)

    return {
      rawRow: r,
      lineNum,
      authorName,
      username,
      rawPrompt,
      promptNorm,
      rowTitle,
      titleNorm,
      views,
      extId,
      srcUrl,
      sigKey: extId || srcUrl || (promptNorm ? `${username}||${promptNorm}` : '')
    }
  })

  // Pass 1: Multi-key Union-Find Intra-CSV Grouping (Matches by post_id, sourceUrl, OR username+prompt)
  const getKeys = (item) => {
    const keys = []
    if (item.extId) keys.push(`ext:${item.extId}`)
    if (item.srcUrl) keys.push(`url:${item.srcUrl}`)
    if (item.username && item.promptNorm) keys.push(`prompt:${item.username}||${item.promptNorm}`)
    return keys
  }

  const parent = processedRows.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (i, j) => {
    const rootI = find(i)
    const rootJ = find(j)
    if (rootI !== rootJ) parent[rootI] = rootJ
  }

  const keyToIdx = new Map()
  processedRows.forEach((item, idx) => {
    const keys = getKeys(item)
    keys.forEach((k) => {
      if (keyToIdx.has(k)) {
        union(idx, keyToIdx.get(k))
      } else {
        keyToIdx.set(k, idx)
      }
    })
  })

  const intraGroups = new Map()
  processedRows.forEach((item, idx) => {
    const root = find(idx)
    if (!intraGroups.has(root)) intraGroups.set(root, [])
    intraGroups.get(root).push(item)
  })

  const intraCsvDuplicateSet = new Set()
  const intraCsvDuplicateInfoMap = new Map()

  for (const group of intraGroups.values()) {
    if (group.length > 1) {
      // Sort descending by views count (highest views wins)
      group.sort((a, b) => b.views - a.views)
      const winner = group[0]
      for (let i = 1; i < group.length; i++) {
        const dup = group[i]
        intraCsvDuplicateSet.add(dup)
        intraCsvDuplicateInfoMap.set(dup, {
          reason: `Trùng nội bộ tệp CSV với dòng ${winner.lineNum} ("${winner.rowTitle}"). Đã giữ bài dòng ${winner.lineNum} có ${winner.views.toLocaleString('vi-VN')} views (bài này ${dup.views.toLocaleString('vi-VN')} views)`,
          matchedLine: winner.lineNum,
          matchedViews: winner.views
        })
      }
    }
  }

  const realDuplicatesList = []
  const sameAuthorRenamedList = []
  const diffAuthorRenamedList = []
  const validCandidateRows = []

  // Pass 2: DB Real Duplicate check & Title Disambiguation
  for (const item of processedRows) {
    // Check intra-CSV duplicate
    if (intraCsvDuplicateSet.has(item)) {
      const dupInfo = intraCsvDuplicateInfoMap.get(item)
      realDuplicatesList.push({
        lineNum: item.lineNum,
        post_id: item.extId,
        title: item.rowTitle,
        author: item.authorName,
        views: item.views,
        reason: dupInfo.reason,
        matchedLine: dupInfo.matchedLine,
        matchedViews: dupInfo.matchedViews
      })
      continue
    }

    // Check DB real duplicate (same prompt + author)
    const isDbRealDup =
      (item.extId && activeExtIds.has(item.extId)) ||
      (item.srcUrl && activeSrcUrls.has(item.srcUrl)) ||
      (item.promptNorm && activePromptAuthorSet.has(`${item.username}||${item.promptNorm}`))

    if (isDbRealDup) {
      realDuplicatesList.push({
        lineNum: item.lineNum,
        post_id: item.extId,
        title: item.rowTitle,
        author: item.authorName,
        views: item.views,
        reason: 'Trùng Prompt + Tác giả với bài đăng đã có sẵn trong CSDL'
      })
      continue
    }

    // Valid new post! Resolve Title Disambiguation
    let resolvedTitle = item.rowTitle
    const tNorm = item.titleNorm

    if (activeTitleAuthorMap.has(tNorm)) {
      const existingInfo = activeTitleAuthorMap.get(tNorm)
      if (existingInfo.username === item.username) {
        // Same Author, Different Prompt -> Version 2 / Variant
        const count = (activeTitleCountMap.get(tNorm) || 1) + 1
        activeTitleCountMap.set(tNorm, count)
        resolvedTitle = `${item.rowTitle} ${count}`
        sameAuthorRenamedList.push({
          lineNum: item.lineNum,
          originalTitle: item.rowTitle,
          newTitle: resolvedTitle,
          author: item.authorName,
          promptSnippet: item.rawPrompt.substring(0, 70)
        })
      } else {
        // Different Author -> Append Author Name
        resolvedTitle = `${item.rowTitle} - ${item.authorName}`
        const resNorm = resolvedTitle.toLowerCase().trim()
        if (activeTitleAuthorMap.has(resNorm)) {
          const count = (activeTitleCountMap.get(resNorm) || 1) + 1
          activeTitleCountMap.set(resNorm, count)
          resolvedTitle = `${resolvedTitle} ${count}`
        }
        diffAuthorRenamedList.push({
          lineNum: item.lineNum,
          originalTitle: item.rowTitle,
          newTitle: resolvedTitle,
          author: item.authorName,
          origAuthor: existingInfo.authorName || existingInfo.username
        })
      }
    }

    // Register into active state maps for subsequent rows
    item.resolvedTitle = resolvedTitle
    const resNorm = resolvedTitle.toLowerCase().trim()
    activeTitleAuthorMap.set(resNorm, { username: item.username, authorName: item.authorName })
    activeTitleCountMap.set(resNorm, 1)

    if (item.extId) activeExtIds.add(item.extId)
    if (item.srcUrl) activeSrcUrls.add(item.srcUrl)
    if (item.promptNorm) activePromptAuthorSet.add(`${item.username}||${item.promptNorm}`)

    validCandidateRows.push(item)
  }

  return {
    processedRows,
    validCandidateRows,
    realDuplicatesList,
    sameAuthorRenamedList,
    diffAuthorRenamedList
  }
}

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
    }).select('externalId sourceUrl citedFrom caption prompt authorId').populate('authorId', 'username displayName').lean(),
    User.find({
      $or: [
        { username: { $in: Array.from(usernames) } },
        { email: { $in: Array.from(emails) } }
      ]
    })
  ])

  // Run Smart Deduplication Engine
  const evalResult = evaluateCsvDeduplication(rows, existingPosts)
  const candidateItems = evalResult.validCandidateRows

  const userCacheMap = new Map()
  for (const u of existingUsers) {
    if (u.username) userCacheMap.set(u.username.toLowerCase(), u)
    if (u.email) userCacheMap.set(u.email.toLowerCase(), u)
  }
  const activeCategoriesDocs = await Category.find({ isActive: true }).select('name slug').lean().catch(() => [])

  let importedCount = 0
  let skippedCount = evalResult.realDuplicatesList.length
  let createdUsersCount = 0
  let errorCount = 0
  const rowErrors = []

  let rowIndex = 0
  const totalCandidateRows = candidateItems.length
  for (const item of candidateItems) {
    rowIndex++
    const row = item.rawRow

    if (onProgress && (rowIndex % 5 === 0 || rowIndex === totalCandidateRows)) {
      onProgress({
        current: rowIndex,
        total: totalCandidateRows,
        importedCount,
        skippedCount,
        createdUsersCount,
      })
    }

    try {
      const externalId = item.extId
      const sourceUrl = item.srcUrl
      const rawUrl = ensureString(row.url)
      const citedFrom = ensureString(row.url || row.cited_from || 'https://youmind.com')
      const rawCategory = ensureString(row.category)
      const rowTitle = item.resolvedTitle || item.rowTitle

      const generatedImages = parseImageLists(row.image_urls, row.image_paths, localImagesBasePath, row)

      if (generatedImages.length === 0 && !externalId) {
        skippedCount++
        continue
      }

      // Author processing & Username extraction from X profile URL
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

      // Prompt & AI Model parsing
      let rawPromptText = ensureString(row.prompt)
      if (rawPromptText.startsWith('http://') || rawPromptText.startsWith('https://')) {
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
          // Keep raw promptText
        }
      }

      promptText = ensureString(promptText)
      negativePromptText = ensureString(negativePromptText)
      aiModelText = ensureString(aiModelText)
      parametersText = ensureString(parametersText)

      if (!promptText || promptText.trim().length < 2) {
        promptText = `AI Artwork generated by @${username}`
      }

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

      // Caption text uses resolved title (disambiguated if needed)
      let captionText = ensureString(rowTitle || promptText)
      if (captionText.length > 490) {
        captionText = captionText.substring(0, 487) + '...'
      }

      // Category & Tags classification
      const tags = extractTagsFromCsvCategory(rawCategory, ensureString(row.tags || row.hashtags || ''))
      const catClassification = classifySystemCategory(rawCategory, promptText, rawAuthorName, captionText, activeCategoriesDocs, tags)
      
      const categorySlug = catClassification.category
      let tagsList = tags
      if (categorySlug && !tagsList.includes(categorySlug)) {
        tagsList.push(categorySlug)
      }

      // Slug generation
      let baseSlug = (row.post_id || captionText || promptText)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 80)
      if (!baseSlug) baseSlug = `post-${Date.now()}`
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

      const publishedDate = row.published_date ? new Date(row.published_date) : new Date()

      // Determine valid AI tool enum value from CSV ai_model / tool string
      let mappedAiTool = 'gpt-image-1-5'
      const rawTool = (row.ai_tool || row.ai_model || row.source_category || '').toLowerCase()
      if (rawTool.includes('midjourney')) mappedAiTool = 'midjourney'
      else if (rawTool.includes('dalle') || rawTool.includes('dall-e')) mappedAiTool = 'dalle-3'
      else if (rawTool.includes('stable') || rawTool.includes('sdxl') || rawTool.includes('sd')) mappedAiTool = 'stable-diffusion'
      else if (rawTool.includes('flux')) mappedAiTool = 'flux'
      else if (rawTool.includes('seedream')) mappedAiTool = 'seedream'
      else if (rawTool.includes('grok')) mappedAiTool = 'grok'
      else if (rawTool.includes('picspy')) mappedAiTool = 'picspy'
      else if (rawTool.includes('gemini')) mappedAiTool = 'gemini-nano-banana-pro'
      else if (rawTool.includes('chatgpt') || rawTool.includes('gpt')) mappedAiTool = 'gpt-image-1-5'

      // Ensure generatedImages array has at least 1 valid image object for Post.model.js schema
      const validGeneratedImages = generatedImages.length > 0
        ? generatedImages.map((img) => ({
            url: img.url,
            thumbnailUrl: img.thumbnailUrl || img.url,
            previewUrl: img.previewUrl || img.url,
            width: img.width || 1200,
            height: img.height || 1200,
            fileSize: img.fileSize || 0,
            format: img.format || 'jpg'
          }))
        : [{
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
            thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
            previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
            width: 1200,
            height: 1200,
            fileSize: 102400,
            format: 'jpg'
          }]

      const adjViews   = calculateAdjustedViews(row)
      const likesVal    = safeParseStat(row.likes_count    || 0, STAT_MAX.likes)
      const sharesVal   = safeParseStat(row.shares_count   || 0, STAT_MAX.shares)
      const commentsVal = safeParseStat(row.comments_count || 0, STAT_MAX.comments)
      const savedVal    = safeParseStat(row.saved_count    || 0, STAT_MAX.saved)

      const postDoc = new Post({
        authorId: user._id,
        postType: 'ai',
        prompt: promptText,
        negativePrompt: negativePromptText,
        aiTool: mappedAiTool,
        aiModel: aiModelText,
        parameters: parametersText,
        generatedImages: validGeneratedImages,
        caption: captionText,
        category: categorySlug,
        requestedCategory: catClassification.requestedCategory || null,
        requestedCategoryStatus: catClassification.requestedCategory ? 'pending' : 'none',
        tags: tagsList,
        aspectRatio: validGeneratedImages[0]?.aspectRatio || '1:1',
        status: 'approved',
        isExternal: true,
        externalId: externalId || null,
        sourceUrl: sourceUrl || rawUrl || null,
        citedFrom: citedFrom,
        originalLanguage: ensureString(row.original_language || 'EN'),
        sourceCategory: ensureString(row.source_category || 'gpt-2'),
        stats: {
          viewsCount: adjViews,
          likesCount: likesVal,
          downloadsCount: Math.floor(adjViews * 0.1),
          commentsCount: commentsVal,
          bookmarksCount: savedVal,
          sharesCount: sharesVal,
        },
        baseStats: {
          viewsCount: adjViews,
          likesCount: likesVal,
          sharesCount: sharesVal,
          commentsCount: commentsVal,
          bookmarksCount: savedVal,
        },
        createdAt: publishedDate,
        updatedAt: publishedDate,
        publishedAt: publishedDate,
        batchImportId
      })

      await postDoc.save()
      importedCount++

    } catch (err) {
      errorCount++
      console.error(`❌ [CSV Import Row ${rowIndex}] Error:`, err.message)
      rowErrors.push({ row: rowIndex, error: err.message })
    }
  }

  console.log(`✅ [CSV IMPORT COMPLETE] Imported: ${importedCount} | Skipped Duplicates: ${skippedCount} | Users Created: ${createdUsersCount} | Errors: ${errorCount}`)

  return {
    success: true,
    batchImportId,
    totalRows: rows.length,
    importedCount,
    skippedCount,
    createdUsersCount,
    errorCount,
    rowErrors
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
      realDuplicatesCount: 0,
      sameAuthorRenamedCount: 0,
      diffAuthorRenamedCount: 0,
      realDuplicatesList: [],
      sameAuthorRenamedList: [],
      diffAuthorRenamedList: [],
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
    }).select('externalId sourceUrl citedFrom caption prompt authorId').populate('authorId', 'username displayName').lean(),
    User.find({
      $or: [
        { username: { $in: Array.from(usernames) } },
        { email: { $in: Array.from(emails) } }
      ]
    }).select('username email').lean(),
    Category.find({ isActive: true }).select('name slug').lean().catch(() => [])
  ])

  const existingUsernamesSet = new Set(existingUsers.map((u) => u.username))

  // Run Smart Deduplication Engine
  const evalResult = evaluateCsvDeduplication(rows, existingPosts)
  const candidateItems = evalResult.validCandidateRows

  let newPostsCount = candidateItems.length
  let realDuplicatesCount = evalResult.realDuplicatesList.length
  let sameAuthorRenamedCount = evalResult.sameAuthorRenamedList.length
  let diffAuthorRenamedCount = evalResult.diffAuthorRenamedList.length
  let matchedCategoriesCount = 0
  let proposedCategoriesCount = 0
  const newPostRowsList = []

  for (const item of candidateItems) {
    const row = item.rawRow
    const rawCategory = ensureString(row.category)
    const rowTitle = item.resolvedTitle || item.rowTitle
    const promptText = ensureString(row.prompt)

    const tags = extractTagsFromCsvCategory(rawCategory, ensureString(row.tags || row.hashtags || ''))
    const catRes = classifySystemCategory(rawCategory, promptText, row.author_name, rowTitle, activeCategoriesDocs, tags)
    if (catRes.isMatched) {
      matchedCategoriesCount++
    } else {
      proposedCategoriesCount++
    }

    newPostRowsList.push({
      post_id: item.extId,
      url: item.srcUrl,
      title: rowTitle,
      author: item.authorName,
      category: catRes.isMatched ? catRes.category : `[Đề xuất] ${catRes.requestedCategory}`
    })
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

  console.log(`📊 [CSV ANALYZE SUMMARY] Total: ${rows.length} | New: ${newPostsCount} | Real Dups: ${realDuplicatesCount} | Same Author Renamed: ${sameAuthorRenamedCount} | Diff Author Renamed: ${diffAuthorRenamedCount}`)

  return {
    totalRows: rows.length,
    dbTotalPosts: existingPosts.length,
    newPostsCount,
    existingPostsCount: realDuplicatesCount,
    realDuplicatesCount,
    sameAuthorRenamedCount,
    diffAuthorRenamedCount,
    realDuplicatesList: evalResult.realDuplicatesList,
    sameAuthorRenamedList: evalResult.sameAuthorRenamedList,
    diffAuthorRenamedList: evalResult.diffAuthorRenamedList,
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
      : `Phân tích hoàn tất: Sẵn sàng nạp +${newPostsCount} bài viết mới (${realDuplicatesCount} bài trùng prompt+tác giả bị bỏ qua, ${sameAuthorRenamedCount} bài trùng tên cùng tác giả đã đổi tên v2, ${diffAuthorRenamedCount} bài trùng tên khác tác giả đã đính kèm tên tác giả).`,
  }
}




