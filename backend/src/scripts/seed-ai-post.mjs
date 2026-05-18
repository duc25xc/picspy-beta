/**
 * seed-ai-post.mjs
 * Tạo 1 AI post demo để test UI: ImageGallery + PromptBlock
 *
 * Usage:
 *   node src/scripts/seed-ai-post.mjs
 *
 * Yêu cầu: MONGODB_URI trong .env
 */

import 'dotenv/config'
import mongoose from 'mongoose'

/* ─── Inline schemas (tránh import chain phức tạp) ─────────── */
const imageSchema = new mongoose.Schema(
  { url: String, thumbnailUrl: String, previewUrl: String, publicId: String, width: Number, height: Number, fileSize: Number, format: String },
  { _id: false }
)

const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceImages: { type: [imageSchema], default: [] },
  generatedImages: { type: [imageSchema], default: [] },
  images: { type: [imageSchema], default: [] }, // legacy
  caption: { type: String, required: true },
  prompt: String,
  negativePrompt: String,
  parameters: String,
  aiTool: String,
  aiModel: String,
  tags: [String],
  category: String,
  orientation: String,
  resolution: String,
  aspectRatio: String,
  isPremium: { type: Boolean, default: false },
  priceInTokens: Number,
  status: { type: String, default: 'approved' },
  isPublic: { type: Boolean, default: true },
  colorPalette: [String],
  stats: {
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },
  },
}, { timestamps: true }))

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  displayName: String,
  avatar: String,
  isVerified: Boolean,
}, { timestamps: true }))

/* ─── Demo image URLs (Picsum/Unsplash — stable, CORS-ok) ────── */
// Dùng ảnh thật từ Unsplash để ambient glow có màu đẹp
const DEMO_IMAGES = [
  {
    // ảnh AI kết quả 1: cyberpunk cityscape
    url: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=1920&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=400&q=80',
    width: 1920, height: 1080, format: 'jpg',
  },
  {
    // ảnh AI kết quả 2: neon rain street
    url: 'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=1920&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=400&q=80',
    width: 1920, height: 1280, format: 'jpg',
  },
  {
    // ảnh AI kết quả 3: purple galaxy abstract
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80',
    width: 1920, height: 1080, format: 'jpg',
  },
]

const SOURCE_IMAGE = {
  url: 'https://images.unsplash.com/photo-1616514197671-15d99ce7a6f8?w=800&q=80',
  thumbnailUrl: 'https://images.unsplash.com/photo-1616514197671-15d99ce7a6f8?w=300&q=70',
  width: 800, height: 534, format: 'jpg',
}

/* ─── Main ───────────────────────────────────────────────────── */
async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) { console.error('❌ MONGODB_URI not set'); process.exit(1) }

  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  console.log('✅ Connected')

  // Lấy user đầu tiên có sẵn để làm author
  const author = await User.findOne().sort({ createdAt: 1 }).lean()
  if (!author) { console.error('❌ No user found. Create a user first.'); process.exit(1) }
  console.log(`👤 Using author: ${author.username || author.email}`)

  // Xoá post demo cũ nếu có
  await Post.deleteOne({ caption: '[Demo] Cyberpunk Tokyo Nightscape — AI Gallery Test' })

  const post = await Post.create({
    authorId: author._id,
    caption: '[Demo] Cyberpunk Tokyo Nightscape — AI Gallery Test',
    prompt: `A cinematic wide-angle shot of Tokyo at midnight, cyberpunk aesthetic, neon signs reflecting on wet asphalt streets, ultra-high detail, dramatic volumetric lighting, holographic advertisements floating above the crowd, rain particles, atmospheric fog, blade runner inspired, 8K resolution, octane render, photorealistic`,
    negativePrompt: `blurry, low quality, cartoon, anime, watermark, text overlay, overexposed, flat lighting, daytime, sunny weather, people faces clearly visible, logos`,
    parameters: `--ar 16:9 --v 6.1 --style raw --stylize 750 --chaos 15 --quality 2 --seed 4829103`,
    aiTool: 'midjourney',
    aiModel: 'v6.1',
    tags: ['cyberpunk', 'tokyo', 'nightscape', 'neon', 'scifi', 'urban'],
    category: 'city',
    orientation: 'landscape',
    resolution: '4k',
    aspectRatio: '16:9',
    isPremium: false,
    status: 'approved',
    isPublic: true,
    generatedImages: DEMO_IMAGES,
    sourceImages: [SOURCE_IMAGE],
    // Palette màu cyberpunk để test ambient gradient
    colorPalette: ['#7b2fff', '#00d4ff', '#ff0099', '#1a0533', '#00ff88'],
    stats: {
      viewsCount: 1247,
      likesCount: 389,
      downloadsCount: 56,
      commentsCount: 12,
      bookmarksCount: 78,
    },
  })

  console.log(`\n✅ Seed post created!`)
  console.log(`   ID: ${post._id}`)
  console.log(`   URL: http://localhost:5173/posts/${post._id}`)
  console.log(`   3 generated images + 1 source image`)
  console.log(`   Prompt: ${post.prompt.slice(0, 60)}...`)

  await mongoose.disconnect()
  console.log('\n🔌 Disconnected. Done!')
}

main().catch(e => { console.error(e); process.exit(1) })
