import mongoose from 'mongoose'

const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true })
followSchema.index({ followingId: 1 })
followSchema.index({ followerId: 1 })

const Follow = mongoose.model('Follow', followSchema)
export default Follow
