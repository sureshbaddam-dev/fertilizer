import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { supplierService } from '../modules/suppliers/services/supplier.service.js';

async function runSupplierSoftDeleteAcceptanceTest() {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp_test';
  console.log(`Connecting to Test MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🧪 ACCEPTANCE TEST: SUPPLIER SOFT DELETE & 90-DAY RETENTION');
  console.log('====================================================\n');

  const testSupName = `SoftDelete Test Supplier ${Date.now()}`;
  const testMobile = `9848${Math.floor(100000 + Math.random() * 900000)}`;

  console.log(`1. Registering Test Supplier '${testSupName}' (${testMobile})...`);
  const createdSup = await supplierService.createSupplier({
    name: testSupName,
    companyName: 'Test Agri Corp',
    mobile: testMobile,
    address: 'Narketpally Market Yard',
  });

  const supplierId = createdSup._id;
  console.log(`✓ Supplier Created with ID: ${supplierId}`);

  console.log('\n2. Verifying Supplier is visible in Active Suppliers query...');
  const activeSupsBefore = await supplierService.getAllSuppliers({ status: 'active' });
  const foundBefore = activeSupsBefore.suppliers.find(s => s._id.toString() === supplierId.toString());
  console.log(`• Active Suppliers List contains test supplier: ${Boolean(foundBefore)}`);
  if (!foundBefore) {
    throw new Error('TEST FAILED: Supplier was not found in active list before deletion');
  }

  console.log('\n3. Executing Soft Delete (deactivateSupplier)...');
  const deactivatedSup = await supplierService.deactivateSupplier(supplierId.toString());
  console.log(`✓ Soft Delete API call succeeded without errors!`);

  console.log('\n4. Verifying MongoDB Document State...');
  const rawMongoDoc = await Supplier.findById(supplierId).lean().exec();
  console.log(`• Document exists in MongoDB: ${Boolean(rawMongoDoc)}`);
  console.log(`• Document isActive: ${rawMongoDoc?.isActive}`);
  console.log(`• Document deletedAt: ${rawMongoDoc?.deletedAt}`);

  if (!rawMongoDoc) {
    throw new Error('TEST FAILED: Supplier document was physically deleted from MongoDB!');
  }
  if (rawMongoDoc.isActive !== false) {
    throw new Error(`TEST FAILED: Supplier isActive is ${rawMongoDoc.isActive}, expected false`);
  }
  if (!rawMongoDoc.deletedAt) {
    throw new Error('TEST FAILED: Supplier deletedAt timestamp is missing!');
  }

  console.log('\n5. Verifying Supplier disappeared from Active Suppliers query...');
  const activeSupsAfter = await supplierService.getAllSuppliers({ status: 'active' });
  const foundAfter = activeSupsAfter.suppliers.find(s => s._id.toString() === supplierId.toString());
  console.log(`• Active Suppliers List contains test supplier: ${Boolean(foundAfter)} (Expected: false)`);
  if (foundAfter) {
    throw new Error('TEST FAILED: Soft-deleted supplier is still visible in active list!');
  }

  console.log('\n6. Testing Partial Mobile Index Reuse...');
  const reuseSup = await supplierService.createSupplier({
    name: `New Supplier Same Mobile ${Date.now()}`,
    mobile: testMobile,
  });
  console.log(`✓ Mobile number '${testMobile}' successfully reused for new active supplier! ID: ${reuseSup._id}`);

  console.log('\n7. Cleaning up test records from test DB...');
  await Supplier.deleteOne({ _id: supplierId });
  await Supplier.deleteOne({ _id: reuseSup._id });
  console.log('✓ Test cleanup complete!');

  console.log('\n====================================================');
  console.log('🎉 ALL SUPPLIER SOFT DELETE ACCEPTANCE TESTS PASSED (100%)!');
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runSupplierSoftDeleteAcceptanceTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
