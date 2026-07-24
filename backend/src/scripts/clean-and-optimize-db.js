import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Post from '../models/Post.model.js';
import User from '../models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;
const isApplyFix = process.argv.includes('--apply-fix');

async function main() {
  console.log(`🧹 Running Data Cleanup & Optimization Tool (${isApplyFix ? '⚡ EXECUTE FIX MODE' : '👀 DRY-RUN MODE'})...\n`);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Backfill missing default fields on Posts
  console.log('--- Step 1: Checking Post defaults & missing field backfills ---');
  const postsCollection = db.collection('posts');

  const pendingTypeCount = await postsCollection.countDocuments({ postType: { $exists: false } });
  const pendingStatsCount = await postsCollection.countDocuments({ stats: { $exists: false } });
  const pendingAccessTierCount = await postsCollection.countDocuments({ accessTier: { $exists: false } });

  console.log(`- Posts missing 'postType': ${pendingTypeCount}`);
  console.log(`- Posts missing 'stats': ${pendingStatsCount}`);
  console.log(`- Posts missing 'accessTier': ${pendingAccessTierCount}`);

  if (isApplyFix) {
    if (pendingTypeCount > 0) {
      await postsCollection.updateMany({ postType: { $exists: false } }, { $set: { postType: 'ai' } });
      console.log(`  ✅ Backfilled 'postType: "ai"' for ${pendingTypeCount} posts`);
    }
    if (pendingStatsCount > 0) {
      await postsCollection.updateMany({ stats: { $exists: false } }, {
        $set: {
          stats: { viewsCount: 0, likesCount: 0, downloadsCount: 0, commentsCount: 0, bookmarksCount: 0, sharesCount: 0 }
        }
      });
      console.log(`  ✅ Backfilled default 'stats' for ${pendingStatsCount} posts`);
    }
    if (pendingAccessTierCount > 0) {
      await postsCollection.updateMany({ accessTier: { $exists: false } }, { $set: { accessTier: 'free' } });
      console.log(`  ✅ Backfilled 'accessTier: "free"' for ${pendingAccessTierCount} posts`);
    }
  }

  // 2. Unset legacy obsolete fields if any exist
  console.log('\n--- Step 2: Checking Legacy Obsolete Fields ---');
  const legacyTokenPosts = await postsCollection.countDocuments({ totalTokensEarned: { $exists: true } });
  console.log(`- Posts containing legacy 'totalTokensEarned' field: ${legacyTokenPosts}`);

  if (isApplyFix && legacyTokenPosts > 0) {
    // Optionally preserve or unset
    console.log(`  ℹ️ Keeping 'totalTokensEarned' for backwards compatibility (or use $unset if requested).`);
  }

  // 3. User defaults
  console.log('\n--- Step 3: Checking User defaults ---');
  const usersCollection = db.collection('users');
  const pendingUserStatus = await usersCollection.countDocuments({ status: { $exists: false } });
  console.log(`- Users missing 'status': ${pendingUserStatus}`);

  if (isApplyFix && pendingUserStatus > 0) {
    await usersCollection.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
    console.log(`  ✅ Backfilled 'status: "active"' for ${pendingUserStatus} users`);
  }

  console.log('\n==================================================');
  if (!isApplyFix) {
    console.log('💡 Dry-run finished. To apply these fixes to the database, run:');
    console.log('   node src/scripts/clean-and-optimize-db.js --apply-fix');
  } else {
    console.log('🎉 Cleanup and optimization executed successfully!');
  }
  console.log('==================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Cleanup script error:', err);
  process.exit(1);
});
