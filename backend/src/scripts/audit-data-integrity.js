import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import Post, { AI_TOOLS } from '../models/Post.model.js';
import User from '../models/User.model.js';
import Category from '../models/Category.model.js';
import Comment from '../models/Comment.model.js';
import Interaction from '../models/Interaction.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function auditPosts() {
  console.log('🔍 Auditing Posts collection...');
  const posts = await Post.find({}).lean();
  const validUserIds = new Set((await User.find({}, '_id').lean()).map(u => u._id.toString()));
  const validPostIds = new Set(posts.map(p => p._id.toString()));

  const issues = {
    totalPosts: posts.length,
    missingPostType: [],
    invalidAiTool: [],
    missingGeneratedImages: [],
    missingHistograms: [],
    missingBlurHash: [],
    brokenAuthorRef: [],
    brokenParentPostRef: [],
    invalidEnumStatus: []
  };

  const VALID_POST_TYPES = ['ai', 'digital-raw', 'digital-normal'];
  const VALID_STATUSES = ['pending', 'approved', 'rejected', 'hidden'];

  for (const post of posts) {
    const pId = post._id.toString();

    // 1. Post Type
    if (!post.postType || !VALID_POST_TYPES.includes(post.postType)) {
      issues.missingPostType.push({ id: pId, postType: post.postType });
    }

    // 2. AI Tool
    if (post.postType === 'ai' || post.aiTool) {
      if (post.aiTool && !AI_TOOLS.includes(post.aiTool)) {
        issues.invalidAiTool.push({ id: pId, aiTool: post.aiTool });
      }
    }

    // 3. Generated Images
    if (!post.generatedImages || !Array.isArray(post.generatedImages) || post.generatedImages.length === 0) {
      issues.missingGeneratedImages.push(pId);
    }

    // 4. Histograms / BlurHash
    if (!post.histograms || post.histograms.length === 0) {
      if (!post.histogram || (!post.histogram.r || post.histogram.r.length === 0)) {
        issues.missingHistograms.push(pId);
      }
    }

    if (!post.blurHash) {
      issues.missingBlurHash.push(pId);
    }

    // 5. Foreign Keys
    if (!post.authorId || !validUserIds.has(post.authorId.toString())) {
      issues.brokenAuthorRef.push({ id: pId, authorId: post.authorId });
    }

    if (post.isRemix && post.parentPostId && !validPostIds.has(post.parentPostId.toString())) {
      issues.brokenParentPostRef.push({ id: pId, parentPostId: post.parentPostId });
    }

    // 6. Status Enum
    if (post.status && !VALID_STATUSES.includes(post.status)) {
      issues.invalidEnumStatus.push({ id: pId, status: post.status });
    }
  }

  return issues;
}

async function auditUsers() {
  console.log('🔍 Auditing Users collection...');
  const users = await User.find({}).lean();
  const issues = {
    totalUsers: users.length,
    missingRole: [],
    missingStatus: [],
    missingAvatarUrl: []
  };

  for (const user of users) {
    const uId = user._id.toString();
    if (!user.role) issues.missingRole.push(uId);
    if (!user.status) issues.missingStatus.push(uId);
    if (!user.avatarUrl && !user.avatar) issues.missingAvatarUrl.push(uId);
  }

  return issues;
}

async function main() {
  console.log('📦 Connecting to MongoDB for Integrity Audit...');
  await mongoose.connect(MONGO_URI);

  const postAudit = await auditPosts();
  const userAudit = await auditUsers();

  const fullAudit = {
    timestamp: new Date().toISOString(),
    posts: postAudit,
    users: userAudit
  };

  const outputPath = path.join(__dirname, '../logs/data_integrity_audit.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(fullAudit, null, 2));

  console.log(`✅ Data integrity audit complete! Results saved to ${outputPath}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Audit script error:', err);
  process.exit(1);
});
