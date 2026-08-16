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
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { customerService } from '../modules/customers/services/customer.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runConsolidatedPaymentsLedgerTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Masters
  const user = await User.create({
    ownerName: 'Consolidated Ledger Test User',
    mobile: `994${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa Consolidated Ledger Hub',
  });
  const userId = user._id;

  const category = await Category.create({ userId, name: 'Pesticides', slug: `pest-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Syngenta' });
  const unit = await Unit.create({ userId, name: 'Bottles', shortName: 'Btl' });

  const product = await Product.create({
    userId,
    name: 'Syngenta Ampligo 100ml',
    code: 'AMP-100',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 300,
    defaultSellingPrice: 500,
    totalStock: 1000,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product._id,
    batchNumber: 'BATCH-AMP-001',
    initialQuantity: 1000,
    currentStock: 1000,
    purchaseRate: 300,
    sellingPrice: 500,
    isActive: true,
  });

  // ==================================================
  // TEST 1: USER PROMPT 3-INVOICE SCENARIO
  // ==================================================
  console.log(`--- TEST 1: PROMPT 3-INVOICE SCENARIO (₹1k/₹1k, ₹2k/₹1.5k, ₹700/₹500) ---`);
  const cust1 = await Customer.create({ userId, name: 'Prompt Customer 1', mobile: '9876543001', customerType: 'ADDED' });

  // Invoice 1: Total ₹1,000, Paid ₹1,000
  await salesInvoiceService.createInvoice(
    { customerId: cust1._id.toString(), items: [{ productId: product._id.toString(), qty: 2, price: 500 }], paidAmount: 1000, date: new Date('2026-08-10') },
    userId
  );

  // Invoice 2: Total ₹2,000, Paid ₹1,500
  await salesInvoiceService.createInvoice(
    { customerId: cust1._id.toString(), items: [{ productId: product._id.toString(), qty: 4, price: 500 }], paidAmount: 1500, date: new Date('2026-08-11') },
    userId
  );

  const product2 = await Product.create({
    userId,
    name: 'Syngenta Chess 250g',
    code: 'CHS-250',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 400,
    defaultSellingPrice: 700,
    totalStock: 1000,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product2._id,
    batchNumber: 'BATCH-CHS-001',
    initialQuantity: 1000,
    currentStock: 1000,
    purchaseRate: 400,
    sellingPrice: 700,
    isActive: true,
  });

  // Invoice 3: Total ₹700, Paid ₹500
  await salesInvoiceService.createInvoice(
    { customerId: cust1._id.toString(), items: [{ productId: product2._id.toString(), qty: 1, price: 700 }], paidAmount: 500, date: new Date('2026-08-12') },
    userId
  );

  const res1 = await customerService.getCustomerById(cust1._id.toString(), userId);
  console.log(`Financial Summary for Customer 1:`);
  console.log(`  Total Purchases: ₹${res1.customer.totalPurchases} (Expected: ₹3,700)`);
  console.log(`  Total Paid: ₹${res1.customer.totalPaid} (Expected: ₹3,000)`);
  console.log(`  Outstanding Balance: ₹${res1.customer.outstandingBalance} (Expected: ₹700)`);
  console.log(`  Advance Balance: ₹${res1.customer.advanceBalance} (Expected: ₹0)`);
  console.log(`  Payments Tab Count: ${res1.payments.length} (Expected: 3)`);
  console.log(`  Ledger Rows Count: ${res1.transactions.length} (Expected: 3 - NO separate payment rows)`);

  console.log(`Ledger Rows (Chronological sequence reversed for display):`);
  res1.transactions.forEach((tx) => {
    console.log(`  - Ref: ${tx.refNo}, Type: ${tx.type}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`);
  });

  // Note: res1.transactions is returned in reverse chronological order for table display:
  // res1.transactions[2]: Invoice 1 (Date: 10 Aug) -> Debit: 1000, Credit: 1000, Balance: ₹ 0
  // res1.transactions[1]: Invoice 2 (Date: 11 Aug) -> Debit: 2000, Credit: 1500, Balance: ₹ 500 Dr
  // res1.transactions[0]: Invoice 3 (Date: 12 Aug) -> Debit: 700, Credit: 500, Balance: ₹ 700 Dr

  const rowInv1 = res1.transactions[2];
  const rowInv2 = res1.transactions[1];
  const rowInv3 = res1.transactions[0];

  if (res1.transactions.length !== 3) throw new Error(`Test 1 Failed: Expected exactly 3 ledger rows, got ${res1.transactions.length}`);
  if (rowInv1.debit !== 1000 || rowInv1.credit !== 1000 || rowInv1.formattedBalance !== '₹ 0') {
    throw new Error(`Test 1 Row 1 Failed! Got Debit:${rowInv1.debit}, Credit:${rowInv1.credit}, Balance:${rowInv1.formattedBalance}`);
  }
  if (rowInv2.debit !== 2000 || rowInv2.credit !== 1500 || rowInv2.formattedBalance !== '₹ 500 Dr') {
    throw new Error(`Test 1 Row 2 Failed! Got Debit:${rowInv2.debit}, Credit:${rowInv2.credit}, Balance:${rowInv2.formattedBalance}`);
  }
  if (rowInv3.debit !== 700 || rowInv3.credit !== 500 || rowInv3.formattedBalance !== '₹ 700 Dr') {
    throw new Error(`Test 1 Row 3 Failed! Got Debit:${rowInv3.debit}, Credit:${rowInv3.credit}, Balance:${rowInv3.formattedBalance}`);
  }

  console.log(`✓ TEST 1 PASSED: 3-invoice ledger matches prompt exactly (₹0, ₹500 Dr, ₹700 Dr) with zero duplicate payment rows!`);

  // ==================================================
  // TEST 2: MULTIPLE PAYMENTS FOR SINGLE INVOICE
  // ==================================================
  console.log(`\n--- TEST 2: MULTIPLE PAYMENTS FOR SINGLE INVOICE (₹2,000 Invoice, 3 Payments) ---`);
  const cust2 = await Customer.create({ userId, name: 'Multi Pay Customer', mobile: '9876543002', customerType: 'ADDED' });

  // Create Invoice for ₹2,000 unpaid at checkout
  const inv2 = await salesInvoiceService.createInvoice(
    { customerId: cust2._id.toString(), items: [{ productId: product._id.toString(), qty: 4, price: 500 }], paidAmount: 0, date: new Date('2026-08-13') },
    userId
  );

  // Record 3 payments linked to this invoice
  await customerService.recordPayment(cust2._id.toString(), { amount: 500, invoiceId: inv2.invoice._id.toString(), notes: 'Part 1' }, userId);
  await customerService.recordPayment(cust2._id.toString(), { amount: 700, invoiceId: inv2.invoice._id.toString(), notes: 'Part 2' }, userId);
  await customerService.recordPayment(cust2._id.toString(), { amount: 800, invoiceId: inv2.invoice._id.toString(), notes: 'Part 3' }, userId);

  const res2 = await customerService.getCustomerById(cust2._id.toString(), userId);
  console.log(`Customer 2 Ledger Rows Count: ${res2.transactions.length} (Expected: 1)`);
  console.log(`Customer 2 Payments Tab Receipts Count: ${res2.payments.length} (Expected: 3)`);
  res2.transactions.forEach((tx) => console.log(`  - Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  if (res2.transactions.length !== 1 || res2.transactions[0].credit !== 2000 || res2.transactions[0].formattedBalance !== '₹ 0') {
    throw new Error(`Test 2 Ledger Row Failed!`);
  }
  if (res2.payments.length !== 3) {
    throw new Error(`Test 2 Payments Tab Failed! Expected 3 payment receipts in payments array, got ${res2.payments.length}`);
  }
  console.log(`✓ TEST 2 PASSED: 3 payments consolidated into 1 invoice row (Credit ₹2,000, Balance ₹0) while keeping 3 receipts in Payments tab!`);

  // ==================================================
  // TEST 3: STANDALONE UNLINKED ADVANCE PAYMENT
  // ==================================================
  console.log(`\n--- TEST 3: STANDALONE UNLINKED ADVANCE PAYMENT ---`);
  await customerService.recordPayment(cust2._id.toString(), { amount: 500, notes: 'General Unlinked Advance' }, userId);

  const res3 = await customerService.getCustomerById(cust2._id.toString(), userId);
  console.log(`Customer 2 Ledger Rows after standalone advance:`);
  res3.transactions.forEach((tx) => console.log(`  - Ref: ${tx.refNo}, Type: ${tx.type}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  const standaloneRow = res3.transactions.find((t) => t.type === 'Payment');
  if (!standaloneRow || standaloneRow.credit !== 500 || res3.customer.advanceBalance !== 500) {
    throw new Error(`Test 3 Failed!`);
  }
  console.log(`✓ TEST 3 PASSED: Standalone advance payment rendered cleanly as a Payment row with Advance Balance = ₹500!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL CONSOLIDATED PAYMENTS LEDGER TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runConsolidatedPaymentsLedgerTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
