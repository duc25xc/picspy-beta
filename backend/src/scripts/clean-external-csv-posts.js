import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Post from '../models/Post.model.js'
import User from '../models/User.model.js'
import { processCsvImport } from '../services/csvImport.service.js'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Connected to MongoDB Cloud')

  // Remove previously imported external posts
  const deletedPosts = await Post.deleteMany({ isExternal: true })
  console.log(`🧹 Deleted ${deletedPosts.deletedCount} old external posts`)

  // Remove auto-created csv users (@picspy.ai)
  const deletedUsers = await User.deleteMany({ email: /@picspy\.ai$/ })
  console.log(`🧹 Deleted ${deletedUsers.deletedCount} old csv auto-created users`)

  // Re-run CSV import with upgraded logic & new CSV file
  const csvPath = path.join(__dirname, '../../../plant/datas/youmind_export_20260725_022113.csv')
  console.log(`🚀 Importing CSV from: ${csvPath}`)
  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const result = await processCsvImport(csvContent)

  console.log('\n==================================================')
  console.log('🎉 Cleaned & Re-imported External CSV Posts (2026-07-25)!')
  console.log(`📊 Total rows: ${result.totalRows}`)
  console.log(`✅ Newly imported posts: ${result.importedCount}`)
  console.log(`👤 Newly created users (Password: Minhduc@123): ${result.createdUsersCount}`)
  console.log('==================================================')

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
