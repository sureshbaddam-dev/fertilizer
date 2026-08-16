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
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { productService } from '../modules/products/services/product.service.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runInventoryHistoryPricesTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Supplier
  const user = await User.create({
    ownerName: 'Inventory History Price Test User',
    mobile: `998${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa History Price Test Hub',
  });
  const userId = user._id;

  const supplier = await Supplier.create({
    userId,
    name: 'Pioneer Suppliers Ltd',
    mobile: '9876543210',
    isActive: true,
  });

  const category = await Category.create({ userId, name: 'Fertilizers', slug: `fert-hist-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Pioneer' });
  const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

  // Create Product Master (Initial master selling price = 350)
  const product = await Product.create({
    userId,
    name: 'Pioneer NPK 10:26:26',
    code: 'PNPK-102626',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 300,
    defaultSellingPrice: 350,
    totalStock: 0,
    isActive: true,
  });
  const productId = product._id.toString();
  console.log(`✓ Initialized Product '${product.name}' (ID: ${productId})`);

  // ==================================================
  // STEP 1: CREATE 3 PURCHASES WITH DIFFERENT BATCH PRICES
  // ==================================================
  console.log(`\n--- STEP 1: CREATING 3 PURCHASES WITH DIFFERENT RATES ---`);

  // Purchase 1: 10 Bags @ ₹300 Purchase Rate, ₹350 Selling Price
  const pur1Res = await purchaseService.createPurchase(
    {
      supplierId: supplier._id.toString(),
      supplierInvoiceNumber: 'PUR-INV-001',
      purchaseDate: new Date('2026-08-11'),
      items: [{
        productId,
        quantity: 10,
        purchaseRate: 300,
        sellingPrice: 350,
        batchNumber: 'BATCH-001',
      }],
      paidAmount: 3000,
    },
    userId
  );
  console.log(`✓ Purchase 1 Created: 10 Bags @ ₹300 Rate, ₹350 Selling Price (Batch: BATCH-001)`);

  // Purchase 2: 20 Bags @ ₹350 Purchase Rate, ₹450 Selling Price
  const pur2Res = await purchaseService.createPurchase(
    {
      supplierId: supplier._id.toString(),
      supplierInvoiceNumber: 'PUR-INV-002',
      purchaseDate: new Date('2026-08-11'),
      items: [{
        productId,
        quantity: 20,
        purchaseRate: 350,
        sellingPrice: 450,
        batchNumber: 'BATCH-002',
      }],
      paidAmount: 7000,
    },
    userId
  );
  console.log(`✓ Purchase 2 Created: 20 Bags @ ₹350 Rate, ₹450 Selling Price (Batch: BATCH-002)`);

  // Purchase 3: 15 Bags @ ₹400 Purchase Rate, ₹500 Selling Price
  const pur3Res = await purchaseService.createPurchase(
    {
      supplierId: supplier._id.toString(),
      supplierInvoiceNumber: 'PUR-INV-003',
      purchaseDate: new Date('2026-08-11'),
      items: [{
        productId,
        quantity: 15,
        purchaseRate: 400,
        sellingPrice: 500,
        batchNumber: 'BATCH-003',
      }],
      paidAmount: 6000,
    },
    userId
  );
  console.log(`✓ Purchase 3 Created: 15 Bags @ ₹400 Rate, ₹500 Selling Price (Batch: BATCH-003)`);

  // ==================================================
  // STEP 2: VERIFY PURCHASE HISTORY API RATES
  // ==================================================
  console.log(`\n--- STEP 2: VERIFYING PURCHASE HISTORY PRICES ---`);
  let historyData = await productService.getProductHistory(productId, userId);
  console.log(`Fetched Purchase History (${historyData.purchaseHistory.length} rows):`);
  historyData.purchaseHistory.forEach((ph, idx) => {
    console.log(`  Row ${idx + 1}: Invoice #${ph.invoiceNumber}, Qty: +${ph.quantity}, Purchase Rate: ₹${ph.purchaseRate}, Rate Alias: ₹${ph.rate}`);
  });

  if (historyData.purchaseHistory.length !== 3) {
    throw new Error(`Expected 3 purchase history rows, got ${historyData.purchaseHistory.length}`);
  }

  const p1 = historyData.purchaseHistory.find((p) => p.invoiceNumber === 'PUR-INV-001');
  const p2 = historyData.purchaseHistory.find((p) => p.invoiceNumber === 'PUR-INV-002');
  const p3 = historyData.purchaseHistory.find((p) => p.invoiceNumber === 'PUR-INV-003');

  if (p1.purchaseRate !== 300 || p1.rate !== 300) throw new Error(`Purchase 1 Rate mismatch! Got ${p1.purchaseRate}`);
  if (p2.purchaseRate !== 350 || p2.rate !== 350) throw new Error(`Purchase 2 Rate mismatch! Got ${p2.purchaseRate}`);
  if (p3.purchaseRate !== 400 || p3.rate !== 400) throw new Error(`Purchase 3 Rate mismatch! Got ${p3.purchaseRate}`);

  console.log(`✓ VERIFIED: Purchase History displays exact purchase rates (₹300, ₹350, ₹400). Zero rate bug is fixed!`);

  // ==================================================
  // STEP 3: PERFORM MULTI-BATCH FIFO SALE OF 15 BAGS
  // ==================================================
  console.log(`\n--- STEP 3: PERFORMING MULTI-BATCH FIFO SALE OF 15 BAGS ---`);
  // FIFO expected: 10 Bags from BATCH-001 @ ₹350 + 5 Bags from BATCH-002 @ ₹450
  const saleRes = await salesInvoiceService.createInvoice(
    {
      customerName: 'Multi-Batch Test Farmer',
      items: [{
        productId,
        quantity: 15,
      }],
      paidAmount: 5750, // 10 * 350 + 5 * 450 = 3500 + 2250 = 5750
    },
    userId
  );

  console.log(`Created Invoice #${saleRes.invoice.invoiceNumber}: Grand Total = ₹${saleRes.invoice.totalAmount}`);

  // ==================================================
  // STEP 4: VERIFY SALES HISTORY PRESERVES BOTH PRICES
  // ==================================================
  console.log(`\n--- STEP 4: VERIFYING SALES HISTORY PRESERVES SEPARATE BATCH PRICES ---`);
  historyData = await productService.getProductHistory(productId, userId);
  console.log(`Fetched Sales History (${historyData.salesHistory.length} rows):`);
  historyData.salesHistory.forEach((sh, idx) => {
    console.log(`  Row ${idx + 1}: Invoice #${sh.invoiceNumber}, Batch: ${sh.batchNumber}, Qty: -${sh.quantity}, Selling Price: ₹${sh.sellingPrice}, Price Alias: ₹${sh.price}`);
  });

  if (historyData.salesHistory.length !== 2) {
    throw new Error(`Expected 2 sales history rows for 2 batches, got ${historyData.salesHistory.length}`);
  }

  const sRow1 = historyData.salesHistory.find((s) => s.sellingPrice === 350);
  const sRow2 = historyData.salesHistory.find((s) => s.sellingPrice === 450);

  if (sRow1.quantity !== 10 || sRow1.sellingPrice !== 350 || sRow1.price !== 350) {
    throw new Error(`Sales History Row 1 mismatch! Got Qty: ${sRow1.quantity}, Price: ${sRow1.sellingPrice}`);
  }
  if (sRow2.quantity !== 5 || sRow2.sellingPrice !== 450 || sRow2.price !== 450) {
    throw new Error(`Sales History Row 2 mismatch! Got Qty: ${sRow2.quantity}, Price: ${sRow2.sellingPrice}`);
  }

  console.log(`✓ VERIFIED: Sales History preserves both distinct selling prices (10 @ ₹350 and 5 @ ₹450). No merging or zero prices!`);

  // ==================================================
  // STEP 5: HISTORICAL PRICE STABILITY TEST
  // ==================================================
  console.log(`\n--- STEP 5: TESTING HISTORICAL PRICE STABILITY WHEN PRODUCT MASTER PRICE CHANGES ---`);
  await Product.findByIdAndUpdate(productId, { defaultSellingPrice: 999, defaultPurchaseRate: 888 });
  console.log(`Changed Product Master defaultSellingPrice to ₹999 and defaultPurchaseRate to ₹888...`);

  historyData = await productService.getProductHistory(productId, userId);
  const p1After = historyData.purchaseHistory.find((p) => p.invoiceNumber === 'PUR-INV-001');
  const s1After = historyData.salesHistory.find((s) => s.sellingPrice === 350);

  if (p1After.purchaseRate !== 300) throw new Error(`Historical purchase rate changed unexpectedly! Got ${p1After.purchaseRate}`);
  if (s1After.sellingPrice !== 350) throw new Error(`Historical selling price changed unexpectedly! Got ${s1After.sellingPrice}`);

  console.log(`✓ VERIFIED: Historical purchase rate (₹300) and selling price (₹350) remained unchanged despite Product master price update to ₹999!`);

  // ==================================================
  // STEP 6: PRODUCT DEACTIVATION INTEGRITY TEST
  // ==================================================
  console.log(`\n--- STEP 6: TESTING PRODUCT DEACTIVATION INTEGRITY ---`);
  await Product.findByIdAndUpdate(productId, { isActive: false, deletedAt: new Date() });
  console.log(`Deactivated Product '${product.name}' (isActive: false)...`);

  historyData = await productService.getProductHistory(productId, userId);
  if (historyData.purchaseHistory.length !== 3 || historyData.salesHistory.length !== 2) {
    throw new Error(`Deactivating product deleted or hid historical records!`);
  }
  console.log(`✓ VERIFIED: Deactivating product retains full historical purchase and sales records!`);

  // Reactivate product for purchase soft delete test
  await Product.findByIdAndUpdate(productId, { isActive: true, deletedAt: null });

  // ==================================================
  // STEP 7: PURCHASE SOFT DELETE ISOLATION TEST
  // ==================================================
  console.log(`\n--- STEP 7: TESTING PURCHASE SOFT DELETE ISOLATION ---`);
  const pur3Doc = await Purchase.findOne({ userId, supplierInvoiceNumber: 'PUR-INV-003' });
  console.log(`Soft-deleting Purchase 3 (PUR-INV-003, 15 Bags @ ₹400)...`);
  await purchaseService.softDeletePurchase(pur3Doc._id.toString(), userId);

  historyData = await productService.getProductHistory(productId, userId);
  console.log(`Purchase History after soft-deleting Purchase 3 (${historyData.purchaseHistory.length} rows remaining):`);
  historyData.purchaseHistory.forEach((p) => console.log(`  Invoice #${p.invoiceNumber}, Qty: +${p.quantity}`));

  const deletedPurInHistory = historyData.purchaseHistory.find((p) => p.invoiceNumber === 'PUR-INV-003');
  if (deletedPurInHistory) {
    throw new Error(`Soft-deleted purchase PUR-INV-003 still appeared in active purchase history!`);
  }

  const updatedProdDoc = await Product.findById(productId);
  console.log(`Updated Product Live Stock: ${updatedProdDoc.totalStock} Bags (Expected: 30 Bags)`);
  if (updatedProdDoc.totalStock !== 30) {
    throw new Error(`Expected live stock 30 Bags after soft-deleting 15 Bags purchase, got ${updatedProdDoc.totalStock}`);
  }

  console.log(`✓ VERIFIED: Soft-deleting purchase cleanly isolates active history view and recalculates live stock without physical deletion!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL INVENTORY HISTORY PRICE FIX TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runInventoryHistoryPricesTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
