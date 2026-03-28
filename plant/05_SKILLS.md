# 🧠 PicSpy — Skills & Technical Knowledge Guide

> Những gì bạn sẽ học và thực hành trong dự án này

---

## 1. Authentication — JWT + Refresh Token Rotation

### Kiến thức cần nắm

- Access token vs Refresh token khác gì nhau
- httpOnly cookie là gì và tại sao an toàn hơn localStorage
- Token rotation: mỗi lần refresh → invalidate token cũ

### Implementation

```js
// server/src/services/auth.service.js

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  })

  const refreshToken = jwt.sign(
    { userId, version: Date.now() }, // version để phân biệt token cũ/mới
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  return { accessToken, refreshToken }
}

const rotateRefreshToken = async (oldRefreshToken, res) => {
  // 1. Verify token cũ
  const payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET)

  // 2. Kiểm tra trong Redis
  const storedHash = await redis.get(`session:refresh:${payload.userId}`)
  const isValid = await bcrypt.compare(oldRefreshToken, storedHash)

  if (!isValid) {
    // Token reuse detected → logout toàn bộ
    await redis.del(`session:refresh:${payload.userId}`)
    throw new Error('REFRESH_TOKEN_REUSE_DETECTED')
  }

  // 3. Tạo token mới
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    payload.userId
  )

  // 4. Lưu hash của token mới vào Redis
  const hash = await bcrypt.hash(newRefreshToken, 10)
  await redis.setex(`session:refresh:${payload.userId}`, 7 * 24 * 3600, hash)

  // 5. Set cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  return accessToken
}
```

**Khó khăn thường gặp:**

- Quên set `secure: true` trong production → cookie bị lộ qua HTTP
- Không xử lý concurrent refresh requests → race condition tạo nhiều token

---

## 2. Image Processing Pipeline — BullMQ

### Kiến thức cần nắm

- Job Queue là gì và tại sao không xử lý sync
- BullMQ: Producer, Consumer, Worker
- Dead letter queue: xử lý job fail

### Implementation

```js
// server/src/workers/imageProcessor.worker.js
import { Worker } from 'bullmq'
import Vibrant from 'node-vibrant'
import { encode } from 'blurhash'
import sharp from 'sharp'

const imageWorker = new Worker(
  'image-processing',
  async (job) => {
    const { postId, imageUrl } = job.data

    try {
      // 1. Download ảnh
      const imageBuffer = await downloadImage(imageUrl)

      // 2. Resize
      await job.updateProgress(20)
      const thumbnail = await sharp(imageBuffer).resize(400).webp().toBuffer()
      const preview = await sharp(imageBuffer).resize(1200).webp().toBuffer()

      // 3. Upload các size lên Cloudinary
      await job.updateProgress(40)
      const [thumbUrl, previewUrl] = await Promise.all([
        uploadToCloudinary(thumbnail, `${postId}_thumb`),
        uploadToCloudinary(preview, `${postId}_preview`),
      ])

      // 4. Extract color palette
      await job.updateProgress(60)
      const palette = await Vibrant.from(imageBuffer).getPalette()
      const colorPalette = Object.values(palette)
        .filter(Boolean)
        .map((swatch) => swatch.hex)

      // 5. Generate blurHash
      await job.updateProgress(70)
      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })
      const blurHash = encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        4,
        4
      )

      // 6. NSFW Detection
      await job.updateProgress(80)
      const nsfwScore = await checkNSFW(imageUrl) // Sightengine API

      // 7. Update post
      await job.updateProgress(90)
      const status =
        nsfwScore > 0.8 ? 'rejected' : nsfwScore > 0.4 ? 'pending' : 'approved'

      await Post.findByIdAndUpdate(postId, {
        thumbnailUrl: thumbUrl,
        previewUrl,
        colorPalette,
        blurHash,
        nsfwScore,
        isNSFW: nsfwScore > 0.4,
        status,
      })

      // 8. Notify creator
      await job.updateProgress(100)
      socketServer.to(`user:${post.authorId}`).emit('notification', {
        type: status === 'approved' ? 'post_approved' : 'post_rejected',
        postId,
      })
    } catch (error) {
      // Job fail → BullMQ tự retry theo config
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 3, // xử lý 3 job cùng lúc
    limiter: { max: 10, duration: 1000 }, // max 10 job/giây
  }
)

// Retry config
const imageQueue = new Queue('image-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})
```

---

## 3. Feed Ranking — Hacker News Algorithm

```js
// server/src/workers/scoreUpdater.worker.js
// Chạy mỗi giờ bằng cron job

const updateScores = async () => {
  const posts = await Post.find({ status: 'approved' }).select(
    '_id stats createdAt isFeatured isSponsored'
  )

  const bulkOps = posts.map((post) => {
    const ageInHours = (Date.now() - post.createdAt) / 3600000

    const interactions =
      post.stats.likesCount * 3 +
      post.stats.downloadsCount * 5 +
      post.stats.commentsCount * 2 +
      post.stats.viewsCount * 0.1

    let score = interactions / Math.pow(ageInHours + 2, 1.5)

    // Boost cho featured và sponsored
    if (post.isFeatured) score *= 2
    if (post.isSponsored) score *= 3

    return {
      updateOne: {
        filter: { _id: post._id },
        update: { $set: { score } },
      },
    }
  })

  await Post.bulkWrite(bulkOps)

  // Cập nhật Redis cache
  await redis.del('feed:hot')
  const topPosts = await Post.find({ status: 'approved' })
    .sort({ score: -1 })
    .limit(100)
    .select('_id score')

  const pipeline = redis.pipeline()
  topPosts.forEach((p) => pipeline.zadd('feed:hot', p.score, p._id.toString()))
  pipeline.expire('feed:hot', 300) // 5 phút
  await pipeline.exec()
}
```

---

## 4. Coin Transaction — Atomic & Race-condition Safe

```js
// server/src/services/coin.service.js

const downloadPremiumPost = async (userId, postId) => {
  const session = await mongoose.startSession()

  // Redis lock để tránh concurrent requests
  const lockKey = `coinlock:${userId}`
  const locked = await redis.set(lockKey, '1', { NX: true, EX: 5 })
  if (!locked) throw new AppError('PROCESSING', 'Đang xử lý, vui lòng thử lại')

  try {
    let result
    await session.withTransaction(async () => {
      const post = await Post.findById(postId).session(session)
      if (!post?.isPremium)
        throw new AppError('NOT_PREMIUM', 'Ảnh này miễn phí')

      const required = post.priceInCoins

      // Atomic: trừ xu chỉ khi đủ
      const user = await User.findOneAndUpdate(
        { _id: userId, coinBalance: { $gte: required } },
        { $inc: { coinBalance: -required } },
        { session, new: true }
      )
      if (!user) throw new AppError('INSUFFICIENT_COINS', 'Không đủ xu')

      // Cộng xu cho creator (70%)
      const creatorEarns = Math.floor(required * 0.7)
      await User.findByIdAndUpdate(
        post.authorId,
        { $inc: { coinBalance: creatorEarns, totalEarned: creatorEarns } },
        { session }
      )

      // Ghi transaction records
      await Transaction.insertMany(
        [
          {
            userId,
            type: 'spend_download',
            amount: -required,
            balanceBefore: user.coinBalance + required,
            balanceAfter: user.coinBalance,
            relatedPostId: postId,
          },
          {
            userId: post.authorId,
            type: 'earn_download_premium',
            amount: creatorEarns,
            relatedPostId: postId,
            relatedUserId: userId,
          },
        ],
        { session }
      )

      // Update stats
      await Post.findByIdAndUpdate(
        postId,
        {
          $inc: { 'stats.downloadsCount': 1, totalCoinsEarned: required },
        },
        { session }
      )

      // Tạo signed download URL
      const downloadUrl = cloudinary.url(post.images[0].publicId, {
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        resource_type: 'image',
      })

      result = {
        downloadUrl,
        coinsSpent: required,
        creatorEarned: creatorEarns,
      }
    })

    return result
  } finally {
    await redis.del(lockKey)
    await session.endSession()
  }
}
```

---

## 5. Color Search — Euclidean Distance

```js
// server/src/services/search.service.js

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

const colorDistance = (hex1, hex2) => {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  if (!c1 || !c2) return Infinity
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  )
}

const searchByColor = async (targetHex, limit = 20) => {
  const THRESHOLD = 60 // khoảng cách màu tối đa chấp nhận

  // Lấy posts có status approved
  // Với dataset nhỏ (<100k posts): filter trong app
  // Với dataset lớn: cần vector database (MongoDB Atlas Vector Search)
  const posts = await Post.find({ status: 'approved' }).select(
    '_id colorPalette stats score'
  )

  const results = posts
    .map((post) => {
      const minDist = Math.min(
        ...post.colorPalette.map((c) => colorDistance(targetHex, c))
      )
      return { post, distance: minDist }
    })
    .filter(({ distance }) => distance <= THRESHOLD)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ post }) => post)

  return results
}
```

---

## 6. Real-time với Socket.io

```js
// server/src/socket/index.js

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL },
    transports: ['websocket', 'polling'],
  })

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = payload.userId
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    // Join personal room
    socket.join(`user:${socket.userId}`)

    // Track online status
    await redis.setex(`online:${socket.userId}`, 30, '1')

    // Ping để giữ online status
    const pingInterval = setInterval(async () => {
      await redis.setex(`online:${socket.userId}`, 30, '1')
    }, 20000)

    socket.on('disconnect', () => {
      clearInterval(pingInterval)
    })
  })

  return io
}

// Dùng ở bất kỳ đâu trong server
export const sendNotification = async (io, recipientId, data) => {
  // Lưu vào DB
  const notif = await Notification.create({
    recipientId,
    ...data,
  })

  // Emit real-time nếu user đang online
  const isOnline = await redis.exists(`online:${recipientId}`)
  if (isOnline) {
    io.to(`user:${recipientId}`).emit('notification', notif)
  }
}
```

---

## 7. Security Checklist

```
✅ Helmet.js (security headers)
✅ CORS configured (chỉ allow CLIENT_URL)
✅ Rate limiting (express-rate-limit)
✅ Input validation (Zod schema)
✅ XSS prevention (sanitize-html cho caption/comment)
✅ SQL/NoSQL injection: Mongoose tự escape, không dùng $where
✅ JWT stored in httpOnly cookie (không localStorage)
✅ Cloudinary signed URLs cho premium download
✅ Environment variables (.env, không commit lên Git)
✅ MongoDB: không expose _id pattern, dùng lean() khi chỉ đọc
✅ File upload: validate MIME type server-side (không tin client)
✅ HTTPS only trong production
```

---

## 8. Những điều sẽ hỏi trong phỏng vấn từ project này

| Câu hỏi                                | Trả lời từ project                                        |
| -------------------------------------- | --------------------------------------------------------- |
| "Em xử lý concurrent request thế nào?" | Redis lock + MongoDB transaction trong coin system        |
| "Em tối ưu performance thế nào?"       | Redis cache feed, cursor pagination, denormalized stats   |
| "Em biết gì về job queue?"             | BullMQ worker cho image processing                        |
| "Em handle real-time thế nào?"         | Socket.io với room-based events                           |
| "Em authenticate thế nào?"             | JWT + Refresh token rotation, httpOnly cookie             |
| "Em thiết kế database thế nào?"        | Explain schema, index strategy, denormalization tradeoffs |
| "Em deploy app thế nào?"               | Docker + Railway/VPS + Nginx + PM2 + CI/CD                |
| "Em xử lý file upload thế nào?"        | Multer → Cloudinary → BullMQ async processing             |
