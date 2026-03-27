import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.model.js'
import 'dotenv/config'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

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

            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              username,
              displayName: profile.displayName,
              avatar: profile.photos[0]?.value || '',
              isVerified: true, // Email từ Google đã được verify
            })
          } else if (!user.googleId) {
            // Merge account: user đã đăng ký bằng email, giờ login Google
            user.googleId = profile.id
            await user.save()
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
