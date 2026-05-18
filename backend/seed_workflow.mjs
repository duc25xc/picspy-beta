import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const { MONGODB_URI } = process.env
if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI. Please set it in backend/.env')
  process.exit(1)
}

await mongoose.connect(MONGODB_URI)

console.log('✅ Connected to MongoDB')

const col = mongoose.connection.collection('posts')

// Lấy post approved mới nhất
const post = await col.findOne({ status: 'approved' }, { sort: { _id: -1 } })
if (!post) {
  console.log('❌ No approved post found')
  process.exit(1)
}

const sampleWorkflow = JSON.stringify(
  {
    4: {
      inputs: { ckpt_name: 'v1-5-pruned-emaonly.ckpt' },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'Load Checkpoint' },
    },
    6: {
      inputs: {
        text: (post.prompt || 'a beautiful scene').slice(0, 120),
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Positive Prompt' },
    },
    7: {
      inputs: {
        text: 'ugly, blurry, low quality, watermark, deformed',
        clip: ['4', 1],
      },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'Negative Prompt' },
    },
    3: {
      inputs: {
        seed: 42,
        steps: 20,
        cfg: 7.5,
        sampler_name: 'euler_ancestral',
        scheduler: 'karras',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      class_type: 'KSampler',
      _meta: { title: 'KSampler' },
    },
    5: {
      inputs: { width: 768, height: 1024, batch_size: 1 },
      class_type: 'EmptyLatentImage',
      _meta: { title: 'Empty Latent Image' },
    },
    8: {
      inputs: { samples: ['3', 0], vae: ['4', 2] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' },
    },
    9: {
      inputs: { filename_prefix: 'picspy_output', images: ['8', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' },
    },
  },
  null,
  2
)

const result = await col.updateOne(
  { _id: post._id },
  { $set: { workflowJson: sampleWorkflow } }
)

console.log(`✅ Injected workflowJson → modifiedCount: ${result.modifiedCount}`)
console.log(`   Post ID  : ${post._id.toString()}`)
console.log(`   Caption  : ${post.caption || '(none)'}`)

await mongoose.disconnect()
process.exit(0)
