import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanupSyntheticTestData() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const testUsers = await db
    .collection('users')
    .find({ mobile: { $in: ['9111111111', '9222222222'] } })
    .toArray();

  console.log('\n====================================================');
  console.log('       SYNTHETIC TEST RUNNER USERS TO CLEAN UP       ');
  console.log('====================================================');

  if (testUsers.length === 0) {
    console.log('No synthetic test users found in database.');
    await mongoose.disconnect();
    return;
  }

  testUsers.forEach((u) => {
    console.log(`• Test User ID: ${u._id.toString()} | Owner: ${u.ownerName} | Mobile: ${u.mobile}`);
  });

  const testUserIds = testUsers.map((u) => u._id);

  const collections = [
    'categories',
    'companies',
    'units',
    'products',
    'productbatches',
    'customers',
    'customerpayments',
    'suppliers',
    'supplierledgers',
    'purchases',
    'purchaseitems',
    'stockledgers',
    'salesinvoices',
    'shopsettings',
    'shopdiscounts',
  ];

  console.log('\n====================================================');
  console.log('    SYNTHETIC RECORD COUNTS (BEFORE DELETION)        ');
  console.log('====================================================');

  let totalSyntheticDocs = 0;
  const countsPerCollection = {};

  for (const cName of collections) {
    const count = await db.collection(cName).countDocuments({ userId: { $in: testUserIds } });
    countsPerCollection[cName] = count;
    console.log(`${cName.padEnd(20)}: ${count} records`);
    totalSyntheticDocs += count;
  }

  console.log(`Users Collection    : ${testUsers.length} records`);
  totalSyntheticDocs += testUsers.length;

  console.log(`\nTOTAL SYNTHETIC TEST DOCUMENTS TO DELETE: ${totalSyntheticDocs}`);

  console.log('\n====================================================');
  console.log('      EXECUTING SAFE DELETION OF TEST DATA ONLY     ');
  console.log('====================================================');

  for (const cName of collections) {
    const res = await db.collection(cName).deleteMany({ userId: { $in: testUserIds } });
    console.log(`✓ Deleted ${res.deletedCount} test records from '${cName}'`);
  }

  const userRes = await db.collection('users').deleteMany({ mobile: { $in: ['9111111111', '9222222222'] } });
  console.log(`✓ Deleted ${userRes.deletedCount} synthetic test users from 'users'`);

  console.log('\n====================================================');
  console.log('   VERIFYING CLEANUP IN MANDHI_ERP DATABASE         ');
  console.log('====================================================');

  const remainingUsers = await db.collection('users').find({}).toArray();
  console.log('Remaining Active Users:');
  remainingUsers.forEach((u) => {
    console.log(`• User ID: ${u._id.toString()} | Owner: ${u.ownerName} | Mobile: ${u.mobile}`);
  });

  let remainingSynthetic = 0;
  for (const cName of collections) {
    const rem = await db.collection(cName).countDocuments({ userId: { $in: testUserIds } });
    if (rem > 0) remainingSynthetic += rem;
  }

  if (remainingSynthetic === 0) {
    console.log('\n✅ PASS: Database mandhi_erp cleanly scrubbed of synthetic test data!');
  } else {
    console.error(`\n❌ FAIL: ${remainingSynthetic} synthetic records remain in database.`);
  }

  await mongoose.disconnect();
}

cleanupSyntheticTestData().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
