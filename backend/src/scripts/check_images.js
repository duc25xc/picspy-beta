import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const posts = await Post.find().limit(10).lean();
  posts.forEach((p, idx) => {
    console.log(`[Post ${idx + 1}] ID: ${p._id}, caption: ${p.caption}`);
    console.log(`- keys:`, Object.keys(p));
    console.log(`- images:`, p.images);
    console.log(`- generatedImages:`, p.generatedImages);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
