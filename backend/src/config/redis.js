import Redis from 'ioredis'

// Upstash dùng rediss:// (TLS) — ioredis tự detect và bật TLS
// Cần tắt enableOfflineQueue để tránh queue chồng chất khi offline
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const isTLS = redisUrl.startsWith('rediss://')

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  // TLS config bắt buộc khi dùng Upstash (rediss://)
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries. Caching/Queue sẽ bị vô hiệu.')
      return null // Dừng retry — không crash server
    }
    return Math.min(times * 500, 2000)
  },
  // Không queue commands khi offline — trả lỗi ngay để fallback xử lý được
  enableOfflineQueue: false,
})

redis.on('connect', () => console.log('✅ Redis connected:', isTLS ? 'Upstash (TLS)' : 'Local'))
redis.on('error', (err) => {
  // Chỉ log message, không log stack trace spam
  if (!err.message.includes('ECONNREFUSED')) {
    console.error('❌ Redis error:', err.message)
  }
})

// Kết nối — bắt lỗi để server không crash khi Redis unavailable
await redis.connect().catch((err) => {
  console.error('❌ Redis connect failed:', err.message)
})

export default redis
