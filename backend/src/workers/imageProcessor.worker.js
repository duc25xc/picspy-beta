import { Worker } from 'bullmq'
import sharp from 'sharp'
import { encode } from 'blurhash'
import axios from 'axios'
import redis from '../config/redis.js'
import { uploadBuffer } from '../config/cloudinary.js'
import Post from '../models/Post.model.js'
import Settings from '../models/Settings.model.js'

// Giải pháp "bất bại" để import các package CJS cứng đầu trong môi trường ESM
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Vibrant } = require('node-vibrant/node')

/**
 * Kiểm tra NSFW qua Sightengine API
 * Fallback: trả về 0.5 (pending) nếu không có API key hoặc API lỗi.
 */
const checkNSFW = async (imageUrl) => {
  if (
    !process.env.SIGHTENGINE_API_USER ||
    !process.env.SIGHTENGINE_API_SECRET
  ) {
    console.warn(
      '⚠️  Sightengine API key chưa được cấu hình — ảnh sẽ ở trạng thái pending chờ admin duyệt'
    )
    return 0.5 // pending — để admin duyệt thủ công
  }

  try {
    const response = await axios.get(
      'https://api.sightengine.com/1.0/check.json',
      {
        params: {
          url: imageUrl,
          models: 'nudity,gore',
          api_user: process.env.SIGHTENGINE_API_USER,
          api_secret: process.env.SIGHTENGINE_API_SECRET,
        },
        timeout: 10000,
      }
    )
    const { nudity } = response.data
    return Math.max(
      nudity?.sexual_activity || 0,
      nudity?.erotica || 0,
      nudity?.suggestive || 0
    )
  } catch (err) {
    console.error('NSFW check failed:', err.message)
    return 0.5 // pending — để admin review nếu API lỗi
  }
}

/**
 * BullMQ Worker: xử lý ảnh AI sau khi upload
 *
 * Job data:
 *   - postId: ID bài đăng
 *   - imageUrl: URL generatedImages[0] (ảnh chính để analyze)
 *   - publicId: publicId generatedImages[0]
 *   - authorId: ID tác giả
 *   - generatedCount: số ảnh kết quả (1-5)
 *
 * Pipeline:
 *   1. Download generatedImages[0]
 *   2. Resize → thumbnail (400px) + preview (1200px) cho generatedImages[0]
 *   3. Color palette (từ generatedImages[0])
 *   4. Histogram 64-bin (từ generatedImages[0])
 *   5. BlurHash placeholder
 *   6. NSFW detection
 *   7. Update Post document
 *   8. Socket.io notification
 *
 * LƯU Ý: EXIF đã được extract tại controller (từ sourceImages[0]),
 *         worker KHÔNG extract EXIF từ generatedImages (AI ảnh không có EXIF).
 */
const imageWorker = new Worker(
  'image-processing',
  async (job) => {
    const { postId, imageUrl, publicId, authorId } = job.data
    console.log(`🔄 Processing AI content for post: ${postId}`)

    try {
      // 1. Download ảnh chính (generatedImages[0]) về buffer
      await job.updateProgress(10)
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })
      const imageBuffer = Buffer.from(response.data)

      // 2. Resize → thumbnail (400px) và preview (1200px)
      await job.updateProgress(20)
      const [thumbnailBuffer, previewBuffer] = await Promise.all([
        sharp(imageBuffer)
          .rotate()
          .resize(400, null, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
        sharp(imageBuffer)
          .rotate()
          .resize(1200, null, { withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer(),
      ])

      // 3. Upload các size lên Cloudinary
      await job.updateProgress(40)
      const baseName = publicId.split('/').pop()
      const [thumbResult, previewResult] = await Promise.all([
        uploadBuffer(
          thumbnailBuffer,
          'picspy/posts/thumbnails',
          `${baseName}_thumb`,
          { format: 'webp' }
        ),
        uploadBuffer(
          previewBuffer,
          'picspy/posts/previews',
          `${baseName}_preview`,
          { format: 'webp' }
        ),
      ])

      // 4. Color palette (từ generatedImages[0])
      // node-vibrant dùng Jimp nội bộ — Jimp không hỗ trợ WebP!
      // Phải convert sang JPEG trước khi feed vào Vibrant.
      await job.updateProgress(55)
      const jpegForVibrant = await sharp(thumbnailBuffer)
        .jpeg({ quality: 80 })
        .toBuffer()
      const palette = await Vibrant.from(jpegForVibrant).getPalette()
      const colorPalette = Object.values(palette)
        .filter(Boolean)
        .map((swatch) => swatch.hex)
        .slice(0, 6) // Tối đa 6 màu

      // 5. Compute RGB histogram (64-bin mỗi kênh)
      await job.updateProgress(62)
      let histogram = { r: [], g: [], b: [] }
      try {
        const { data: rawPixels } = await sharp(thumbnailBuffer)
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
        // Normalize to 0-100 range
        const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1
        histogram = {
          r: Array.from(rBins, v => Math.round(v / maxVal * 100)),
          g: Array.from(gBins, v => Math.round(v / maxVal * 100)),
          b: Array.from(bBins, v => Math.round(v / maxVal * 100)),
        }
      } catch (histErr) {
        console.warn(`⚠️ Histogram computation failed: ${histErr.message}`)
      }

      // 6. Generate blurHash cho placeholder
      await job.updateProgress(70)
      const { data: pixelData, info } = await sharp(imageBuffer)
        .resize(32, 32)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })
      const blurHash = encode(
        new Uint8ClampedArray(pixelData),
        info.width,
        info.height,
        4,
        4
      )

      // 7. NSFW Detection
      await job.updateProgress(80)
      const nsfwScore = await checkNSFW(imageUrl)

      // Đọc cài đặt hệ thống (autoApprove toggle từ Admin Panel)
      const sysSettings = await Settings.getSingleton()

      // Quyết định status:
      // - NSFW rõ ràng (>0.8) → luôn reject
      // - autoApprove BẬT   → approved ngay
      // - autoApprove TẮT   → pending, admin duyệt thủ công
      let status
      if (nsfwScore > 0.8) {
        status = 'rejected'
      } else if (sysSettings.autoApprove) {
        if (sysSettings.autoApproveDelayMs > 0) {
          await new Promise(r => setTimeout(r, sysSettings.autoApproveDelayMs))
        }
        status = 'approved'
      } else {
        status = 'pending'
      }

      // 8. Cập nhật Post — generatedImages[0] thêm thumbnail/preview
      await job.updateProgress(90)
      await Post.findByIdAndUpdate(postId, {
        $set: {
          'generatedImages.0.thumbnailUrl': thumbResult.secure_url,
          'generatedImages.0.previewUrl': previewResult.secure_url,
          colorPalette,
          blurHash,
          nsfwScore,
          isNSFW: nsfwScore > 0.4,
          status,
          ...(histogram.r.length > 0 && { histogram }),
          ...(status === 'rejected' && {
            rejectionReason: 'Nội dung không phù hợp (NSFW)',
          }),
        },
      })

      // 9. Emit Socket.io notification cho creator
      await job.updateProgress(100)
      if (global.io) {
        global.io.to(`user:${authorId}`).emit('notification', {
          type:
            status === 'approved'
              ? 'post_approved'
              : status === 'rejected'
                ? 'post_rejected'
                : 'post_reviewed',
          postId,
          message:
            status === 'approved'
              ? '🎉 Nội dung AI của bạn đã được duyệt!'
              : status === 'rejected'
                ? '❌ Nội dung không được chấp nhận (NSFW)'
                : '⏳ Nội dung đang chờ duyệt thủ công',
        })
      }

      console.log(`✅ Post ${postId} processed — status: ${status}`)
    } catch (error) {
      console.error(`❌ Image processing failed for post ${postId}:`, error)
      // Cập nhật status thành pending để admin review
      await Post.findByIdAndUpdate(postId, { status: 'pending' }).catch(
        () => {}
      )
      throw error // BullMQ sẽ retry theo config
    }
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: { max: 10, duration: 1000 },
  }
)

imageWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`)
})

imageWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

export default imageWorker
