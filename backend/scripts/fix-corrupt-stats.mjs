/**
 * Migration script: Fix corrupted stats in Post collection
 * Targets posts where sharesCount > 500K (clearly corrupt CSV data)
 * Resets the corrupt stat to 0 and recalculates viewsCount to a reasonable value
 */
import mongoose from 'mongoose'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../.env') })

const STAT_MAX = {
  views:    10_000_000,
  likes:     2_000_000,
  shares:      500_000,
  comments:    500_000,
  saved:     1_000_000,
}

await mongoose.connect(process.env.MONGODB_URI)
console.log('✅ Connected to MongoDB')

const Post = (await import('../src/models/Post.model.js')).default

// Find all posts with any stat exceeding their max
const badPosts = await Post.find({
  $or: [
    { 'stats.sharesCount':   { $gt: STAT_MAX.shares   } },
    { 'stats.likesCount':    { $gt: STAT_MAX.likes    } },
    { 'stats.commentsCount': { $gt: STAT_MAX.comments } },
    { 'stats.bookmarksCount':{ $gt: STAT_MAX.saved    } },
    { 'stats.viewsCount':    { $gt: STAT_MAX.views    } },
  ]
}).select('_id stats baseStats caption').lean()

console.log(`🔍 Found ${badPosts.length} posts with corrupted stats`)

let fixed = 0
for (const post of badPosts) {
  const clamp = (v, max) => (v > max ? 0 : v)
  
  const newLikes    = clamp(post.stats?.likesCount    || 0, STAT_MAX.likes)
  const newShares   = clamp(post.stats?.sharesCount   || 0, STAT_MAX.shares)
  const newComments = clamp(post.stats?.commentsCount || 0, STAT_MAX.comments)
  const newSaved    = clamp(post.stats?.bookmarksCount|| 0, STAT_MAX.saved)
  
  // Recalculate views: clamp first, then apply engagement-based inflation (capped at 10M)
  let newViews = clamp(post.stats?.viewsCount || 0, STAT_MAX.views)
  const maxEng = Math.max(newLikes, newShares, newComments, newSaved)
  if (maxEng > 0) {
    if (newViews <= 0) newViews = 1
    let iters = 0
    while (newViews <= maxEng && iters < 3) { newViews *= 1000; iters++ }
  }
  newViews = Math.min(newViews, STAT_MAX.views)

  console.log(`  → [${post._id}] "${(post.caption || '').substring(0, 40)}"`)
  console.log(`     shares: ${post.stats?.sharesCount} → ${newShares}  |  views: ${post.stats?.viewsCount} → ${newViews}`)

  await Post.updateOne({ _id: post._id }, {
    $set: {
      'stats.sharesCount':    newShares,
      'stats.likesCount':     newLikes,
      'stats.commentsCount':  newComments,
      'stats.bookmarksCount': newSaved,
      'stats.viewsCount':     newViews,
      'stats.downloadsCount': Math.floor(newViews * 0.1),
      'baseStats.sharesCount':    newShares,
      'baseStats.likesCount':     newLikes,
      'baseStats.commentsCount':  newComments,
      'baseStats.bookmarksCount': newSaved,
      'baseStats.viewsCount':     newViews,
    }
  })
  fixed++
}

console.log(`\n✅ Fixed ${fixed}/${badPosts.length} posts`)
await mongoose.disconnect()
process.exit(0)
