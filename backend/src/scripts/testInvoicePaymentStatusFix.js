import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../modules/auth/user.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';
import { calculateInvoicePaymentStatus } from '../utils/pricingUtils.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runInvoiceStatusTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // 1. Setup Isolated User & Masters
  const user = await User.create({
    ownerName: 'Payment Status Test User',
    mobile: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa Payment Status Test Hub',
  });
  const userId = user._id;
  console.log(`✓ Test User initialized (UserId: ${userId})`);

  await SalesInvoice.deleteMany({ userId });
  await Product.deleteMany({ userId });
  await ProductBatch.deleteMany({ userId });

  const category = await Category.create({ userId, name: 'Fertilizers', slug: `fert-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Pioneer' });
  const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

  const product = await Product.create({
    userId,
    name: 'Pioneer Status Product',
    code: 'STAT-001',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 1000,
    defaultSellingPrice: 1534,
    totalStock: 100,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product._id,
    batchNumber: 'BATCH-STAT-001',
    initialQuantity: 100,
    currentStock: 100,
    purchaseRate: 1000,
    sellingPrice: 1534,
    isActive: true,
  });

  // ==================================================
  // TEST SCENARIOS FOR CENTRALIZED HELPER FUNCTION
  // ==================================================
  console.log(`\n--- TEST HELPER FUNCTION: calculateInvoicePaymentStatus ---`);

  // Test 1: Fully Paid (1534 total, 1534 paid, 0 due)
  const st1 = calculateInvoicePaymentStatus(1534, 1534, 0);
  console.log(`Helper Test 1 (Fully Paid 1534/1534/0): ${st1} (Expected: Paid)`);
  if (st1 !== 'Paid') throw new Error(`Helper Test 1 Failed! Got ${st1}`);

  // Test 2: Partial (1534 total, 500 paid, 1034 due)
  const st2 = calculateInvoicePaymentStatus(1534, 500, 1034);
  console.log(`Helper Test 2 (Partial 1534/500/1034): ${st2} (Expected: Partial)`);
  if (st2 !== 'Partial') throw new Error(`Helper Test 2 Failed! Got ${st2}`);

  // Test 3: Fully Due (1534 total, 0 paid, 1534 due)
  const st3 = calculateInvoicePaymentStatus(1534, 0, 1534);
  console.log(`Helper Test 3 (Fully Due 1534/0/1534): ${st3} (Expected: Due)`);
  if (st3 !== 'Due') throw new Error(`Helper Test 3 Failed! Got ${st3}`);

  // Test 4: Floating Point Zero (1534 total, 1534 paid, 0.00000001 due)
  const st4 = calculateInvoicePaymentStatus(1534, 1534, 0.00000001);
  console.log(`Helper Test 4 (Floating Point 1534/1534/0.00000001): ${st4} (Expected: Paid)`);
  if (st4 !== 'Paid') throw new Error(`Helper Test 4 Failed! Got ${st4}`);

  // Test 5: Cancelled Invoice
  const st5 = calculateInvoicePaymentStatus(1534, 1534, 0, 'Cancelled');
  console.log(`Helper Test 5 (Cancelled Status): ${st5} (Expected: Cancelled)`);
  if (st5 !== 'Cancelled') throw new Error(`Helper Test 5 Failed! Got ${st5}`);

  console.log(`✓ Helper function unit tests passed!`);

  // ==================================================
  // END-TO-END INVOICE CREATION & RETRIEVAL FLOW
  // ==================================================
  console.log(`\n--- TEST E2E: INVOICE CREATION & HISTORY API FLOW ---`);

  // Test 6: Submit & Save Bill with exact payment (₹1,534 / ₹1,534)
  console.log(`Submitting bill: Total = ₹1,534.00, Paid = ₹1,534.00...`);
  const createdRes = await salesInvoiceService.createInvoice(
    {
      customerName: 'Screenshot Scenario Farmer',
      items: [{ productId: product._id.toString(), qty: 1 }],
      paidAmount: 1534,
    },
    userId
  );

  const inv = createdRes.invoice;
  console.log(`Created Invoice #${inv.invoiceNumber}:`);
  console.log(`  Total Amount: ₹${inv.totalAmount}`);
  console.log(`  Paid Amount: ₹${inv.paidAmount}`);
  console.log(`  Due Amount: ₹${inv.dueAmount}`);
  console.log(`  Status: ${inv.status} (Expected: Paid)`);

  if (inv.totalAmount !== 1534 || inv.paidAmount !== 1534 || inv.dueAmount !== 0 || inv.status !== 'Paid') {
    throw new Error(`E2E Test Failed: Created invoice did not return status = 'Paid' or dueAmount = 0!`);
  }
  console.log(`✓ VERIFIED: Newly created fully paid bill returned status: "Paid" and dueAmount: 0.00!`);

  // Test 7: Query Invoice History API
  console.log(`\nFetching Invoice History via getAllInvoices...`);
  const historyRes = await salesInvoiceService.getAllInvoices({}, userId);
  const historyInv = historyRes.invoices.find((i) => i.invoiceNumber === inv.invoiceNumber);

  console.log(`History API returned Invoice #${historyInv.invoiceNumber}: Status = ${historyInv.status}, Due = ₹${historyInv.dueAmount}`);
  console.log(`History Counters: Paid = ${historyRes.counters.paid}, Due = ${historyRes.counters.due}`);

  if (historyInv.status !== 'Paid' || historyInv.dueAmount !== 0 || historyRes.counters.paid !== 1) {
    throw new Error(`E2E Test Failed: Invoice History API returned incorrect status or counters!`);
  }
  console.log(`✓ VERIFIED: Invoice History API returns Status: "Paid" and accurate counters!`);

  // Test 8: Legacy Database Stale Document Self-Healing Test
  console.log(`\n--- TEST LEGACY STALE DOCUMENT REPAIR ---`);
  // Simulate an old DB document stored with stale status: "Due" when paidAmount == totalAmount
  const legacyDoc = await SalesInvoice.create({
    userId,
    invoiceNumber: 'INV-LEGACY-STALE-001',
    customerName: 'Legacy Stale Customer',
    items: [{ productName: 'Legacy Item', quantity: 1, unitPrice: 1534, totalAmount: 1534 }],
    totalAmount: 1534,
    paidAmount: 1534,
    dueAmount: 0,
    status: 'Due', // Stale legacy status in DB
    dueStatus: 'Due In 30 Days',
  });

  console.log(`Inserted Legacy Stale Document into DB: #${legacyDoc.invoiceNumber} -> Stored Status: "${legacyDoc.status}"`);

  // Call getAllInvoices history service
  console.log(`Executing getAllInvoices to trigger self-healing sync...`);
  const repairedHistory = await salesInvoiceService.getAllInvoices({}, userId);
  const repairedDocInDb = await SalesInvoice.findById(legacyDoc._id);

  console.log(`Repaired Document state in DB: Status = "${repairedDocInDb.status}", Due = ₹${repairedDocInDb.dueAmount}`);

  if (repairedDocInDb.status !== 'Paid' || repairedDocInDb.dueAmount !== 0) {
    throw new Error(`Legacy Document Repair Failed! Stale status was not self-healed.`);
  }
  console.log(`✓ VERIFIED: Legacy stale database records are automatically repaired and saved as "Paid" in MongoDB!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL INVOICE PAYMENT STATUS FIX TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runInvoiceStatusTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
