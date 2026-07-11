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
 * Trích xuất RGB Histogram (64-bin) chuẩn hóa từ ảnh buffer
 */
const computeRGBHistogram = async (imageBuffer) => {
  const { data: rawPixels } = await sharp(imageBuffer)
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

  // Chuẩn hóa về dải 0-100
  const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1
  return {
    r: Array.from(rBins, v => Math.round(v / maxVal * 100)),
    g: Array.from(gBins, v => Math.round(v / maxVal * 100)),
    b: Array.from(bBins, v => Math.round(v / maxVal * 100)),
  }
}

/**
 * Trích xuất tất cả các đối tượng ảnh từ các trường khác nhau trong Post
 */
const getAllPostImages = (post) => {
  const images = []

  // 1. Root generatedImages
  if (post.generatedImages && post.generatedImages.length > 0) {
    post.generatedImages.forEach(img => {
      if (img && img.url) images.push(img)
    })
  }

  // 2. modelComparisons
  if (post.modelComparisons && post.modelComparisons.length > 0) {
    post.modelComparisons.forEach(comp => {
      if (comp.generatedImages && comp.generatedImages.length > 0) {
        comp.generatedImages.forEach(img => {
          if (img && img.url) images.push(img)
        })
      }
    })
  }

  // 3. Old images field
  if (post.images && post.images.length > 0) {
    post.images.forEach(img => {
      if (img && img.url) images.push(img)
    })
  }

  return images
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
 *   0. Fetch postDoc sớm (để dùng cho collection images)
 *   1. Download generatedImages[0]
 *   2. Resize → thumbnail (400px) + preview (1200px) cho generatedImages[0]
 *   3. Color palette (từ generatedImages[0])
 *   4. Histogram 64-bin (từ tất cả generatedImages)
 *   5. BlurHash placeholder
 *   6. NSFW detection
 *   7. Xử lý WebP cho generatedImages[1..n] (collection secondary)
 *   8. Xử lý WebP cho modelComparisons (multi-model)
 *   9. Update Post document
 *  10. Socket.io notification
 *
 * LƯU Ý: EXIF đã được extract tại controller (từ sourceImages[0]),
 *         worker KHÔNG extract EXIF từ generatedImages (AI ảnh không có EXIF).
 */
const imageWorker = new Worker(
  'image-processing',
  async (job) => {
    const { postId, imageUrl, publicId, authorId, sourceImageUrl, sourcePublicId } = job.data
    console.log(`🔄 Processing AI content for post: ${postId}`)

    try {
      // 0. Fetch postDoc sớm để dùng cho histogram secondary images (collection)
      const postDoc = await Post.findById(postId)

      // 1. Download ảnh chính (generatedImages[0]) và ảnh nguồn (sourceImages[0]) nếu có
      await job.updateProgress(10)
      const downloadTasks = [
        axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })
      ]
      if (sourceImageUrl) {
        downloadTasks.push(
          axios.get(sourceImageUrl, { responseType: 'arraybuffer', timeout: 30000 }).catch(err => {
            console.error(`⚠️ Failed to download source image ${sourceImageUrl}:`, err.message)
            return null
          })
        )
      }

      const downloadResults = await Promise.all(downloadTasks)
      const imageBuffer = Buffer.from(downloadResults[0].data)
      const sourceBuffer = (downloadResults[1] && downloadResults[1].data) ? Buffer.from(downloadResults[1].data) : null

      // 2. Resize → thumbnail (400px) và preview (1200px)
      await job.updateProgress(20)
      const resizeTasks = [
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
      ]
      if (sourceBuffer) {
        resizeTasks.push(
          sharp(sourceBuffer)
            .rotate()
            .resize(400, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer(),
          sharp(sourceBuffer)
            .rotate()
            .resize(1200, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer()
        )
      }

      const resizeResults = await Promise.all(resizeTasks)
      const thumbnailBuffer = resizeResults[0]
      const previewBuffer = resizeResults[1]
      const sourceThumbBuffer = resizeResults[2] || null
      const sourcePreviewBuffer = resizeResults[3] || null

      // 3. Upload các size lên Cloudinary
      await job.updateProgress(40)
      const baseName = publicId.split('/').pop()
      const uploadTasks = [
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
      ]
      if (sourceThumbBuffer && sourcePreviewBuffer && sourcePublicId) {
        const sourceBaseName = sourcePublicId.split('/').pop()
        uploadTasks.push(
          uploadBuffer(
            sourceThumbBuffer,
            'picspy/posts/thumbnails',
            `${sourceBaseName}_thumb`,
            { format: 'webp' }
          ),
          uploadBuffer(
            sourcePreviewBuffer,
            'picspy/posts/previews',
            `${sourceBaseName}_preview`,
            { format: 'webp' }
          )
        )
      }

      const uploadResults = await Promise.all(uploadTasks)
      const thumbResult = uploadResults[0]
      const previewResult = uploadResults[1]
      const sourceThumbResult = uploadResults[2] || null
      const sourcePreviewResult = uploadResults[3] || null

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

      // 5. Compute RGB histograms for all generated images
      await job.updateProgress(62)
      let histogram = { r: [], g: [], b: [] }
      const histograms = []
      try {
        histogram = await computeRGBHistogram(thumbnailBuffer)
        histograms.push(histogram)

        if (postDoc) {
          const allImages = getAllPostImages(postDoc)
          const primaryUrl = postDoc.generatedImages?.[0]?.url
          const secondaryImages = allImages.filter(img => img.url && img.url !== primaryUrl)

          for (let i = 0; i < secondaryImages.length; i++) {
            const img = secondaryImages[i]
            try {
              console.log(`📸 Computing histogram for secondary post image: ${img.url}`)
              const imgRes = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 15000 })
              const imgBuf = Buffer.from(imgRes.data)
              const imgHist = await computeRGBHistogram(imgBuf)
              histograms.push(imgHist)
            } catch (imgErr) {
              console.warn(`⚠️ Failed to compute histogram for post image ${img.url}: ${imgErr.message}`)
            }
          }
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
      // Quyết định status:
      // - Lấy post hiện tại để kiểm tra status cũ (postDoc đã fetch từ đầu)
      const currentStatus = postDoc?.status || 'pending'

      // - NSFW rõ ràng (>0.8) → luôn reject
      // - Nếu bài viết đã được duyệt (approved) → giữ nguyên approved
      // - autoApprove BẬT   → approved ngay
      // - autoApprove TẮT   → pending, admin duyệt thủ công
      let status = currentStatus
      if (nsfwScore > 0.8) {
        status = 'rejected'
      } else if (currentStatus !== 'approved') {
        if (sysSettings.autoApprove) {
          if (sysSettings.autoApproveDelayMs > 0) {
            await new Promise(r => setTimeout(r, sysSettings.autoApproveDelayMs))
          }
          status = 'approved'
        } else {
          status = 'pending'
        }
      }

      // 8. Cập nhật Post — generatedImages[0] và sourceImages[0] thêm thumbnail/preview
      await job.updateProgress(90)
      const updateFields = {
        'generatedImages.0.thumbnailUrl': thumbResult.secure_url,
        'generatedImages.0.previewUrl': previewResult.secure_url,
        colorPalette,
        blurHash,
        nsfwScore,
        isNSFW: nsfwScore > 0.4,
        status,
        ...(histogram.r.length > 0 && { histogram }),
        ...(histograms.length > 0 && { histograms }),
        ...(status === 'rejected' && {
          rejectionReason: 'Nội dung không phù hợp (NSFW)',
        }),
      }

      if (sourceThumbResult && sourcePreviewResult) {
        updateFields['sourceImages.0.thumbnailUrl'] = sourceThumbResult.secure_url
        updateFields['sourceImages.0.previewUrl'] = sourcePreviewResult.secure_url
      }

      // ── Process secondary generatedImages (collection ảnh 1..n) ─────
      // Ảnh đầu (index 0) đã được xử lý ở bước 2-3.
      // Với collection posts, các ảnh phía sau vẫn là JPG/PNG gốc → cần convert sang WebP
      // để: (1) tối ưu tốc độ load, (2) ngăn user chuột phải tải ảnh gốc
      if (postDoc && postDoc.generatedImages && postDoc.generatedImages.length > 1) {
        for (let i = 1; i < postDoc.generatedImages.length; i++) {
          const secImg = postDoc.generatedImages[i]
          if (!secImg?.url) continue

          // Bỏ qua nếu đã có thumbnailUrl webp (tránh re-process)
          if (secImg.thumbnailUrl && secImg.previewUrl) continue

          try {
            console.log(`🖼 Processing secondary collection image [${i}]: ${secImg.url}`)
            const dlRes = await axios.get(secImg.url, { responseType: 'arraybuffer', timeout: 30000 })
            const secBuf = Buffer.from(dlRes.data)

            const [secThumbBuf, secPrevBuf] = await Promise.all([
              sharp(secBuf)
                .rotate()
                .resize(400, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer(),
              sharp(secBuf)
                .rotate()
                .resize(1200, null, { withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer(),
            ])

            // publicId: dùng publicId gốc nếu có, fallback tạo tên từ postId + index
            const secBaseName = secImg.publicId
              ? secImg.publicId.split('/').pop()
              : `col_${postId.toString().slice(-8)}_${i}`

            const [secThumbUp, secPrevUp] = await Promise.all([
              uploadBuffer(secThumbBuf, 'picspy/posts/thumbnails', `${secBaseName}_thumb`, { format: 'webp' }),
              uploadBuffer(secPrevBuf, 'picspy/posts/previews', `${secBaseName}_preview`, { format: 'webp' }),
            ])

            updateFields[`generatedImages.${i}.thumbnailUrl`] = secThumbUp.secure_url
            updateFields[`generatedImages.${i}.previewUrl`] = secPrevUp.secure_url
            console.log(`✅ Secondary image [${i}] WebP done: thumb=${secThumbUp.secure_url}`)
          } catch (secErr) {
            console.error(`⚠️ Failed to process secondary image [${i}]: ${secErr.message}`)
          }
        }
      }

      // ── Process Multi-model Comparison images ───────────────────

      if (postDoc && postDoc.isMultiModel && postDoc.modelComparisons && postDoc.modelComparisons.length > 0) {
        for (let i = 0; i < postDoc.modelComparisons.length; i++) {
          const comp = postDoc.modelComparisons[i]
          const img = comp.generatedImages?.[0]
          if (img && img.url) {
            try {
              console.log(`🔄 Processing comparison image for slot ${i}: ${img.url}`)
              const dlRes = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 30000 })
              const compBuf = Buffer.from(dlRes.data)

              const compThumbBuf = await sharp(compBuf)
                .rotate()
                .resize(400, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer()

              const compPrevBuf = await sharp(compBuf)
                .rotate()
                .resize(1200, null, { withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer()

              const compBaseName = img.publicId ? img.publicId.split('/').pop() : `comp_${postId.toString().slice(-6)}_${i}`
              const [thumbUp, prevUp] = await Promise.all([
                uploadBuffer(compThumbBuf, 'picspy/posts/thumbnails', `${compBaseName}_thumb`, { format: 'webp' }),
                uploadBuffer(compPrevBuf, 'picspy/posts/previews', `${compBaseName}_preview`, { format: 'webp' })
              ])

              updateFields[`modelComparisons.${i}.generatedImages.0.thumbnailUrl`] = thumbUp.secure_url
              updateFields[`modelComparisons.${i}.generatedImages.0.previewUrl`] = prevUp.secure_url
              console.log(`✅ Success processing comparison slot ${i}`)
            } catch (compErr) {
              console.error(`⚠️ Failed to process comparison image for slot ${i}:`, compErr.message)
            }
          }
        }
      }

      await Post.findByIdAndUpdate(postId, {
        $set: updateFields,
      })

      // 9. Gửi thông báo kết quả xử lý AI vào DB & Socket
      await job.updateProgress(100)
      const { triggerNotificationEvent } = await import('../services/notification.service.js')
      const notifType = status === 'rejected' ? 'AI_FAILED' : 'AI_COMPLETE'
      const notifMsg = status === 'approved'
        ? '🎉 Hình ảnh AI của bạn đã được duyệt và đăng tải thành công!'
        : status === 'rejected'
          ? '❌ Hình ảnh AI bị từ chối do không phù hợp tiêu chuẩn (NSFW)'
          : '⏳ Hình ảnh AI đã xử lý xong và đang chờ kiểm duyệt thủ công.'

      await triggerNotificationEvent({
        type: notifType,
        actorId: null,
        recipientId: authorId,
        targetId: postId,
        targetModel: 'Post',
        metadata: {
          postId,
          customTitle: postDoc.caption || 'Bài đăng AI',
          message: notifMsg
        }
      }).catch(err => console.error('Failed to trigger AI status notification:', err))

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
