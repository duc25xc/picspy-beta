import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Ensure a user can only report a specific post once
reportSchema.index({ reporterId: 1, postId: 1 }, { unique: true })

const Report = mongoose.model('Report', reportSchema)
export default Report
