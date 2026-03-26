import { Queue } from 'bullmq'
import redis from './redis.js'

// Queue cho xử lý ảnh async sau khi upload
export const imageQueue = new Queue('image-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Giữ 100 completed jobs gần nhất
    removeOnFail: 50,
  },
})

// Queue cho gửi email
export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 20,
    removeOnFail: 10,
  },
})
