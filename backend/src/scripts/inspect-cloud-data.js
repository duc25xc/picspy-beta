import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL;

function getType(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val instanceof Date) return 'Date';
  if (Array.isArray(val)) return 'Array';
  if (val && typeof val === 'object' && val._bsontype === 'ObjectID') return 'ObjectId';
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ObjectId') return 'ObjectId';
  return typeof val;
}

function extractFieldStructure(obj, prefix = '') {
  const fields = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    return fields;
  }
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    const type = getType(val);
    fields[fullKey] = type;
    if (type === 'object') {
      const nested = extractFieldStructure(val, fullKey);
      Object.assign(fields, nested);
    } else if (type === 'Array' && val.length > 0) {
      const elemTypes = [...new Set(val.map(getType))].join('|');
      fields[`${fullKey}[]`] = elemTypes;
      if (val[0] && typeof val[0] === 'object' && !(val[0] instanceof Date)) {
        const nestedArr = extractFieldStructure(val[0], `${fullKey}[]`);
        Object.assign(fields, nestedArr);
      }
    }
  }
  return fields;
}

async function inspectMongoDB() {
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const report = {};

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const collection = db.collection(colName);
    const totalDocs = await collection.countDocuments();
    const sampleDocs = await collection.find({}).limit(100).toArray();

    const fieldStats = {};

    for (const doc of sampleDocs) {
      const struct = extractFieldStructure(doc);
      for (const [fKey, fType] of Object.entries(struct)) {
        if (!fieldStats[fKey]) {
          fieldStats[fKey] = { types: new Set(), count: 0 };
        }
        fieldStats[fKey].types.add(fType);
        fieldStats[fKey].count += 1;
      }
    }

    const fieldSummary = {};
    for (const [fKey, data] of Object.entries(fieldStats)) {
      fieldSummary[fKey] = {
        types: Array.from(data.types),
        occurrenceRate: `${((data.count / sampleDocs.length) * 100).toFixed(1)}%`,
        sampleCount: data.count
      };
    }

    report[colName] = {
      totalDocs,
      sampledDocs: sampleDocs.length,
      fields: fieldSummary
    };
  }

  return report;
}

async function inspectCloudinary() {
  console.log('☁️ Checking Cloudinary...');
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    return { status: 'Not configured or missing environment variables' };
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  try {
    const pingRes = await cloudinary.api.ping();
    const subfolders = await cloudinary.api.root_folders().catch(() => ({ folders: [] }));
    const sampleResources = await cloudinary.api.resources({ max_results: 30 }).catch(() => ({ resources: [] }));

    return {
      status: 'Connected',
      ping: pingRes,
      folders: subfolders.folders ? subfolders.folders.map(f => f.name) : [],
      totalSampleAssetsFetched: sampleResources.resources ? sampleResources.resources.length : 0,
      sampleAssets: (sampleResources.resources || []).map(r => ({
        public_id: r.public_id,
        format: r.format,
        bytes: r.bytes,
        created_at: r.created_at,
        url: r.secure_url
      }))
    };
  } catch (err) {
    return { status: 'Error', error: err.message };
  }
}

async function inspectRedis() {
  console.log('🔴 Checking Redis...');
  if (!REDIS_URL) return { status: 'Not configured' };

  try {
    const isTLS = REDIS_URL.startsWith('rediss://');
    const redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      tls: isTLS ? { rejectUnauthorized: false } : undefined,
      enableOfflineQueue: false,
      connectTimeout: 4000
    });

    await redis.connect().catch(() => {});
    if (redis.status !== 'ready' && redis.status !== 'connect') {
      return { status: 'Disconnected or Timeout' };
    }

    const infoStr = await redis.info().catch(() => '');
    const keys = await redis.keys('*').catch(() => []);

    const keyTypes = {};
    for (const key of keys.slice(0, 50)) {
      const kType = await redis.type(key).catch(() => 'unknown');
      keyTypes[key] = kType;
    }

    redis.disconnect();

    return {
      status: 'Connected',
      totalKeys: keys.length,
      sampleKeys: keyTypes,
      infoSummary: infoStr.split('\n').filter(l => l.includes('used_memory_human') || l.includes('connected_clients') || l.includes('redis_version'))
    };
  } catch (err) {
    return { status: 'Error', error: err.message };
  }
}

async function main() {
  console.log('🚀 Executing Cloud Data Structure Inspection...');
  const mongoReport = await inspectMongoDB();
  const cloudinaryReport = await inspectCloudinary();
  const redisReport = await inspectRedis();

  const fullReport = {
    timestamp: new Date().toISOString(),
    mongodb: mongoReport,
    cloudinary: cloudinaryReport,
    redis: redisReport
  };

  const outputJsonPath = path.join(__dirname, '../logs/cloud_data_structure.json');
  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
  fs.writeFileSync(outputJsonPath, JSON.stringify(fullReport, null, 2));

  console.log(`✅ MongoDB, Cloudinary & Redis data structure successfully output to ${outputJsonPath}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Inspection script error:', err);
  process.exit(1);
});
