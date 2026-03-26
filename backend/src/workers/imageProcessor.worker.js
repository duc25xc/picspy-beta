import { Worker } from 'bullmq'
import sharp from 'sharp'
import Vibrant from 'node-vibrant'
import { encode } from 'blurhash'
import axios from 'axios'
import redis from '../config/redis.js'
import { uploadBuffer } from '../config/cloudinary.js'
import Post from '../models/Post.model.js'

/**
 * Kiểm tra NSFW qua Sightengine API
 * Fallback: trả về score thấp (auto approve) nếu không có API key
 */
const checkNSFW = async (imageUrl) => {
  if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
    console.warn('⚠️  Sightengine API key chưa được cấu hình — bỏ qua NSFW check')
    return 0.0 // auto approve
  }

  try {
    const response = await axios.get('https://api.sightengine.com/1.0/check.json', {
      params: {
        url: imageUrl,
        models: 'nudity,gore',
        api_user: process.env.SIGHTENGINE_API_USER,
        api_secret: process.env.SIGHTENGINE_API_SECRET,
      },
      timeout: 10000,
    })
    const { nudity } = response.data
    // Tổng hợp score: lấy max của các category nhạy cảm
    return Math.max(nudity?.sexual_activity || 0, nudity?.erotica || 0, nudity?.suggestive || 0)
  } catch (err) {
    console.error('NSFW check failed:', err.message)
    return 0.3 // Đưa vào queue review thủ công nếu API lỗi
  }
}

/**
 * BullMQ Worker: xử lý ảnh sau khi upload
 * Concurrency: 3 jobs song song
 */
const imageWorker = new Worker(
  'image-processing',
  async (job) => {
    const { postId, imageUrl, publicId, authorId } = job.data
    console.log(`🔄 Processing image for post: ${postId}`)

    try {
      // 1. Download ảnh về buffer
      await job.updateProgress(10)
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })
      const imageBuffer = Buffer.from(response.data)

      // 2. Resize → thumbnail (400px) và preview (1200px)
      await job.updateProgress(20)
      const [thumbnailBuffer, previewBuffer] = await Promise.all([
        sharp(imageBuffer).resize(400, null, { withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
        sharp(imageBuffer).resize(1200, null, { withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(),
      ])

      // 3. Upload các size lên Cloudinary
      await job.updateProgress(40)
      const baseName = publicId.split('/').pop()
      const [thumbResult, previewResult] = await Promise.all([
        uploadBuffer(thumbnailBuffer, 'pixeldrop/posts/thumbnails', `${baseName}_thumb`, { format: 'webp' }),
        uploadBuffer(previewBuffer, 'pixeldrop/posts/previews', `${baseName}_preview`, { format: 'webp' }),
      ])

      // 4. Trích xuất color palette
      await job.updateProgress(60)
      const palette = await Vibrant.from(imageBuffer).getPalette()
      const colorPalette = Object.values(palette)
        .filter(Boolean)
        .map((swatch) => swatch.hex)
        .slice(0, 6) // Tối đa 6 màu

      // 5. Generate blurHash cho placeholder
      await job.updateProgress(70)
      const { data: pixelData, info } = await sharp(imageBuffer)
        .resize(32, 32)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })
      const blurHash = encode(new Uint8ClampedArray(pixelData), info.width, info.height, 4, 4)

      // 6. NSFW Detection
      await job.updateProgress(80)
      const nsfwScore = await checkNSFW(imageUrl)

      // Quyết định status:
      // score > 0.8  → reject tự động
      // score 0.4–0.8 → pending (chờ admin review)
      // score < 0.4  → approved
      let status
      if (nsfwScore > 0.8) status = 'rejected'
      else if (nsfwScore > 0.4) status = 'pending'
      else status = 'approved'

      // 7. Cập nhật Post
      await job.updateProgress(90)
      await Post.findByIdAndUpdate(postId, {
        $set: {
          'images.0.thumbnailUrl': thumbResult.secure_url,
          'images.0.previewUrl': previewResult.secure_url,
          colorPalette,
          blurHash,
          nsfwScore,
          isNSFW: nsfwScore > 0.4,
          status,
          ...(status === 'rejected' && { rejectionReason: 'Nội dung không phù hợp (NSFW)' }),
        },
      })

      // 8. Emit Socket.io notification cho creator
      await job.updateProgress(100)
      // io được inject vào global khi khởi động server
      if (global.io) {
        global.io.to(`user:${authorId}`).emit('notification', {
          type: status === 'approved' ? 'post_approved' : status === 'rejected' ? 'post_rejected' : 'post_reviewed',
          postId,
          message:
            status === 'approved'
              ? '🎉 Ảnh của bạn đã được duyệt!'
              : status === 'rejected'
              ? '❌ Ảnh của bạn không được chấp nhận (NSFW)'
              : '⏳ Ảnh của bạn đang chờ duyệt thủ công',
        })
      }

      console.log(`✅ Post ${postId} processed — status: ${status}`)
    } catch (error) {
      console.error(`❌ Image processing failed for post ${postId}:`, error)
      // Cập nhật status thành pending để admin review
      await Post.findByIdAndUpdate(postId, { status: 'pending' }).catch(() => {})
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
