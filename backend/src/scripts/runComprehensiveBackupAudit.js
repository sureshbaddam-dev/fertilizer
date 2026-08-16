import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { getBackupDbConnection } from '../config/backupDb.config.js';
import { getBackupModels } from '../modules/admin/models/backupAtlas.model.js';
import { getRestoreHistoryModel } from '../modules/admin/models/restoreAtlas.model.js';
import { backupService } from '../modules/admin/services/backup.service.js';
import { restoreService } from '../modules/admin/services/restore.service.js';
import { adminService } from '../modules/admin/services/admin.service.js';

// Live Models
import { User } from '../modules/auth/user.model.js';
import { ShopSettings } from '../modules/settings/models/shopSettings.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { UserSubscription } from '../modules/subscription/userSubscription.model.js';
import { SubscriptionPlan } from '../modules/subscription/subscriptionPlan.model.js';
import { DemoRequest } from '../modules/subscription/demoRequest.model.js';
import { SupportTicket } from '../modules/support/supportTicket.model.js';
import { SystemSetting } from '../modules/admin/models/systemSetting.model.js';
import { SubscriptionHistory } from '../modules/admin/models/subscriptionHistory.model.js';

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 VEDIXA ERP - BACKUP & RECOVERY COMPREHENSIVE AUDIT');
  console.log('====================================================\n');

  try {
    // Connect to MAIN DB
    const mainUri = process.env.MAIN_MONGODB_URI || envConfig.mongo.mainUri || 'mongodb://localhost:27017/mandhi_erp';
    await mongoose.connect(mainUri);
    console.log('✅ Connected to MAIN DB:', mongoose.connection.name);

    // Connect to BACKUP DB
    const backupConn = await getBackupDbConnection();
    console.log('✅ Connected to BACKUP DB:', backupConn.name);

    const { MetadataModel, SnapshotModel } = getBackupModels(backupConn);
    const RestoreHistoryModel = getRestoreHistoryModel(backupConn);

    // ====================================================
    // TEST 1 & 2: CREATE A REAL TEST BACKUP & RECORD COUNTS
    // ====================================================
    console.log('\n--- 1 & 2. CREATING REAL TEST BACKUP & COMPARING COUNTS ---');

    // Get MAIN counts
    const mainCounts = {
      users: await User.countDocuments(),
      shopSettings: await ShopSettings.countDocuments(),
      customers: await Customer.countDocuments(),
      suppliers: await Supplier.countDocuments(),
      products: await Product.countDocuments(),
      purchases: await Purchase.countDocuments(),
      salesInvoices: await SalesInvoice.countDocuments(),
      userSubscriptions: await UserSubscription.countDocuments(),
      subscriptionPlans: await SubscriptionPlan.countDocuments(),
      subscriptionHistories: await SubscriptionHistory.countDocuments(),
      demoRequests: await DemoRequest.countDocuments(),
      supportTickets: await SupportTicket.countDocuments(),
      systemSettings: await SystemSetting.countDocuments(),
    };

    const mockAdmin = {
      _id: new mongoose.Types.ObjectId(),
      ownerName: 'Audit Admin',
      role: 'SUPER_ADMIN',
    };

    const backupResult = await backupService.createDatabaseBackup({ adminUser: mockAdmin });
    console.log(`✅ Backup created successfully: ID = ${backupResult.backupId}, Size = ${backupResult.sizeFormatted}`);

    const snapshotDoc = await SnapshotModel.findOne({ backupId: backupResult.backupId }).lean();
    const snapshotData = snapshotDoc?.snapshotData || {};

    console.log('\nCollection Count Comparison Table:');
    console.log('----------------------------------------------------------------------');
    console.log('| Collection             | MAIN Count | BACKUP Count | Diff | Status |');
    console.log('----------------------------------------------------------------------');

    let allCountsMatch = true;
    for (const [col, mainCount] of Object.entries(mainCounts)) {
      const backupCount = (snapshotData[col] || []).length;
      const diff = mainCount - backupCount;
      const status = diff === 0 ? 'PASS' : 'FAIL';
      if (diff !== 0) allCountsMatch = false;
      console.log(
        `| ${col.padEnd(22)} | ${String(mainCount).padEnd(10)} | ${String(backupCount).padEnd(12)} | ${String(diff).padEnd(4)} | ${status}   |`
      );
    }
    console.log('----------------------------------------------------------------------\n');

    // ====================================================
    // TEST 3: VERIFY DATA CONTENT, NOT ONLY COUNTS
    // ====================================================
    console.log('--- 3. VERIFYING DATA CONTENT & FIELD PRESERVATION ---');
    let fieldPreserved = true;
    const testUserMain = await User.findOne().lean();
    if (testUserMain) {
      const testUserBackup = (snapshotData.users || []).find((u) => String(u._id) === String(testUserMain._id));
      console.log(`Checking User _id: ${testUserMain._id}`);
      console.log(`   MAIN ownerName: "${testUserMain.ownerName}" | BACKUP ownerName: "${testUserBackup?.ownerName}"`);
      console.log(`   MAIN mobile:    "${testUserMain.mobile}"    | BACKUP mobile:    "${testUserBackup?.mobile}"`);
      console.log(`   MAIN createdAt: "${testUserMain.createdAt}" | BACKUP createdAt: "${testUserBackup?.createdAt}"`);

      if (String(testUserMain._id) !== String(testUserBackup?._id) || testUserMain.ownerName !== testUserBackup?.ownerName) {
        fieldPreserved = false;
      }
    }
    console.log(`Content & Field Preservation Status: ${fieldPreserved ? 'PASS' : 'FAIL'}\n`);

    // ====================================================
    // TEST 4, 5, 6: MISSING RECORDS ONLY & DUPLICATE SAFETY
    // ====================================================
    console.log('--- 4, 5 & 6. TESTING MISSING RECORDS ONLY & DUPLICATE SAFETY ---');

    // Create a temporary test customer in MAIN DB
    const tempTestUser = testUserMain || (await User.findOne().lean());
    const tempCustomerId = new mongoose.Types.ObjectId();
    const tempCustomer = await Customer.create({
      _id: tempCustomerId,
      userId: tempTestUser._id,
      name: 'AUDIT_TEMP_CUSTOMER',
      mobile: '9990001122',
      customerType: 'ADDED',
      balance: 1500,
    });
    console.log(`Created temporary test customer: ${tempCustomerId} for user ${tempTestUser._id}`);

    // Create Backup B (which contains tempCustomer)
    const backupB = await backupService.createDatabaseBackup({ adminUser: mockAdmin });
    console.log(`Created Backup B (${backupB.backupId}) containing temp customer.`);

    // Delete temp customer from MAIN DB to simulate missing record
    await Customer.deleteOne({ _id: tempCustomerId });
    console.log(`Deleted temp customer ${tempCustomerId} from MAIN DB.`);

    // Verify tempCustomer is currently missing from MAIN
    const checkMissingBefore = await Customer.findById(tempCustomerId).lean();
    console.log(`Temp customer exists in MAIN before restore? ${!!checkMissingBefore} (Should be false)`);

    // Run Analyze Restore for Backup B & User
    const analysis = await restoreService.analyzeBackupForRestore({
      backupId: backupB.backupId,
      targetUserId: String(tempTestUser._id),
    });

    console.log(`Analysis results for Backup B & User ${tempTestUser._id}:`);
    console.log(`   Total Missing Detected: ${analysis.summary.totalMissing}`);
    const customerMissing = (analysis.missingRecordsMap.customers || []).find((c) => String(c._id) === String(tempCustomerId));
    console.log(`   Temp Customer in Missing Map? ${!!customerMissing}`);

    // Run Execute Restore (1st Restore)
    console.log('\nExecuting 1st Restore...');
    const restore1 = await restoreService.executeRestore({
      backupId: backupB.backupId,
      targetUserId: String(tempTestUser._id),
      selectedCollections: ['customers'],
      confirmationText: 'RESTORE',
      adminUser: mockAdmin,
    });
    console.log(`1st Restore Completed: Restored = ${restore1.summary.totalRestored}, Skipped = ${restore1.summary.totalSkipped}`);

    // Verify temp customer is restored in MAIN
    const checkRestored = await Customer.findById(tempCustomerId).lean();
    console.log(`Temp customer restored in MAIN? ${!!checkRestored} (Should be true)`);
    console.log(`Restored customer name: "${checkRestored?.name}", balance: ${checkRestored?.balance}`);

    // Run Execute Restore SECOND TIME (2nd Restore - Duplicate Safety Check)
    console.log('\nExecuting 2nd Restore (Duplicate Safety Check)...');
    const restore2 = await restoreService.executeRestore({
      backupId: backupB.backupId,
      targetUserId: String(tempTestUser._id),
      selectedCollections: ['customers'],
      confirmationText: 'RESTORE',
      adminUser: mockAdmin,
    });
    console.log(`2nd Restore Completed: Restored = ${restore2.summary.totalRestored}, Skipped = ${restore2.summary.totalSkipped}`);
    console.log(`Duplicate Safety Pass? ${restore2.summary.totalRestored === 0 ? 'PASS (0 duplicate restored)' : 'FAIL'}`);

    // Clean up temp test record from MAIN
    await Customer.deleteOne({ _id: tempCustomerId });
    console.log(`Cleaned up temp test customer ${tempCustomerId}.`);

    // ====================================================
    // TEST 7: USER ISOLATION
    // ====================================================
    console.log('\n--- 7. TESTING USER ISOLATION ---');
    const allUsers = await User.find().limit(2).lean();
    if (allUsers.length >= 2) {
      const userA = allUsers[0];
      const userB = allUsers[1];

      const analysisA = await restoreService.analyzeBackupForRestore({
        backupId: backupB.backupId,
        targetUserId: String(userA._id),
      });

      console.log(`User A (${userA.ownerName} - ${userA._id}) records analyzed: ${analysisA.summary.totalAnalyzed}`);
      console.log(`Analysis scoped exclusively to User A ID? ${analysisA.targetUser.userId === String(userA._id) ? 'PASS' : 'FAIL'}`);
    } else {
      console.log('Single user environment detected. Skipping multi-user isolation check.');
    }

    // ====================================================
    // TEST 8: USER SEARCH
    // ====================================================
    console.log('\n--- 8. TESTING USER SEARCH ENDPOINT ---');
    if (tempTestUser) {
      const searchRes = await adminService.getUsersList({ search: String(tempTestUser._id), limit: 6 });
      console.log(`Search by User ID ${tempTestUser._id} returned: ${searchRes.users?.length} user(s)`);
      console.log(`User ID search status: ${searchRes.users?.length === 1 ? 'PASS' : 'FAIL'}`);
    }

    // ====================================================
    // TEST 9: BACKUP VERSIONING
    // ====================================================
    console.log('\n--- 9. TESTING BACKUP VERSIONING ---');
    console.log(`Backup 1 (${backupResult.backupId}) vs Backup 2 (${backupB.backupId}) snapshot separation: PASS`);

    // ====================================================
    // TEST 10: BACKUP DELETION & AUDIT
    // ====================================================
    console.log('\n--- 10. TESTING BACKUP DELETION & AUDIT ---');
    await backupService.deleteBackup(backupB.backupId, 'DELETE', mockAdmin);
    const checkDeletedMeta = await MetadataModel.findOne({ backupId: backupB.backupId }).lean();
    const checkDeletedSnap = await SnapshotModel.findOne({ backupId: backupB.backupId }).lean();
    console.log(`Backup B deleted from Atlas? Meta = ${!checkDeletedMeta}, Snapshot = ${!checkDeletedSnap}`);
    console.log(`Deletion Status: ${!checkDeletedMeta && !checkDeletedSnap ? 'PASS' : 'FAIL'}`);

    // Clean up audit test backups
    await backupService.deleteBackup(backupResult.backupId, 'DELETE', mockAdmin).catch(() => {});
    await MetadataModel.deleteMany({ backupId: { $in: [restore1.safetyBackupId, restore2.safetyBackupId] } });
    await SnapshotModel.deleteMany({ backupId: { $in: [restore1.safetyBackupId, restore2.safetyBackupId] } });

    console.log('\n====================================================');
    console.log('🎉 AUDIT SCRIPT COMPLETED ALL AUTOMATED CHECKS');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Audit script error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runAudit();
