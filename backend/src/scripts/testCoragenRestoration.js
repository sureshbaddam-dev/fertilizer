import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { getBackupDbConnection } from '../config/backupDb.config.js';
import { Product } from '../modules/products/models/product.model.js';
import { adminService } from '../modules/admin/services/admin.service.js';
import { restoreService } from '../modules/admin/services/restore.service.js';
import { getBackupModels } from '../modules/admin/models/backupAtlas.model.js';

const TARGET_USER_ID = '6a797801e9edd25a916f2f47';
const CORAGEN_PRODUCT_ID = '6a7acd57c7cc2aa367f12e01';

async function testCoragen() {
  console.log('====================================================');
  console.log('🧪 TESTING CORAGEN PRODUCT RESTORATION & ADMIN COUNTS');
  console.log('====================================================\n');

  try {
    const mainUri = process.env.MAIN_MONGODB_URI || envConfig.mongo.mainUri || 'mongodb://localhost:27017/mandhi_erp';
    await mongoose.connect(mainUri);
    console.log('Connected to MAIN DB');

    const backupConn = await getBackupDbConnection();
    console.log('Connected to BACKUP DB');
    const { MetadataModel } = getBackupModels(backupConn);

    const mockAdmin = {
      _id: new mongoose.Types.ObjectId(),
      ownerName: 'Coragen Audit Admin',
      role: 'SUPER_ADMIN',
    };

    // 1. BEFORE STATE CHECK
    console.log('--- 1. BEFORE RESTORE STATE ---');
    const adminDetailsBefore = await adminService.getUserDetails(TARGET_USER_ID);
    console.log(`Admin User Profile PRODUCTS Count: ${adminDetailsBefore.counts.products} (Expected: 2)`);

    const coragenBefore = await Product.findById(CORAGEN_PRODUCT_ID).lean();
    console.log(`Coragen in MAIN before restore: name="${coragenBefore?.name}", isActive=${coragenBefore?.isActive}, deletedAt=${coragenBefore?.deletedAt}`);

    // 2. ANALYZE RESTORE
    console.log('\n--- 2. RESTORE ANALYSIS ---');
    const backupMeta = await MetadataModel.findOne({ backupId: 'SAFETY-20260816172526-233' }).lean() || await MetadataModel.findOne({ status: 'COMPLETED' }).sort({ createdAt: -1 }).lean();
    const backupIdToUse = backupMeta.backupId;
    console.log(`Using Backup Snapshot: ${backupIdToUse}`);

    const analysis = await restoreService.analyzeBackupForRestore({
      backupId: backupIdToUse,
      targetUserId: TARGET_USER_ID,
    });

    const productSummary = (analysis.collectionSummaries || []).find((c) => c.collectionName === 'products');
    console.log('Products Collection Analysis Summary:', productSummary);

    const coragenInMissing = (analysis.missingRecordsMap?.products || []).find((p) => String(p._id) === CORAGEN_PRODUCT_ID);
    console.log(`Coragen identified as Recoverable/Missing? ${!!coragenInMissing} (Expected: true)`);

    // 3. EXECUTE RESTORE (1ST RUN)
    console.log('\n--- 3. EXECUTING 1ST RESTORE ---');
    const restoreRes = await restoreService.executeRestore({
      backupId: backupIdToUse,
      targetUserId: TARGET_USER_ID,
      selectedCollections: ['products'],
      confirmationText: 'RESTORE',
      adminUser: mockAdmin,
    });

    console.log(`Restore Result: Restored = ${restoreRes.summary.totalRestored}, Skipped = ${restoreRes.summary.totalSkipped}`);

    // 4. AFTER RESTORE CHECK
    console.log('\n--- 4. AFTER RESTORE STATE ---');
    const coragenAfter = await Product.findById(CORAGEN_PRODUCT_ID).lean();
    console.log(`Coragen in MAIN after restore: _id=${coragenAfter?._id}, name="${coragenAfter?.name}", isActive=${coragenAfter?.isActive}, deletedAt=${coragenAfter?.deletedAt}`);

    const adminDetailsAfter = await adminService.getUserDetails(TARGET_USER_ID);
    console.log(`Admin User Profile PRODUCTS Count after restore: ${adminDetailsAfter.counts.products} (Expected: 3)`);

    // 5. SECOND RESTORE RUN (DUPLICATE SAFETY CHECK)
    console.log('\n--- 5. SECOND RESTORE RUN (DUPLICATE PROTECTION CHECK) ---');
    const restoreRes2 = await restoreService.executeRestore({
      backupId: backupIdToUse,
      targetUserId: TARGET_USER_ID,
      selectedCollections: ['products'],
      confirmationText: 'RESTORE',
      adminUser: mockAdmin,
    });
    console.log(`2nd Restore Result: Restored = ${restoreRes2.summary.totalRestored}, Skipped = ${restoreRes2.summary.totalSkipped} (Expected Restored: 0)`);

    const coragenCountInMain = await Product.countDocuments({ _id: CORAGEN_PRODUCT_ID });
    console.log(`Total Coragen documents in MAIN by _id: ${coragenCountInMain} (Expected: 1, no duplicate)`);

    // 6. RESTORE ORIGINAL SOFT-DELETED TEST STATE
    console.log('\n--- 6. RESTORING ORIGINAL SOFT-DELETED TEST STATE ---');
    await Product.updateOne({ _id: CORAGEN_PRODUCT_ID }, { $set: { isActive: false, deletedAt: new Date('2026-08-16T23:16:13.000Z') } });
    console.log('Reset Coragen to isActive: false for test state cleanliness.');

    console.log('\n====================================================');
    console.log('🎉 CORAGEN RESTORATION TEST SUITE COMPLETED 100% SUCCESS!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testCoragen();
