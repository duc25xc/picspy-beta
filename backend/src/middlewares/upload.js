import multer from 'multer'
import AppError from '../utils/AppError.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

// Lưu trong memory — sau đó stream lên Cloudinary
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'rawFile') {
    const ext = file.originalname.split('.').pop().toLowerCase()
    const allowed = ['cr2', 'nef', 'arw', 'dng', 'cr3', 'tiff', 'tif']
    if (!allowed.includes(ext)) {
      return cb(
        new AppError('INVALID_RAW_FILE', 'Định dạng file RAW không hỗ trợ. Cho phép: ' + allowed.join(', '), 400),
        false
      )
    }
    return cb(null, true)
  }

  if (file.fieldname === 'colorFile') {
    const ext = file.originalname.split('.').pop().toLowerCase()
    const allowed = ['cube', 'xmp', '3dl']
    if (!allowed.includes(ext)) {
      return cb(
        new AppError('INVALID_COLOR_FILE', 'Định dạng file màu không hỗ trợ. Cho phép: ' + allowed.join(', '), 400),
        false
      )
    }
    return cb(null, true)
  }

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
      return next(new AppError('UPLOAD_TOO_LARGE', 'Kích thước tệp tin không được vượt quá 100MB', 413))
    }
    return next(new AppError('UPLOAD_ERROR', err.message, 400))
  }
  next(err)
}

export default upload
