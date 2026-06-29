import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/picspy'
console.log('Connecting to', uri)

await mongoose.connect(uri)

const settingsSchema = new mongoose.Schema(
  {
    autoApprove: Boolean,
    autoApproveDelayMs: Number,
    primaryColor: String,
    gradientColor: String,
  },
  { collection: 'settings' }
)

const Settings = mongoose.model('Settings', settingsSchema)

const doc = await Settings.findOne()
console.log('Settings Document in DB:', doc)

await mongoose.disconnect()
process.exit(0)
