import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emoji: { type: String, default: '🏷️' },
    description: { type: String, maxlength: 200 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    searchCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
)

// categorySchema.index({ slug: 1 }, { unique: true })
categorySchema.index({ isActive: 1, sortOrder: 1 })

const Category = mongoose.model('Category', categorySchema)
export default Category
