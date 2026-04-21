import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * LensSpy AI Service
 * Phân tích bức ảnh nhiếp ảnh và EXIF data bằng Gemini Vision
 * Trả về JSON cấu trúc chi tiết để Frontend render thành UI bài học
 */

/** Lấy ảnh từ URL về base64 (Gemini cần inline_data) */
const fetchImageAsBase64 = async (imageUrl) => {
  // Dùng Cloudinary transform để resize về 800px — đủ chất cho AI, tiết kiệm token
  let sampleUrl = imageUrl
  if (imageUrl && imageUrl.includes('/upload/')) {
    const [base, rest] = imageUrl.split('/upload/')
    sampleUrl = `${base}/upload/w_800,f_jpg,q_75/${rest}`
  }

  const response = await axios.get(sampleUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
  })
  const base64 = Buffer.from(response.data).toString('base64')
  return { base64, mimeType: 'image/jpeg' }
}

/** Build EXIF context string để inject vào prompt */
const buildExifContext = (exifData = {}) => {
  if (!exifData || Object.keys(exifData).length === 0) return '(Không có dữ liệu EXIF)'
  const parts = []
  if (exifData.camera)       parts.push(`Máy: ${exifData.camera}`)
  if (exifData.lensModel)    parts.push(`Ống kính: ${exifData.lensModel}`)
  if (exifData.focalLength)  parts.push(`Tiêu cự: ${exifData.focalLength}`)
  if (exifData.aperture)     parts.push(`Khẩu độ: ${exifData.aperture}`)
  if (exifData.shutterSpeed) parts.push(`Tốc cửa trập: ${exifData.shutterSpeed}`)
  if (exifData.iso)          parts.push(`ISO: ${exifData.iso}`)
  if (exifData.ev !== undefined) parts.push(`EV: ${exifData.ev}`)
  if (exifData.dateTaken)    parts.push(`Ngày chụp: ${new Date(exifData.dateTaken).toLocaleString('vi-VN')}`)
  if (exifData.software)     parts.push(`Hậu kỳ: ${exifData.software}`)
  return parts.join(' | ')
}

/**
 * Phân tích ảnh nhiếp ảnh bằng Gemini Vision
 * Hỗ trợ fallback: nếu model chính bị rate-limited sẽ thử model dự phòng.
 * @param {string} imageUrl - URL ảnh trên Cloudinary
 * @param {object} exifData - Dữ liệu EXIF từ DB
 * @returns {{ result: object, modelUsed: string }}
 */

// Đã verify ngày 22/04/2026 — chỉ các model này respond được với API key hiện tại:
// ✅ gemini-2.5-flash, gemini-2.5-flash-lite, gemini-flash-latest
// ❌ gemini-2.0-flash* → hết quota free tier
// ❌ gemini-1.5-flash* → đã bị remove khỏi API này
const MODEL_CHAIN = [
  'gemini-2.5-flash',  
  'gemini-3.1-flash-lite-preview',    
  'gemini-flash-latest',   
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite'
]

export const analyzeLensSpy = async (imageUrl, exifData = {}) => {
  const exifContext = buildExifContext(exifData)
  const { base64, mimeType } = await fetchImageAsBase64(imageUrl)

  const systemPrompt = `Bạn là một NHIẾP ẢNH GIA CHUYÊN NGHIỆP đẳng cấp thế giới kiêm GIÁM ĐỐC ÁNH SÁNG và CHUYÊN GIA HẬU KỲ.
Nhiệm vụ của bạn: Phân tích bức ảnh này một cách SIÊU CHI TIẾT và dạy người dùng cách chụp lại y hệt.

THÔNG SỐ EXIF GỐC CỦA BỨC ẢNH: ${exifContext}

YÊU CẦU NGHIÊM NGẶT:
1. Phân tích DỰA VÀO ảnh thực tế VÀ thông số EXIF được cung cấp.
2. Nếu EXIF thiếu một trường nào, hãy SUY LUẬN từ chính bức ảnh (độ bokeh, bóng đổ, vibe màu sắc).
3. Giọng điệu: Chuyên nghiệp nhưng dễ hiểu. Dùng thuật ngữ nhiếp ảnh và giải thích ngay bên cạnh.
4. actionableAdvice phải CỰC KỲ CỤ THỂ — không nói chung chung kiểu "chụp đẹp nhé".
5. gearSuggestions chỉ gợi ý thiết bị THỰC SỰ LIÊN QUAN để tái tạo bức ảnh này.
6. vibeKeywords phải là tiếng Anh, 3-5 từ ngắn, capture đúng MOOD của ảnh.

TRẢ VỀ DUY NHẤT JSON SAU ĐÂY (KHÔNG có markdown, KHÔNG có text xung quanh):

{
  "cameraAndLens": {
    "evaluation": "...",
    "focusPoint": "...",
    "dofAnalysis": "...",
    "evAnalysis": "..."
  },
  "lighting": {
    "type": "Natural Light | Studio Flash | Ambient | Mixed",
    "keyLight": "...",
    "fillLight": "... hoặc null",
    "rimLight": "... hoặc null",
    "mood": "...",
    "lightingDiagram": "Miêu tả sơ đồ đèn bằng text, ví dụ: Key 45° left-high, Fill reflector right, Rim behind-right"
  },
  "compositionAndPose": {
    "ruleUsed": "...",
    "cameraAngle": "Eye-level / High angle / Low angle / Dutch angle",
    "subjectDistance": "Khoảng cách ước tính ví dụ 1.5-2m",
    "poseAnalysis": "Chỉ điền nếu có người trong ảnh, nếu không để null",
    "vibeKeywords": ["keyword1", "keyword2", "keyword3"]
  },
  "colorGrading": {
    "vibe": "...",
    "technique": "...",
    "whiteBalance": "...",
    "filterRecommend": "...",
    "lutSuggestion": "... hoặc null"
  },
  "actionableAdvice": [
    "Lời khuyên CỰC KỲ CỤ THỂ 1...",
    "Lời khuyên CỰC KỲ CỤ THỂ 2...",
    "Lời khuyên CỰC KỲ CỤ THỂ 3...",
    "Lời khuyên CỰC KỲ CỤ THỂ 4..."
  ],
  "gearSuggestions": [
    {
      "type": "lens | light | reflector | filter | tripod | accessory",
      "name": "Tên cụ thể của thiết bị",
      "reason": "Tại sao cần thiết bị này để tái tạo bức ảnh",
      "searchKeyword": "Từ khóa tìm kiếm trên Shopee"
    }
  ]
}`

  const content = [
    { text: systemPrompt },
    { inlineData: { data: base64, mimeType } },
  ]

  let lastError = null

  // Thử lần lượt từng model trong chuỗi fallback
  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 LensSpy: Trying model "${modelName}"...`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()

      // Bóc tách JSON — đề phòng AI wrap bằng markdown code block
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI không trả về JSON hợp lệ')
      }

      const parsed = JSON.parse(jsonMatch[0])
      console.log(`✅ LensSpy: Success with model "${modelName}"`)

      // Gắn thêm tên model đã dùng để lưu vào PostAnalysis
      parsed._modelUsed = modelName
      return parsed
    } catch (err) {
      lastError = err
      const errMsg = err.message || ''
      // Skip sang model tiếp nếu: rate-limited (429) HOẶC model không tồn tại (404)
      const shouldFallback = errMsg.includes('429')
        || errMsg.includes('quota')
        || errMsg.includes('Too Many Requests')
        || errMsg.includes('404')
        || errMsg.includes('not found')
        || errMsg.includes('503')
        || errMsg.includes('500')
        || errMsg.includes('high demand')
        || errMsg.includes('overloaded')
      if (shouldFallback) {
        console.warn(`⚠️ LensSpy: Model "${modelName}" lỗi (${errMsg.includes('404') ? '404 Not Found' : 'Rate Limited'}), thử model tiếp theo...`)
        continue
      }
      // Lỗi khác (network, auth...) → throw luôn
      throw err
    }
  }

  // Tất cả model đều bị rate-limited
  console.error('❌ LensSpy: Tất cả model đều bị rate-limited!')
  throw lastError || new Error('Tất cả AI model đều hết quota. Vui lòng thử lại sau.')
}

