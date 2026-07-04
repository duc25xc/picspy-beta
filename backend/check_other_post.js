import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGODB_URI);

const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }), 'posts');
const post = await Post.findById('6a3ebd4b76542b070aa66ec9').lean();

if (post) {
  console.log('Post found!');
  console.log('Title:', post.title || post.caption);
  console.log('generatedImages:', JSON.stringify(post.generatedImages, null, 2));
  console.log('sourceImages:', JSON.stringify(post.sourceImages, null, 2));
} else {
  console.log('Post 6a3ebd4b76542b070aa66ec9 not found!');
}

await mongoose.connect(MONGODB_URI);
await mongoose.disconnect();
