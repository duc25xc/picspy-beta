import bcrypt from 'bcryptjs'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'

/**
 * Tách chuỗi CSV an toàn xử lý được các ô chứa xuống dòng và dấu ngoặc kép.
 */
export function parseCSV(text) {
  const lines = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const nextC = text[i + 1]

    if (inQuotes) {
      if (c === '"' && nextC === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\r' && nextC === '\n') {
        row.push(field)
        lines.push(row)
        row = []
        field = ''
        i++
      } else if (c === '\n' || c === '\r') {
        row.push(field)
        lines.push(row)
        row = []
        field = ''
      } else {
        field += c
      }
    }
  }

  if (field || row.length > 0) {
    row.push(field)
    lines.push(row)
  }

  if (lines.length === 0) return []

  const headers = lines[0].map((h) => h.trim().toLowerCase())
  const results = []

  for (let r = 1; r < lines.length; r++) {
    const rowValues = lines[r]
    if (rowValues.length < 2) continue
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = rowValues[idx] !== undefined ? rowValues[idx].trim() : ''
    })
    results.push(obj)
  }

  return results
}

/**
 * Tự động phân loại công cụ AI từ prompt/url/model
 */
function detectAiTool(rawText = '', url = '', aiModel = '', sourceCategory = '') {
  const text = (rawText + ' ' + url + ' ' + aiModel + ' ' + sourceCategory).toLowerCase()
  if (text.includes('gpt image 1.5') || text.includes('gpt-1.5') || text.includes('gpt-image-1-5')) return 'gpt-image-1-5'
  if (text.includes('midjourney') || text.includes('--ar')) return 'midjourney'
  if (text.includes('dalle') || text.includes('dall-e')) return 'dalle-3'
  if (text.includes('flux')) return 'flux'
  if (text.includes('stable-diffusion') || text.includes('sdxl') || text.includes('comfyui')) return 'stable-diffusion'
  if (text.includes('grok')) return 'grok'
  if (text.includes('chatgpt')) return 'chatgpt'
  return 'gemini-nano-banana-pro'
}

/**
 * Loại bỏ tiếng Việt có dấu
 */
function removeAccents(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/**
 * Trích xuất Username từ author_url (như X/Twitter/Instagram handle) hoặc author_name
 */
function extractUsername(name = '', authorUrl = '') {
  if (authorUrl) {
    const handleMatch = authorUrl.match(/(?:x\.com|twitter\.com|instagram\.com)\/([a-zA-Z0-9_]+)/i)
    if (handleMatch && handleMatch[1]) {
      const handle = handleMatch[1].toLowerCase().trim()
      if (handle.length >= 2 && handle !== 'intent' && handle !== 'status') {
        return handle
      }
    }
  }

  const cleanName = removeAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleanName.length >= 3 ? cleanName : `${cleanName || 'creator'}_${Math.floor(1000 + Math.random() * 9000)}`
}

/**
 * Chuyển các phân loại thô từ CSV thành mảng tags chuẩn của PicSpy
 */
function extractTagsFromCsvCategory(rawCategory = '') {
  if (!rawCategory) return []
  const items = rawCategory.split(/[,/|]+/)
  const tags = new Set()

  items.forEach((item) => {
    const tag = removeAccents(item.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (tag && tag.length >= 2) {
      tags.add(tag)
    }
  })

  return Array.from(tags).slice(0, 10)
}

/**
 * AI / Smart Rule Classification: Phân loại 1 danh mục duy nhất của hệ thống
 */
function classifySystemCategory(rawCategory = '', prompt = '', authorName = '', title = '') {
  const combined = (rawCategory + ' ' + prompt + ' ' + authorName + ' ' + title).toLowerCase()
  const clean = removeAccents(combined)

  if (clean.includes('anime') || clean.includes('manga') || clean.includes('nhan vat') || clean.includes('character') || clean.includes('chibi') || clean.includes('2d') || clean.includes('illust')) {
    return 'anime'
  }
  if (clean.includes('thanh pho') || clean.includes('city') || clean.includes('street') || clean.includes('do thi') || clean.includes('building') || clean.includes('cyberpunk') || clean.includes('kien truc')) {
    return 'city'
  }
  if (clean.includes('thien nhien') || clean.includes('nature') || clean.includes('landscape') || clean.includes('phong canh') || clean.includes('forest') || clean.includes('mountain') || clean.includes('sea') || clean.includes('flower')) {
    return 'nature'
  }
  if (clean.includes('vu tru') || clean.includes('space') || clean.includes('galaxy') || clean.includes('sci-fi') || clean.includes('planet')) {
    return 'space'
  }
  if (clean.includes('dark') || clean.includes('gothic') || clean.includes('shadow') || clean.includes('night')) {
    return 'dark'
  }
  if (clean.includes('light') || clean.includes('sunlight') || clean.includes('bright')) {
    return 'light'
  }
  if (clean.includes('minimal') || clean.includes('minimalist') || clean.includes('toi gian')) {
    return 'minimal'
  }
  if (clean.includes('abstract') || clean.includes('surreal') || clean.includes('pattern')) {
    return 'abstract'
  }
  if (clean.includes('gradient')) {
    return 'gradient'
  }

  return 'other'
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
    other: ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'],
  }
  return palettes[category] || palettes.other
}

/**
 * Parse danh sách ảnh từ chuỗi JSON hoặc chuỗi đơn
 */
function parseImageLists(imageUrlsStr = '', imagePathsStr = '') {
  let urls = []
  let paths = []

  if (imageUrlsStr) {
    if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
      try {
        urls = JSON.parse(imageUrlsStr)
      } catch {
        urls = [imageUrlsStr]
      }
    } else {
      urls = imageUrlsStr.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
    }
  }

  if (imagePathsStr) {
    if (imagePathsStr.startsWith('[') || imagePathsStr.startsWith('{')) {
      try {
        paths = JSON.parse(imagePathsStr)
      } catch {
        paths = [imagePathsStr]
      }
    } else {
      paths = imagePathsStr.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
    }
  }

  if (!Array.isArray(urls)) urls = [urls]
  if (!Array.isArray(paths)) paths = [paths]

  const maxLen = Math.max(urls.length, paths.length, 1)
  const result = []

  for (let i = 0; i < maxLen; i++) {
    const url = urls[i] || urls[0] || ''
    const localPath = paths[i] || paths[0] || ''
    if (url || localPath) {
      result.push({
        url: url || localPath,
        thumbnailUrl: url || localPath,
        previewUrl: url || localPath,
        localPath: localPath || undefined,
        format: 'jpg',
      })
    }
  }

  return result
}

/**
 * Service chính xử lý import tập tin CSV
 */
export async function processCsvImport(csvContent) {
  const rows = parseCSV(csvContent)
  console.log(`📊 Parsed ${rows.length} rows from CSV`)

  let importedCount = 0
  let skippedCount = 0
  let createdUsersCount = 0
  const defaultPasswordHash = await bcrypt.hash('Minhduc@123', 12)

  for (const row of rows) {
    const externalId = row.post_id
    const sourceUrl = row.original_post_url || row.author_url || row.url
    const citedFrom = row.url || row.cited_from || 'https://youmind.com'
    const rawCategory = row.category || ''
    const rowTitle = row.title || ''

    const generatedImages = parseImageLists(row.image_urls, row.image_paths)

    if (generatedImages.length === 0 && !externalId) {
      skippedCount++
      continue
    }

    // 1. Deduplication check: Bỏ qua nếu post đã tồn tại
    const existing = await Post.findOne({
      $or: [
        ...(externalId ? [{ externalId }] : []),
        ...(sourceUrl ? [{ sourceUrl }] : []),
        ...(row.url ? [{ sourceUrl: row.url }] : [])
      ]
    })

    if (existing) {
      skippedCount++
      continue
    }

    // 2. Author processing: Tạo hoặc lấy User
    const rawAuthorName = row.author_name || 'AI Creator'
    const username = extractUsername(rawAuthorName, row.author_url)
    const email = `${username}@picspy.ai`
    const avatarUrl = row.author_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawAuthorName)}`

    let user = await User.findOne({
      $or: [{ username }, { email }]
    })

    if (!user) {
      user = await User.create({
        username,
        displayName: rawAuthorName,
        email,
        passwordHash: defaultPasswordHash,
        avatar: avatarUrl,
        role: 'user',
        status: 'active',
        isVerified: true,
        socialLinks: {
          tiktok: '',
          instagram: '',
          twitter: row.author_url || '',
          facebook: row.author_url || ''
        }
      })
      createdUsersCount++
    } else if (row.author_avatar_url && user.avatar?.includes('dicebear.com')) {
      // Cập nhật avatar thật nếu trước đó dùng avatar tạo tự động
      user.avatar = row.author_avatar_url
      await user.save()
    }

    // 3. Prompt & JSON parsing
    let promptText = row.prompt || ''
    let negativePromptText = ''
    let aiModelText = row.ai_model || row.source_category || ''
    let parametersText = ''

    if (promptText.startsWith('{') || promptText.startsWith('```')) {
      try {
        let cleanJsonStr = promptText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
        const parsed = JSON.parse(cleanJsonStr)
        if (parsed.prompt) promptText = parsed.prompt
        if (parsed.negative_prompt) negativePromptText = parsed.negative_prompt
        if (parsed.model) aiModelText = parsed.model
        const params = []
        if (parsed.steps) params.push(`steps: ${parsed.steps}`)
        if (parsed.sampler_name) params.push(`sampler: ${parsed.sampler_name}`)
        if (parsed.cfg_scale) params.push(`cfg: ${parsed.cfg_scale}`)
        if (parsed.seed) params.push(`seed: ${parsed.seed}`)
        if (params.length > 0) parametersText = params.join(', ')
      } catch {
        // Giữ nguyên promptText nếu không parse được JSON
      }
    }

    if (!promptText || promptText.trim().length < 2) {
      promptText = `AI Artwork generated by @${rawAuthorName}`
    }

    // 4. Caption generation: Ưu tiên dùng `title` từ CSV
    let captionText = rowTitle || promptText
    if (captionText.length > 200) {
      captionText = captionText.substring(0, 197) + '...'
    }

    // 5. Category & Tags mapping & 6-color Palette
    const tags = extractTagsFromCsvCategory(rawCategory)
    const category = classifySystemCategory(rawCategory, promptText, rawAuthorName, rowTitle)
    const colorPalette = generateHarmonious6ColorPalette(category)

    // 6. Timestamps & Base Stats
    const originalCreatedAt = row.created_at ? new Date(row.created_at) : null
    const publishedAt = row.published_date ? new Date(row.published_date) : null
    const originalLanguage = row.original_language || 'EN'

    const baseLikes = Number(row.likes_count) || 0
    const baseViews = Number(row.views_count) || 0
    const baseShares = Number(row.shares_count) || 0
    const baseComments = Number(row.comments_count) || 0
    const baseBookmarks = Number(row.saved_count) || 0

    // 7. Post creation
    await Post.create({
      authorId: user._id,
      caption: captionText,
      prompt: promptText,
      negativePrompt: negativePromptText,
      aiTool: detectAiTool(promptText, sourceUrl, aiModelText, row.source_category),
      aiModel: aiModelText || 'v1.0',
      parameters: parametersText,
      postType: 'ai',
      category,
      tags,
      generatedImages,
      isExternal: true,
      externalId: externalId || undefined,
      sourceUrl: sourceUrl || undefined,
      authorUrl: row.author_url || undefined,
      citedFrom: citedFrom || undefined,
      originalLanguage,
      originalCreatedAt: originalCreatedAt || undefined,
      publishedAt: publishedAt || undefined,
      status: 'approved',
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

    importedCount++
  }

  return {
    totalRows: rows.length,
    importedCount,
    skippedCount,
    createdUsersCount
  }
}
