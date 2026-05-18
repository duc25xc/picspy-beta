import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, 'backend/.env') })

const postSchema = new mongoose.Schema({}, { strict: false })
const Post = mongoose.models.Post || mongoose.model('Post', postSchema, 'posts')

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const post = await Post.findOne({ status: 'approved' }).sort({ _id: -1 }).lean()
  if (!post) { console.log('No approved post found'); process.exit(1) }

  const sampleWorkflow = JSON.stringify({
    '4': { inputs: { ckpt_name: 'v1-5-pruned-emaonly.ckpt' }, class_type: 'CheckpointLoaderSimple' },
    '6': { inputs: { text: (post.prompt || 'a beautiful scene').slice(0, 100), clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
    '7': { inputs: { text: 'ugly, blurry, watermark, low quality', clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
    '3': { inputs: { seed: 42, steps: 20, cfg: 7, sampler_name: 'euler', scheduler: 'normal', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] }, class_type: 'KSampler' },
    '5': { inputs: { width: 512, height: 768, batch_size: 1 }, class_type: 'EmptyLatentImage' },
    '8': { inputs: { samples: ['3', 0], vae: ['4', 2] }, class_type: 'VAEDecode' },
    '9': { inputs: { filename_prefix: 'picspy_output', images: ['8', 0] }, class_type: 'SaveImage' }
  }, null, 2)

  await Post.updateOne({ _id: post._id }, { $set: { workflowJson: sampleWorkflow } })
  console.log('✅ Injected workflowJson into post:', post._id.toString(), '-', post.caption || '(no caption)')
  process.exit(0)
}).catch(e => { console.error('❌', e.message); process.exit(1) })
