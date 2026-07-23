import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import Post from './src/models/Post.model.js'

async function run() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/picspy'
  await mongoose.connect(dbUri)
  console.log('Connected to DB')
  
  // Lấy post có status approved và postType ai
  const post = await Post.findOne({ postType: 'ai', status: 'approved', 'sourceImages.0': { $exists: true } })
  console.log('DUMP POST WITH SOURCE IMAGES:', JSON.stringify(post, null, 2))
  
  const post2 = await Post.findOne({ postType: 'ai', status: 'approved' })
  console.log('DUMP GENERAL AI POST:', JSON.stringify(post2, null, 2))
  
  await mongoose.disconnect()
}
run()
