import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import AuditLog from '../models/AuditLog.model.js';
import Category from '../models/Category.model.js';
import Comment from '../models/Comment.model.js';
import Follow from '../models/Follow.model.js';
import Interaction from '../models/Interaction.model.js';
import Notification from '../models/Notification.model.js';
import Otp from '../models/Otp.model.js';
import Post from '../models/Post.model.js';
import PostAnalysis from '../models/PostAnalysis.model.js';
import RemixSession from '../models/RemixSession.model.js';
import Report from '../models/Report.model.js';
import Settings from '../models/Settings.model.js';
import SubscriptionPlan from '../models/SubscriptionPlan.model.js';
import TokenTransaction from '../models/TokenTransaction.model.js';
import User from '../models/User.model.js';
import UserUnlock from '../models/UserUnlock.model.js';
import VndTransaction from '../models/VndTransaction.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

const MODELS_MAP = {
  posts: Post,
  users: User,
  categories: Category,
  comments: Comment,
  auditlogs: AuditLog,
  follows: Follow,
  interactions: Interaction,
  notifications: Notification,
  otps: Otp,
  postanalyses: PostAnalysis,
  remixsessions: RemixSession,
  reports: Report,
  settings: Settings,
  subscriptionplans: SubscriptionPlan,
  tokentransactions: TokenTransaction,
  userunlocks: UserUnlock,
  vndtransactions: VndTransaction
};

function getTopLevelKeys(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj);
}

function getSchemaTopLevelKeys(schema) {
  const keys = new Set();
  schema.eachPath((pathName) => {
    const topKey = pathName.split('.')[0];
    if (topKey && topKey !== '__v') {
      keys.add(topKey);
    }
  });
  return Array.from(keys);
}

async function main() {
  console.log('📦 Connecting to MongoDB for Schema Comparison...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const comparisonResult = {};

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const model = MODELS_MAP[colName];

    if (!model) {
      comparisonResult[colName] = {
        status: 'Unmapped Collection (No corresponding local Mongoose model)',
        count: await db.collection(colName).countDocuments()
      };
      continue;
    }

    const schemaKeys = getSchemaTopLevelKeys(model.schema);
    const rawDocs = await db.collection(colName).find({}).limit(200).toArray();
    const totalDocs = await db.collection(colName).countDocuments();

    const dbKeysOccurrence = {};
    for (const doc of rawDocs) {
      const docKeys = getTopLevelKeys(doc);
      for (const k of docKeys) {
        dbKeysOccurrence[k] = (dbKeysOccurrence[k] || 0) + 1;
      }
    }

    const dbFoundKeys = Object.keys(dbKeysOccurrence);

    const schemaMissingInDb = schemaKeys.filter(k => !dbFoundKeys.includes(k));
    const legacyFieldsInDb = dbFoundKeys.filter(k => k !== '__v' && !schemaKeys.includes(k));
    const matchedFields = schemaKeys.filter(k => dbFoundKeys.includes(k));

    const matchedCoverage = {};
    for (const k of matchedFields) {
      const count = dbKeysOccurrence[k] || 0;
      const rate = rawDocs.length > 0 ? ((count / rawDocs.length) * 100).toFixed(1) : '0';
      matchedCoverage[k] = `${rate}% (${count}/${rawDocs.length})`;
    }

    comparisonResult[colName] = {
      modelName: model.modelName,
      totalDocsInDb: totalDocs,
      sampledDocs: rawDocs.length,
      schemaKeysCount: schemaKeys.length,
      dbFoundKeysCount: dbFoundKeys.length,
      matchedFieldsCount: matchedFields.length,
      matchedFieldsCoverage: matchedCoverage,
      schemaMissingInDb, // Defined in Mongoose model but 0% present in DB documents
      legacyFieldsInDb // Found in MongoDB documents but removed/not defined in Mongoose Schema
    };
  }

  const outputPath = path.join(__dirname, '../logs/schema_vs_db_comparison.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(comparisonResult, null, 2));

  console.log(`✅ Schema vs Database comparison complete! Results saved to ${outputPath}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Comparison script error:', err);
  process.exit(1);
});
