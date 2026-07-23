import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import Post from './src/models/Post.model.js'
import User from './src/models/User.model.js'
import RemixSession from './src/models/RemixSession.model.js'
import { verifyRemix } from './src/services/ai.service.js'

async function run() {
  console.log('Testing connection to DB...')
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/picspy'
  console.log('DB URI:', dbUri)
  
  try {
    await mongoose.connect(dbUri)
    console.log('✅ Connected to MongoDB!')
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message)
    process.exit(1)
  }

  console.log('\n--- Checking for Posts ---')
  const post = await Post.findOne({ status: 'approved' })
  if (!post) {
    console.log('⚠️ No approved post found to test remix. Please seed the database or upload a post first.')
    await mongoose.disconnect()
    process.exit(0)
  }
  
  console.log(`✅ Found post: ${post._id}`)
  console.log(`   Caption: "${post.caption}"`)
  console.log(`   Prompt: "${post.prompt}"`)
  console.log(`   allowRemix: ${post.allowRemix}`)
  console.log(`   remixRoyaltyPercent: ${post.remixRoyaltyPercent}%`)
  console.log(`   remixDiscountPercent: ${post.remixDiscountPercent}%`)

  if (process.env.GEMINI_API_KEY) {
    console.log('\n--- Testing verifyRemix via Gemini API ---')
    try {
      const result = await verifyRemix(
        post.prompt || "Japanese girl white hoodie in cafe",
        "Japanese girl black leather jacket on Tokyo street night neon cyberpunk",
        post.generatedImages?.[0]?.url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        post.generatedImages?.[0]?.url || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
      )
      console.log('✅ Gemini verifyRemix response:\n', JSON.stringify(result, null, 2))
    } catch (err) {
      console.error('❌ Gemini verifyRemix call failed:', err.message)
    }
  } else {
    console.log('\n⚠️ No GEMINI_API_KEY env variable found, skipping AI API check.')
  }

  await mongoose.disconnect()
  console.log('✅ Disconnected!')
}

run()
