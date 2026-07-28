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

  const total = await User.countDocuments()
  console.log(`\n📊 Total users in DB: ${total}`)

  // Check different date ranges
  const ranges = [
    { label: '2026-07-28 UTC+7 (00:00-07:00 UTC)', start: '2026-07-27T17:00:00.000Z', end: '2026-07-28T17:00:00.000Z' },
    { label: '2026-07-27', start: '2026-07-27T00:00:00.000Z', end: '2026-07-27T17:00:00.000Z' },
    { label: 'All time - by date distribution', start: null, end: null },
  ]

  for (const r of ranges) {
    if (r.start) {
      const count = await User.countDocuments({ createdAt: { $gte: new Date(r.start), $lt: new Date(r.end) } })
      console.log(`\n📅 ${r.label}: ${count} users`)
    }
  }

  // Show all users grouped by date (last 7 days creation)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentUsers = await User.find({ createdAt: { $gte: sevenDaysAgo } })
    .select('_id username email createdAt')
    .sort({ createdAt: -1 })
    .lean()

  console.log(`\n🕐 Recent users (last 7 days): ${recentUsers.length}`)
  recentUsers.slice(0, 20).forEach(u => {
    console.log(`   - @${u.username} | ${u.email} | ${new Date(u.createdAt).toISOString()}`)
  })

  // How old are all users?
  const oldestUser = await User.findOne().sort({ createdAt: 1 }).select('createdAt username email').lean()
  const newestUser = await User.findOne().sort({ createdAt: -1 }).select('createdAt username email').lean()
  console.log(`\n⏳ Oldest user: @${oldestUser?.username} created ${oldestUser?.createdAt}`)
  console.log(`⏳ Newest user: @${newestUser?.username} created ${newestUser?.createdAt}`)

  // Count by createdAt date bucket
  const byDate = await User.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 10 }
  ])
  console.log(`\n📈 User creation by date (last 10 days):`)
  byDate.forEach(d => console.log(`   ${d._id}: ${d.count} users`))

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
