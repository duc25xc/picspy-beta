import 'dotenv/config'
import mongoose from 'mongoose'
import sharp from 'sharp'
import axios from 'axios'
import Post from '../models/Post.model.js'

// Helper to compute RGB Histogram (64-bin)
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

// Helper to get all image objects from a post (generatedImages, modelComparisons, and old images)
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

async function run() {
  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected!')

  // Find all approved posts
  const posts = await Post.find({ status: 'approved' }).lean()
  console.log(`ℹ️ Found ${posts.length} approved posts to migrate.`)

  for (let idx = 0; idx < posts.length; idx++) {
    const post = posts[idx]
    console.log(`\n--------------------------------------------`)
    console.log(`⏳ [${idx + 1}/${posts.length}] Processing Post ID: ${post._id} (${post.caption.slice(0, 30)}...)`)

    const allImages = getAllPostImages(post)
    const histograms = []

    if (allImages.length > 0) {
      console.log(`👉 Post has ${allImages.length} images across all sources. Starting download & analysis...`)

      for (let i = 0; i < allImages.length; i++) {
        const img = allImages[i]
        try {
          console.log(`   ⬇️ Downloading image #${i + 1}: ${img.url}`)
          const res = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 30000 })
          const buf = Buffer.from(res.data)

          console.log(`   📊 Analyzing color histogram...`)
          const hist = await computeRGBHistogram(buf)
          histograms.push(hist)
          console.log(`   ✅ Success!`)
        } catch (err) {
          console.error(`   ❌ Failed for image #${i + 1}: ${err.message}`)
        }
      }
    }

    if (histograms.length > 0) {
      console.log(`💾 Saving ${histograms.length} histograms to database...`)
      // Update DB and also keep root histogram in sync with histograms[0]
      await Post.findByIdAndUpdate(post._id, {
        $set: {
          histograms,
          histogram: histograms[0]
        }
      })
      console.log(`✅ Post ID: ${post._id} updated successfully!`)
    } else {
      console.log(`⚠️ No histograms calculated, skipping DB update for this post.`)
    }
  }

  console.log(`\n============================================`)
  console.log('🎉 Migration completed successfully!')
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('❌ Critical error during migration:', err)
  await mongoose.disconnect()
})
