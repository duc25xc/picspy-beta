import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Post, { AI_TOOLS } from '../models/Post.model.js';
import User from '../models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

const AI_TOOL_MAPPING = {
  'gemini-flash': 'gemini-nano-banana-pro',
  'gemini-pro': 'gemini-nano-banana-2',
  'gemini-nano-banana': 'gemini-nano-banana-pro',
  'other': 'picspy',
  'deepseek': 'picspy',
  'canva-ai': 'picspy'
};

async function main() {
  console.log('⚡ Starting Database Field Synchronization & Sanitize Process...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Unset legacy fields on Posts
  console.log('\n--- 1. Cleaning Legacy Fields from Posts ---');
  const postsCol = db.collection('posts');
  const unsetResult = await postsCol.updateMany(
    {},
    {
      $unset: {
        images: '',
        isAIGenerated: '',
        priceInCoins: '',
        totalCoinsEarned: '',
        priceInTokens: '',
        isPublic: ''
      }
    }
  );
  console.log(`  ✅ Unset legacy post fields across ${unsetResult.modifiedCount} documents.`);

  // 2. Fix Invalid AI Tools
  console.log('\n--- 2. Mapping & Normalizing Invalid AI Tools ---');
  for (const [invalidTool, validTool] of Object.entries(AI_TOOL_MAPPING)) {
    const res = await postsCol.updateMany(
      { aiTool: invalidTool },
      { $set: { aiTool: validTool } }
    );
    if (res.modifiedCount > 0) {
      console.log(`  ✅ Mapped invalid aiTool "${invalidTool}" -> "${validTool}" (${res.modifiedCount} posts updated)`);
    }
  }

  // 3. Backfill missing defaults on Posts
  console.log('\n--- 3. Backfilling Missing Default Post Fields ---');
  await postsCol.updateMany({ accessTier: { $exists: false } }, { $set: { accessTier: 'free' } });
  await postsCol.updateMany({ postType: { $exists: false } }, { $set: { postType: 'ai' } });
  await postsCol.updateMany({ isNSFW: { $exists: false } }, { $set: { isNSFW: false } });
  await postsCol.updateMany({ isFeatured: { $exists: false } }, { $set: { isFeatured: false } });
  await postsCol.updateMany({ isTrending: { $exists: false } }, { $set: { isTrending: false } });
  await postsCol.updateMany({ isSponsored: { $exists: false } }, { $set: { isSponsored: false } });
  console.log(`  ✅ Post default fields backfilled successfully.`);

  // 4. Unset legacy fields from Users & backfill status
  console.log('\n--- 4. Cleaning Users Collection ---');
  const usersCol = db.collection('users');
  await usersCol.updateMany(
    {},
    {
      $unset: {
        coinBalance: '',
        isBot: ''
      }
    }
  );
  await usersCol.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
  console.log(`  ✅ User collection cleaned & status backfilled.`);

  // 5. Unset legacy settings
  console.log('\n--- 5. Cleaning Settings Collection ---');
  const settingsCol = db.collection('settings');
  await settingsCol.updateMany({}, { $unset: { borderStyle: '' } });
  console.log(`  ✅ Settings collection cleaned.`);

  console.log('\n🎉 Database Field Synchronization & Sanitize Completed!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Sync script error:', err);
  process.exit(1);
});
