import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

// Mongoose global settings
mongoose.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v
    return ret
  },
})

export default connectDB
