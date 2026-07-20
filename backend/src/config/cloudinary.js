import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import https from 'https'
import http from 'http'
import { URL } from 'url'

let isConfigured = false

/**
 * Lazy initialize Cloudinary config - only runs once on first use
 */
const ensureConfigured = () => {
  if (isConfigured) return
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  
  // DEBUG: Kiểm tra Cloudinary env variables (chỉ log 1 lần)
  console.log('🔍 [Cloudinary Config Debug]')
  console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING')
  console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? `✅ ${process.env.CLOUDINARY_API_KEY.substring(0, 6)}...` : '❌ MISSING')
  console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ MISSING')
  console.log('')
  
  isConfigured = true
}

/**
 * Upload buffer lên Cloudinary
 * @param {Buffer} buffer
 * @param {string} folder - thư mục trên Cloudinary
 * @param {string} publicId - tên file
 * @param {object} options - options thêm
 */
export const uploadBuffer = (buffer, folder, publicId, options = {}) => {
  ensureConfigured()
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    Readable.from(buffer).pipe(uploadStream)
  })
}

/**
 * Tải ảnh từ URL bên ngoài (vd: Google avatar) về dạng Buffer.
 * Có timeout để tránh treo request khi URL chậm/hỏng.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Buffer>}
 */
export const fetchImageBuffer = (url, timeoutMs = 8000) => {
  ensureConfigured()
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url)
      const lib = parsed.protocol === 'http:' ? http : https
      const req = lib.get(
        url,
        {
          headers: {
            // Một số CDN (Google) trả 403 nếu không có User-Agent
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        },
        (res) => {
          // Follow 1 lần redirect (Google avatar có thể trả 302)
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location
          ) {
            res.resume()
            fetchImageBuffer(res.headers.location, timeoutMs)
              .then(resolve)
              .catch(reject)
            return
          }
          if (res.statusCode !== 200) {
            res.resume()
            return reject(
              new Error(`Fetch image failed: HTTP ${res.statusCode}`)
            )
          }
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
          res.on('error', reject)
        }
      )
      req.on('error', reject)
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('Fetch image timeout'))
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Tải ảnh từ URL bên ngoài rồi upload lên Cloudinary.
 * Dùng cho: mirror avatar Google OAuth, mirror avatar OAuth khác, v.v.
 *
 * @param {string} sourceUrl - URL ảnh nguồn (Google/Facebook/...)
 * @param {string} folder - thư mục Cloudinary
 * @param {string} publicId - tên file
 * @param {object} options - options thêm cho Cloudinary (transformation, format, ...)
 * @returns {Promise<{ secure_url: string, public_id: string, width?: number, height?: number }>}
 */
export const uploadFromUrl = async (
  sourceUrl,
  folder,
  publicId,
  options = {}
) => {
  if (!sourceUrl) throw new Error('uploadFromUrl: sourceUrl is required')
  const buffer = await fetchImageBuffer(sourceUrl)
  return uploadBuffer(buffer, folder, publicId, options)
}

/**
 * Xóa file trên Cloudinary
 * @param {string} publicId
 */
export const deleteImage = async (publicId) => {
  ensureConfigured()
  return cloudinary.uploader.destroy(publicId)
}

/**
 * Tạo signed URL cho premium download
 * @param {string} publicId
 * @param {number} expiresInSeconds
 */
export const getSignedUrl = (publicId, expiresInSeconds = 3600) => {
  ensureConfigured()
  return cloudinary.url(publicId, {
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    resource_type: 'image',
  })
}

/**
 * Options chuẩn cho mọi lần upload AVATAR lên Cloudinary.
 *
 * Mục tiêu: ảnh nhỏ, nhẹ, hiển thị nhanh trên mọi trình duyệt.
 *  - Resize về 400x400, crop theo khuôn mặt (Cloudinary tự dò mặt nhờ `gravity: 'face'`)
 *  - `radius: 'max'`     → bo tròn (avatar hiển thị dạng tròn)
 *  - `quality: 'auto:low'` → Cloudinary tự chọn chất lượng thấp nhất mà mắt
 *    thường không phân biệt được (thường ~70-80 cho JPEG/WEBP), giảm 60-80% dung lượng
 *  - `fetch_format: 'auto'` → Cloudinary tự trả về AVIF/WebP/JPEG tuỳ trình duyệt
 *    (cần kết hợp với frontend gửi `Accept` header — Cloudinary tự xử lý)
 *  - `flags: 'progressive'` → progressive encoding: hiển thị ảnh mờ trước rồi nét dần
 *    → cảm giác tải nhanh hơn
 *
 * Lưu ý: khi truyền `fetch_format` thì KHÔNG truyền `format` cùng lúc —
 * Cloudinary sẽ tự chọn format tối ưu cho client.
 *
 * @param {object} [overrides] tuỳ chọn override khi cần (vd: test, debug)
 * @returns {object} options để truyền vào uploadBuffer / uploadFromUrl
 */
export const getAvatarUploadOptions = (overrides = {}) => {
  return {
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        radius: 'max',
        quality: 'auto:low',
        fetch_format: 'auto:webp', // luôn serve webp nếu browser hỗ trợ (phổ biến hơn AVIF)
        flags: 'progressive',
      },
    ],
    // Ép eager transformation để Cloudinary áp dụng transform ngay tại upload
    // (không cần đợi request đầu tiên mới transform)
    eager: [
      {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        radius: 'max',
        quality: 'auto:low',
        fetch_format: 'auto:webp',
        flags: 'progressive',
      },
    ],
    eager_async: false, // chờ transform xong rồi mới trả response
    eager_notification_url: undefined,
    ...overrides,
  }
}

export default cloudinary
