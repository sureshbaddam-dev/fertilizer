import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../modules/auth/user.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { CustomerPayment } from '../modules/customers/models/customerPayment.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { customerService } from '../modules/customers/services/customer.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runCustomerLedgerFixTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Masters
  const user = await User.create({
    ownerName: 'Customer Ledger Fix Test User',
    mobile: `996${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa Customer Ledger Test Hub',
  });
  const userId = user._id;

  const category = await Category.create({ userId, name: 'Seeds', slug: `seed-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Kaveri' });
  const unit = await Unit.create({ userId, name: 'Packs', shortName: 'Pack' });

  const product = await Product.create({
    userId,
    name: 'Kaveri Cotton Seeds 1kg',
    code: 'SEED-100',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 800,
    defaultSellingPrice: 1000,
    totalStock: 100,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product._id,
    batchNumber: 'BATCH-SEED-001',
    initialQuantity: 100,
    currentStock: 100,
    purchaseRate: 800,
    sellingPrice: 1000,
    isActive: true,
  });

  // ==================================================
  // TEST 1 — EXACT PAYMENT (SCREENSHOT SCENARIO: "rohith sharma")
  // ==================================================
  console.log(`--- TEST 1: SCREENSHOT SCENARIO (rohith sharma - Total: ₹1,000, Paid: ₹1,000) ---`);
  const customer1 = await Customer.create({
    userId,
    name: 'rohith sharma',
    mobile: '9876543299',
    customerType: 'ADDED',
    type: 'Regular',
    status: 'Active',
  });

  // Create Bill INV-2026-1004 for ₹1,000 paid in full
  const bill1 = await salesInvoiceService.createInvoice(
    {
      customerId: customer1._id.toString(),
      items: [{ productId: product._id.toString(), qty: 1, price: 1000 }],
      paidAmount: 1000,
      date: new Date('2026-08-14'),
    },
    userId
  );

  console.log(`Created Sales Bill #${bill1.invoice.invoiceNumber}: Total = ₹${bill1.invoice.totalAmount}, Paid = ₹${bill1.invoice.paidAmount}`);

  // Fetch Customer Summary & Statements
  const data1 = await customerService.getCustomerById(customer1._id.toString(), userId);
  console.log(`Financial Summary for '${data1.customer.name}':`);
  console.log(`  Total Purchases: ₹${data1.customer.totalPurchases}`);
  console.log(`  Total Paid: ₹${data1.customer.totalPaid} (Expected: ₹1,000)`);
  console.log(`  Outstanding Balance: ₹${data1.customer.outstandingBalance} (Expected: ₹0)`);
  console.log(`  Advance Balance: ₹${data1.customer.advanceBalance} (Expected: ₹0)`);
  console.log(`  Payments Count: ${data1.payments.length} (Expected: 1)`);

  console.log(`Ledger Transactions:`);
  data1.transactions.forEach((tx) => {
    console.log(`  - [${tx.type}] Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`);
  });

  if (data1.customer.totalPurchases !== 1000) throw new Error(`Test 1 Failed: totalPurchases is ${data1.customer.totalPurchases}, expected 1000`);
  if (data1.customer.totalPaid !== 1000) throw new Error(`Test 1 Failed: DOUBLE COUNTING BUG PRESENT! totalPaid is ₹${data1.customer.totalPaid}, expected ₹1,000`);
  if (data1.customer.outstandingBalance !== 0) throw new Error(`Test 1 Failed: outstandingBalance is ${data1.customer.outstandingBalance}, expected 0`);
  if (data1.customer.advanceBalance !== 0) throw new Error(`Test 1 Failed: ARTIFICIAL ADVANCE BUG PRESENT! advanceBalance is ₹${data1.customer.advanceBalance}, expected ₹0`);
  if (data1.payments.length !== 1) throw new Error(`Test 1 Failed: payments count is ${data1.payments.length}, expected 1`);

  const invTx = data1.transactions.find((t) => t.type === 'Invoice');
  const payTx = data1.transactions.find((t) => t.type === 'Payment');
  if (invTx.debit !== 1000 || invTx.credit !== 0) throw new Error(`Test 1 Failed: Invoice row credit must be 0! Got debit:${invTx.debit}, credit:${invTx.credit}`);
  if (payTx.debit !== 0 || payTx.credit !== 1000) throw new Error(`Test 1 Failed: Payment row credit must be 1000! Got debit:${payTx.debit}, credit:${payTx.credit}`);

  console.log(`✓ TEST 1 PASSED: Total Paid = ₹1,000 (NOT ₹2,000), Outstanding = ₹0, Advance = ₹0, Payments = 1!`);

  // ==================================================
  // TEST 2 — PARTIAL PAYMENT
  // ==================================================
  console.log(`\n--- TEST 2: PARTIAL PAYMENT (Total: ₹1,000, Paid: ₹500) ---`);
  const customer2 = await Customer.create({
    userId,
    name: 'virat kohli',
    mobile: '9876543288',
    customerType: 'ADDED',
  });

  await salesInvoiceService.createInvoice(
    {
      customerId: customer2._id.toString(),
      items: [{ productId: product._id.toString(), qty: 1, price: 1000 }],
      paidAmount: 500,
    },
    userId
  );

  const data2 = await customerService.getCustomerById(customer2._id.toString(), userId);
  console.log(`Financial Summary for '${data2.customer.name}':`);
  console.log(`  Total Purchases: ₹${data2.customer.totalPurchases}`);
  console.log(`  Total Paid: ₹${data2.customer.totalPaid} (Expected: ₹500)`);
  console.log(`  Outstanding Balance: ₹${data2.customer.outstandingBalance} (Expected: ₹500)`);
  console.log(`  Advance Balance: ₹${data2.customer.advanceBalance} (Expected: ₹0)`);

  if (data2.customer.totalPaid !== 500 || data2.customer.outstandingBalance !== 500 || data2.customer.advanceBalance !== 0) {
    throw new Error(`Test 2 Failed!`);
  }
  console.log(`✓ TEST 2 PASSED: Partial Payment shows Total Paid = ₹500, Outstanding = ₹500, Advance = ₹0!`);

  // ==================================================
  // TEST 3 — GENUINE ADVANCE PAYMENT
  // ==================================================
  console.log(`\n--- TEST 3: GENUINE ADVANCE PAYMENT (Total: ₹1,000, Paid: ₹1,500) ---`);
  const customer3 = await Customer.create({
    userId,
    name: 'sachin tendulkar',
    mobile: '9876543277',
    customerType: 'ADDED',
  });

  await salesInvoiceService.createInvoice(
    {
      customerId: customer3._id.toString(),
      items: [{ productId: product._id.toString(), qty: 1, price: 1000 }],
      paidAmount: 1000,
    },
    userId
  );

  // Standalone advance payment of ₹500
  await customerService.recordPayment(
    customer3._id.toString(),
    { amount: 500, notes: 'Standalone Advance Payment' },
    userId
  );

  const data3 = await customerService.getCustomerById(customer3._id.toString(), userId);
  console.log(`Financial Summary for '${data3.customer.name}':`);
  console.log(`  Total Purchases: ₹${data3.customer.totalPurchases}`);
  console.log(`  Total Paid: ₹${data3.customer.totalPaid} (Expected: ₹1,500)`);
  console.log(`  Outstanding Balance: ₹${data3.customer.outstandingBalance} (Expected: ₹0)`);
  console.log(`  Advance Balance: ₹${data3.customer.advanceBalance} (Expected: ₹500)`);

  if (data3.customer.totalPaid !== 1500 || data3.customer.outstandingBalance !== 0 || data3.customer.advanceBalance !== 500) {
    throw new Error(`Test 3 Failed!`);
  }
  console.log(`✓ TEST 3 PASSED: Genuine Advance shows Total Paid = ₹1,500, Outstanding = ₹0, Advance = ₹500!`);

  // ==================================================
  // TEST 4 — DUPLICATE SUBMIT IDEMPOTENCY GUARD
  // ==================================================
  console.log(`\n--- TEST 4: DUPLICATE SUBMIT IDEMPOTENCY GUARD ---`);
  const dupeRef = `PAY-TEST-DUPE-001`;
  await customerService.recordPayment(customer1._id.toString(), { amount: 200, refNo: dupeRef }, userId);
  // Resubmit exact same payment request
  await customerService.recordPayment(customer1._id.toString(), { amount: 200, refNo: dupeRef }, userId);

  const dupeCheck = await CustomerPayment.find({ userId, customer: customer1._id, refNo: dupeRef });
  console.log(`Duplicate Submission Check: Found ${dupeCheck.length} CustomerPayment document(s) for refNo '${dupeRef}'`);

  if (dupeCheck.length !== 1) {
    throw new Error(`Test 4 Failed: Idempotency check failed, created ${dupeCheck.length} duplicate payments!`);
  }
  console.log(`✓ TEST 4 PASSED: Idempotency guard prevented duplicate payment creation!`);

  // ==================================================
  // TEST 5 — SOFT-DELETED PAYMENT ISOLATION
  // ==================================================
  console.log(`\n--- TEST 5: SOFT-DELETED PAYMENT ISOLATION ---`);
  const payToDel = dupeCheck[0];
  await CustomerPayment.findByIdAndUpdate(payToDel._id, { isDeleted: true, deletedAt: new Date() });
  await customerService.calculateCustomerBalance(customer1._id.toString(), userId);

  const data1AfterDel = await customerService.getCustomerById(customer1._id.toString(), userId);
  console.log(`After Soft-Deleting payment ${payToDel._id}: Total Paid = ₹${data1AfterDel.customer.totalPaid}`);

  if (data1AfterDel.customer.totalPaid !== 1000) {
    throw new Error(`Test 5 Failed: Soft-deleted payment was not excluded from totalPaid!`);
  }
  console.log(`✓ TEST 5 PASSED: Soft-deleted payment cleanly excluded from active Total Paid!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL CUSTOMER LEDGER DUPLICATE PAYMENT FIX TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runCustomerLedgerFixTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
