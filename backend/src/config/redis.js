import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Lazy connect để không crash nếu Redis chưa sẵn sàng
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries')
      return null
    }
    return Math.min(times * 500, 2000)
  },
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err) => console.error('❌ Redis error:', err.message))

// Kết nối
await redis.connect().catch(() => {})

export default redis
