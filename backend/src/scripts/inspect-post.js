import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const post = await Post.findById('69d49b6cbb2bf5bd28778b68').lean();
  console.log('Full Post:', JSON.stringify(post, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
