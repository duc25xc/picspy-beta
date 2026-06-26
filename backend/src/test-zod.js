import { z } from 'zod'

const AI_TOOLS = [
  'midjourney', 'dalle-3', 'stable-diffusion', 'flux',
  'leonardo', 'firefly', 'ideogram', 'bing-creator',
  'playground', 'canva-ai', 'comfyui',
  'gemini-flash', 'gemini-think', 'gemini-pro',
  'gemini-nano-banana', 'gemini-nano-banana-pro', 'gemini-nano-banana-2',
  'chatgpt', 'deepseek', 'grok',
  'sora', 'kling', 'runway', 'pika', 'luma', 'hailuo',
  'other',
]

const createPostSchema = z.object({
  postType: z.enum(['ai', 'digital', 'digital-raw', 'digital-normal']).default('ai'),
  prompt: z.string().max(2000).trim().optional(),
  negativePrompt: z.string().max(1000).trim().optional(),
  aiTool: z.enum(AI_TOOLS).optional(),
  aiModel: z.string().trim().optional(),
  parameters: z.string().trim().optional(),
  workflowJson: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        try {
          JSON.parse(val)
          return true
        } catch {
          return false
        }
      },
      { message: 'workflowJson phải là JSON hợp lệ' }
    ),
  contentType: z.enum(['image', 'video']).default('image'),

  caption: z.string().max(500).optional(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
  category: z.string().min(1).toLowerCase().trim().default('other'),

  isPremium: z.boolean().optional().default(false),
  priceInTokens: z.number().min(1).max(500).optional().default(10),

  resolution: z.enum(['sd', 'hd', '2k', '4k']).optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  aspectRatio: z.string().optional(),
})

// Let's test with the values from frontend:
const testBody = {
  postType: 'digital',
  contentType: 'image',
  caption: 'abcd',
  tags: JSON.stringify(['portrait', 'dark']),
  category: 'minimal',
  isPremium: 'false',
  priceInTokens: '10',
  resolution: 'hd',
  orientation: 'landscape',
  aspectRatio: '16:9'
}

// Emulate backend preprocessing:
const body = { ...testBody }
if (typeof body.tags === 'string') {
  try { body.tags = JSON.parse(body.tags) }
  catch { body.tags = body.tags.split(',').map(t => t.trim()).filter(Boolean) }
}
if (typeof body.isPremium === 'string') body.isPremium = body.isPremium === 'true'
if (body.priceInTokens) body.priceInTokens = parseInt(body.priceInTokens)

try {
  const result = createPostSchema.parse(body)
  console.log('Zod validation passed successfully! Result:', result)
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('Zod validation failed! Errors:', err.errors)
  } else {
    console.error('Other error:', err)
  }
}
