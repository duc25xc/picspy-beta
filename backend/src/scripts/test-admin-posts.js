import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'
import Report from '../models/Report.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected to MongoDB Cloud')

  const statuses = ['pending', 'approved', 'rejected', 'hidden', 'all']

  for (const status of statuses) {
    try {
      const query = {}
      if (status !== 'all') query.status = status

      const posts = await Post.find(query)
        .sort({ _id: -1 })
        .limit(13)
        .populate('authorId', 'username displayName avatar email')
        .populate({
          path: 'parentPostId',
          select: 'caption authorId generatedImages',
          populate: { path: 'authorId', select: 'username' }
        })
        .lean()

      const postIds = posts.map((p) => p._id)
      const reportCounts = await Report.aggregate([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: '$postId', count: { $sum: 1 } } },
      ])

      console.log(`Status [${status}]: fetched ${posts.length} posts, reportCounts: ${reportCounts.length}`)
    } catch (err) {
      console.error(`Status [${status}] ERROR:`, err)
    }
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
