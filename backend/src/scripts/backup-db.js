import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  console.log('📦 Starting Full MongoDB Database Backup...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const backupData = {
    backupTimestamp: new Date().toISOString(),
    databaseName: db.databaseName,
    collections: {}
  };

  for (const colInfo of collections) {
    const colName = colInfo.name;
    console.log(`  └─ Backing up collection: ${colName}...`);
    const docs = await db.collection(colName).find({}).toArray();
    backupData.collections[colName] = docs;
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `mongodb_backup_${timestampStr}.json`;
  const backupPath = path.join(__dirname, `../logs/${backupFileName}`);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

  console.log(`\n🎉 Full Backup Completed Successfully!`);
  console.log(`📁 File location: ${backupPath}`);
  console.log(`📊 Summary: Backed up ${Object.keys(backupData.collections).length} collections.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Backup script error:', err);
  process.exit(1);
});
