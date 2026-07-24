import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { processCsvImport } from '../services/csvImport.service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI
const defaultCsvPath = path.join(__dirname, '../../../plant/datas/youmind_export_20260723_153225.csv')

async function main() {
  const csvPath = process.argv[2] || defaultCsvPath
  console.log(`🚀 Starting Bulk CSV Import from: ${csvPath}`)

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV File not found at path: ${csvPath}`)
    process.exit(1)
  }

  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected to MongoDB Cloud')

  const csvContent = fs.readFileSync(csvPath, 'utf8')
  const result = await processCsvImport(csvContent)

  console.log('\n==================================================')
  console.log('🎉 Bulk CSV Import Completed Successfully!')
  console.log(`📊 Total rows in CSV: ${result.totalRows}`)
  console.log(`✅ Newly imported posts: ${result.importedCount}`)
  console.log(`⏭️ Skipped duplicates: ${result.skippedCount}`)
  console.log(`👤 Newly created users (Password: Minhduc@123): ${result.createdUsersCount}`)
  console.log('==================================================')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌ CSV Import script failed:', err)
  process.exit(1)
})
