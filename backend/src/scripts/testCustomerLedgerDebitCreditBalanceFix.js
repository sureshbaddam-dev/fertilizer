import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../modules/auth/user.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { customerService } from '../modules/customers/services/customer.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runDebitCreditBalanceAccountingTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Masters
  const user = await User.create({
    ownerName: 'Accounting Fix Test User',
    mobile: `995${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa Accounting Test Hub',
  });
  const userId = user._id;

  const category = await Category.create({ userId, name: 'Fertilizers', slug: `fert-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'IFFCO' });
  const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

  const product = await Product.create({
    userId,
    name: 'IFFCO Urea 45kg',
    code: 'UREA-100',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 250,
    defaultSellingPrice: 1000,
    totalStock: 500,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product._id,
    batchNumber: 'BATCH-UREA-001',
    initialQuantity: 500,
    currentStock: 500,
    purchaseRate: 250,
    sellingPrice: 1000,
    isActive: true,
  });

  // ==================================================
  // TEST A: FULL PAYMENT (₹1,000 Invoice, ₹1,000 Payment)
  // ==================================================
  console.log(`--- TEST A: FULL PAYMENT (₹1,000 Invoice, ₹1,000 Payment) ---`);
  const custA = await Customer.create({ userId, name: 'Customer A (Full)', mobile: '9876543111', customerType: 'ADDED' });
  await salesInvoiceService.createInvoice(
    { customerId: custA._id.toString(), items: [{ productId: product._id.toString(), qty: 1, price: 1000 }], paidAmount: 1000, date: new Date('2026-08-14') },
    userId
  );

  const resA = await customerService.getCustomerById(custA._id.toString(), userId);
  console.log(`Financial Summary for Customer A:`);
  console.log(`  Total Purchases: ₹${resA.customer.totalPurchases}, Total Paid: ₹${resA.customer.totalPaid}, Outstanding: ₹${resA.customer.outstandingBalance}, Advance: ₹${resA.customer.advanceBalance}`);
  console.log(`Ledger Rows:`);
  resA.transactions.forEach((tx) => console.log(`  - [${tx.type}] Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  if (resA.customer.totalPurchases !== 1000 || resA.customer.totalPaid !== 1000 || resA.customer.outstandingBalance !== 0 || resA.customer.advanceBalance !== 0) {
    throw new Error(`Test A Summary Failed!`);
  }

  // Transactions are returned in reverse chronological order for display:
  // Transaction 0 in display (reverse chronological): Payment (Balance ₹ 0)
  // Transaction 1 in display (reverse chronological): Invoice (Balance ₹ 1,000 Dr)
  const payRowA = resA.transactions.find((t) => t.type === 'Payment');
  const invRowA = resA.transactions.find((t) => t.type === 'Invoice');
  if (invRowA.debit !== 1000 || invRowA.credit !== 0 || invRowA.formattedBalance !== '₹ 1,000 Dr') {
    throw new Error(`Test A Invoice Row Failed! Got debit:${invRowA.debit}, credit:${invRowA.credit}, balance:${invRowA.formattedBalance}`);
  }
  if (payRowA.debit !== 0 || payRowA.credit !== 1000 || payRowA.formattedBalance !== '₹ 0') {
    throw new Error(`Test A Payment Row Failed! Got debit:${payRowA.debit}, credit:${payRowA.credit}, balance:${payRowA.formattedBalance}`);
  }
  console.log(`✓ TEST A PASSED: Full payment shows Debit ₹1,000, Credit ₹1,000, Balance ₹0, Outstanding ₹0, Advance ₹0!`);

  // ==================================================
  // TEST B: PARTIAL PAYMENT (₹1,000 Invoice, ₹600 Payment)
  // ==================================================
  console.log(`\n--- TEST B: PARTIAL PAYMENT (₹1,000 Invoice, ₹600 Payment) ---`);
  const custB = await Customer.create({ userId, name: 'Customer B (Partial)', mobile: '9876543222', customerType: 'ADDED' });
  await salesInvoiceService.createInvoice(
    { customerId: custB._id.toString(), items: [{ productId: product._id.toString(), qty: 1, price: 1000 }], paidAmount: 600, date: new Date('2026-08-14') },
    userId
  );

  const resB = await customerService.getCustomerById(custB._id.toString(), userId);
  console.log(`Financial Summary for Customer B:`);
  console.log(`  Total Purchases: ₹${resB.customer.totalPurchases}, Total Paid: ₹${resB.customer.totalPaid}, Outstanding: ₹${resB.customer.outstandingBalance}, Advance: ₹${resB.customer.advanceBalance}`);
  console.log(`Ledger Rows:`);
  resB.transactions.forEach((tx) => console.log(`  - [${tx.type}] Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  const payRowB = resB.transactions.find((t) => t.type === 'Payment');
  if (resB.customer.totalPurchases !== 1000 || resB.customer.totalPaid !== 600 || resB.customer.outstandingBalance !== 400 || resB.customer.advanceBalance !== 0 || payRowB.formattedBalance !== '₹ 400 Dr') {
    throw new Error(`Test B Failed!`);
  }
  console.log(`✓ TEST B PASSED: Partial payment shows Debit ₹1,000, Credit ₹600, Balance ₹400 Dr, Outstanding ₹400, Advance ₹0!`);

  // ==================================================
  // TEST C: NO PAYMENT (₹1,000 Invoice, ₹0 Payment)
  // ==================================================
  console.log(`\n--- TEST C: NO PAYMENT (₹1,000 Invoice, ₹0 Payment) ---`);
  const custC = await Customer.create({ userId, name: 'Customer C (No Payment)', mobile: '9876543333', customerType: 'ADDED' });
  await salesInvoiceService.createInvoice(
    { customerId: custC._id.toString(), items: [{ productId: product._id.toString(), qty: 1, price: 1000 }], paidAmount: 0, date: new Date('2026-08-14') },
    userId
  );

  const resC = await customerService.getCustomerById(custC._id.toString(), userId);
  console.log(`Financial Summary for Customer C:`);
  console.log(`  Total Purchases: ₹${resC.customer.totalPurchases}, Total Paid: ₹${resC.customer.totalPaid}, Outstanding: ₹${resC.customer.outstandingBalance}, Advance: ₹${resC.customer.advanceBalance}`);
  console.log(`Ledger Rows:`);
  resC.transactions.forEach((tx) => console.log(`  - [${tx.type}] Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  const invRowC = resC.transactions.find((t) => t.type === 'Invoice');
  if (resC.customer.totalPurchases !== 1000 || resC.customer.totalPaid !== 0 || resC.customer.outstandingBalance !== 1000 || resC.customer.advanceBalance !== 0 || invRowC.formattedBalance !== '₹ 1,000 Dr') {
    throw new Error(`Test C Failed!`);
  }
  console.log(`✓ TEST C PASSED: No payment shows Debit ₹1,000, Credit ₹0, Balance ₹1,000 Dr, Outstanding ₹1,000, Advance ₹0!`);

  // ==================================================
  // TEST D: OVERPAYMENT (₹1,000 Invoice, ₹1,200 Payment)
  // ==================================================
  console.log(`\n--- TEST D: OVERPAYMENT (₹1,000 Invoice, ₹1,200 Payment) ---`);
  const custD = await Customer.create({ userId, name: 'Customer D (Overpaid)', mobile: '9876543444', customerType: 'ADDED' });
  await salesInvoiceService.createInvoice(
    { customerId: custD._id.toString(), items: [{ productId: product._id.toString(), qty: 1, price: 1000 }], paidAmount: 1000, date: new Date('2026-08-14') },
    userId
  );
  await customerService.recordPayment(custD._id.toString(), { amount: 200, notes: 'Overpayment Advance' }, userId);

  const resD = await customerService.getCustomerById(custD._id.toString(), userId);
  console.log(`Financial Summary for Customer D:`);
  console.log(`  Total Purchases: ₹${resD.customer.totalPurchases}, Total Paid: ₹${resD.customer.totalPaid}, Outstanding: ₹${resD.customer.outstandingBalance}, Advance: ₹${resD.customer.advanceBalance}`);
  console.log(`Ledger Rows:`);
  resD.transactions.forEach((tx) => console.log(`  - [${tx.type}] Ref: ${tx.refNo}, Debit: ₹${tx.debit}, Credit: ₹${tx.credit}, Balance: ${tx.formattedBalance}`));

  const latestPayD = resD.transactions[0]; // most recent transaction in reverse view
  if (resD.customer.totalPurchases !== 1000 || resD.customer.totalPaid !== 1200 || resD.customer.outstandingBalance !== 0 || resD.customer.advanceBalance !== 200 || latestPayD.formattedBalance !== '₹ 200 Cr') {
    throw new Error(`Test D Failed!`);
  }
  console.log(`✓ TEST D PASSED: Overpayment shows Debit ₹1,000, Credit ₹1,200, Balance ₹200 Cr, Outstanding ₹0, Advance ₹200!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL ACCOUNTING DEBIT/CREDIT/BALANCE FIX TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runDebitCreditBalanceAccountingTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
