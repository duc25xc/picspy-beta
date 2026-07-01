import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const query = { status: 'approved', postType: 'ai' };
  console.log('Query:', query);

  const posts = await Post.find(query).select('_id caption postType status').lean();
  console.log(`Matching posts count: ${posts.length}`);
  posts.forEach(p => {
    console.log(`- ${p._id}: ${p.caption} (${p.postType})`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
