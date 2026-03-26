import multer from 'multer'
import AppError from '../utils/AppError.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

// Lưu trong memory — sau đó stream lên Cloudinary
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError('INVALID_FILE_TYPE', 'Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WebP', 400),
      false
    )
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
})

// Error handler cho multer (quá size)
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('UPLOAD_TOO_LARGE', 'Ảnh không được vượt quá 20MB', 413))
    }
    return next(new AppError('UPLOAD_ERROR', err.message, 400))
  }
  next(err)
}

export default upload
