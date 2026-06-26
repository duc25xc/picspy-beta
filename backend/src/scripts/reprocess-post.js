import 'dotenv/config'
import mongoose from 'mongoose'
import sharp from 'sharp'
import axios from 'axios'
import Post from '../models/Post.model.js'
import { uploadBuffer } from '../config/cloudinary.js'

await mongoose.connect(process.env.MONGODB_URI)

const postId = '6a3ee7a3a1db5def4c88ab83'
const post = await Post.findById(postId)

if (post) {
  console.log('Reprocessing post:', post._id)
  const imageUrl = post.generatedImages[0].url
  const publicId = post.generatedImages[0].publicId
  const baseName = publicId.split('/').pop()

  console.log('Downloading original image from:', imageUrl)
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
  const imageBuffer = Buffer.from(response.data)

  console.log('Resizing with sharp auto-rotate...')
  const [thumbnailBuffer, previewBuffer] = await Promise.all([
    sharp(imageBuffer)
      .rotate()
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(imageBuffer)
      .rotate()
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer(),
  ])

  console.log('Uploading WebP versions to Cloudinary...')
  const [thumbResult, previewResult] = await Promise.all([
    uploadBuffer(thumbnailBuffer, 'picspy/posts/thumbnails', `${baseName}_thumb`, { format: 'webp' }),
    uploadBuffer(previewBuffer, 'picspy/posts/previews', `${baseName}_preview`, { format: 'webp' }),
  ])

  console.log('Updating post in MongoDB...')
  await Post.findByIdAndUpdate(postId, {
    $set: {
      'generatedImages.0.thumbnailUrl': thumbResult.secure_url,
      'generatedImages.0.previewUrl': previewResult.secure_url,
    }
  })
  console.log('✅ Reprocessing complete!')
} else {
  console.log('❌ Post not found')
}

await mongoose.disconnect()
