import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import Post from './src/models/Post.model.js'

async function run() {
  console.log('Connecting to database for migration...')
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/picspy'
  
  try {
    await mongoose.connect(dbUri)
    console.log('✅ Connected to MongoDB!')
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    process.exit(1)
  }

  try {
    const query = {
      $or: [
        { postType: 'ai' },
        { prompt: { $exists: true, $ne: '' } }
      ]
    }

    const result = await Post.updateMany(query, {
      $set: {
        allowRemix: true,
        remixRoyaltyPercent: 15,
        remixDiscountPercent: 10
      }
    })

    console.log(`🎉 Migration completed! Updated ${result.modifiedCount} posts in database.`)
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Disconnected!')
  }
}

run()
