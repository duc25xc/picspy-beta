import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * Upload buffer lên Cloudinary
 * @param {Buffer} buffer
 * @param {string} folder - thư mục trên Cloudinary
 * @param {string} publicId - tên file
 * @param {object} options - options thêm
 */
export const uploadBuffer = (buffer, folder, publicId, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    Readable.from(buffer).pipe(uploadStream)
  })
}

/**
 * Xóa file trên Cloudinary
 * @param {string} publicId
 */
export const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId)
}

/**
 * Tạo signed URL cho premium download
 * @param {string} publicId
 * @param {number} expiresInSeconds
 */
export const getSignedUrl = (publicId, expiresInSeconds = 3600) => {
  return cloudinary.url(publicId, {
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    resource_type: 'image',
  })
}

export default cloudinary
