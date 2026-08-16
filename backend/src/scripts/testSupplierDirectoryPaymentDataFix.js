import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../modules/auth/user.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { supplierService } from '../modules/suppliers/services/supplier.service.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runSupplierPaymentDataTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Masters
  const user = await User.create({
    ownerName: 'Supplier Payment Data Test User',
    mobile: `997${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa Supplier Payment Test Hub',
  });
  const userId = user._id;

  const category = await Category.create({ userId, name: 'Pesticides', slug: `pest-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Bayer' });
  const unit = await Unit.create({ userId, name: 'Litres', shortName: 'L' });

  const product = await Product.create({
    userId,
    name: 'Bayer Confidor',
    code: 'CONF-100',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 500,
    defaultSellingPrice: 650,
    totalStock: 0,
    isActive: true,
  });
  const productId = product._id.toString();

  // ==================================================
  // CASE 1: NO PAYMENTS
  // ==================================================
  console.log(`--- CASE 1: SUPPLIER WITH NO PAYMENTS ---`);
  const supA = await supplierService.createSupplier({ name: 'Supplier A (No Payment)', mobile: '9876543211' }, userId);
  await purchaseService.createPurchase(
    {
      supplierId: supA._id.toString(),
      supplierInvoiceNumber: 'PUR-CASE1-01',
      purchaseDate: new Date('2026-08-10'),
      items: [{ productId, quantity: 20, purchaseRate: 500, sellingPrice: 650 }],
      paidAmount: 0,
    },
    userId
  );

  const resA = await supplierService.getAllSuppliers({ search: 'Supplier A' }, userId);
  const dataA = resA.suppliers.find((s) => s._id.toString() === supA._id.toString());
  console.log(`Supplier A Data: Total Purchases = ₹${dataA.totalPurchases}, Total Payments = ₹${dataA.totalPayments}, Outstanding = ₹${dataA.outstandingBalance}, Last Payment Date = ${dataA.lastPaymentDate}, Last Payment Amount = ${dataA.lastPaymentAmount}`);

  if (dataA.totalPurchases !== 10000 || dataA.totalPayments !== 0 || dataA.lastPaymentDate !== null || dataA.lastPaymentAmount !== 0 || dataA.outstandingBalance !== 10000) {
    throw new Error(`Case 1 Failed!`);
  }
  console.log(`✓ CASE 1 PASSED: Supplier with 0 payment shows Total Payments = ₹0, Last Payment Date = null, Last Payment Amount = 0!`);

  // ==================================================
  // CASE 2: ONE PAYMENT
  // ==================================================
  console.log(`\n--- CASE 2: SUPPLIER WITH ONE INLINE PAYMENT ---`);
  const supB = await supplierService.createSupplier({ name: 'Supplier B (One Payment)', mobile: '9876543212' }, userId);
  await purchaseService.createPurchase(
    {
      supplierId: supB._id.toString(),
      supplierInvoiceNumber: 'PUR-CASE2-01',
      purchaseDate: new Date('2026-08-11'),
      items: [{ productId, quantity: 20, purchaseRate: 500, sellingPrice: 650 }],
      paidAmount: 4000,
    },
    userId
  );

  const resB = await supplierService.getAllSuppliers({ search: 'Supplier B' }, userId);
  const dataB = resB.suppliers.find((s) => s._id.toString() === supB._id.toString());
  console.log(`Supplier B Data: Total Purchases = ₹${dataB.totalPurchases}, Total Payments = ₹${dataB.totalPayments}, Outstanding = ₹${dataB.outstandingBalance}, Last Payment Date = ${dataB.lastPaymentDate}, Last Payment Amount = ₹${dataB.lastPaymentAmount}`);

  if (dataB.totalPurchases !== 10000 || dataB.totalPayments !== 4000 || dataB.lastPaymentAmount !== 4000 || dataB.outstandingBalance !== 6000) {
    throw new Error(`Case 2 Failed!`);
  }
  console.log(`✓ CASE 2 PASSED: Supplier with 1 payment shows Total Payments = ₹4,000, Last Payment Amount = ₹4,000, Outstanding = ₹6,000!`);

  // ==================================================
  // CASE 3: MULTIPLE PAYMENTS (BSR SUPPLIERS SCENARIO)
  // ==================================================
  console.log(`\n--- CASE 3: BSR SUPPLIERS SCENARIO (PURCHASE PAYMENT + STANDALONE PAYMENT) ---`);
  const supC = await supplierService.createSupplier({ name: 'BSR suppliers', mobile: '9876543213' }, userId);

  // Purchase: ₹23,500 total, ₹5,000 initial payment on 12 Aug 2026
  await purchaseService.createPurchase(
    {
      supplierId: supC._id.toString(),
      supplierInvoiceNumber: 'PUR-BSR-01',
      purchaseDate: new Date('2026-08-12'),
      items: [{ productId, quantity: 47, purchaseRate: 500, sellingPrice: 650 }],
      paidAmount: 5000,
    },
    userId
  );

  // Standalone Payment: ₹9,500 on 14 Aug 2026
  const payEntry = await supplierService.recordSupplierPayment(
    supC._id.toString(),
    {
      amount: 9500,
      paymentMode: 'Bank Transfer',
      date: new Date('2026-08-14'),
      notes: 'Part Payment for BSR suppliers',
    },
    userId
  );

  const resC = await supplierService.getAllSuppliers({ search: 'BSR suppliers' }, userId);
  const dataC = resC.suppliers.find((s) => s._id.toString() === supC._id.toString());
  console.log(`BSR suppliers Data:`);
  console.log(`  Total Purchases: ₹${dataC.totalPurchases}`);
  console.log(`  Total Payments: ₹${dataC.totalPayments}`);
  console.log(`  Current Outstanding: ₹${dataC.outstandingBalance}`);
  console.log(`  Last Payment Date: ${dataC.lastPaymentDate}`);
  console.log(`  Last Payment Amount: ₹${dataC.lastPaymentAmount}`);

  if (dataC.totalPurchases !== 23500 || dataC.totalPayments !== 14500 || dataC.outstandingBalance !== 9000 || dataC.lastPaymentAmount !== 9500) {
    throw new Error(`Case 3 Failed!`);
  }
  console.log(`✓ CASE 3 PASSED: BSR suppliers shows Total Purchases = ₹23,500, Total Payments = ₹14,500, Outstanding = ₹9,000, Last Payment Amount = ₹9,500!`);

  // ==================================================
  // CASE 4: DELETED PAYMENT ISOLATION TEST
  // ==================================================
  console.log(`\n--- CASE 4: SOFT-DELETED PAYMENT ISOLATION ---`);
  console.log(`Soft-deleting ₹9,500 payment entry (${payEntry._id})...`);
  await supplierService.softDeletePayment(payEntry._id.toString(), userId, 'DELETE');

  const resCDel = await supplierService.getAllSuppliers({ search: 'BSR suppliers' }, userId);
  const dataCDel = resCDel.suppliers.find((s) => s._id.toString() === supC._id.toString());
  console.log(`BSR suppliers Data after soft-deleting ₹9,500 payment:`);
  console.log(`  Total Payments: ₹${dataCDel.totalPayments}`);
  console.log(`  Current Outstanding: ₹${dataCDel.outstandingBalance}`);
  console.log(`  Last Payment Amount: ₹${dataCDel.lastPaymentAmount}`);

  if (dataCDel.totalPayments !== 5000 || dataCDel.outstandingBalance !== 18500 || dataCDel.lastPaymentAmount !== 5000) {
    throw new Error(`Case 4 Failed! Soft-deleted payment was not excluded from active totals.`);
  }
  console.log(`✓ CASE 4 PASSED: Soft-deleted payment was cleanly excluded from active Total Payments (now ₹5,000), Outstanding (now ₹18,500), and Last Payment Amount (now ₹5,000)!`);

  // ==================================================
  // CASE 5: SUMMARY STATS TOP METRICS VERIFICATION
  // ==================================================
  console.log(`\n--- CASE 5: TOP SUMMARY CARDS METRICS CHECK ---`);
  const allRes = await supplierService.getAllSuppliers({}, userId);
  console.log(`Directory Summary Stats:`);
  console.log(`  Total Suppliers: ${allRes.summaryStats.totalSuppliers}`);
  console.log(`  Total Purchases Amount: ₹${allRes.summaryStats.totalPurchasesAmount}`);
  console.log(`  Total Payments Amount: ₹${allRes.summaryStats.totalPaymentsAmount}`);
  console.log(`  Total Outstanding Due: ₹${allRes.summaryStats.totalOutstandingDue}`);

  if (allRes.summaryStats.totalPaymentsAmount <= 0) {
    throw new Error(`Summary Stats totalPaymentsAmount is zero!`);
  }
  console.log(`✓ CASE 5 PASSED: Summary Cards Total Payments Card returns ₹${allRes.summaryStats.totalPaymentsAmount}!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL SUPPLIER DIRECTORY PAYMENT DATA FIX TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runSupplierPaymentDataTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
