import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }), 'posts');

const post = await Post.findById('6a402331472292d129f6b075').lean();

if (post) {
  console.log('Post found!');
  console.log('Title:', post.title || post.caption);
  console.log('isPremium:', post.isPremium);
  console.log('generatedImages:', JSON.stringify(post.generatedImages, null, 2));
  console.log('sourceImages:', JSON.stringify(post.sourceImages, null, 2));
} else {
  console.log('Post 6a402331472292d129f6b075 not found!');
}

await mongoose.disconnect();
console.log('Disconnected');
