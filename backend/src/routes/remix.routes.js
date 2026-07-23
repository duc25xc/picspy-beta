import express from 'express'
import { authenticate } from '../middlewares/authenticate.js'
import { createSession, getSession, generateImage, publishRemix, purchasePost, checkPromptOnly, uploadRemixImage, suggestPrompt } from '../controllers/remix.controller.js'

import upload, { handleMulterError } from '../middlewares/upload.js'

const router = express.Router()

router.use(authenticate)

router.post('/purchase', purchasePost)
router.post('/sessions', createSession)
router.get('/sessions/:id', getSession)
router.post(
  '/sessions/:id/generate',
  upload.fields([{ name: 'sourceImage', maxCount: 1 }]),
  handleMulterError,
  generateImage
)
router.post('/sessions/:id/check-prompt', checkPromptOnly)
router.post('/sessions/:id/suggest-prompt', suggestPrompt)
router.post('/sessions/:id/publish', publishRemix)
router.post('/upload-image', upload.single('image'), handleMulterError, uploadRemixImage)

export default router
