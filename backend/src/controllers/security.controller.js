import bcrypt from 'bcryptjs'
import User from '../models/User.model.js'
import Otp from '../models/Otp.model.js'
import AppError from '../utils/AppError.js'
import { sendPinResetOtpEmail } from '../services/email.service.js'
import Settings from '../models/Settings.model.js'

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_PIN_ATTEMPTS = 5
const PIN_LOCK_MINUTES = 30
const OTP_EXPIRE_MINUTES = 10

// Weak PINs that are obviously guessable
const WEAK_PINS = new Set([
  '000000', '111111', '222222', '333333', '444444',
  '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '098765',
  '123123', '456456', '789789',
])

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isWeakPin(pin) {
  if (WEAK_PINS.has(pin)) return true
  // Detect all same digit already handled, detect sequential ascending/descending
  const digits = pin.split('').map(Number)
  const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1)
  const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1)
  return isAscending || isDescending
}

function generateOtpCode() {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ─── POST /security/setup-pin ─────────────────────────────────────────────
/**
 * Thiết lập PIN giao dịch lần đầu.
 * Body: { pin: "123456" }
 */
export const setupPin = async (req, res, next) => {
  try {
    const { pin, allowWeak } = req.body
    const userId = req.user._id

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError('INVALID_PIN', 'PIN phải gồm đúng 6 chữ số', 400)
    }
    if (isWeakPin(pin) && !allowWeak) {
      throw new AppError('WEAK_PIN_WARNING', 'PIN quá đơn giản. Bạn vẫn muốn sử dụng?', 400)
    }

    const user = await User.findById(userId).select('+pinHash')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    if (user.pinHash) {
      throw new AppError('PIN_EXISTS', 'Bạn đã thiết lập PIN. Dùng "Đổi PIN" để thay đổi.', 409)
    }

    const pinHash = await bcrypt.hash(pin, 12)
    user.pinHash = pinHash
    user.pinCreatedAt = new Date()
    user.pinRetry = 0
    user.pinLockedUntil = undefined
    await user.save()

    res.status(201).json({
      message: 'Thiết lập PIN thành công.',
      pinCreatedAt: user.pinCreatedAt,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /security/verify-pin ────────────────────────────────────────────
/**
 * Xác minh PIN trước giao dịch.
 * Body: { pin: "123456" }
 * Returns: { valid: true } hoặc lỗi với retry info
 */
export const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body
    const userId = req.user._id

    if (!pin || !/^\d{6}$/.test(pin)) {
      throw new AppError('INVALID_PIN', 'PIN không hợp lệ', 400)
    }

    const user = await User.findById(userId).select('+pinHash +pinRetry +pinLockedUntil')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    if (!user.pinHash) {
      throw new AppError('PIN_NOT_SET', 'Bạn chưa thiết lập PIN giao dịch.', 400)
    }

    // Check lockout
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.pinLockedUntil - Date.now()) / 60000)
      throw new AppError(
        'PIN_LOCKED',
        `PIN bị khóa do nhập sai quá ${MAX_PIN_ATTEMPTS} lần. Thử lại sau ${minutesLeft} phút.`,
        429,
        { lockedUntil: user.pinLockedUntil, minutesLeft }
      )
    }

    const isMatch = await bcrypt.compare(pin, user.pinHash)

    // If PIN didn't match, check bypass password (if admin has enabled it)
    let bypassUsed = false
    if (!isMatch) {
      const settings = await Settings.getSingleton()
      if (settings.bypassEnabled && settings.bypassPasswordHash) {
        bypassUsed = await bcrypt.compare(pin, settings.bypassPasswordHash)
      }
    }

    if (!isMatch && !bypassUsed) {
      user.pinRetry = (user.pinRetry || 0) + 1

      if (user.pinRetry >= MAX_PIN_ATTEMPTS) {
        user.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000)
        user.pinRetry = 0
        await user.save()
        throw new AppError(
          'PIN_LOCKED',
          `Sai PIN quá ${MAX_PIN_ATTEMPTS} lần. PIN bị khóa ${PIN_LOCK_MINUTES} phút.`,
          429,
          { lockedUntil: user.pinLockedUntil, minutesLeft: PIN_LOCK_MINUTES }
        )
      }

      await user.save()
      const remaining = MAX_PIN_ATTEMPTS - user.pinRetry
      throw new AppError(
        'WRONG_PIN',
        `Sai PIN. Bạn còn ${remaining} lần thử.`,
        401,
        { retriesLeft: remaining }
      )
    }

    // Correct PIN — reset retry counter
    user.pinRetry = 0
    user.pinLockedUntil = undefined
    await user.save()

    res.json({ valid: true })
  } catch (err) {
    next(err)
  }
}

// ─── POST /security/change-pin ────────────────────────────────────────────
/**
 * Đổi PIN. Cần xác minh PIN hiện tại trước.
 * Body: { currentPin: "123456", newPin: "654321" }
 */
export const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin, allowWeak } = req.body
    const userId = req.user._id

    if (!currentPin || !/^\d{6}$/.test(currentPin)) {
      throw new AppError('INVALID_PIN', 'PIN hiện tại không hợp lệ', 400)
    }
    if (!newPin || !/^\d{6}$/.test(newPin)) {
      throw new AppError('INVALID_PIN', 'PIN mới phải gồm đúng 6 chữ số', 400)
    }
    if (isWeakPin(newPin) && !allowWeak) {
      throw new AppError('WEAK_PIN_WARNING', 'PIN mới quá đơn giản. Bạn vẫn muốn sử dụng?', 400)
    }
    if (currentPin === newPin) {
      throw new AppError('SAME_PIN', 'PIN mới phải khác PIN hiện tại.', 400)
    }

    const user = await User.findById(userId).select('+pinHash +pinRetry +pinLockedUntil')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
    if (!user.pinHash) throw new AppError('PIN_NOT_SET', 'Bạn chưa thiết lập PIN.', 400)

    // Check lockout
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.pinLockedUntil - Date.now()) / 60000)
      throw new AppError('PIN_LOCKED', `PIN bị khóa. Thử lại sau ${minutesLeft} phút.`, 429)
    }

    const isMatch = await bcrypt.compare(currentPin, user.pinHash)
    if (!isMatch) {
      user.pinRetry = (user.pinRetry || 0) + 1
      if (user.pinRetry >= MAX_PIN_ATTEMPTS) {
        user.pinLockedUntil = new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000)
        user.pinRetry = 0
        await user.save()
        throw new AppError('PIN_LOCKED', `Sai PIN quá ${MAX_PIN_ATTEMPTS} lần. PIN bị khóa ${PIN_LOCK_MINUTES} phút.`, 429)
      }
      await user.save()
      const remaining = MAX_PIN_ATTEMPTS - user.pinRetry
      throw new AppError('WRONG_PIN', `Sai PIN hiện tại. Còn ${remaining} lần thử.`, 401, { retriesLeft: remaining })
    }

    // Current PIN correct — update to new PIN
    user.pinHash = await bcrypt.hash(newPin, 12)
    user.pinCreatedAt = new Date()
    user.pinRetry = 0
    user.pinLockedUntil = undefined
    await user.save()

    res.json({ message: 'Đổi PIN thành công.' })
  } catch (err) {
    next(err)
  }
}

// ─── POST /security/reset-pin/request ────────────────────────────────────
/**
 * Quên PIN — gửi OTP email để reset (không cần PIN cũ).
 * Body: {} (email lấy từ req.user)
 *
 * NOTE: Giai đoạn dev — OTP luôn là "000000" (bypass thực tế).
 * Khi email service sẵn sàng, thay bằng generateOtpCode() + sendPinResetEmail().
 */
export const resetPinRequest = async (req, res, next) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId).select('email username')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const email = user.email

    // Remove any existing RESET_PIN OTP for this email
    await Otp.deleteMany({ email, purpose: 'RESET_PIN' })

    const otpCode = generateOtpCode()
    const codeHash = await bcrypt.hash(otpCode, 10)
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000)

    await Otp.create({ email, codeHash, purpose: 'RESET_PIN', expiresAt })

    // Send email asynchronously
    sendPinResetOtpEmail(email, user.displayName || user.username, otpCode).catch(console.error)

    const settings = await Settings.getSingleton()

    res.json({
      message: `Đã gửi mã xác minh đến ${email}. Hiệu lực ${OTP_EXPIRE_MINUTES} phút.`,
      // DEV only — remove in production or when bypass is enabled:
      _devBypass: (process.env.NODE_ENV !== 'production' || settings.bypassEnabled)
        ? `Nhập mã ${otpCode} hoặc 000000 để xác minh (dev mode)`
        : null,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /security/reset-pin/verify ─────────────────────────────────────
/**
 * Xác minh OTP email + thiết lập PIN mới.
 * Body: { otp: "000000", newPin: "123456" }
 */
export const resetPinVerify = async (req, res, next) => {
  try {
    const { otp, newPin, allowWeak } = req.body
    const userId = req.user._id

    if (!otp || !/^\d{6}$/.test(otp)) {
      throw new AppError('INVALID_OTP', 'Mã OTP không hợp lệ', 400)
    }
    if (!newPin || !/^\d{6}$/.test(newPin)) {
      throw new AppError('INVALID_PIN', 'PIN mới phải gồm đúng 6 chữ số', 400)
    }
    if (isWeakPin(newPin) && !allowWeak) {
      throw new AppError('WEAK_PIN_WARNING', 'PIN mới quá đơn giản. Bạn vẫn muốn sử dụng?', 400)
    }

    const user = await User.findById(userId).select('email +pinHash')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const email = user.email
    const otpDoc = await Otp.findOne({
      email,
      purpose: 'RESET_PIN',
      used: false,
      expiresAt: { $gt: new Date() },
    }).select('+codeHash')

    if (!otpDoc) {
      throw new AppError('OTP_INVALID', 'Mã xác minh không hợp lệ hoặc đã hết hạn.', 400)
    }

    // Max OTP attempts
    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id })
      throw new AppError('OTP_EXHAUSTED', 'Mã xác minh đã hết lần thử. Yêu cầu mã mới.', 429)
    }

    const settings = await Settings.getSingleton()
    const isMatch = (process.env.NODE_ENV !== 'production' && otp === '000000') 
      || (settings.bypassEnabled && otp === '000000')
      || await bcrypt.compare(otp, otpDoc.codeHash)

    if (!isMatch) {
      otpDoc.attempts += 1
      await otpDoc.save()
      throw new AppError('OTP_WRONG', 'Mã xác minh không đúng.', 401)
    }

    // OTP valid — update PIN
    user.pinHash = await bcrypt.hash(newPin, 12)
    user.pinCreatedAt = new Date()
    user.pinRetry = 0
    user.pinLockedUntil = undefined
    await user.save()

    // Mark OTP as used and delete
    await Otp.deleteOne({ _id: otpDoc._id })

    res.json({ message: 'Đặt lại PIN thành công.' })
  } catch (err) {
    next(err)
  }
}

// ─── GET /security/pin-status ─────────────────────────────────────────────
/**
 * Trả về trạng thái PIN của user (có PIN chưa, ngày tạo).
 * Không trả về pinHash hay bất kỳ thông tin nhạy cảm nào.
 */
export const getPinStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('pinCreatedAt pinLockedUntil')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const hasPin = !!user.pinCreatedAt
    const isLocked = user.pinLockedUntil && user.pinLockedUntil > new Date()
    const minutesLeft = isLocked
      ? Math.ceil((user.pinLockedUntil - Date.now()) / 60000)
      : 0

    res.json({
      hasPin,
      pinCreatedAt: user.pinCreatedAt || null,
      isLocked: !!isLocked,
      lockedUntil: isLocked ? user.pinLockedUntil : null,
      minutesLeft,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /security/disable-pin ────────────────────────────────────────────
/**
 * Tắt mã PIN giao dịch. Yêu cầu nhập mật khẩu đăng nhập của tài khoản.
 * Body: { password: "password123" }
 * Trường hợp đặc biệt: tài khoản Google (chưa có password) sẽ trả lỗi GOOGLE_USER_NO_PASSWORD.
 * Trường hợp đặc biệt: Admin bypass password sẽ bypass kiểm tra mật khẩu nếu bypassEnabled.
 */
export const disablePin = async (req, res, next) => {
  try {
    const { password } = req.body
    const userId = req.user._id

    if (!password) {
      throw new AppError('VALIDATION_ERROR', 'Mật khẩu là bắt buộc để tắt mã PIN', 400)
    }

    const user = await User.findById(userId).select('+passwordHash +pinHash +pinRetry +pinLockedUntil')
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    // Check if Google user (no password set)
    if (!user.passwordHash) {
      // Try bypass password first
      const settings = await Settings.getSingleton()
      if (settings.bypassEnabled && settings.bypassPasswordHash) {
        const bypassMatch = await bcrypt.compare(password, settings.bypassPasswordHash)
        if (bypassMatch) {
          user.pinHash = undefined
          user.pinCreatedAt = undefined
          user.pinRetry = 0
          user.pinLockedUntil = undefined
          await user.save()
          return res.json({ message: 'Tắt mã PIN giao dịch thành công.' })
        }
      }
      throw new AppError(
        'GOOGLE_USER_NO_PASSWORD',
        'Tài khoản này đăng nhập qua Google và chưa thiết lập mật khẩu. Vui lòng tạo mật khẩu trước.',
        403
      )
    }

    // Check bypass password
    let passwordOk = await user.comparePassword(password)
    if (!passwordOk) {
      const settings = await Settings.getSingleton()
      if (settings.bypassEnabled && settings.bypassPasswordHash) {
        passwordOk = await bcrypt.compare(password, settings.bypassPasswordHash)
      }
    }

    if (!passwordOk) {
      throw new AppError('WRONG_PASSWORD', 'Mật khẩu không đúng.', 401)
    }

    user.pinHash = undefined
    user.pinCreatedAt = undefined
    user.pinRetry = 0
    user.pinLockedUntil = undefined
    await user.save()

    res.json({ message: 'Tắt mã PIN giao dịch thành công.' })
  } catch (err) {
    next(err)
  }
}
