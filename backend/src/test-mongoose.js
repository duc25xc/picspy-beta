import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from backend directory
dotenv.config({ path: 'd:/DataOfDevelopers/Projects/2026/picspy/backend/.env' })

const uri = process.env.MONGODB_URI
console.log('Connecting to:', uri)
await mongoose.connect(uri)

// Define schema matching Post.model.js exactly (or import it if possible)
const PostModule = await import('./models/Post.model.js')
const Post = PostModule.default

try {
  // Try to validate/create a dummy digital post
  const dummyPost = new Post({
    authorId: new mongoose.Types.ObjectId(), // dummy
    postType: 'digital-normal',
    generatedImages: [
      {
        url: 'http://example.com/test.jpg',
        thumbnailUrl: 'http://example.com/test.jpg',
        previewUrl: 'http://example.com/test.jpg',
        publicId: 'test_public_id',
        width: 1000,
        height: 1000,
        fileSize: 102400,
        format: 'jpg'
      }
    ],
    category: 'minimal',
    caption: 'Test caption',
    tags: ['test', 'digital'],
    isPremium: false,
    priceInTokens: 10,
    resolution: 'hd',
    orientation: 'landscape',
    aspectRatio: '16:9',
    exifData: {
      camera: 'Test Camera',
      lensModel: 'Test Lens',
      iso: 100,
      aperture: 'f/2.8',
      focalLength: '50mm',
      shutterSpeed: '1/125s',
      gpsLat: 10.7769,
      gpsLng: 106.7009
    }
  })

  await dummyPost.validate()
  console.log('✅ Mongoose Schema Validation passed successfully!')
} catch (err) {
  console.error('❌ Mongoose Schema Validation failed!')
  if (err.errors) {
    Object.keys(err.errors).forEach(key => {
      console.error(`Field: ${key}, Message: ${err.errors[key].message}`)
    })
  } else {
    console.error(err)
  }
}

await mongoose.disconnect()
