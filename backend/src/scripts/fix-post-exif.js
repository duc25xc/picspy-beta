/**
 * Cập nhật EXIF cho post đã upload mà bị thiếu EXIF
 * (vì lúc upload server chưa có code extract EXIF)
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGO_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }))

// Post vừa upload từ iPhone XR — data lấy từ upload page preview
await Post.findByIdAndUpdate('69d6b59f833e9f16b922367b', {
  $set: {
    exifData: {
      camera: 'Apple iPhone XR',
      lensModel: 'iPhone XR back camera 4.25mm f/1.8',
      iso: 400,
      aperture: 'f/1.8',
      focalLength: '4.25mm',
      shutterSpeed: '1/40s',
      dateTaken: new Date('2022-06-23'),
    }
  }
})

console.log('✅ EXIF updated for post 69d6b59f833e9f16b922367b')
await mongoose.disconnect()
