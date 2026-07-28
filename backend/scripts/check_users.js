import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const userSchema = new mongoose.Schema({}, { strict: false })
const User = mongoose.model('User', userSchema, 'users')

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const users = await User.find({}).select('username displayName avatar email').limit(20).lean()

    console.log('Sample User Avatars:', users.map(u => ({ username: u.username, avatar: u.avatar })))
  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await mongoose.disconnect()
  }
}

run()
