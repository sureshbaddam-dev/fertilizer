import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { User } from '../modules/auth/user.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { backupService } from '../modules/admin/services/backup.service.js';
import { restoreService } from '../modules/admin/services/restore.service.js';

async function runRestoreSystemTest() {
  console.log('🧪 Starting Automated Integration Test for Safe Missing-Records-Only Restore System...');

  try {
    // 1. Connect to Main Database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(envConfig.mongo.mainUri);
    }
    console.log('✅ Connected to Main MongoDB Database.');

    const adminUser = (await User.findOne({ role: 'admin' }).lean()) || {
      _id: new mongoose.Types.ObjectId(),
      ownerName: 'Test Admin',
      role: 'admin',
    };

    // Find or create a test user
    let testUser = await User.findOne({ mobile: '9998887776' });
    if (!testUser) {
      testUser = await User.create({
        ownerName: 'Raja Rajeshwara Agro Test',
        mobile: '9998887776',
        email: 'test@rajaagro.com',
        passwordHash: 'dummy_hash_123',
        role: 'owner',
        isActive: true,
      });
    }

    const userId = testUser._id;

    // Clean test products/customers/invoices for test user
    await Product.deleteMany({ userId });
    await Customer.deleteMany({ userId });
    await SalesInvoice.deleteMany({ userId });

    // Seed Initial Test Records
    const prodA = await Product.create({
      userId,
      name: 'Test Product A (Urea)',
      defaultSellingPrice: 100,
      totalStock: 50,
      categoryId: new mongoose.Types.ObjectId(),
      defaultUnitId: new mongoose.Types.ObjectId(),
    });

    const prodB = await Product.create({
      userId,
      name: 'Test Product B (DAP)',
      defaultSellingPrice: 200,
      totalStock: 30,
      categoryId: new mongoose.Types.ObjectId(),
      defaultUnitId: new mongoose.Types.ObjectId(),
    });

    const prodC = await Product.create({
      userId,
      name: 'Test Product C (Pesticide)',
      defaultSellingPrice: 350,
      totalStock: 20,
      categoryId: new mongoose.Types.ObjectId(),
      defaultUnitId: new mongoose.Types.ObjectId(),
    });

    const cust1 = await Customer.create({
      userId,
      name: 'Test Farmer Customer 1',
      mobile: '9876543210',
      customerType: 'ADDED',
    });

    const inv101 = await SalesInvoice.create({
      userId,
      invoiceNumber: 'INV-TEST-101',
      customerName: cust1.name,
      customerId: cust1._id,
      totalAmount: 1500,
      items: [{ productName: prodA.name, quantity: 2, unitPrice: 100, totalAmount: 200 }],
    });

    console.log(`✅ Initial Seed Data Created for User ${testUser.ownerName}: 3 Products, 1 Customer, 1 Invoice.`);

    // 2. CREATE BACKUP SNAPSHOT
    console.log('\n--- STEP 1: Creating Baseline Backup Snapshot ---');
    const backupMetadata = await backupService.createDatabaseBackup({ adminUser });
    const backupId = backupMetadata.backupId;
    console.log(`✅ Backup Created: ${backupId} (${backupMetadata.sizeFormatted}, ${backupMetadata.totalRecordsCount} records).`);

    // 3. SIMULATE DATA ACCIDENTAL DELETION IN MAIN DB
    console.log('\n--- STEP 2: Simulating Accidental Deletion of Product C and Invoice 101 ---');
    await Product.deleteOne({ _id: prodC._id });
    await SalesInvoice.deleteOne({ _id: inv101._id });

    const countProdAfterDel = await Product.countDocuments({ userId });
    const countInvAfterDel = await SalesInvoice.countDocuments({ userId });
    console.log(`   Current Main DB Status: Products = ${countProdAfterDel} (expected 2), Invoices = ${countInvAfterDel} (expected 0).`);

    // 4. RUN RESTORE ANALYSIS
    console.log('\n--- STEP 3: Running Pre-Flight Restore Analysis ---');
    const analysis = await restoreService.analyzeBackupForRestore({
      backupId,
      targetUserId: String(userId),
    });

    console.log(`   Analysis Target: ${analysis.targetUser.ownerName}`);
    console.log(`   Total Missing Records Detected: ${analysis.summary.totalMissing}`);
    console.log(`   Missing Products: ${analysis.missingRecordsMap.products?.length || 0}`);
    console.log(`   Missing Sales Invoices: ${analysis.missingRecordsMap.salesInvoices?.length || 0}`);

    if (analysis.summary.totalMissing !== 2) {
      throw new Error(`Expected 2 missing records, but analysis detected ${analysis.summary.totalMissing}`);
    }
    console.log('✅ Pre-flight analysis correctly identified missing records Product C and Invoice 101.');

    // 5. EXECUTE RESTORE
    console.log('\n--- STEP 4: Executing Safe Restore with Pre-Restore Safety Backup ---');
    const restoreResult = await restoreService.executeRestore({
      backupId,
      targetUserId: String(userId),
      confirmationText: 'RESTORE',
      adminUser,
    });

    console.log(`   Restore Executed: ${restoreResult.restoreId}`);
    console.log(`   Safety Backup Generated: ${restoreResult.safetyBackupId}`);
    console.log(`   Total Restored Records: ${restoreResult.summary.totalRestored}`);
    console.log(`   Total Skipped Records: ${restoreResult.summary.totalSkipped}`);

    // Verify Main DB after restore
    const prodC_restored = await Product.findById(prodC._id);
    const inv101_restored = await SalesInvoice.findById(inv101._id);

    if (!prodC_restored || !inv101_restored) {
      throw new Error('Restore failed to recreate Product C or Invoice 101');
    }
    console.log('✅ Product C and Invoice 101 successfully restored into Main DB.');

    // 6. TEST MODIFIED RECORDS PROTECTION
    console.log('\n--- STEP 5: Testing Modified Live Records Protection ---');
    await Product.updateOne({ _id: prodA._id }, { $set: { defaultSellingPrice: 150 } });
    console.log('   Updated Product A selling price in live Main DB to ₹150.');

    await restoreService.executeRestore({
      backupId,
      targetUserId: String(userId),
      confirmationText: 'RESTORE',
      adminUser,
    });

    const prodA_afterMod = await Product.findById(prodA._id);
    if (prodA_afterMod.defaultSellingPrice !== 150) {
      throw new Error(`OVERWRITE ERROR: Product A price reverted from 150 back to ${prodA_afterMod.defaultSellingPrice}!`);
    }
    console.log('✅ MODIFIED RECORD PROTECTION VERIFIED: Product A price remained ₹150 (not overwritten by older ₹100 backup).');

    // 7. TEST DUPLICATE RESTORE PROTECTION
    console.log('\n--- STEP 6: Testing Duplicate Restore Protection ---');
    const secondRestore = await restoreService.executeRestore({
      backupId,
      targetUserId: String(userId),
      confirmationText: 'RESTORE',
      adminUser,
    });

    console.log(`   Second Restore Restored: ${secondRestore.summary.totalRestored} records (expected 0).`);
    if (secondRestore.summary.totalRestored !== 0) {
      throw new Error(`DUPLICATE ERROR: Second restore inserted ${secondRestore.summary.totalRestored} duplicate records!`);
    }
    console.log('✅ DUPLICATE PROTECTION VERIFIED: Second restore inserted 0 duplicates.');

    // Clean up test data
    await Product.deleteMany({ userId });
    await Customer.deleteMany({ userId });
    await SalesInvoice.deleteMany({ userId });

    console.log('\n🎉 ALL 4 RESTORE SYSTEM TEST SCENARIOS PASSED 100% SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Restore System Test Failed:', err);
    process.exit(1);
  }
}

runRestoreSystemTest();
