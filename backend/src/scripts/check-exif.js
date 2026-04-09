import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGO_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }))
const p = await Post.findById('69d6b59f833e9f16b922367b').select('exifData histogram').lean()

console.log('exifData:', JSON.stringify(p?.exifData, null, 2))
console.log('histogram r length:', p?.histogram?.r?.length)

await mongoose.disconnect()
