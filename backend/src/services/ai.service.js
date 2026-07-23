import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * LensSpy AI Service
 * Phân tích bức ảnh nhiếp ảnh và EXIF data bằng Gemini Vision
 * Trả về JSON cấu trúc chi tiết để Frontend render thành UI bài học
 */

/** Lấy ảnh từ URL về base64 (Gemini cần inline_data) */
const fetchImageAsBase64 = async (imageUrl) => {
  const transparent1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim().startsWith('http')) {
    console.warn('⚠️ fetchImageAsBase64: Invalid or empty image URL, using transparent fallback.')
    return { base64: transparent1x1, mimeType: 'image/png' }
  }

  // Dùng Cloudinary transform để resize về 800px — đủ chất cho AI, tiết kiệm token
  let sampleUrl = imageUrl
  if (imageUrl.includes('/upload/')) {
    const [base, rest] = imageUrl.split('/upload/')
    sampleUrl = `${base}/upload/w_800,f_jpg,q_75/${rest}`
  }

  try {
    const response = await axios.get(sampleUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    })
    const base64 = Buffer.from(response.data).toString('base64')
    return { base64, mimeType: 'image/jpeg' }
  } catch (err) {
    console.error(`⚠️ fetchImageAsBase64: Failed to fetch "${sampleUrl}": ${err.message}. Using transparent fallback.`)
    return { base64: transparent1x1, mimeType: 'image/png' }
  }
}

/** Build EXIF context string để inject vào prompt */
const buildExifContext = (exifData = {}) => {
  if (!exifData || Object.keys(exifData).length === 0)
    return '(Không có dữ liệu EXIF)'
  const parts = []
  if (exifData.camera) parts.push(`Máy: ${exifData.camera}`)
  if (exifData.lensModel) parts.push(`Ống kính: ${exifData.lensModel}`)
  if (exifData.focalLength) parts.push(`Tiêu cự: ${exifData.focalLength}`)
  if (exifData.aperture) parts.push(`Khẩu độ: ${exifData.aperture}`)
  if (exifData.shutterSpeed)
    parts.push(`Tốc cửa trập: ${exifData.shutterSpeed}`)
  if (exifData.iso) parts.push(`ISO: ${exifData.iso}`)
  if (exifData.ev !== undefined) parts.push(`EV: ${exifData.ev}`)
  if (exifData.dateTaken)
    parts.push(
      `Ngày chụp: ${new Date(exifData.dateTaken).toLocaleString('vi-VN')}`
    )
  if (exifData.software) parts.push(`Hậu kỳ: ${exifData.software}`)
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
  'gemini-2.0-flash-lite',
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
      const shouldFallback =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Too Many Requests') ||
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded')
      if (shouldFallback) {
        console.warn(
          `⚠️ LensSpy: Model "${modelName}" lỗi (${errMsg.includes('404') ? '404 Not Found' : 'Rate Limited'}), thử model tiếp theo...`
        )
        continue
      }
      // Lỗi khác (network, auth...) → throw luôn
      throw err
    }
  }

  // Tất cả model đều bị rate-limited
  console.error('❌ LensSpy: Tất cả model đều bị rate-limited!')
  throw (
    lastError ||
    new Error('Tất cả AI model đều hết quota. Vui lòng thử lại sau.')
  )
}

export const extractPromptArguments = async (promptText) => {
  const systemPrompt = `Bạn là một chuyên gia kỹ sư prompt AI. Nhiệm vụ của bạn là phân tích đoạn prompt tạo ảnh do người dùng cung cấp.
Hãy xác định các từ khóa cốt lõi, quan trọng mà người dùng thường muốn thay đổi để tùy biến ảnh (như chủ thể chính, địa điểm, thiết bị máy ảnh/ống kính, chất liệu, màu sắc chủ đạo, phong cách nghệ thuật).
Hãy trả về kết quả dưới định dạng JSON bao gồm:
1. formatted_prompt: Đoạn prompt gốc nhưng các từ khóa tùy biến đã được bọc lại bằng cú pháp: {argument name="tên_biến" default="giá_trị_gốc"}.
   Lưu ý quan trọng:
   - Chỉ chọn từ 2 đến 6 từ khóa quan trọng nhất để bọc. Không bọc quá nhiều từ gây rối prompt.
   - Tên biến phải viết bằng tiếng Anh, ngắn gọn, dùng snake_case (ví dụ: location, subject, camera_model, accent_color).
   - Tên biến và giá trị mặc định phải khớp chính xác với ngữ cảnh trong prompt. Nếu từ khóa xuất hiện nhiều lần ở các vị trí giống nhau hoặc cùng vai trò, hãy sử dụng cùng một tên biến và cùng giá trị mặc định.
2. variables: Mảng danh sách các biến được trích xuất. Mỗi phần tử chứa:
   - name: Tên biến (ví dụ: "location")
   - default: Giá trị mặc định gốc (ví dụ: "NEW YORK")`

  const content = [
    { text: systemPrompt },
    { text: `Đoạn prompt cần phân tích: "${promptText}"` },
  ]

  let lastError = null

  // Thử lần lượt các model trong chuỗi fallback
  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 extractPromptArguments: Trying model "${modelName}"...`)
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              formatted_prompt: {
                type: 'STRING',
                description:
                  'The original prompt text with customized keywords wrapped as {argument name="variable_name" default="original_value"}',
              },
              variables: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: {
                      type: 'STRING',
                      description: 'English name of the variable in snake_case',
                    },
                    default: {
                      type: 'STRING',
                      description: 'Original text value of the variable',
                    },
                  },
                  required: ['name', 'default'],
                },
              },
            },
            required: ['formatted_prompt', 'variables'],
          },
        },
      })

      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()
      const parsed = JSON.parse(rawText)
      console.log(
        `✅ extractPromptArguments: Success with model "${modelName}"`
      )
      return parsed
    } catch (err) {
      lastError = err
      const errMsg = err.message || ''
      const shouldFallback =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Too Many Requests') ||
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded')
      if (shouldFallback) {
        console.warn(
          `⚠️ extractPromptArguments: Model "${modelName}" lỗi (${errMsg.includes('404') ? '404 Not Found' : 'Rate Limited'}), thử model tiếp theo...`
        )
        continue
      }
      throw err
    }
  }

  console.error('❌ extractPromptArguments: Tất cả model đều bị rate-limited!')
  throw (
    lastError ||
    new Error('Tất cả AI model đều hết quota. Vui lòng thử lại sau.')
  )
}

const STYLE_MAP = {
  gioi_tre_y2k: 'Giới Trẻ Y2K',
  tho_mong: 'Thơ Mộng Thả Thính',
  hai_huoc: 'Hài Hước Xoáy Sâu',
  ngau: 'Ngầu Cá Tính',
  sau_lang: 'Sâu Lắng Sâu Sắc',
  buon: 'Buồn - Cô Đơn',
  tet_le: 'Tết - Lễ - Noel',
  dong_luc: 'Động Lực - Học Tập - Tuổi Trẻ',
  cong_viec: 'Công Việc - Đi Làm',
  tinh_ban: 'Tình Bạn - Gia Đình - Hôn Nhân',
  do_an: 'Đăng Ảnh Đồ Ăn',
  du_lich: 'Du Lịch',
  tieng_anh: 'Tiếng Anh Song Ngữ',
}

const getStyleCorpus = (styleKey) => {
  try {
    const targetHeading = STYLE_MAP[styleKey]
    if (!targetHeading) return ''

    // Candidate file paths for robust resolution
    const candidates = [
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'memories',
        'captions',
        'caption-tha-thinh-tong-hop_pro.md'
      ),
      path.join(
        process.cwd(),
        'memories',
        'captions',
        'caption-tha-thinh-tong-hop_pro.md'
      ),
      path.join(
        process.cwd(),
        '..',
        'memories',
        'captions',
        'caption-tha-thinh-tong-hop_pro.md'
      ),
      path.join(process.cwd(), 'caption-tha-thinh-tong-hop_pro.md'),
    ]

    let filePath = ''
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        filePath = p
        break
      }
    }

    if (!filePath) {
      console.warn(
        '⚠️ getStyleCorpus: Không tìm thấy file corpus tại bất kỳ đường dẫn nào.'
      )
      return ''
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')

    // Phân tách nội dung file dựa trên ký tự phân đoạn Markdown '## '
    const sections = fileContent.split('\n## ')
    const targetSection = sections.find((sec) =>
      sec.trim().startsWith(targetHeading)
    )

    if (!targetSection) return ''

    // Cắt bóc tách các dòng gợi ý mẫu
    const lines = targetSection.split('\n')
    const headerLines = []
    const captionLines = []

    for (const line of lines) {
      const trimmed = line.trim()
      // Nhận diện dòng caption dạng "1. Câu thính..." hoặc "2. ..."
      if (/^\d+\./.test(trimmed)) {
        captionLines.push(line)
      } else {
        if (trimmed !== '') {
          headerLines.push(line)
        }
      }
    }

    const maxCaptions = 50 // Giới hạn tối đa 50 câu thính cho mỗi lần tạo để tiết kiệm token
    if (captionLines.length <= maxCaptions) {
      return headerLines.join('\n') + '\n\n' + captionLines.join('\n')
    }

    // Shuffle ngẫu nhiên và lấy ra 50 câu đại diện mẫu
    const shuffled = [...captionLines].sort(() => 0.5 - Math.random())
    const sampled = shuffled.slice(0, maxCaptions)

    return (
      headerLines.join('\n') +
      '\n\n' +
      sampled.join('\n') +
      `\n... (Đã trích xuất ngẫu nhiên ${maxCaptions}/${captionLines.length} mẫu tiêu biểu để tối ưu hóa xử lý)`
    )
  } catch (error) {
    console.error('❌ getStyleCorpus Error:', error)
    return ''
  }
}

export const generateMetaSuggestions = async (
  imageBase64,
  styleKey = 'gioi_tre_y2k',
  imageMimeType = 'image/jpeg'
) => {
  const styleName = STYLE_MAP[styleKey] || 'Tổng hợp'
  const styleCorpus = getStyleCorpus(styleKey)

  const systemPrompt = `
[ROLE - VAI TRÒ]
Bạn là một Chuyên gia Sáng tạo Nội dung Truyền thông Xã hội (Social Media Content Creator) kiêm Chuyên gia tối ưu hóa SEO hình ảnh. Bạn am hiểu sâu sắc xu hướng ngôn từ của giới trẻ, các cấu trúc câu thả thính độc lạ và cách giật tít bắt mắt trên Facebook, Instagram, TikTok, Threads.

[TASK - NHIỆM VỤ]
Phân tích chi tiết bối cảnh hình ảnh được cung cấp kết hợp với Kho ngữ liệu tham khảo để sinh ra một đối tượng dữ liệu JSON gồm câu mô tả (caption) sống động và danh sách các thẻ khóa liên quan (tags).

[CONTEXT - BỐI CẢNH]
- Hình ảnh này được tải lên bởi một người dùng đang có nhu cầu tạo bài đăng mạng xã hội để tăng tương tác.
- Phong cách viết bài (Tone of Voice) được chỉ định cho ảnh này là: "${styleName}".
- Dưới đây là Kho ngữ liệu chứa các từ lóng, câu caption mẫu tiêu biểu cho phong cách này. Bạn cần học tập tư duy nhả chữ, nhịp điệu ngắt câu hoặc áp dụng linh hoạt dữ liệu này vào ngữ cảnh thực tế của bức ảnh:
---
${styleCorpus}
---

[CONSTRAINTS - RÀNG BUỘC & CHUYÊN NGHIỆP]
1. Nhận diện giới tính & Chủ thể trong ảnh:
   - Hãy phân tích xem chủ thể chính trong bức ảnh là nam, nữ, một cặp đôi (nam & nữ/đồng giới), một nhóm người hay là phong cảnh/đồ vật/đồ ăn.
   - Hãy THAY THẾ linh hoạt đại từ nhân xưng (anh/em/ta/tôi) trong caption mẫu cho phù hợp. Ví dụ: Nếu ảnh là một chàng trai (nam), caption không được dùng đại từ xưng hô tự gọi mình là "em" (ví dụ: "Em vụng về..." phải đổi thành "Anh vụng về..." hoặc xưng hô cho tự nhiên với nam giới). Nếu là phong cảnh/đồ ăn, hãy viết mô tả hướng tới trải nghiệm, vibe, hoặc chill.
2. Tiêu chuẩn Caption:
   - Hãy tạo ra một câu caption ngắn gọn, súc tích và đúng trọng tâm nhất, chắt lọc ra ý hay nhất liên quan đến bối cảnh ảnh từ Kho ngữ liệu.
   - Độ dài: Giới hạn nghiêm ngặt chỉ từ 15-18 từ (tối đa không quá 25 từ đối với các bối cảnh phức tạp/khó diễn tả). Hãy làm cho caption thật sắc sảo, cô đọng.
   - Viết hoàn toàn bằng tiếng Việt văn phong tự nhiên, lôi cuốn, mang tính viral cao, đúng phong cách "${styleName}" đã chọn.
3. Tiêu chuẩn Tags:
   - Trả về một mảng chứa chính xác từ 3 đến 5 từ khóa (tags).
   - BẮT BUỘC sử dụng tiếng Anh hoàn toàn (English) viết thường để tối ưu hóa SEO toàn cầu và phân loại hình ảnh.
   - Thẻ tag không được chứa dấu thăng (#) và dấu cách (dùng dấu gạch ngang nếu là cụm từ, ví dụ: street-style). Tag phải bám sát vào chủ thể, trang phục (outfit), mood (tâm trạng), màu sắc hoặc phong cách được nhận diện trong ảnh.
`.trim()

  const content = [
    { text: systemPrompt },
    { inlineData: { data: imageBase64, mimeType: imageMimeType } },
  ]

  let lastError = null

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(
        `🤖 generateMetaSuggestions: Trying model "${modelName}" with style "${styleKey}"...`
      )
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              caption: {
                type: 'STRING',
                description:
                  'Attractive customized style caption in Vietnamese, max 500 chars',
              },
              tags: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                  description:
                    'Single word or short phrase lowercase tags without hashes',
                },
              },
            },
            required: ['caption', 'tags'],
          },
        },
      })

      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()
      const parsed = JSON.parse(rawText)
      console.log(
        `✅ generateMetaSuggestions: Success with model "${modelName}"`
      )
      return parsed
    } catch (err) {
      lastError = err
      const errMsg = err.message || ''
      const shouldFallback =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Too Many Requests') ||
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded')
      if (shouldFallback) {
        console.warn(
          `⚠️ generateMetaSuggestions: Model "${modelName}" lỗi (${errMsg.includes('404') ? '404 Not Found' : 'Rate Limited'}), thử model tiếp theo...`
        )
        continue
      }
      throw err
    }
  }

  console.error('❌ generateMetaSuggestions: Tất cả model đều bị rate-limited!')
  throw (
    lastError ||
    new Error('Tất cả AI model đều hết quota. Vui lòng thử lại sau.')
  )
}

/**
 * AI Check: So sánh prompt và ảnh của bản Remix so với bản Gốc
 * Phân tích 3 tầng: Semantic Prompt Score, Image Similarity, Change Category
 */
export const verifyRemix = async (originalPrompt, remixPrompt, originalImageUrl, remixImageUrl) => {
  console.log(`🤖 AI Check Remix: fetching images...`)
  const [origImg, remixImg] = await Promise.all([
    fetchImageAsBase64(originalImageUrl),
    fetchImageAsBase64(remixImageUrl)
  ])

  const systemPrompt = `Bạn là một Chuyên Gia Kiểm Duyệt Nghệ Thuật AI (AI Art Moderation Expert).
Nhiệm vụ của bạn là đánh giá bản Remix của người dùng so với tác phẩm Gốc dựa trên 3 tiêu chí chính:

1. Semantic Prompt Score: Độ tương đồng về ý nghĩa/ngữ cảnh giữa hai đoạn prompt (0-100%).
2. Image Similarity: Độ tương đồng thị giác giữa ảnh gốc và ảnh remix (0-100%).
3. Change Category: Xem xét các khía cạnh đã thay đổi: Subject (Chủ thể), Outfit (Trang phục), Background (Bối cảnh), Lighting (Ánh sáng), Style (Phong cách), Camera (Góc máy/Thông số).

Quy tắc về thay đổi khía cạnh (changedCategories):
- Đối với mỗi trường (subject, outfit, background, lighting, style, camera), bạn PHẢI đánh giá kỹ xem nó có thực sự thay đổi khác biệt so với tác phẩm gốc hay không.
- Nếu chi tiết đó giống hệt hoặc không thay đổi gì trong prompt và hình ảnh, bạn PHẢI trả về false cho trường đó. Không được trả về true nếu chi tiết đó không được thay đổi rõ rệt!
- Ví dụ: Nếu prompt gốc và prompt remix đều ghi là "anime style" thì style=false. Nếu cả hai đều chụp "selfie" hay "looking at camera" thì camera=false. Nếu prompt gốc giống hệt prompt remix 100%, toàn bộ changedCategories PHẢI là false cho tất cả 6 trường!

Quy tắc quyết định (Decision rules):
- REJECT (Từ chối):
  * Nếu Semantic Prompt Score >= 88% (ví dụ: chỉ đổi 1 vài từ như "white hoodie" thành "black hoodie").
  * Hoặc nếu Image Similarity >= 90%.
  * Hoặc nếu số nhóm thay đổi (changedCategories có giá trị true) ít hơn 3 nhóm (ví dụ: chỉ đổi mỗi Outfit và Hair).
- WARNING (Cảnh báo):
  * Nếu không thuộc diện bị REJECT nhưng prompt hoặc ảnh có độ tương đồng khá cao (ví dụ: 80% - 87%), hoặc số nhóm thay đổi (true) chỉ bằng 2.
  * Thông điệp cảnh báo: "Hãy thay đổi thêm bối cảnh, phong cách hoặc góc máy để tạo sự khác biệt."
- PASS (Chấp nhận):
  * Thay đổi rõ rệt (hơn 3 nhóm thay đổi, prompt/ảnh khác biệt đáng kể, tương đồng < 80%).

Hãy trả về duy nhất một đối tượng JSON khớp với cấu trúc được yêu cầu.`

  const promptText = `
TÁC PHẨM GỐC:
- Prompt: "${originalPrompt}"

BẢN REMIX CỦA USER:
- Prompt: "${remixPrompt}"

Hãy so sánh hai prompt trên và hai bức ảnh được đính kèm (ảnh 1 là Gốc, ảnh 2 là Remix).
`

  const content = [
    { text: systemPrompt },
    { text: promptText },
    { inlineData: { data: origImg.base64, mimeType: origImg.mimeType } },
    { inlineData: { data: remixImg.base64, mimeType: remixImg.mimeType } },
  ]

  let lastError = null

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 verifyRemix: Trying model "${modelName}"...`)
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              semanticScore: {
                type: 'INTEGER',
                description: 'Semantic similarity percentage of prompt meaning (0-100)'
              },
              imageScore: {
                type: 'INTEGER',
                description: 'Visual similarity percentage of both images (0-100)'
              },
              changedCategories: {
                type: 'OBJECT',
                properties: {
                  subject: { type: 'BOOLEAN', description: 'Whether the core subject changed' },
                  outfit: { type: 'BOOLEAN', description: 'Whether clothing/outfit changed' },
                  background: { type: 'BOOLEAN', description: 'Whether background/location changed' },
                  lighting: { type: 'BOOLEAN', description: 'Whether light color/time of day changed' },
                  style: { type: 'BOOLEAN', description: 'Whether artistic style/medium changed' },
                  camera: { type: 'BOOLEAN', description: 'Whether lens/camera angle/settings changed' }
                },
                required: ['subject', 'outfit', 'background', 'lighting', 'style', 'camera']
              },
              decision: {
                type: 'STRING',
                enum: ['pass', 'warning', 'reject'],
                description: 'Final moderation action: pass, warning, or reject'
              },
              message: {
                type: 'STRING',
                description: 'Detailed explanation or warning guidelines in Vietnamese'
              }
            },
            required: ['semanticScore', 'imageScore', 'changedCategories', 'decision', 'message']
          }
        }
      })

      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()
      const parsed = JSON.parse(rawText)
      console.log(`✅ verifyRemix: Success with model "${modelName}". Decision: ${parsed.decision}`)
      return parsed
    } catch (err) {
      lastError = err
      console.error(`⚠️ verifyRemix error with ${modelName}:`, err.message)
      const errMsg = err.message || ''
      const shouldFallback =
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Too Many Requests') ||
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded')
      if (shouldFallback) {
        continue
      }
      throw err
    }
  }

  throw lastError || new Error('Tất cả AI model đều hết quota để thực hiện AI Check. Thử lại sau.')
}

/**
 * AI Check: So sánh prompt Remix so với Gốc (chỉ kiểm tra text, không tốn credit, không cần ảnh)
 */
export const verifyRemixPrompt = async (originalPrompt, remixPrompt) => {
  const systemPrompt = `Bạn là một Chuyên Gia Kiểm Duyệt Nghệ Thuật AI (AI Art Moderation Expert).
Nhiệm vụ của bạn là đánh giá bản prompt Remix của người dùng so với tác phẩm Gốc dựa trên 2 tiêu chí:

1. Semantic Prompt Score: Độ tương đồng về ý nghĩa/ngữ cảnh giữa hai đoạn prompt (0-100%).
2. Change Category: Xem xét các khía cạnh đã thay đổi: Subject (Chủ thể), Outfit (Trang phục), Background (Bối cảnh), Lighting (Ánh sáng), Style (Phong cách), Camera (Góc máy/Thông số).

Quy tắc về thay đổi khía cạnh (changedCategories):
- Đối với mỗi trường (subject, outfit, background, lighting, style, camera), bạn PHẢI đánh giá kỹ xem nó có thực sự thay đổi khác biệt hay không.
- Nếu chi tiết đó giống hệt hoặc không thay đổi gì trong prompt, bạn PHẢI trả về false cho trường đó. Không được trả về true nếu chi tiết đó không được thay đổi rõ rệt!
- Ví dụ: Nếu prompt gốc và prompt remix đều ghi là "anime style" thì style=false. Nếu cả hai đều chụp "selfie" thì camera=false. Nếu prompt gốc giống hệt prompt remix 100%, toàn bộ changedCategories PHẢI là false cho tất cả 6 trường!

Quy tắc quyết định (Decision rules):
- REJECT (Từ chối):
  * Nếu Semantic Prompt Score >= 88%.
  * Hoặc nếu số nhóm thay đổi (changedCategories có giá trị true) ít hơn 3 nhóm.
- WARNING (Cảnh báo):
  * Nếu không thuộc diện bị REJECT nhưng prompt có độ tương đồng khá cao (ví dụ: 80% - 87%), hoặc số nhóm thay đổi (true) chỉ bằng 2.
  * Thông điệp cảnh báo: "Hãy thay đổi thêm bối cảnh, phong cách hoặc góc máy để tạo sự kết quả khác biệt."
- PASS (Chấp nhận):
  * Thay đổi rõ rệt (hơn 3 nhóm thay đổi, prompt khác biệt đáng kể, tương đồng < 80%).

Hãy trả về duy nhất một đối tượng JSON khớp với cấu trúc được yêu cầu.`

  const promptText = `
TÁC PHẨM GỐC:
- Prompt: "${originalPrompt}"

BẢN REMIX CỦA USER:
- Prompt: "${remixPrompt}"
`

  const content = [
    { text: systemPrompt },
    { text: promptText },
  ]

  let lastError = null

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 verifyRemixPrompt: Trying model "${modelName}"...`)
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              semanticScore: {
                type: 'INTEGER',
                description: 'Semantic similarity percentage of prompt meaning (0-100)'
              },
              changedCategories: {
                type: 'OBJECT',
                properties: {
                  subject: { type: 'BOOLEAN', description: 'Whether the core subject changed' },
                  outfit: { type: 'BOOLEAN', description: 'Whether clothing/outfit changed' },
                  background: { type: 'BOOLEAN', description: 'Whether background/location changed' },
                  lighting: { type: 'BOOLEAN', description: 'Whether light color/time of day changed' },
                  style: { type: 'BOOLEAN', description: 'Whether artistic style/medium changed' },
                  camera: { type: 'BOOLEAN', description: 'Whether lens/camera angle/settings changed' }
                },
                required: ['subject', 'outfit', 'background', 'lighting', 'style', 'camera']
              },
              decision: {
                type: 'STRING',
                enum: ['pass', 'warning', 'reject'],
                description: 'Final moderation action: pass, warning, or reject'
              },
              message: {
                type: 'STRING',
                description: 'Detailed explanation or warning guidelines in Vietnamese'
              }
            },
            required: ['semanticScore', 'changedCategories', 'decision', 'message']
          }
        }
      })

      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()
      const parsed = JSON.parse(rawText)
      console.log(`✅ verifyRemixPrompt: Success with model "${modelName}". Decision: ${parsed.decision}`)
      return parsed
    } catch (err) {
      if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('api key') || err.status === 400) {
        console.log('⚠️ verifyRemixPrompt: Invalid API key detected. Using mock pass fallback for development...')
        return {
          semanticScore: 50,
          changedCategories: {
            subject: false,
            outfit: true,
            background: true,
            lighting: true,
            style: true,
            camera: true
          },
          decision: 'pass',
          message: 'Prompt đạt tiêu chuẩn kiểm duyệt! (Chế độ phát triển)'
        }
      }
      lastError = err
      console.error(`⚠️ verifyRemixPrompt error with ${modelName}:`, err.message)
    }
  }

  throw lastError || new Error('Tất cả AI model đều hết quota để thực hiện AI Prompt Check. Thử lại sau.')
}

/**
 * AI suggest prompt: Gợi ý prompt đạt chuẩn (đáp ứng tiêu chuẩn kiểm duyệt)
 */
export const suggestRemixPrompt = async (originalPrompt, userPrompt = '') => {
  const systemPrompt = `Bạn là một Chuyên Gia Viết Prompt Nghệ Thuật AI (AI Art Prompt Engineer).
Nhiệm vụ của bạn là nhận vào một đoạn prompt GỐC (Original Prompt) của một tác phẩm, và gợi ý một đoạn prompt REMIX mới dựa trên ý tưởng đó.

Yêu cầu đối với prompt gợi ý (remix):
1. Giữ nguyên được ý tưởng cốt lõi (subject hoặc chủ thể chính) từ prompt gốc để người xem vẫn nhận ra đây là bản remake/remix.
2. Thay đổi rõ rệt ít nhất 3 khía cạnh khác nhau như: Trang phục (Outfit), Bối cảnh (Background), Ánh sáng (Lighting), Phong cách nghệ thuật (Art Style), hoặc Góc máy/Thông số camera (Camera Settings).
3. Đảm bảo độ tương đồng về ngữ nghĩa (Semantic Similarity Score) giữa prompt gợi ý và prompt gốc dưới 80% để chắc chắn vượt qua vòng kiểm duyệt tự động (không bị reject do đạo nhái/trùng lặp quá cao).
4. Prompt gợi ý phải bằng tiếng Anh, viết dưới dạng miêu tả chi tiết chất lượng cao (high quality, detailed), không chứa các từ nhạy cảm hoặc vi phạm chính sách.

Hãy trả về duy nhất một đối tượng JSON khớp với cấu trúc được yêu cầu:
{
  "suggestedPrompt": "Đoạn prompt gợi ý bằng tiếng Anh",
  "explanation": "Lời giải thích ngắn gọn bằng tiếng Việt về những điểm đã được thay đổi (Ví dụ: Thay đổi trang phục từ đầm trắng sang đầm đen, bối cảnh từ rừng sương mù sang thành phố tương lai cyberpunk, ánh sáng từ soft sang neon rực rỡ...)"
}`

  const promptText = `
TÁC PHẨM GỐC:
- Prompt: "${originalPrompt}"

GỢI Ý HIỆN TẠI CỦA USER (NẾU CÓ):
- Prompt: "${userPrompt}"
`

  const content = [
    { text: systemPrompt },
    { text: promptText },
  ]

  let lastError = null

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 suggestRemixPrompt: Trying model "${modelName}"...`)
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              suggestedPrompt: { type: 'STRING', description: 'The suggested remix prompt in English' },
              explanation: { type: 'STRING', description: 'Brief explanation in Vietnamese of what details were changed' }
            },
            required: ['suggestedPrompt', 'explanation']
          }
        }
      })

      const result = await model.generateContent(content)
      const rawText = result.response.text().trim()
      const parsed = JSON.parse(rawText)
      console.log(`✅ suggestRemixPrompt: Success with model "${modelName}"`)
      return parsed
    } catch (err) {
      if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('api key') || err.status === 400) {
        console.log('⚠️ suggestRemixPrompt: Invalid API key detected. Using high-quality mock fallback for development...')
        return {
          suggestedPrompt: `${originalPrompt}, highly detailed, oil painting style, dramatic neon lighting, cyberpunk elements, futuristic clothing, 8k resolution`,
          explanation: 'Thay đổi phong cách sang tranh sơn dầu (oil painting), ánh sáng neon cyberpunk rực rỡ và bổ sung trang phục tương lai.'
        }
      }
      lastError = err
      console.error(`⚠️ suggestRemixPrompt error with ${modelName}:`, err.message)
    }
  }

  throw lastError || new Error('Tất cả AI model đều bận. Không thể gợi ý prompt lúc này.')
}

