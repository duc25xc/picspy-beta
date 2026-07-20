/**
 * Migration Script: Mirror tất cả avatar Google URL lên Cloudinary.
 *
 * Vấn đề: URL avatar Google (lh3.googleusercontent.com / googleusercontent.com)
 * có thể hết hạn hoặc bị Google rotate → hiển thị ảnh broken ở:
 *  - Bảng Xếp Hạng Creators (HomePage)
 *  - Admin → Users
 *  - và nhiều nơi khác
 *
 * Giải pháp: tải ảnh từ Google về và upload lên Cloudinary, sau đó update
 * trường `avatar` của User sang URL Cloudinary mới.
 *
 * Chạy:  node src/scripts/migrate-google-avatars.js
 *
 * Tuỳ chọn (qua ENV):
 *   DRY_RUN=1                → chỉ log, không ghi DB
 *   LIMIT=100                → giới hạn số user xử lý (mặc định: tất cả)
 *   SKIP_IF_CLOUDINARY=0     → mặc định: bỏ qua user đã có avatar Cloudinary
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.model.js'
import { uploadFromUrl } from '../config/cloudinary.js'

dotenv.config()

const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URI
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null
const SKIP_IF_CLOUDINARY = process.env.SKIP_IF_CLOUDINARY !== '0'

// Match cả lh3.googleusercontent.com lẫn googleusercontent.com (mọi sub-domain)
const GOOGLE_AVATAR_RE = /https?:\/\/([a-z0-9-]+\.)?googleusercontent\.com\//i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function processOne(user, stats) {
  const current = user.avatar || ''
  const isGoogle = GOOGLE_AVATAR_RE.test(current)
  const isCloudinary =
    typeof current === 'string' && current.includes('res.cloudinary.com')

  // Bỏ qua nếu đã là Cloudinary (an toàn + tiết kiệm bandwidth)
  if (SKIP_IF_CLOUDINARY && isCloudinary) {
    stats.skippedCloudinary++
    return { skipped: 'cloudinary' }
  }

  if (!isGoogle) {
    stats.skippedNotGoogle++
    return { skipped: 'not-google' }
  }

  try {
    const result = await uploadFromUrl(
      current,
      'picspy/avatars',
      `avatar_${user._id}`,
      {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        ],
        format: 'webp',
      }
    )
    const newUrl = result.secure_url
    if (!DRY_RUN) {
      user.avatar = newUrl
      await user.save()
    }
    stats.migrated++
    return { ok: true, from: current, to: newUrl, dryRun: DRY_RUN }
  } catch (err) {
    stats.failed++
    return { error: err.message, from: current }
  }
}

async function main() {
  if (!MONGO_URI) {
    console.error('❌ Không tìm thấy MONGODB_URI trong .env')
    process.exit(1)
  }

  console.log('🔌 Connecting MongoDB...')
  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected.')

  // Lấy tất cả user có avatar khớp Google pattern
  const query = {
    avatar: { $regex: GOOGLE_AVATAR_RE.source, $options: 'i' },
  }

  const total = await User.countDocuments(query)
  console.log(`📊 Tìm thấy ${total} user có avatar Google URL.`)
  if (LIMIT) console.log(`🔢 Giới hạn xử lý: ${LIMIT} user.`)

  const cursor = User.find(query)
    .select('_id username email avatar googleId')
    .sort({ _id: -1 })
    .cursor({ batchSize: 10 })

  const stats = {
    migrated: 0,
    failed: 0,
    skippedCloudinary: 0,
    skippedNotGoogle: 0,
  }
  const failures = []
  let processed = 0

  for await (const user of cursor) {
    if (LIMIT && processed >= LIMIT) break
    processed++

    const result = await processOne(user, stats)
    const tag = `[${processed}/${LIMIT || total}]`
    if (result.ok) {
      console.log(`${tag} ✅ @${user.username} → ${result.to}`)
    } else if (result.error) {
      console.log(`${tag} ❌ @${user.username} — ${result.error}`)
      failures.push({ userId: user._id, username: user.username, ...result })
    } else {
      // skip
      if (processed <= 5 || processed % 25 === 0) {
        console.log(`${tag} ⏭️  @${user.username} (${result.skipped})`)
      }
    }

    // Tránh spam Cloudinary: throttle 100ms/user
    if (result.ok || result.error) await sleep(100)
  }

  console.log('\n═══════════════════════════════════════')
  console.log('🎉 Migration hoàn tất!')
  console.log(`   Migrated:           ${stats.migrated}`)
  console.log(`   Failed:             ${stats.failed}`)
  console.log(`   Skipped (Cloudinary): ${stats.skippedCloudinary}`)
  console.log(`   Skipped (không phải Google): ${stats.skippedNotGoogle}`)
  if (DRY_RUN) console.log('   (DRY RUN — không ghi DB)')
  console.log('═══════════════════════════════════════')

  if (failures.length > 0) {
    console.log('\n❌ Danh sách thất bại:')
    failures.slice(0, 20).forEach((f) => {
      console.log(`   - @${f.username}: ${f.error}`)
    })
    if (failures.length > 20) {
      console.log(`   ... và ${failures.length - 20} user khác.`)
    }
  }

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('💥 Lỗi:', err)
  try {
    await mongoose.disconnect()
  } catch (disconnectErr) {
    console.error('(disconnect cũng lỗi):', disconnectErr.message)
  }
  process.exit(1)
})
