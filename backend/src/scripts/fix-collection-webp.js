/**
 * fix-collection-webp.js
 *
 * Script backfill: chuyển đổi ảnh secondary (generatedImages[1..n]) trong
 * collection posts sang WebP thumbnail (400px) + preview (1200px),
 * upload lên Cloudinary và cập nhật DB.
 *
 * Chỉ xử lý ảnh chưa có thumbnailUrl + previewUrl (tức là chưa được convert).
 *
 * Usage:
 *   node src/scripts/fix-collection-webp.js
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import sharp from 'sharp'
import axios from 'axios'
import Post from '../models/Post.model.js'
import { uploadBuffer } from '../config/cloudinary.js'

async function run() {
  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected!\n')

  // Tìm tất cả approved posts có nhiều hơn 1 generatedImages
  const posts = await Post.find({
    status: 'approved',
    $expr: {
      $gt: [{ $size: { $ifNull: ['$generatedImages', []] } }, 1]
    }
  }).lean()

  console.log(`ℹ️ Found ${posts.length} collection posts (generatedImages > 1)\n`)

  let totalFixed = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (let pi = 0; pi < posts.length; pi++) {
    const post = posts[pi]
    const imgs = post.generatedImages || []
    console.log(`\n📦 [${pi + 1}/${posts.length}] Post ${post._id} — ${imgs.length} ảnh`)
    console.log(`   Caption: ${post.caption?.slice(0, 50) || '(no caption)'}`)

    const updateFields = {}

    for (let i = 1; i < imgs.length; i++) {
      const img = imgs[i]

      if (!img?.url) {
        console.log(`   ⏭️  [${i}] Không có URL, bỏ qua.`)
        continue
      }

      // Bỏ qua nếu đã có cả thumbnailUrl và previewUrl (đã convert trước đó)
      if (img.thumbnailUrl && img.previewUrl) {
        console.log(`   ✔  [${i}] Đã có thumbnail+preview, bỏ qua. (${img.thumbnailUrl?.slice(-30)})`)
        totalSkipped++
        continue
      }

      try {
        console.log(`   ⬇️  [${i}] Downloading: ${img.url}`)
        const res = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 30000 })
        const buf = Buffer.from(res.data)

        console.log(`   🔄 [${i}] Resizing & converting to WebP...`)
        const [thumbBuf, prevBuf] = await Promise.all([
          sharp(buf)
            .rotate()
            .resize(400, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer(),
          sharp(buf)
            .rotate()
            .resize(1200, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer(),
        ])

        const baseName = img.publicId
          ? img.publicId.split('/').pop()
          : `col_${post._id.toString().slice(-8)}_${i}`

        console.log(`   ☁️  [${i}] Uploading to Cloudinary (${baseName})...`)
        const [thumbUp, prevUp] = await Promise.all([
          uploadBuffer(thumbBuf, 'picspy/posts/thumbnails', `${baseName}_thumb`, { format: 'webp' }),
          uploadBuffer(prevBuf, 'picspy/posts/previews', `${baseName}_preview`, { format: 'webp' }),
        ])

        updateFields[`generatedImages.${i}.thumbnailUrl`] = thumbUp.secure_url
        updateFields[`generatedImages.${i}.previewUrl`] = prevUp.secure_url
        console.log(`   ✅ [${i}] Done! thumb → ${thumbUp.secure_url?.slice(-40)}`)
        totalFixed++
      } catch (err) {
        console.error(`   ❌ [${i}] Error: ${err.message}`)
        totalErrors++
      }
    }

    // Update DB nếu có fields cần update
    if (Object.keys(updateFields).length > 0) {
      await Post.findByIdAndUpdate(post._id, { $set: updateFields })
      console.log(`   💾 Saved ${Object.keys(updateFields).length / 2} image(s) to DB`)
    } else {
      console.log(`   ℹ️  No changes needed for this post.`)
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`🎉 Backfill hoàn thành!`)
  console.log(`   ✅ Fixed:   ${totalFixed} ảnh secondary`)
  console.log(`   ⏭️  Skipped: ${totalSkipped} ảnh (đã có WebP)`)
  console.log(`   ❌ Errors:  ${totalErrors} ảnh`)
  console.log(`${'='.repeat(50)}\n`)

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('❌ Critical error:', err)
  await mongoose.disconnect()
  process.exit(1)
})
