/**
 * Migration Script: Re-process existing posts to extract EXIF + Histogram
 * 
 * Chạy: node src/scripts/migrate-exif.js
 * 
 * Script này download ảnh gốc từ Cloudinary, extract EXIF metadata + histogram,
 * rồi update lại Post document. Chỉ xử lý posts chưa có exifData.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import axios from 'axios'
import sharp from 'sharp'
import exifr from 'exifr'
import Post from '../models/Post.model.js'

dotenv.config()

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const BATCH_SIZE = 5 // xử lý 5 ảnh cùng lúc

async function processPost(post) {
  const imageUrl = post.images?.[0]?.url
  if (!imageUrl) return { id: post._id, status: 'skip', reason: 'no image' }

  try {
    // Download ảnh
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })
    const imageBuffer = Buffer.from(response.data)

    // Extract EXIF
    let exifData = {}
    try {
      const rawExif = await exifr.parse(imageBuffer, {
        pick: ['Make', 'Model', 'ISO', 'FNumber', 'FocalLength',
               'ExposureTime', 'DateTimeOriginal', 'LensModel', 'Software',
               'GPSLatitude', 'GPSLongitude'],
        translateKeys: false,
        translateValues: false,
      })
      if (rawExif) {
        const cameraName = [rawExif.Make, rawExif.Model].filter(Boolean).join(' ').trim()
        exifData = {
          ...(cameraName && { camera: cameraName }),
          ...(rawExif.LensModel && { lensModel: rawExif.LensModel }),
          ...(rawExif.ISO && { iso: rawExif.ISO }),
          ...(rawExif.FNumber && { aperture: `f/${rawExif.FNumber}` }),
          ...(rawExif.FocalLength && { focalLength: `${rawExif.FocalLength}mm` }),
          ...(rawExif.ExposureTime && {
            shutterSpeed: rawExif.ExposureTime >= 1
              ? `${rawExif.ExposureTime}s`
              : `1/${Math.round(1 / rawExif.ExposureTime)}s`
          }),
          ...(rawExif.DateTimeOriginal && { dateTaken: rawExif.DateTimeOriginal }),
          ...(rawExif.Software && { software: rawExif.Software }),
        }
      }
    } catch { /* EXIF not available */ }

    // Compute histogram (64-bin)
    let histogram = { r: [], g: [], b: [] }
    try {
      const thumbBuffer = await sharp(imageBuffer)
        .resize(200, null, { withoutEnlargement: true })
        .removeAlpha()
        .raw()
        .toBuffer()
      
      const bins = 64
      const rBins = new Uint32Array(bins)
      const gBins = new Uint32Array(bins)
      const bBins = new Uint32Array(bins)
      for (let i = 0; i < thumbBuffer.length; i += 3) {
        rBins[Math.floor(thumbBuffer[i] / 4)]++
        gBins[Math.floor(thumbBuffer[i + 1] / 4)]++
        bBins[Math.floor(thumbBuffer[i + 2] / 4)]++
      }
      const maxVal = Math.max(...rBins, ...gBins, ...bBins) || 1
      histogram = {
        r: Array.from(rBins, v => Math.round(v / maxVal * 100)),
        g: Array.from(gBins, v => Math.round(v / maxVal * 100)),
        b: Array.from(bBins, v => Math.round(v / maxVal * 100)),
      }
    } catch { /* histogram fail */ }

    // Update Post
    const updateFields = {}
    if (Object.keys(exifData).length > 0) updateFields.exifData = exifData
    if (histogram.r.length > 0) updateFields.histogram = histogram

    if (Object.keys(updateFields).length > 0) {
      await Post.findByIdAndUpdate(post._id, { $set: updateFields })
      return { id: post._id, status: 'ok', hasExif: Object.keys(exifData).length > 0, hasHist: histogram.r.length > 0 }
    }
    return { id: post._id, status: 'skip', reason: 'no data extracted' }
  } catch (err) {
    return { id: post._id, status: 'error', reason: err.message }
  }
}

async function main() {
  console.log('🔄 Connecting to MongoDB...')
  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected\n')

  // Tìm posts chưa có histogram (tất cả)
  const posts = await Post.find({
    $or: [
      { histogram: { $exists: false } },
      { 'histogram.r': { $size: 0 } },
      { histogram: null },
    ]
  }).select('_id images').lean()

  console.log(`📦 Found ${posts.length} posts to process\n`)

  let ok = 0, skip = 0, error = 0
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(processPost))
    
    for (const r of results) {
      if (r.status === 'ok') {
        ok++
        console.log(`  ✅ ${r.id} — EXIF:${r.hasExif ? '✓' : '✗'} Hist:${r.hasHist ? '✓' : '✗'}`)
      } else if (r.status === 'skip') {
        skip++
        console.log(`  ⏭️  ${r.id} — skipped (${r.reason})`)
      } else {
        error++
        console.log(`  ❌ ${r.id} — ${r.reason}`)
      }
    }
    console.log(`  [${Math.min(i + BATCH_SIZE, posts.length)}/${posts.length}]\n`)
  }

  console.log(`\n🏁 Done! OK: ${ok} | Skipped: ${skip} | Errors: ${error}`)
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
