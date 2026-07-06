/**
 * fix-collection-histograms.js
 *
 * Script sửa histograms cho các collection posts (isCollection=true hoặc generatedImages.length > 1)
 * bị thiếu histograms của ảnh secondary do bug trong imageProcessor.worker.js
 * (postDoc được dùng trước khi được định nghĩa → if(postDoc) luôn false)
 *
 * Chỉ xử lý các posts mà số histograms < số generatedImages (tức là thiếu histogram).
 *
 * Usage:
 *   node src/scripts/fix-collection-histograms.js
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import sharp from 'sharp'
import axios from 'axios'
import Post from '../models/Post.model.js'

// Helper: tính RGB 64-bin Histogram (giống worker)
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

  const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1
  return {
    r: Array.from(rBins, v => Math.round(v / maxVal * 100)),
    g: Array.from(gBins, v => Math.round(v / maxVal * 100)),
    b: Array.from(bBins, v => Math.round(v / maxVal * 100)),
  }
}

async function run() {
  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected!\n')

  // Tìm tất cả approved posts có nhiều hơn 1 ảnh generatedImages
  // nhưng histograms array có ít hơn số ảnh (hoặc không có histograms)
  const posts = await Post.find({
    status: 'approved',
    $expr: {
      $gt: [{ $size: { $ifNull: ['$generatedImages', []] } }, 1]
    }
  }).lean()

  console.log(`ℹ️ Found ${posts.length} posts with multiple generatedImages.`)

  let fixedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (let idx = 0; idx < posts.length; idx++) {
    const post = posts[idx]
    const imgCount = post.generatedImages?.length || 0
    const histCount = post.histograms?.length || 0

    // Chỉ fix nếu số histograms < số ảnh (thiếu histogram cho ảnh secondary)
    if (histCount >= imgCount) {
      console.log(`✔ [${idx + 1}/${posts.length}] Post ${post._id} đã có đủ ${histCount} histograms, bỏ qua.`)
      skippedCount++
      continue
    }

    console.log(`\n⚙️ [${idx + 1}/${posts.length}] Fixing Post ${post._id} (${post.caption?.slice(0, 40) || 'no caption'}...)`)
    console.log(`   📊 Có ${imgCount} ảnh, ${histCount} histograms. Cần tính thêm ${imgCount - histCount} histograms.`)

    const histograms = []

    for (let i = 0; i < post.generatedImages.length; i++) {
      const img = post.generatedImages[i]
      // Ưu tiên dùng thumbnailUrl (nhỏ hơn, nhanh hơn), fallback url gốc
      const imgUrl = img.thumbnailUrl || img.url
      if (!imgUrl) {
        console.warn(`   ⚠️ Ảnh #${i + 1} không có URL, bỏ qua.`)
        continue
      }

      try {
        console.log(`   ⬇️ Downloading ảnh #${i + 1}: ${imgUrl}`)
        const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 })
        const buf = Buffer.from(res.data)
        const hist = await computeRGBHistogram(buf)
        histograms.push(hist)
        console.log(`   ✅ Histogram #${i + 1} OK`)
      } catch (err) {
        console.error(`   ❌ Lỗi ảnh #${i + 1}: ${err.message}`)
      }
    }

    if (histograms.length === 0) {
      console.warn(`   ⚠️ Không tính được histogram nào, bỏ qua post này.`)
      errorCount++
      continue
    }

    try {
      await Post.findByIdAndUpdate(post._id, {
        $set: {
          histograms,
          histogram: histograms[0], // Giữ root histogram sync với ảnh đầu
        }
      })
      console.log(`   💾 Đã lưu ${histograms.length} histograms cho post ${post._id}`)
      fixedCount++
    } catch (dbErr) {
      console.error(`   ❌ Lỗi khi lưu DB: ${dbErr.message}`)
      errorCount++
    }
  }

  console.log(`\n============================================`)
  console.log(`🎉 Hoàn thành!`)
  console.log(`   ✅ Fixed: ${fixedCount} posts`)
  console.log(`   ⏭️ Skipped (already OK): ${skippedCount} posts`)
  console.log(`   ❌ Errors: ${errorCount} posts`)
  console.log(`============================================\n`)

  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('❌ Critical error:', err)
  await mongoose.disconnect()
  process.exit(1)
})
