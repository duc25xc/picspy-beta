/**
 * Xóa vĩnh viễn các tài khoản Tác giả CSV (@picspy.ai) không còn bài viết nào.
 * Chạy: node scripts/cleanup_orphan_users.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const userSchema = new mongoose.Schema({}, { strict: false })
const User = mongoose.model('User', userSchema, 'users')
const postSchema = new mongoose.Schema({}, { strict: false })
const Post = mongoose.model('Post', postSchema, 'posts')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected to Mongo')

  const totalBefore = await User.countDocuments()
  console.log(`📊 Total users BEFORE cleanup: ${totalBefore}`)

  // Get all CSV users
  const csvUsers = await User.find({ email: /@picspy\.ai$/i }).select('_id username email').lean()
  console.log(`🤖 Total CSV (@picspy.ai) users: ${csvUsers.length}`)

  // Get all authorIds that have at least 1 post
  const activeAuthorIdsRaw = await Post.distinct('authorId')
  const activeAuthorSet = new Set(activeAuthorIdsRaw.map((id) => id?.toString()).filter(Boolean))
  console.log(`📝 Authors with active posts: ${activeAuthorSet.size}`)

  // Filter orphans
  const orphans = csvUsers.filter((u) => !activeAuthorSet.has(u._id.toString()))
  const orphanIds = orphans.map((u) => u._id)
  console.log(`\n🧹 Orphan CSV users to delete: ${orphans.length}`)
  console.log(`   Sample: ${orphans.slice(0, 5).map(u => `@${u.username}`).join(', ')} ...`)

  if (orphans.length === 0) {
    console.log('✅ No orphans found. Database is clean!')
    await mongoose.disconnect()
    return
  }

  // Confirm by deleting
  const deleteRes = await User.deleteMany({ _id: { $in: orphanIds } })
  console.log(`\n✅ Deleted ${deleteRes.deletedCount} orphan CSV users!`)

  const totalAfter = await User.countDocuments()
  console.log(`📊 Total users AFTER cleanup: ${totalAfter}`)
  console.log(`📉 Reduced by: ${totalBefore - totalAfter} users`)

  await mongoose.disconnect()
  console.log('\n🎉 Done! Database cleaned up successfully.')
}

run().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
