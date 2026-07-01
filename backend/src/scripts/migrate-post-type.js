import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Check how many documents lack postType
  const countLacking = await Post.countDocuments({ postType: { $exists: false } });
  console.log(`Documents lacking postType: ${countLacking}`);

  if (countLacking > 0) {
    // 1. Cập nhật các bài viết digital (nơi isAIGenerated = false)
    const resDigital = await Post.updateMany(
      { postType: { $exists: false }, isAIGenerated: false },
      { $set: { postType: 'digital-normal' } }
    );
    console.log(`Digital posts updated:`, resDigital.modifiedCount);

    // 2. Cập nhật các bài viết AI (nơi isAIGenerated !== false)
    const resAI = await Post.updateMany(
      { postType: { $exists: false }, isAIGenerated: { $ne: false } },
      { $set: { postType: 'ai' } }
    );
    console.log(`AI posts updated:`, resAI.modifiedCount);
  } else {
    console.log('No documents require migration.');
  }

  // Double check how many approved AI posts we now have in MongoDB
  const approvedAiCount = await Post.countDocuments({ status: 'approved', postType: 'ai' });
  console.log(`Approved AI posts now in DB: ${approvedAiCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
