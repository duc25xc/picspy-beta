import mongoose from 'mongoose'

/**
 * Unified OTP collection used for all purpose-based verification flows.
 * A single model with `purpose` enum avoids duplicating OTP logic across controllers.
 *
 * Supported purposes:
 *   RESET_PASSWORD — forgot password flow
 *   RESET_PIN      — forgot transaction PIN flow
 *   VERIFY_EMAIL   — email verification on register
 *   CHANGE_EMAIL   — email change confirmation
 */

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    codeHash: {
      type: String,
      required: true,
      select: false, // never leak hash in responses
    },

    purpose: {
      type: String,
      required: true,
      enum: ['RESET_PASSWORD', 'RESET_PIN', 'VERIFY_EMAIL', 'CHANGE_EMAIL'],
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB auto-deletes documents after expiry
      index: { expireAfterSeconds: 0 },
    },

    attempts: {
      type: Number,
      default: 0,
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
)

// Compound index: one active OTP per (email, purpose) pair
otpSchema.index({ email: 1, purpose: 1 })

const Otp = mongoose.model('Otp', otpSchema)
export default Otp
