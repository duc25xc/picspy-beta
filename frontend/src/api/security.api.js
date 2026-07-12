import api from './api'

/**
 * Security API client — Transaction PIN operations
 */

/** Get PIN status for the current user */
export const getPinStatus = () => api.get('/security/pin-status')

/** First-time PIN setup */
export const setupPin = (pin, allowWeak = false) => api.post('/security/setup-pin', { pin, allowWeak })

/** Verify PIN before a transaction — returns { valid: true } on success */
export const verifyPin = (pin) => api.post('/security/verify-pin', { pin })

/** Change PIN — requires current PIN */
export const changePin = (currentPin, newPin, allowWeak = false) =>
  api.post('/security/change-pin', { currentPin, newPin, allowWeak })

/** Request a PIN reset OTP (sent to email) */
export const resetPinRequest = () => api.post('/security/reset-pin/request')

/** Verify OTP + set new PIN */
export const resetPinVerify = (otp, newPin, allowWeak = false) =>
  api.post('/security/reset-pin/verify', { otp, newPin, allowWeak })

/** Disable PIN — requires account password */
export const disablePin = (password) => api.post('/security/disable-pin', { password })

