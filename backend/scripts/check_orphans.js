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
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to Mongo')

    const users = await User.find({ email: /@picspy\.ai$/i }).select('_id username email').lean()
    console.log(`Total CSV users (@picspy.ai): ${users.length}`)

    // Aggregate authors who have posts
    const activeAuthorIdsRaw = await Post.distinct('authorId')
    const activeAuthorSet = new Set(activeAuthorIdsRaw.map((id) => id?.toString()).filter(Boolean))

    const orphanUsers = users.filter((u) => !activeAuthorSet.has(u._id.toString()))

    console.log(`🎯 Found ${orphanUsers.length} ORPHAN CSV users with 0 posts!`)
    console.log('Sample Orphans:', orphanUsers.slice(0, 10))
  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await mongoose.disconnect()
  }
}

run()
