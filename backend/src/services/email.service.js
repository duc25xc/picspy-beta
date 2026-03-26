import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Gửi email xác thực tài khoản
 */
export const sendVerificationEmail = async (email, username, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'PixelDrop <noreply@pixeldrop.vn>',
    to: email,
    subject: '✅ Xác thực email tài khoản PixelDrop',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
        <h2>Chào ${username}! 👋</h2>
        <p>Cảm ơn bạn đã đăng ký PixelDrop — nền tảng chia sẻ wallpaper dành cho creator Việt Nam.</p>
        <p>Nhấn nút bên dưới để xác thực email của bạn:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Xác thực Email
        </a>
        <p style="color:#666;font-size:13px;margin-top:16px;">Link hết hạn sau 24 giờ. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
      </div>
    `,
  })
}

/**
 * Gửi email reset mật khẩu
 */
export const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '🔐 Đặt lại mật khẩu PixelDrop',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
        <h2>Xin chào ${username},</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Đặt lại mật khẩu
        </a>
        <p style="color:#666;font-size:13px;margin-top:16px;">Link hết hạn sau 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  })
}
