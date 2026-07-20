import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.model.js'
import { uploadFromUrl } from './cloudinary.js'
import 'dotenv/config'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/**
 * Mirror avatar từ Google lên Cloudinary.
 * - User MỚI: luôn mirror (chưa có avatar)
 * - User CŨ login lại: chỉ mirror khi avatar hiện tại là Google URL (đã hết hạn / user đổi avatar)
 * - Nếu mirror thất bại: giữ nguyên URL Google gốc làm fallback (không block đăng nhập)
 *
 * @param {object} user  - Mongoose user doc (chưa save)
 * @param {string} googlePhotoUrl
 * @returns {Promise<void>}
 */
const mirrorGoogleAvatar = async (user, googlePhotoUrl) => {
  if (!googlePhotoUrl) return

  const isAlreadyCloudinary =
    typeof user.avatar === 'string' &&
    user.avatar.includes('res.cloudinary.com')

  // Nếu user đã có avatar Cloudinary ổn định → không cần mirror lại
  if (user.avatar && isAlreadyCloudinary) return

  try {
    const result = await uploadFromUrl(
      googlePhotoUrl,
      'picspy/avatars',
      `avatar_${user._id}`,
      {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        ],
        format: 'webp',
      }
    )
    user.avatar = result.secure_url
  } catch (err) {
    // Không block đăng nhập nếu mirror lỗi — fallback giữ URL gốc
    console.warn(
      `⚠️ GoogleStrategy: Mirror avatar cho user ${user._id} thất bại — dùng URL gốc. Lỗi: ${err.message}`
    )
  }
}

// Kiểm tra nếu chưa có key thật thì không khởi tạo để tránh crash server
if (
  !GOOGLE_CLIENT_ID ||
  GOOGLE_CLIENT_ID === 'your_google_client_id' ||
  !GOOGLE_CLIENT_SECRET
) {
  console.warn(
    '⚠️ Google OAuth: Thiếu Client ID/Secret. Bỏ qua khởi tạo Strategy.'
  )
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Tìm user theo googleId hoặc email
          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
          })

          const googlePhotoUrl = profile.photos[0]?.value || ''

          if (!user) {
            // Tạo mới user từ Google profile
            const baseUsername = profile.displayName
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .slice(0, 25)

            // Đảm bảo username unique
            let username = baseUsername
            let count = 1
            while (await User.findOne({ username })) {
              username = `${baseUsername}_${count++}`
            }

            // Tạo user với avatar tạm thời = URL Google,
            // sau đó mirror sang Cloudinary rồi save() lại.
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              username,
              displayName: profile.displayName,
              avatar: googlePhotoUrl,
              isVerified: true, // Email từ Google đã được verify
            })

            await mirrorGoogleAvatar(user, googlePhotoUrl)
            if (user.isModified('avatar')) await user.save()
          } else if (!user.googleId) {
            // Merge account: user đã đăng ký bằng email, giờ login Google
            user.googleId = profile.id
            // Nếu user này chưa có avatar (vd: đăng ký bằng email nhưng chưa upload),
            // thì mirror avatar Google làm avatar mặc định.
            if (!user.avatar) {
              await mirrorGoogleAvatar(user, googlePhotoUrl)
            }
            await user.save()
          } else {
            // User Google cũ login lại:
            // - Nếu avatar hiện tại là Google URL (có thể đã hết hạn / user đổi avatar Google)
            //   → mirror lại để cập nhật avatar mới nhất
            // - Nếu avatar đã là Cloudinary thì KHÔNG đụng (tránh tốn bandwidth)
            await mirrorGoogleAvatar(user, googlePhotoUrl)
            if (user.isModified('avatar')) await user.save()
          }

          done(null, user)
        } catch (err) {
          done(err, null)
        }
      }
    )
  )
}

export default passport
