import { z } from 'zod'
import exifr from 'exifr'
import Post, { AI_TOOLS } from '../models/Post.model.js'
import AppError from '../utils/AppError.js'
import { uploadBuffer } from '../config/cloudinary.js'
import { imageQueue } from '../config/bullmq.js'
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'
import { logAdminAction } from '../utils/auditLogger.js'
import { Vibrant } from 'node-vibrant/node'
import { logger } from '../utils/logger.js'

// === ZOD SCHEMAS ===

// Helper: strip excess whitespace and reject strings that are only special chars / spaces
const sanitizeText = z.string().trim().transform(val => val.replace(/\s+/g, ' '))
const hasRealContent = (val) => {
  if (!val) return true // optional fields pass
  // Strip all whitespace and common filler chars, check if anything meaningful remains
  const stripped = val.replace(/[\s\-_~!@#$%^&*()+=\[\]{}<>|\\/:;"',.?]+/g, '')
  return stripped.length >= 2
}

const createPostSchema = z.object({
  // Phân loại bài viết
  postType: z.enum(['ai', 'digital', 'digital-raw', 'digital-normal']).default('ai'),
  // AI generation (core) - optional ở Zod, validate thủ công sau dựa trên postType
  prompt: sanitizeText.pipe(z.string().max(2000)).optional(),
  negativePrompt: sanitizeText.pipe(z.string().max(1000)).optional(),
  aiTool: z.enum(AI_TOOLS).optional(),
  aiModel: z.string().trim().optional(),
  parameters: z.string().trim().optional(),
  // workflowJson: được gửi từ client nhưng được kiểm tra tier ở middleware
  workflowJson: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'workflowJson phải là JSON hợp lệ' }
    ),
  contentType: z.enum(['image', 'video']).default('image'),

  // Content metadata
  caption: sanitizeText.pipe(z.string({ required_error: 'Mô tả (caption) là bắt buộc' }).max(500)).refine(hasRealContent, { message: 'Mô tả cần chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số)' }),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
  category: z.string().min(1).toLowerCase().trim().default('other'),

  // Monetization
  isPremium: z.boolean().optional().default(false),
  priceInVnd: z.number().min(1000).optional().default(20000),

  // Compat (legacy)
  resolution: z.enum(['sd', 'hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  aspectRatio: z.string().optional(),
})

const updatePostSchema = z.object({
  postType: z.enum(['ai', 'digital', 'digital-raw', 'digital-normal']).optional(),
  prompt: sanitizeText.pipe(z.string().max(2000)).optional()
    .refine(hasRealContent, { message: 'Prompt cần chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số)' }),
  negativePrompt: sanitizeText.pipe(z.string().max(1000)).optional(),
  aiTool: z.enum(AI_TOOLS).optional(),
  aiModel: z.string().trim().optional(),
  parameters: z.string().trim().optional(),
  workflowJson: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'workflowJson phải là JSON hợp lệ' }
    ),
  caption: sanitizeText.pipe(z.string().max(500)).optional()
    .refine(hasRealContent, { message: 'Mô tả cần chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số)' }),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional(),
  category: z.string().min(1).toLowerCase().trim().optional(),
  isPremium: z.boolean().optional(),
  priceInVnd: z.number().min(1000).optional(),
  resolution: z.enum(['sd', 'hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  aspectRatio: z.string().optional(),
})

// === HELPERS ===

const cleanCameraName = (make, model) => {
  if (!make && !model) return undefined
  const mk = (make || '').trim()
  const md = (model || '').trim()
  if (!mk) return md
  if (!md) return mk
  if (md.toLowerCase().startsWith(mk.toLowerCase())) {
    return md
  }
  return `${mk} ${md}`
}

const cleanLensModel = (lens, cameraName) => {
  if (!lens) return undefined
  let cleaned = lens.trim()
  
  if (cameraName) {
    const escaped = cameraName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '')
    
    const parts = cameraName.split(/\s+/).filter(p => p.length >= 2)
    parts.forEach(part => {
      const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned.replace(new RegExp(`\\b${escapedPart}\\b`, 'gi'), '')
      if (part.length > 3) {
        cleaned = cleaned.replace(new RegExp(escapedPart, 'gi'), '')
      }
    })
  }

  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '')
  cleaned = cleaned.trim()

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  return cleaned || undefined
}

const formatLensInfo = (arr) => {
  if (!Array.isArray(arr) || arr.length < 4) return undefined
  const rounded = arr.map(v => typeof v === 'number' ? Math.round(v * 100) / 100 : v)
  const [minF, maxF, minA, maxA] = rounded
  const focal = minF === maxF ? `${minF}mm` : `${minF}-${maxF}mm`
  const aperture = minA === maxA ? `f/${minA}` : `f/${minA}-${maxA}`
  return `${focal} ${aperture}`
}

const parseGpsCoord = (coord) => {
  if (typeof coord === 'number') return coord
  if (Array.isArray(coord) && coord.length >= 3) {
    const [deg, min, sec] = coord
    return deg + min / 60 + sec / 3600
  }
  return undefined
}

const mapColorSpace = (cs) => {
  if (cs === 1 || String(cs).toLowerCase().includes('srgb')) return 'sRGB'
  if (cs === 2 || String(cs).toLowerCase().includes('adobe')) return 'Adobe RGB'
  if (cs === 65535 || String(cs).toLowerCase().includes('p3') || String(cs).toLowerCase().includes('wide')) return 'Display P3 (Wide Color)'
  if (cs) return String(cs)
  return undefined
}

/** Parse EXIF metadata from an image buffer */
const extractExif = async (buffer) => {
  try {
    const rawExif = await exifr.parse(buffer, {
      pick: [
        'Make',
        'Model',
        'ISO',
        'FNumber',
        'FocalLength',
        'ExposureTime',
        'DateTimeOriginal',
        'LensModel',
        'Software',
        'GPSLatitude',
        'GPSLongitude',
        'ExposureValue',
        'Flash',
        'WhiteBalance',
        'Artist',
        'Copyright',
        'ExposureProgram',
        'MeteringMode',
        'ExposureBiasValue',
        'DigitalZoomRatio',
        'BodySerialNumber',
        'SerialNumber',
        'CameraSerialNumber',
        'LensSerialNumber',
        'LensSpecification',
        'LensInfo',
        'ColorSpace',
      ]
    })
    if (!rawExif) return {}

    const cameraName = cleanCameraName(rawExif.Make, rawExif.Model)
    const cleanedLens = cleanLensModel(rawExif.LensModel, cameraName)
    
    const rawAperture = rawExif.FNumber 
      ? Math.round(rawExif.FNumber * 100) / 100 
      : undefined
    const rawFocalLength = rawExif.FocalLength 
      ? Math.round(rawExif.FocalLength * 100) / 100 
      : undefined

    const evVal = typeof rawExif.ExposureBiasValue === 'number'
      ? (rawExif.ExposureBiasValue === 0
        ? '0.00 EV'
        : `${rawExif.ExposureBiasValue > 0 ? '+' : ''}${parseFloat(rawExif.ExposureBiasValue.toFixed(2))} EV`)
      : undefined

    const zoomVal = typeof rawExif.DigitalZoomRatio === 'number'
      ? `${parseFloat(rawExif.DigitalZoomRatio.toFixed(2))}x`
      : undefined

    const serialVal = rawExif.BodySerialNumber || rawExif.SerialNumber || rawExif.CameraSerialNumber || undefined

    const lensSpec = rawExif.LensSpecification 
      ? (Array.isArray(rawExif.LensSpecification) ? formatLensInfo(rawExif.LensSpecification) : String(rawExif.LensSpecification))
      : (rawExif.LensInfo ? formatLensInfo(rawExif.LensInfo) : undefined)

    const exifData = {
      camera: cameraName || undefined,
      lensModel: cleanedLens || undefined,
      iso: rawExif.ISO || undefined,
      aperture: rawAperture ? `f/${rawAperture}` : undefined,
      focalLength: rawFocalLength ? `${rawFocalLength}mm` : undefined,
      shutterSpeed: rawExif.ExposureTime
        ? rawExif.ExposureTime >= 1
          ? `${rawExif.ExposureTime}s`
          : `1/${Math.round(1 / rawExif.ExposureTime)}s`
        : undefined,
      ev:
        typeof rawExif.ExposureValue === 'number'
          ? Math.round(rawExif.ExposureValue * 10) / 10
          : undefined,
      flash: rawExif.Flash !== undefined ? rawExif.Flash : undefined,
      dateTaken: rawExif.DateTimeOriginal || undefined,
      software: rawExif.Software || undefined,
      whiteBalance: rawExif.WhiteBalance || undefined,
      artist: rawExif.Artist || undefined,
      copyright: rawExif.Copyright || undefined,
      exposureProgram: rawExif.ExposureProgram || undefined,
      meteringMode: rawExif.MeteringMode || undefined,
      exposureCompensation: evVal,
      digitalZoomRatio: zoomVal,
      bodySerialNumber: serialVal,
      lensSerialNumber: rawExif.LensSerialNumber || undefined,
      lensSpecification: lensSpec,
      colorSpace: mapColorSpace(rawExif.ColorSpace),
      gpsLat: parseGpsCoord(rawExif.GPSLatitude),
      gpsLng: parseGpsCoord(rawExif.GPSLongitude),
    }
    // Remove undefined keys
    Object.keys(exifData).forEach(
      (k) => exifData[k] === undefined && delete exifData[k]
    )
    return exifData
  } catch (err) {
    console.warn('⚠️ EXIF extraction:', err.message)
    return {}
  }
}

/** Upload single buffer to Cloudinary and return image object */
const uploadImage = async (buffer, folder, publicIdPrefix, fileSize, shouldConvertToWebp = false) => {
  let activeBuffer = buffer
  let activeSize = fileSize
  if (shouldConvertToWebp) {
    try {
      activeBuffer = await sharp(buffer)
        .rotate()
        .webp({ quality: 90 })
        .toBuffer()
      activeSize = activeBuffer.length
    } catch (err) {
      console.error('Failed to convert image to WebP on upload:', err.message)
    }
  }

  const result = await uploadBuffer(
    activeBuffer,
    folder,
    `${publicIdPrefix}_${Date.now()}`,
    { resource_type: 'image', angle: 'exif' }
  )
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    fileSize: activeSize || result.bytes,
    format: result.format,
  }
}

// === CONTROLLERS ===

/**
 * POST /posts — Upload AI content mới
 *
 * Multer fields:
 *   - sourceImages: 0–5 ảnh input/tham khảo
 *   - generatedImages: 1–5 ảnh kết quả AI
 *
 * Body (FormData):
 *   - prompt (required), negativePrompt, aiTool (required), aiModel, parameters
 *   - caption, tags (JSON string), category, isPremium, priceInTokens
 */
export const createPost = async (req, res, next) => {
  try {
    // ── Parse FormData fields ───────────────────────────────────
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags) }
      catch { body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean) }
    }
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (body.priceInVnd) body.priceInVnd = parseInt(body.priceInVnd)

    // ── Multi-model mode detection ──────────────────────────────
    // modelComparisons JSON: [{aiTool, aiModel, slotIndex}]
    let compMeta = []
    if (body.modelComparisons) {
      try { compMeta = JSON.parse(body.modelComparisons) } catch {}
    }
    const isMultiModel = compMeta.length >= 2 // cần ít nhất 2 slots mới là so sánh

    // ── Validate & collect primary generated images ─────────────
    // Single-model: dùng field 'generatedImages'
    // Multi-model:  dùng field 'compImages_0' làm primary
    const primaryFiles = isMultiModel
      ? (req.files?.[`compImages_${compMeta[0]?.slotIndex ?? 0}`] || [])
      : (req.files?.generatedImages || [])

    if (primaryFiles.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Cần ít nhất 1 ảnh tải lên', 400)
    }
    if (primaryFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh kết quả', 400)
    }

    // ── Source images ────────────────────────────────────────────
    const srcFiles = req.files?.sourceImages || []
    if (srcFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo', 400)
    }

    // sourceImageRefs: ảnh tham khảo reuse từ Cloudinary (không re-upload)
    let sourceImageRefs = []
    if (body.sourceImageRefs) {
      try { sourceImageRefs = JSON.parse(body.sourceImageRefs) } catch {}
    }
    if (sourceImageRefs.length + srcFiles.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo (bao gồm ảnh từ lịch sử)', 400)
    }

    const data = createPostSchema.parse(body)

    // ── Validation based on postType ─────────────────────────────
    if (data.postType === 'ai') {
      if (!data.prompt || !hasRealContent(data.prompt)) {
        throw new AppError('VALIDATION_ERROR', 'Prompt là bắt buộc đối với ảnh AI và phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.', 400)
      }
      if (!data.aiTool) {
        throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn công cụ AI', 400)
      }
    }

    // ── Upload rawFile & colorFile (Digital attachments) ──────────
    let rawFile = undefined
    if (req.files?.rawFile?.[0]) {
      const file = req.files.rawFile[0]
      const ext = file.originalname.split('.').pop().toLowerCase()
      const uploadRes = await uploadBuffer(
        file.buffer,
        'picspy/posts/raws',
        `raw_${req.user._id}_${Date.now()}.${ext}`,
        { resource_type: 'raw' }
      )
      rawFile = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        fileSize: file.size,
        format: ext,
        originalName: file.originalname,
      }
    }

    let colorFile = undefined
    if (req.files?.colorFile?.[0]) {
      const file = req.files.colorFile[0]
      const ext = file.originalname.split('.').pop().toLowerCase()
      const uploadRes = await uploadBuffer(
        file.buffer,
        'picspy/posts/colors',
        `color_${req.user._id}_${Date.now()}.${ext}`,
        { resource_type: 'raw' }
      )
      colorFile = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        fileSize: file.size,
        format: ext,
        originalName: file.originalname,
      }
    }

    // Determine final postType
    let finalPostType = data.postType
    if (finalPostType.startsWith('digital')) {
      finalPostType = rawFile ? 'digital-raw' : 'digital-normal'
    }

    // Determine format conversion for source images (only keep raw for digital-raw posts)
    const shouldConvertSourceToWebp = finalPostType !== 'digital-raw'

    // ── Upload source images (new files, parallel) ────────────────
    const sourceImages = [...sourceImageRefs] // bắt đầu bằng refs đã có
    let exifData = {}

    if (srcFiles.length > 0) {
      const srcUploads = await Promise.all(
        srcFiles.map((file, i) =>
          uploadImage(
            file.buffer,
            'picspy/posts/sources',
            `src_${req.user._id}_${i}`,
            file.size,
            shouldConvertSourceToWebp
          )
        )
      )
      sourceImages.push(...srcUploads)

      // Extract EXIF from first new source image (refs không có buffer)
      exifData = await extractExif(srcFiles[0].buffer)
      if (Object.keys(exifData).length > 0) {
        console.log('📷 EXIF extracted from source image:', JSON.stringify(exifData))
      }
    }

    // ── Upload primary generated images ──────────────────────────
    const genUploads = await Promise.all(
      primaryFiles.map((file, i) =>
        uploadImage(file.buffer, 'picspy/posts/originals', `gen_${req.user._id}_${i}`, file.size)
      )
    )

    // Trích xuất EXIF từ ảnh kết quả chính nếu không có ảnh tham khảo hoặc ảnh tham khảo không có EXIF
    if (Object.keys(exifData).length === 0 && primaryFiles.length > 0) {
      exifData = await extractExif(primaryFiles[0].buffer)
      if (Object.keys(exifData).length > 0) {
        console.log('📷 EXIF extracted from primary image:', JSON.stringify(exifData))
      }
    }

    // ── Upload comparison model slots (multi-model only) ──────────
    const modelComparisons = []
    if (isMultiModel && finalPostType === 'ai') {
      // Slot 0 đã là primary — bắt đầu từ slot 1
      for (let i = 1; i < compMeta.length; i++) {
        const slot = compMeta[i]
        const slotFiles = req.files?.[`compImages_${slot.slotIndex}`] || []
        if (slotFiles.length === 0) continue // skip slot trống
        if (slotFiles.length > 5) continue   // validate nhẹ

        const slotUploads = await Promise.all(
          slotFiles.map((file, j) =>
            uploadImage(file.buffer, 'picspy/posts/originals', `comp_${req.user._id}_${i}_${j}`, file.size)
          )
        )
        modelComparisons.push({
          aiTool: slot.aiTool,
          aiModel: slot.aiModel || undefined,
          generatedImages: slotUploads,
        })
      }
    }

    // ── Determine primary aiTool from slot 0 meta (multi-model) ──
    const primaryAiTool = (isMultiModel && finalPostType === 'ai') ? (compMeta[0]?.aiTool || data.aiTool) : data.aiTool
    const primaryAiModel = (isMultiModel && finalPostType === 'ai') ? (compMeta[0]?.aiModel || data.aiModel) : data.aiModel

    // ── workflowJson gate (Ultimate only) ────────────────────────
    const userTier = req.user.subscriptionTier
    const allowWorkflow = userTier === 'ultimate'
    const hasExif = Object.keys(exifData).length > 0

    // ── Create Post document ──────────────────────────────────────
    const post = await Post.create({
      authorId: req.user._id,
      postType: finalPostType,
      sourceImages,
      generatedImages: genUploads,
      prompt: finalPostType === 'ai' ? data.prompt : undefined,
      negativePrompt: finalPostType === 'ai' ? data.negativePrompt : undefined,
      aiTool: finalPostType === 'ai' ? primaryAiTool : undefined,
      aiModel: finalPostType === 'ai' ? primaryAiModel : undefined,
      parameters: finalPostType === 'ai' ? data.parameters : undefined,
      ...(allowWorkflow && data.workflowJson && finalPostType === 'ai' ? { workflowJson: data.workflowJson } : {}),
      contentType: data.contentType,
      caption: data.caption,
      tags: data.tags,
      category: data.category,
      isPremium: data.isPremium,
      priceInVnd: data.priceInVnd,
      resolution: data.resolution,
      orientation: data.orientation,
      aspectRatio: data.aspectRatio,
      ...(hasExif ? { exifData } : {}),
      rawFile,
      colorFile,
      // Multi-model
      isMultiModel: finalPostType === 'ai' ? isMultiModel : false,
      modelComparisons: finalPostType === 'ai' ? modelComparisons : [],
      status: 'pending',
    })

    // ── Enqueue image processing job ──────────────────────────────
    await imageQueue.add(
      'process-image',
      {
        postId: post._id.toString(),
        imageUrl: genUploads[0].url,
        publicId: genUploads[0].publicId,
        authorId: req.user._id.toString(),
        generatedCount: genUploads.length,
        sourceImageUrl: sourceImages?.[0]?.url || undefined,
        sourcePublicId: sourceImages?.[0]?.publicId || undefined,
      },
      { priority: 1 }
    )

    // ── Update user stats ─────────────────────────────────────────
    const User = (await import('../models/User.model.js')).default
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.postsCount': 1 } })

    res.status(202).json({
      message: 'Nội dung đang được xử lý. Bạn sẽ nhận thông báo khi hoàn tất.',
      postId: post._id,
      status: 'pending',
      isMultiModel,
    })
  } catch (err) {
    console.error('❌ Error in createPost:', err)
    if (err instanceof z.ZodError || err.name === 'ZodError') {
      const issues = err.issues || err.errors || []
      const errMsg = 'Dữ liệu không hợp lệ: ' + (Array.isArray(issues) ? issues : Object.values(issues)).map(e => `${e.path?.join('.') || e.path || 'post'} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, issues))
    }
    if (err.name === 'ValidationError') {
      const errMsg = 'Dữ liệu không hợp lệ: ' + Object.values(err.errors).map(e => `${e.path} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, err.errors))
    }
    next(err)
  }
}

const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

const parseHex = (hex) => {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('')
  }
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ]
}

const colorDistance = (hex1, hex2) => {
  try {
    const [r1, g1, b1] = parseHex(hex1)
    const [r2, g2, b2] = parseHex(hex2)
    const [h1, s1, l1] = rgbToHsl(r1, g1, b1)
    const [h2, s2, l2] = rgbToHsl(r2, g2, b2)

    const lowSat1 = s1 < 15,
      lowSat2 = s2 < 15
    if (lowSat1 || lowSat2) {
      const dL = Math.abs(l1 - l2)
      const dS = Math.abs(s1 - s2)
      return Math.sqrt((dL * 1.5) ** 2 + (dS * 0.5) ** 2)
    }

    const dH = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
    const dS = Math.abs(s1 - s2)
    const dL = Math.abs(l1 - l2)

    return Math.sqrt((dH * 1.5) ** 2 + (dS * 0.4) ** 2 + (dL * 0.9) ** 2)
  } catch {
    return 999
  }
}

/**
 * GET /posts — Feed công khai, chỉ approved posts
 * Filters: category, aiTool, contentType, orientation, resolution
 * Sort: new (default), hot, top
 */
export const getApprovedPosts = async (req, res, next) => {
  try {
    const {
      cursor,
      limit = 20,
      category,
      aiTool,
      contentType,
      orientation,
      resolution,
      sort = 'new',
      authorId, // Lọc theo tác giả — dùng cho ProfilePage
      q, // free-text search: caption, prompt, tags
      postType,
      hasExif,
      color,
      colorThreshold,
    } = req.query

    const baseMatch = { status: 'approved' }

    // =====================
    // Free-text search (q)
    // =====================
    if (typeof q === 'string') {
      const raw = q.trim()
      if (raw.length > 0) {
        // Safety: limit query length
        const queryText = raw.slice(0, 80)

        // Escape regex special chars
        const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const rx = new RegExp(escaped, 'i')

        // Normalize tags tokens: split by spaces/commas
        const tokens = queryText
          .toLowerCase()
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10)

        const or = [{ caption: rx }, { prompt: rx }]

        // If we have tokens, include tags match.
        // tags is an array -> use $in for exact tokens.
        if (tokens.length > 0) {
          or.push({ tags: { $in: tokens } })
        }

        // Also include partial match on tags via regex against each string in array.
        // (Mongo will apply regex per array element)
        or.push({ tags: rx })

        baseMatch.$or = or
      }
    }

    if (category && category !== 'all') baseMatch.category = category
    if (aiTool) baseMatch.aiTool = aiTool
    if (contentType) baseMatch.contentType = contentType
    if (orientation) baseMatch.orientation = orientation
    if (resolution) baseMatch.resolution = resolution
    if (authorId && /^[a-f\d]{24}$/i.test(authorId))
      baseMatch.authorId = authorId

    // postType filtering
    if (postType && postType !== 'all') {
      if (postType === 'digital') {
        baseMatch.postType = { $in: ['digital-raw', 'digital-normal'] }
      } else {
        baseMatch.postType = postType
      }
    }

    // hasExif filtering (checks if camera metadata exists)
    if (hasExif === 'true') {
      baseMatch.exifData = { $ne: null }
      baseMatch['exifData.camera'] = { $exists: true }
    } else if (hasExif === 'false') {
      const noExifCondition = {
        $or: [
          { exifData: null },
          { 'exifData.camera': { $exists: false } }
        ]
      }
      if (baseMatch.$or) {
        if (!baseMatch.$and) baseMatch.$and = []
        baseMatch.$and.push({ $or: baseMatch.$or })
        delete baseMatch.$or
        baseMatch.$and.push(noExifCondition)
      } else {
        baseMatch.$or = noExifCondition.$or
      }
    }

    // Dynamic facet counts matching (excludes postType & hasExif)
    const countsMatch = { status: 'approved' }
    if (typeof q === 'string' && q.trim().length > 0) {
      const queryText = q.trim().slice(0, 80)
      const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(escaped, 'i')
      const tokens = queryText.toLowerCase().split(/[\s,]+/).map(t => t.trim()).filter(Boolean).slice(0, 10)
      const or = [{ caption: rx }, { prompt: rx }, { tags: rx }]
      if (tokens.length > 0) {
        or.push({ tags: { $in: tokens } })
      }
      countsMatch.$or = or
    }
    if (category && category !== 'all') countsMatch.category = category
    if (aiTool) countsMatch.aiTool = aiTool
    if (contentType) countsMatch.contentType = contentType
    if (orientation) countsMatch.orientation = orientation
    if (resolution) countsMatch.resolution = resolution
    if (authorId && /^[a-f\d]{24}$/i.test(authorId)) countsMatch.authorId = authorId

    // Calculate dynamic stats using highly optimized parallel countDocuments (index-covered scans)
    const countsMatchAll = { ...countsMatch }
    const [totalCount, aiCount, rawCount, cameraExifCount] = await Promise.all([
      Post.countDocuments(countsMatchAll),
      Post.countDocuments({ ...countsMatchAll, postType: 'ai' }),
      Post.countDocuments({ ...countsMatchAll, postType: 'digital-raw' }),
      Post.countDocuments({
        ...countsMatchAll,
        postType: 'digital-normal',
        exifData: { $ne: null },
        'exifData.camera': { $exists: true }
      })
    ])

    const stats = {
      all: totalCount,
      ai: aiCount,
      raw: rawCount,
      cameraExif: cameraExifCount,
    }

    // =====================
    // Lọc theo màu sắc HSL chuyên sâu (In-memory scanner)
    // =====================
    if (color) {
      // 1. Chỉ lấy ID, colorPalette, createdAt và stats để tối ưu dung lượng RAM quét
      const postsWithColor = await Post.find(baseMatch)
        .select('_id colorPalette createdAt stats')
        .lean()

      const targetHex = '#' + color.replace('#', '')
      const threshold = colorThreshold ? parseInt(colorThreshold) : 12

      // 2. Tính khoảng cách HSL
      const matchedPosts = postsWithColor
        .map(post => {
          if (!post.colorPalette?.length) return null
          const minDist = Math.min(
            ...post.colorPalette
              .filter(hex => hex && hex.replace('#', '').length === 6)
              .map(hex => colorDistance(hex, targetHex))
          )
          return {
            post,
            colorDistance: minDist
          }
        })
        .filter(p => p !== null && p.colorDistance < threshold)

      // 3. Sắp xếp theo sort yêu cầu kết hợp độ khớp màu sắc
      if (sort === 'top') {
        matchedPosts.sort((a, b) => (b.post.stats?.likesCount || 0) - (a.post.stats?.likesCount || 0) || a.colorDistance - b.colorDistance || b.post.createdAt - a.post.createdAt)
      } else if (sort === 'hot') {
        const getHotScore = (p) => (p.stats?.viewsCount || 0) * 1 + (p.stats?.likesCount || 0) * 3 + (p.stats?.downloadsCount || 0) * 5
        matchedPosts.sort((a, b) => getHotScore(b.post) - getHotScore(a.post) || a.colorDistance - b.colorDistance || b.post.createdAt - a.post.createdAt)
      } else { // 'new'
        matchedPosts.sort((a, b) => b.post.createdAt - a.post.createdAt || a.colorDistance - b.colorDistance)
      }

      // 4. Phân trang
      let startIndex = 0
      if (cursor) {
        const idx = matchedPosts.findIndex(p => p.post._id.toString() === cursor)
        if (idx !== -1) startIndex = idx + 1
      }

      const slicedPosts = matchedPosts.slice(startIndex, startIndex + parseInt(limit) + 1)
      const hasMore = slicedPosts.length > parseInt(limit)
      if (hasMore) slicedPosts.pop()

      const nextCursor = hasMore ? slicedPosts[slicedPosts.length - 1].post._id.toString() : null
      const targetIds = slicedPosts.map(p => p.post._id)

      // 5. Populate chi tiết các posts hiển thị ở trang hiện tại
      const populatedPosts = await Post.find({ _id: { $in: targetIds } })
        .populate('authorId', 'username displayName avatar isVerified subscriptionTier')
        .lean()

      const orderedPosts = targetIds
        .map(id => populatedPosts.find(p => p._id.toString() === id.toString()))
        .filter(Boolean)

      return res.json({
        posts: orderedPosts,
        pagination: { hasMore, nextCursor, count: orderedPosts.length },
        sortMode: sort,
        stats
      })
    }

    // ─── HOT: Aggregation pipeline tính điểm real-time ──────
    if (sort === 'hot') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const pipeline = [
        { $match: { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $addFields: {
            hotScore: {
              $add: [
                { $multiply: ['$stats.viewsCount', 1] },
                { $multiply: ['$stats.likesCount', 3] },
                { $multiply: ['$stats.downloadsCount', 5] },
              ],
            },
          },
        },
      ]

      // Lọc cursor phân trang cho HOT dựa trên điểm score động
      if (cursor) {
        const cursorPost = await Post.findById(cursor)
        if (cursorPost) {
          const cursorScore = ((cursorPost.stats?.viewsCount || 0) * 1) +
                              ((cursorPost.stats?.likesCount || 0) * 3) +
                              ((cursorPost.stats?.downloadsCount || 0) * 5)
          pipeline.push({
            $match: {
              $or: [
                { hotScore: { $lt: cursorScore } },
                { hotScore: cursorScore, _id: { $lt: cursorPost._id } }
              ]
            }
          })
        }
      }

      pipeline.push(
        { $sort: { hotScore: -1, _id: -1 } },
        { $limit: parseInt(limit) + 1 },
        {
          $lookup: {
            from: 'users',
            localField: 'authorId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  username: 1,
                  displayName: 1,
                  avatar: 1,
                  isVerified: 1,
                },
              },
            ],
            as: 'authorId',
          },
        },
        { $unwind: { path: '$authorId', preserveNullAndEmptyArrays: true } }
      )

      const posts = await Post.aggregate(pipeline)
      const hasMore = posts.length > parseInt(limit)
      if (hasMore) posts.pop()

      const nextCursor = hasMore ? posts[posts.length - 1]._id.toString() : null

      return res.json({
        posts,
        pagination: { hasMore, nextCursor, count: posts.length },
        sortMode: 'hot',
        stats,
      })
    }

    // ─── NEW & TOP: Cursor-based pagination ─────────────────
    const query = { ...baseMatch }
    if (cursor) {
      if (sort === 'top') {
        const cursorPost = await Post.findById(cursor)
        if (cursorPost) {
          const cursorLikes = cursorPost.stats?.likesCount || 0
          query.$or = [
            { 'stats.likesCount': { $lt: cursorLikes } },
            { 'stats.likesCount': cursorLikes, _id: { $lt: cursorPost._id } }
          ]
        }
      } else {
        query._id = { $lt: cursor }
      }
    }

    const sortObj =
      sort === 'top' ? { 'stats.likesCount': -1, _id: -1 } : { _id: -1 } // 'new' mặc định

    const posts = await Post.find(query)
      .sort(sortObj)
      .limit(parseInt(limit) + 1)
      .populate(
        'authorId',
        'username displayName avatar isVerified subscriptionTier'
      )
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    const nextCursor = hasMore ? posts[posts.length - 1]._id : null

    res.json({
      posts,
      pagination: { hasMore, nextCursor, count: posts.length },
      sortMode: sort,
      stats,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/me — Lấy ảnh của user đang đăng nhập (cần auth)
 * Bao gồm tất cả status, có filter
 */
export const getMyPosts = async (req, res, next) => {
  try {
    const {
      cursor,
      limit = 20,
      status, // 'pending' | 'approved' | 'rejected' | 'hidden' | undefined (all)
    } = req.query

    const query = { authorId: req.user._id }

    if (cursor) query._id = { $lt: cursor }
    if (
      status &&
      ['pending', 'approved', 'rejected', 'hidden'].includes(status)
    ) {
      query.status = status
    }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    const nextCursor = hasMore ? posts[posts.length - 1]._id : null

    // Tổng hợp stats
    const statusCounts = await Post.aggregate([
      { $match: { authorId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 }
    statusCounts.forEach(({ _id, count }) => {
      stats[_id] = count
      stats.total += count
    })

    res.json({
      posts,
      stats,
      pagination: {
        hasMore,
        nextCursor,
        count: posts.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /posts/:id — Chỉnh sửa post (chỉ owner)
 */
export const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    if (post.authorId.toString() !== req.user._id.toString()) {
      throw new AppError(
        'FORBIDDEN',
        'Bạn không có quyền chỉnh sửa bài đăng này',
        403
      )
    }

    // ── Parse FormData fields ───────────────────────────────────
    let body = { ...req.body }
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags)
      } catch {
        body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
    }
    if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
    if (body.priceInVnd) body.priceInVnd = parseInt(body.priceInVnd)

    // Validate textual data qua Zod
    const data = updatePostSchema.parse(body)

    // ── Enforce content validations ──
    const activeCaption = data.caption !== undefined ? data.caption : post.caption
    if (!activeCaption || !hasRealContent(activeCaption)) {
      throw new AppError('VALIDATION_ERROR', 'Mô tả (caption) là bắt buộc và phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.', 400)
    }

    const activePostType = data.postType || post.postType
    if (activePostType === 'ai') {
      const activePrompt = data.prompt !== undefined ? data.prompt : post.prompt
      if (!activePrompt || !hasRealContent(activePrompt)) {
        throw new AppError('VALIDATION_ERROR', 'Prompt là bắt buộc đối với ảnh AI và phải chứa nội dung có nghĩa (ít nhất 2 ký tự chữ/số). Không được chỉ toàn dấu cách hoặc ký tự đặc biệt.', 400)
      }
      const activeAiTool = data.aiTool !== undefined ? data.aiTool : post.aiTool
      if (!activeAiTool) {
        throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn công cụ AI', 400)
      }
    }

    // ── Xử lý ảnh gốc (Source Images) ───────────────────────────
    let keepSourceImagePublicIds = []
    if (body.keepSourceImagePublicIds) {
      try {
        keepSourceImagePublicIds = JSON.parse(body.keepSourceImagePublicIds)
      } catch {}
    }

    let sourceImageRefs = []
    if (body.sourceImageRefs) {
      try {
        sourceImageRefs = JSON.parse(body.sourceImageRefs)
      } catch {}
    }

    const srcFiles = req.files?.sourceImages || []
    
    // Gom danh sách ảnh gốc cũ được giữ lại theo thứ tự client chỉ định
    const oldSourceImagesKept = keepSourceImagePublicIds
      .map(pubId => (post.sourceImages || []).find(img => img.publicId === pubId))
      .filter(Boolean)

    // Xác định ảnh gốc cũ cần xóa
    const sourceImagesToDestroy = (post.sourceImages || []).filter(img => 
      img.publicId && !keepSourceImagePublicIds.includes(img.publicId)
    )

    // Determine format conversion for source images (only keep raw for digital-raw posts)
    const currentPostType = data.postType || post.postType
    const shouldConvertSourceToWebp = currentPostType !== 'digital-raw'

    // Upload các ảnh tham khảo mới
    const newSourceUploads = []
    if (srcFiles.length > 0) {
      const srcUploads = await Promise.all(
        srcFiles.map((file, i) =>
          uploadImage(
            file.buffer,
            'picspy/posts/sources',
            `src_${req.user._id}_${i}`,
            file.size,
            shouldConvertSourceToWebp
          )
        )
      )
      newSourceUploads.push(...srcUploads)
    }

    const finalSourceImages = [...oldSourceImagesKept, ...sourceImageRefs, ...newSourceUploads]
    if (finalSourceImages.length > 5) {
      throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh tham khảo', 400)
    }

    // Xóa ảnh gốc cũ khỏi Cloudinary (bao gồm cả file gốc, preview và thumbnail) nếu không còn bài viết nào khác liên kết
    if (sourceImagesToDestroy.length > 0) {
      await Promise.all(
        sourceImagesToDestroy.map(async (img) => {
          const isShared = await Post.exists({ _id: { $ne: post._id }, 'sourceImages.publicId': img.publicId })
          if (isShared) {
            console.log(`ℹ️ Skipping Cloudinary destroy for source image ${img.publicId} as it is referenced by other posts`)
            return
          }
          const promises = [cloudinary.uploader.destroy(img.publicId).catch(() => {})]
          const baseName = img.publicId.split('/').pop()
          promises.push(cloudinary.uploader.destroy(`picspy/posts/thumbnails/${baseName}_thumb`).catch(() => {}))
          promises.push(cloudinary.uploader.destroy(`picspy/posts/previews/${baseName}_preview`).catch(() => {}))
          return Promise.all(promises)
        })
      )
    }

    // ── Xử lý ảnh kết quả & Multi-model ────────────────────────
    let compMeta = []
    if (body.modelComparisons) {
      try {
        compMeta = JSON.parse(body.modelComparisons)
      } catch {}
    }
    const isMultiModel = compMeta.length >= 2

    // Danh sách tất cả các ảnh kết quả cũ đã có (để check dọn dẹp)
    const allOldGeneratedImages = []
    if (post.generatedImages && post.generatedImages.length > 0) {
      allOldGeneratedImages.push(...post.generatedImages)
    }
    if (post.modelComparisons && post.modelComparisons.length > 0) {
      post.modelComparisons.forEach(slot => {
        if (slot.generatedImages && slot.generatedImages.length > 0) {
          allOldGeneratedImages.push(...slot.generatedImages)
        }
      })
    }

    let finalGeneratedImages = []
    let finalModelComparisons = []
    const keptImagePublicIds = new Set() // để theo dõi các ảnh cũ được giữ lại

    if (isMultiModel) {
      // Chế độ so sánh nhiều model
      for (let i = 0; i < compMeta.length; i++) {
        const slot = compMeta[i]
        
        // Lấy ảnh cũ được giữ lại trong slot này theo đúng thứ tự
        let slotKeepIds = slot.keepImagePublicIds || []
        const oldImagesKept = slotKeepIds
          .map(pubId => allOldGeneratedImages.find(img => img.publicId === pubId))
          .filter(Boolean)
        oldImagesKept.forEach(img => keptImagePublicIds.add(img.publicId))

        // Upload ảnh mới cho slot này (compImages_X)
        const slotFiles = req.files?.[`compImages_${slot.slotIndex}`] || []
        const newSlotUploads = await Promise.all(
          slotFiles.map((file, j) =>
            uploadImage(file.buffer, 'picspy/posts/originals', `comp_${req.user._id}_${i}_${j}`, file.size)
          )
        )

        const slotImages = [...oldImagesKept, ...newSlotUploads]
        if (slotImages.length === 0) {
          throw new AppError('VALIDATION_ERROR', `Model ${i + 1} cần ít nhất 1 ảnh kết quả`, 400)
        }
        if (slotImages.length > 5) {
          throw new AppError('VALIDATION_ERROR', `Model ${i + 1} tối đa 5 ảnh kết quả`, 400)
        }

        if (i === 0) {
          finalGeneratedImages = slotImages
        } else {
          finalModelComparisons.push({
            aiTool: slot.aiTool,
            aiModel: slot.aiModel || undefined,
            generatedImages: slotImages,
          })
        }
      }
    } else {
      // Chế độ single-model
      let keepGeneratedImagePublicIds = []
      if (body.keepGeneratedImagePublicIds) {
        try {
          keepGeneratedImagePublicIds = JSON.parse(body.keepGeneratedImagePublicIds)
        } catch {}
      }

      const oldImagesKept = keepGeneratedImagePublicIds
        .map(pubId => allOldGeneratedImages.find(img => img.publicId === pubId))
        .filter(Boolean)
      oldImagesKept.forEach(img => keptImagePublicIds.add(img.publicId))

      const genFiles = req.files?.generatedImages || []
      const newGenUploads = await Promise.all(
        genFiles.map((file, i) =>
          uploadImage(file.buffer, 'picspy/posts/originals', `gen_${req.user._id}_${i}`, file.size)
        )
      )

      finalGeneratedImages = [...oldImagesKept, ...newGenUploads]
      if (finalGeneratedImages.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Cần ít nhất 1 ảnh kết quả AI', 400)
      }
      if (finalGeneratedImages.length > 5) {
        throw new AppError('VALIDATION_ERROR', 'Tối đa 5 ảnh kết quả AI', 400)
      }
      finalModelComparisons = []
    }

    // Xác định các ảnh kết quả cũ cần xóa khỏi Cloudinary (những ảnh không được giữ lại ở bất kỳ đâu)
    const imagesToDestroy = allOldGeneratedImages.filter(img => 
      img.publicId && !keptImagePublicIds.has(img.publicId)
    )

    if (imagesToDestroy.length > 0) {
      await Promise.all(
        imagesToDestroy.map(img => {
          const promises = [cloudinary.uploader.destroy(img.publicId).catch(() => {})]
          const baseName = img.publicId.split('/').pop()
          promises.push(cloudinary.uploader.destroy(`picspy/posts/thumbnails/${baseName}_thumb`).catch(() => {}))
          promises.push(cloudinary.uploader.destroy(`picspy/posts/previews/${baseName}_preview`).catch(() => {}))
          return Promise.all(promises)
        })
      )
    }

    // Determine primary aiTool & aiModel
    const primaryAiTool = isMultiModel ? (compMeta[0]?.aiTool || data.aiTool) : data.aiTool
    const primaryAiModel = isMultiModel ? (compMeta[0]?.aiModel || data.aiModel) : data.aiModel

    // Check workflowJson gate
    const userTier = req.user.subscriptionTier
    const allowWorkflow = userTier === 'ultimate'

    // Update fields
    const promptChanged = data.prompt !== undefined && data.prompt !== post.prompt
    post.prompt = data.prompt !== undefined ? data.prompt : post.prompt
    post.negativePrompt = data.negativePrompt !== undefined ? data.negativePrompt : post.negativePrompt
    post.aiTool = primaryAiTool !== undefined ? primaryAiTool : post.aiTool
    post.aiModel = primaryAiModel !== undefined ? primaryAiModel : post.aiModel
    post.parameters = data.parameters !== undefined ? data.parameters : post.parameters
    if (allowWorkflow) {
      post.workflowJson = data.workflowJson !== undefined ? data.workflowJson : post.workflowJson
    }
    post.caption = data.caption !== undefined ? data.caption : post.caption
    post.tags = data.tags !== undefined ? data.tags : post.tags
    post.category = data.category !== undefined ? data.category : post.category
    post.isPremium = data.isPremium !== undefined ? data.isPremium : post.isPremium
    post.priceInVnd = data.priceInVnd !== undefined ? data.priceInVnd : post.priceInVnd
    
    // Resolution, orientation, aspectRatio
    if (data.resolution) post.resolution = data.resolution
    if (data.orientation) post.orientation = data.orientation
    if (data.aspectRatio) post.aspectRatio = data.aspectRatio

    const oldPrimaryPublicId = post.generatedImages?.[0]?.publicId
    const newPrimaryPublicId = finalGeneratedImages[0]?.publicId
    const oldSourcePublicId = post.sourceImages?.[0]?.publicId
    const newSourcePublicId = finalSourceImages[0]?.publicId

    // Update images
    post.sourceImages = finalSourceImages
    post.generatedImages = finalGeneratedImages
    post.isMultiModel = isMultiModel
    post.modelComparisons = finalModelComparisons

    // Nếu thay đổi ảnh chính đầu tiên hoặc ảnh nguồn đầu tiên, ta trigger hàng chờ re-processing
    const hasPrimaryImageChanged = oldPrimaryPublicId !== newPrimaryPublicId
    const hasSourceImageChanged = oldSourcePublicId !== newSourcePublicId

    // Cập nhật trạng thái duyệt về 'pending' khi prompt quan trọng thay đổi (và post chưa được duyệt)
    // Không chuyển sang pending khi thay đổi ảnh chính/thumbnail hoặc ảnh tham khảo.
    if (promptChanged && post.status !== 'approved') {
      post.status = 'pending'
    }

    await post.save()

    // Enqueue processing job if primary image or source image changed
    if ((hasPrimaryImageChanged && newPrimaryPublicId) || (hasSourceImageChanged && newSourcePublicId)) {
      await imageQueue.add(
        'process-image',
        {
          postId: post._id.toString(),
          imageUrl: finalGeneratedImages[0].url,
          publicId: finalGeneratedImages[0].publicId,
          authorId: req.user._id.toString(),
          generatedCount: finalGeneratedImages.length,
          sourceImageUrl: finalSourceImages[0]?.url || undefined,
          sourcePublicId: finalSourceImages[0]?.publicId || undefined,
        },
        { priority: 1 }
      )
    }

    res.json({ message: 'Cập nhật thành công', post })
  } catch (err) {
    console.error('❌ Error in updatePost:', err)
    if (err instanceof z.ZodError || err.name === 'ZodError') {
      const issues = err.issues || err.errors || []
      const errMsg = 'Dữ liệu không hợp lệ: ' + (Array.isArray(issues) ? issues : Object.values(issues)).map(e => `${e.path?.join('.') || e.path || 'post'} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, issues))
    }
    if (err.name === 'ValidationError') {
      const errMsg = 'Dữ liệu không hợp lệ: ' + Object.values(err.errors).map(e => `${e.path} (${e.message})`).join(', ')
      return next(new AppError('VALIDATION_ERROR', errMsg, 422, err.errors))
    }
    next(err)
  }
}

/**
 * DELETE /posts/:id — Xóa post (chỉ owner)
 * Xóa cả ảnh trên Cloudinary (sourceImages + generatedImages)
 */
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) throw new AppError('NOT_FOUND', 'Không tìm thấy bài đăng', 404)

    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError(
        'FORBIDDEN',
        'Bạn không có quyền xóa bài đăng này',
        403
      )
    }

    // Xóa tất cả ảnh trên Cloudinary
    const deletePromises = []

    // Xóa sourceImages + previews + thumbnails nếu không còn bài viết nào khác liên kết
    for (const img of post.sourceImages || []) {
      if (img.publicId) {
        const isShared = await Post.exists({ _id: { $ne: post._id }, 'sourceImages.publicId': img.publicId })
        if (!isShared) {
          deletePromises.push(
            cloudinary.uploader.destroy(img.publicId).catch(() => {})
          )
          const baseName = img.publicId.split('/').pop()
          deletePromises.push(
            cloudinary.uploader
              .destroy(`picspy/posts/thumbnails/${baseName}_thumb`)
              .catch(() => {})
          )
          deletePromises.push(
            cloudinary.uploader
              .destroy(`picspy/posts/previews/${baseName}_preview`)
              .catch(() => {})
          )
        } else {
          console.log(`ℹ️ Skipping Cloudinary destroy for source image ${img.publicId} as it is referenced by other posts`)
        }
      }
    }

    // Xóa generatedImages + thumbnails + previews
    for (const img of post.generatedImages || []) {
      if (img.publicId) {
        deletePromises.push(
          cloudinary.uploader.destroy(img.publicId).catch(() => {})
        )
        const baseName = img.publicId.split('/').pop()
        deletePromises.push(
          cloudinary.uploader
            .destroy(`picspy/posts/thumbnails/${baseName}_thumb`)
            .catch(() => {})
        )
        deletePromises.push(
          cloudinary.uploader
            .destroy(`picspy/posts/previews/${baseName}_preview`)
            .catch(() => {})
        )
      }
    }

    await Promise.allSettled(deletePromises)
    await post.deleteOne()

    // Giảm postsCount của tác giả
    const User = (await import('../models/User.model.js')).default
    await User.findByIdAndUpdate(post.authorId, {
      $inc: { 'stats.postsCount': -1 },
    })

    // Log admin action if deleted by admin
    if (req.user.role === 'admin') {
      await logAdminAction(req.user._id, 'POST_DELETE', post._id, 'Post', {
        caption: post.caption,
        authorId: post.authorId
      })
    }

    res.json({ message: 'Đã xóa bài đăng thành công', postId: req.params.id })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/following — Feed từ những người đang follow
 */
export const getFollowingFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query

    const Follow = (await import('../models/Follow.model.js')).default
    const follows = await Follow.find({ followerId: req.user._id })
      .select('followingId')
      .lean()

    const followingIds = follows.map((f) => f.followingId)

    if (followingIds.length === 0) {
      return res.json({
        posts: [],
        isEmpty: true,
        pagination: { hasMore: false, nextCursor: null, count: 0 },
      })
    }

    const query = { status: 'approved', authorId: { $in: followingIds } }
    if (cursor) query._id = { $lt: cursor }

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    const hasMore = posts.length > parseInt(limit)
    if (hasMore) posts.pop()

    res.json({
      posts,
      pagination: {
        hasMore,
        nextCursor: hasMore ? posts[posts.length - 1]._id : null,
        count: posts.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /posts/search-by-image
 * Tìm kiếm hình ảnh tương đồng dựa trên RGB 64-bin Histogram
 */
export const searchByImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng cung cấp hình ảnh để tìm kiếm.' })
    }

    logger.info(`Starting image search: File size = ${req.file.size} bytes, Mimetype = ${req.file.mimetype}`)

    const { limit = 12, cursor, color, colorThreshold, postType } = req.query
    const limitNum = parseInt(limit)

    // 1. Trích xuất RGB 64-bin histogram của ảnh mẫu sử dụng sharp
    const { data: rawPixels } = await sharp(req.file.buffer)
      .resize(200, null, { withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const bins = 64
    const rBins = new Uint32Array(bins)
    const gBins = new Uint32Array(bins)
    const bBins = new Uint32Array(bins)

    for (let i = 0; i < rawPixels.length; i += 3) {
      rBins[Math.floor(rawPixels[i] / 4)]++
      gBins[Math.floor(rawPixels[i + 1] / 4)]++
      bBins[Math.floor(rawPixels[i + 2] / 4)]++
    }

    // Chuẩn hóa về phạm vi 0-100
    const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1
    const targetHist = {
      r: Array.from(rBins, v => Math.round(v / maxVal * 100)),
      g: Array.from(gBins, v => Math.round(v / maxVal * 100)),
      b: Array.from(bBins, v => Math.round(v / maxVal * 100)),
    }

    // 2. Query approved posts with histograms, filtering by postType if specified
    const queryConditions = {
      status: 'approved',
      'histogram.r': { $exists: true, $not: { $size: 0 } }
    }
    if (postType && postType !== 'all') {
      if (postType === 'digital') {
        queryConditions.postType = { $in: ['digital-raw', 'digital-normal'] }
      } else {
        queryConditions.postType = postType
      }
    }

    const postsWithHist = await Post.find(queryConditions)
      .select('_id caption prompt tags generatedImages images stats authorId isPremium aiTool resolution colors createdAt histogram histograms colorPalette')
      .populate('authorId', 'username displayName avatar isVerified subscriptionTier')
      .lean()

    // Lọc HSL màu sắc trước nếu có tham số color được truyền lên
    let candidates = postsWithHist
    if (color) {
      const targetHex = '#' + color.replace('#', '')
      const threshold = colorThreshold ? parseInt(colorThreshold) : 12
      candidates = postsWithHist.filter(post => {
        if (!post.colorPalette?.length) return false
        const minDist = Math.min(
          ...post.colorPalette
            .filter(hex => hex && hex.replace('#', '').length === 6)
            .map(hex => colorDistance(hex, targetHex))
        )
        return minDist < threshold
      })
    }

    // 3. Tính Euclidean Distance (khoảng cách Euclid)
    // Càng nhỏ -> càng tương đồng. Ta quy đổi về % Similarity.
    // Khoảng cách tối đa trên 3 kênh 64-bin chuẩn hóa 100 là: Math.sqrt(3 * 64 * (100)^2) = 1385.64
    const MAX_DIST = 1385.64

    let scoredPosts = candidates.map(post => {
      // Fallback: nếu mảng histograms không có, sử dụng histogram đơn ở root (để tương thích ngược)
      const targetHistograms = post.histograms && post.histograms.length > 0 
        ? post.histograms 
        : (post.histogram ? [post.histogram] : [])

      if (targetHistograms.length === 0) {
        return {
          ...post,
          similarityScore: 0
        }
      }

      const scores = targetHistograms.map(h => {
        let rDistSum = 0
        let gDistSum = 0
        let bDistSum = 0

        for (let i = 0; i < bins; i++) {
          rDistSum += Math.pow((targetHist.r[i] - (h.r[i] || 0)), 2)
          gDistSum += Math.pow((targetHist.g[i] - (h.g[i] || 0)), 2)
          bDistSum += Math.pow((targetHist.b[i] - (h.b[i] || 0)), 2)
        }

        const distance = Math.sqrt(rDistSum + gDistSum + bDistSum)
        return Math.max(0, Math.min(100, Math.round((1 - distance / MAX_DIST) * 100)))
      })

      const maxScore = Math.max(...scores)

      return {
        ...post,
        similarityScore: maxScore
      }
    })

    // Lọc theo ngưỡng độ tương đồng tối thiểu (similarityScore >= 60%) để loại bỏ kết quả không liên quan
    scoredPosts = scoredPosts.filter(p => p.similarityScore >= 60)

    // 4. Sắp xếp theo độ tương đồng giảm dần
    scoredPosts.sort((a, b) => b.similarityScore - a.similarityScore || b.createdAt - a.createdAt)

    // Extract color palette of uploaded image using node-vibrant (consistent with 400px worker thumbnail size)
    let colorPalette = []
    try {
      const jpegBuffer = await sharp(req.file.buffer)
        .resize(400, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      const palette = await Vibrant.from(jpegBuffer).getPalette()
      colorPalette = Object.values(palette)
        .filter(Boolean)
        .map(c => c.hex)
        .slice(0, 6)
    } catch (vibrateErr) {
      logger.error('Vibrant palette extraction failed during image search', vibrateErr)
    }

    // 5. Phân trang thủ công (Client pagination)
    let startIndex = 0
    if (cursor) {
      const idx = scoredPosts.findIndex(p => p._id.toString() === cursor)
      if (idx !== -1) startIndex = idx + 1
    }

    const paginatedPosts = scoredPosts.slice(startIndex, startIndex + limitNum + 1)
    const hasMore = paginatedPosts.length > limitNum
    if (hasMore) paginatedPosts.pop()

    const nextCursor = hasMore ? paginatedPosts[paginatedPosts.length - 1]._id.toString() : null

    logger.info(`Image search completed: Found ${scoredPosts.length} matches, Paginated count = ${paginatedPosts.length}, Extracted colors = ${colorPalette.join(', ')}`)

    res.json({
      posts: paginatedPosts,
      pagination: { hasMore, nextCursor, count: paginatedPosts.length },
      colorPalette
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/homepage-data — Trích xuất thống kê và dữ liệu thời gian thực cho trang chủ
 */
export const getHomepageData = async (req, res, next) => {
  try {
    const User = (await import('../models/User.model.js')).default
    const Settings = (await import('../models/Settings.model.js')).default

    // 1. Settings (categoryStyle)
    const settings = await Settings.getSingleton()
    const categoryStyle = settings.categoryStyle || 'style-1'

    let heroBannerImage = settings.heroBannerImage
    if (settings.heroBannerMode === 'auto') {
      const topPostAgg = await Post.aggregate([
        { $match: { status: 'approved' } },
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $ifNull: ['$stats.viewsCount', 0] },
                { $multiply: [{ $ifNull: ['$stats.likesCount', 0] }, 3] },
                { $multiply: [{ $ifNull: ['$stats.downloadsCount', 0] }, 5] },
              ],
            },
          },
        },
        { $sort: { popularityScore: -1, _id: -1 } },
        { $limit: 1 },
      ])
      const topPost = topPostAgg[0]
      if (topPost) {
        heroBannerImage = topPost.generatedImages?.[0]?.url || topPost.images?.[0]?.url
      }
    }

    // 2. Stats
    const totalPosts = await Post.countDocuments({ status: 'approved' })
    
    // Sum total downloads
    const downloadsAgg = await Post.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$stats.downloadsCount' } } }
    ])
    const totalDownloads = downloadsAgg[0]?.total || 0

    // Count creators (users who have postsCount > 0 or have role creator/admin)
    const creatorsCount = await User.countDocuments({
      $or: [
        { role: 'creator' },
        { 'stats.postsCount': { $gt: 0 } }
      ]
    })

    // Sum total coins paid (totalEarned from all users)
    const coinsAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalEarned' } } }
    ])
    const totalCoinsPaid = coinsAgg[0]?.total || 0

    // 3. Featured Categories
    const Category = (await import('../models/Category.model.js')).default
    const activeCategories = await Category.find({ isActive: true }).lean()
    const activeSlugs = activeCategories.map(cat => cat.slug)

    // Sum views of approved posts grouped by category
    const categoryViewsAgg = await Post.aggregate([
      { $match: { status: 'approved', category: { $in: activeSlugs } } },
      {
        $group: {
          _id: '$category',
          totalViews: { $sum: { $ifNull: ['$stats.viewsCount', 0] } }
        }
      }
    ])

    const categoryViewsMap = {}
    categoryViewsAgg.forEach(item => {
      if (item._id) {
        categoryViewsMap[item._id] = item.totalViews
      }
    })

    const categoriesWithViews = activeCategories.map(cat => ({
      ...cat,
      views: categoryViewsMap[cat.slug] || 0
    }))

    // Sắp xếp theo tổng số views giảm dần, nếu bằng nhau thì theo sortOrder
    categoriesWithViews.sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })

    const top6Categories = categoriesWithViews.slice(0, 6)
    const activeCategoriesList = activeCategories.map(cat => ({
      key: cat.slug,
      label: cat.name,
      emoji: cat.emoji
    }))
    // Đưa 'other' (Khác) về cuối danh sách
    activeCategoriesList.sort((a, b) => {
      if (a.key === 'other') return 1
      if (b.key === 'other') return -1
      return 0
    })

    const categoriesData = await Promise.all(top6Categories.map(async (cat) => {
      const count = await Post.countDocuments({ status: 'approved', category: cat.slug })
      // Lấy tối đa 6 ảnh để hiển thị dạng Grid (Style 2), Carousel (Style 3) hoặc Split (Style 4)
      const topPosts = await Post.aggregate([
        { $match: { status: 'approved', category: cat.slug } },
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $ifNull: ['$stats.viewsCount', 0] },
                { $multiply: [{ $ifNull: ['$stats.likesCount', 0] }, 3] },
                { $multiply: [{ $ifNull: ['$stats.downloadsCount', 0] }, 5] },
              ],
            },
          },
        },
        { $sort: { popularityScore: -1, _id: -1 } },
        { $limit: 6 },
        {
          $project: {
            _id: 1,
            generatedImages: 1,
            images: 1,
            caption: 1,
            prompt: 1,
            tags: 1,
            stats: 1,
          }
        }
      ])
      
      return {
        key: cat.slug,
        label: cat.name,
        emoji: cat.emoji,
        count,
        posts: topPosts
      }
    }))

    // Đưa 'other' (Khác) về cuối danh sách
    categoriesData.sort((a, b) => {
      if (a.key === 'other') return 1
      if (b.key === 'other') return -1
      return 0
    })

    // 4. Hero Background Collage (8 ảnh từ database hoặc manual settings)
    let collageImages = []
    if (settings.heroCollageMode === 'manual' && settings.heroCollageImages?.length >= 8) {
      collageImages = settings.heroCollageImages.slice(0, 8)
    } else {
      const collagePosts = await Post.find({ status: 'approved' })
        .sort({ _id: -1 })
        .limit(8)
        .select('generatedImages images')
        .lean()
      
      collageImages = collagePosts.map(post => {
        const img = post.generatedImages?.[0] || post.images?.[0]
        return img?.previewUrl || img?.thumbnailUrl || img?.url || 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=500&q=70&fm=webp'
      })
      
      const defaultCollage = [
        'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=70&fm=webp',
        'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=500&q=70&fm=webp',
      ]
      while (collageImages.length < 8) {
        collageImages.push(defaultCollage[collageImages.length] || defaultCollage[0])
      }
    }

    // 5. Weekly Trending (top 3 posts sorted by hotScore in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const trendingPosts = await Post.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $addFields: {
          hotScore: {
            $add: [
              { $multiply: ['$stats.viewsCount', 1] },
              { $multiply: ['$stats.likesCount', 3] },
              { $multiply: ['$stats.downloadsCount', 5] },
            ],
          },
        },
      },
      { $sort: { hotScore: -1, _id: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                username: 1,
                displayName: 1,
                avatar: 1,
                isVerified: 1,
              },
            },
          ],
          as: 'authorId',
        },
      },
      { $unwind: { path: '$authorId', preserveNullAndEmptyArrays: true } }
    ])

    // 6. New Collections (8 newest approved posts)
    const newCollections = await Post.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('authorId', 'username displayName avatar isVerified')
      .lean()

    // 7. Leaderboard (top 4 creators with followersCount desc)
    const leaderboardCreators = await User.find({
      $or: [
        { role: 'creator' },
        { 'stats.postsCount': { $gt: 0 } }
      ]
    })
      .sort({ 'stats.followersCount': -1, _id: -1 })
      .limit(4)
      .select('username displayName avatar stats isVerified')
      .lean()

    // Nếu người dùng đã đăng nhập, kiểm tra xem họ đã follow creator này chưa
    let followMap = {}
    if (req.user) {
      const Follow = (await import('../models/Follow.model.js')).default
      const creatorIds = leaderboardCreators.map(c => c._id)
      const follows = await Follow.find({
        followerId: req.user._id,
        followingId: { $in: creatorIds }
      }).lean()
      follows.forEach(f => {
        followMap[f.followingId.toString()] = true
      })
    }

    const leaderboard = leaderboardCreators.map(c => ({
      ...c,
      isFollowing: !!followMap[c._id.toString()]
    }))

    res.json({
      categoryStyle,
      heroBannerMode: settings.heroBannerMode || 'auto',
      heroBannerImage: heroBannerImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=85',
      heroCollageMode: settings.heroCollageMode || 'auto',
      globalLoaderType: settings.globalLoaderType || 'wave',
      splashExtraMs: settings.splashExtraMs ?? 0,
      rates: {
        payoutRatePerView: settings.payoutRatePerView || 10,
        creatorSharePercent: settings.creatorSharePercent || 70,
        withdrawalFlatFee: settings.withdrawalFlatFee || 10000,
        withdrawalPercentFee: settings.withdrawalPercentFee || 2,
      },
      stats: {
        totalPosts,
        totalDownloads,
        totalCreators: creatorsCount,
        totalCoinsPaid,
        totalVndPaid: totalCoinsPaid
      },
      categories: categoriesData,
      activeCategories: activeCategoriesList,
      collage: collageImages,
      trending: trendingPosts,
      newCollections,
      leaderboard
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /posts/me/source-history
 * Lấy lịch sử tất cả các ảnh gốc đã tải lên của user, kèm danh sách bài viết đang dùng ảnh đó.
 */
export const getSourceHistory = async (req, res, next) => {
  try {
    const posts = await Post.find({ authorId: req.user._id }).lean()

    // Gom tất cả các ảnh gốc duy nhất theo publicId
    const historyMap = {}

    posts.forEach(post => {
      if (post.sourceImages && post.sourceImages.length > 0) {
        post.sourceImages.forEach(img => {
          if (img.publicId) {
            if (!historyMap[img.publicId]) {
              historyMap[img.publicId] = {
                url: img.url,
                publicId: img.publicId,
                format: img.format,
                width: img.width,
                height: img.height,
                fileSize: img.fileSize,
                previewUrl: img.previewUrl || img.url,
                thumbnailUrl: img.thumbnailUrl || img.url,
                linkedPosts: [],
                useCount: 0
              }
            }
            // Thêm bài viết liên kết
            historyMap[img.publicId].linkedPosts.push({
              _id: post._id,
              caption: post.caption || 'Bài viết không tiêu đề',
              status: post.status
            })
            historyMap[img.publicId].useCount = historyMap[img.publicId].linkedPosts.length
          }
        })
      }
    })

    const sourceHistory = Object.values(historyMap)
    res.json({ sourceHistory })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /posts/me/source-history
 * Query param: ?publicId=...
 * Gỡ bỏ ảnh gốc ra khỏi toàn bộ các bài đăng của user đó. Nếu không còn bài viết nào khác liên kết (bao gồm bài viết của người khác nếu có), xóa vật lý trên Cloudinary.
 */
export const deleteSourceHistoryImage = async (req, res, next) => {
  try {
    const { publicId } = req.query
    if (!publicId) {
      throw new AppError('BAD_REQUEST', 'Thiếu tham số publicId', 400)
    }

    // 1. Tìm toàn bộ bài đăng của user có chứa publicId này trong sourceImages
    const posts = await Post.find({ authorId: req.user._id, 'sourceImages.publicId': publicId })

    if (posts.length === 0) {
      return res.json({ message: 'Ảnh không liên kết với bài đăng nào hoặc đã được xóa trước đó.' })
    }

    // 2. Gỡ liên kết trong từng bài viết
    for (const post of posts) {
      post.sourceImages = post.sourceImages.filter(img => img.publicId !== publicId)
      await post.save()
    }

    // 3. Kiểm tra xem có bài đăng của người dùng khác đang sử dụng ảnh gốc này không
    const isShared = await Post.exists({ 'sourceImages.publicId': publicId })

    if (!isShared) {
      // Xóa vật lý trên Cloudinary
      const baseName = publicId.split('/').pop()
      await Promise.all([
        cloudinary.uploader.destroy(publicId).catch(() => {}),
        cloudinary.uploader.destroy(`picspy/posts/thumbnails/${baseName}_thumb`).catch(() => {}),
        cloudinary.uploader.destroy(`picspy/posts/previews/${baseName}_preview`).catch(() => {}),
      ])
      console.log(`🗑️ Deleted Cloudinary asset: ${publicId}`)
    } else {
      console.log(`ℹ️ Preserved Cloudinary asset ${publicId} as it is referenced by other user posts`)
    }

    res.json({ message: `Đã gỡ ảnh gốc khỏi ${posts.length} bài đăng thành công.` })
  } catch (err) {
    next(err)
  }
}
