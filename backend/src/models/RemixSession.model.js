import mongoose from 'mongoose'

const remixSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    remixPrompt: {
      type: String,
      trim: true,
    },
    remixImageUrl: {
      type: String,
    },
    remixSourceImageUrl: {
      type: String,
    },
    generatedHistory: [
      {
        url: { type: String, required: true },
        prompt: { type: String },
        aiCheckResult: {
          semanticScore: Number,
          imageScore: Number,
          changedCategories: {
            type: Map,
            of: Boolean,
          },
          decision: {
            type: String,
            enum: ['pass', 'warning', 'reject'],
          },
          message: String,
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    aiCheckResult: {
      semanticScore: Number,
      imageScore: Number,
      changedCategories: {
        type: Map,
        of: Boolean,
      },
      decision: {
        type: String,
        enum: ['pass', 'warning', 'reject'],
      },
      message: String,
    },
    status: {
      type: String,
      enum: ['active', 'published'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

remixSessionSchema.index({ userId: 1, originalPostId: 1, status: 1 })

const RemixSession = mongoose.model('RemixSession', remixSessionSchema)
export default RemixSession
