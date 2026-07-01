import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Post from '../models/Post.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const posts = await Post.find({});
  console.log(`Total posts: ${posts.length}`);

  const counts = {};
  for (const post of posts) {
    const pt = post.postType || 'undefined';
    counts[pt] = (counts[pt] || 0) + 1;
    console.log(`Post: ID=${post._id}, Type=${pt}, Status=${post.status}, Tool=${post.aiTool}, Caption="${post.caption}"`);
  }

  console.log('Counts:', counts);
  await mongoose.disconnect();
}

run().catch(console.error);
