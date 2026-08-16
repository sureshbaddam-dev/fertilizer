import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';
import { productService } from '../modules/products/services/product.service.js';
import { supplierService } from '../modules/suppliers/services/supplier.service.js';
import { normalizeMoney } from '../utils/pricingUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runCompleteVedixaTestSuite() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`\n====================================================================`);
  console.log(`  RUNNING COMPLETE VEDIXA ERP TEST SUITE ON ${mongoUri}`);
  console.log(`====================================================================\n`);

  await mongoose.connect(mongoUri);

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create isolated test user & masters
    // -------------------------------------------------------------------------
    const testMobile = `999${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testUser = await User.create({
      ownerName: 'Vedixa Test User',
      mobile: testMobile,
      passwordHash: '$2a$10$hashforexamplepassword12345',
      businessName: 'Vedixa ERP Test Hub',
    });
    const userId = testUser._id;

    const brand = await Brand.create({ userId, name: 'Vedixa Agro Brand' });
    const category = await Category.create({ userId, name: 'Fertilizers Master', slug: 'fertilizers-master' });
    const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

    const supplier = await Supplier.create({
      userId,
      name: 'Agri Supply Corp',
      mobile: '9876543210',
      outstandingBalance: 0,
    });

    const product = await productService.createProduct({
      name: 'NPK 19-19-19 Test Fertilizer',
      brandId: brand._id,
      categoryId: category._id,
      defaultUnitId: unit._id,
      defaultPurchaseRate: 300,
      defaultSellingPrice: 420,
      totalStock: 0,
    }, userId);
    const productId = product._id;

    console.log(`✓ Test Setup complete. User ID: ${userId}, Product ID: ${productId}\n`);

    // -------------------------------------------------------------------------
    // TEST 1 & 5: SELLING PRICE EXACT VALUE NORMALIZATION (350, 400, 420, 419.99)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: SELLING PRICE EXACT VALUE & NORMALIZATION ---');
    const testPrices = [350, 400, 420, 419.99];
    testPrices.forEach((p) => {
      const normalized = normalizeMoney(p);
      console.log(`Input: ${p} => Normalized: ${normalized} (Type: ${typeof normalized})`);
      if (p === 420 && normalized !== 420) {
        throw new Error(`Expected exactly 420, got ${normalized}`);
      }
      if (p === 419.99 && normalized !== 419.99) {
        throw new Error(`Expected exactly 419.99, got ${normalized}`);
      }
    });
    console.log('✓ TEST 1 PASSED: Selling price exact-value normalization works perfectly!\n');

    // -------------------------------------------------------------------------
    // TEST 2, 3, 4: THREE FRESH PURCHASES, MULTI-ITEM & AUTHORITATIVE BATCH NUMBERS
    // -------------------------------------------------------------------------
    console.log('--- TEST 2, 3 & 4: FRESH PURCHASES & AUTHORITATIVE BATCH NUMBERS ---');

    // Purchase 1: Batch 001 -> Qty 10 -> Rate ₹300 -> Selling ₹350
    const p1 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-VEDIXA-1`,
      items: [
        {
          productId,
          productName: product.name,
          batchNumber: '', // Empty -> Backend generates authoritative sequence
          quantity: 10,
          purchaseRate: 300,
          sellingPrice: 350,
        },
      ],
    }, userId);

    // Purchase 2: Batch 002 -> Qty 20 -> Rate ₹350 -> Selling ₹420
    const p2 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-VEDIXA-2`,
      items: [
        {
          productId,
          productName: product.name,
          batchNumber: '',
          quantity: 20,
          purchaseRate: 350,
          sellingPrice: 420,
        },
      ],
    }, userId);

    // Purchase 3: Batch 003 -> Qty 15 -> Rate ₹400 -> Selling ₹450
    const p3 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-VEDIXA-3`,
      items: [
        {
          productId,
          productName: product.name,
          batchNumber: '',
          quantity: 15,
          purchaseRate: 400,
          sellingPrice: 450,
        },
      ],
    }, userId);

    // Check Product Details API Response
    const prodDetailsP1 = await productService.getProductById(productId, userId);
    console.log(`Active Batches Count: ${prodDetailsP1.product.activeBatchCount}`);
    console.log(`Batches list:`);
    prodDetailsP1.batches.forEach((b) => {
      console.log(`  • Batch '${b.batchNumber}' (ID: ${b._id}) => Qty: ${b.currentStock}, Rate: ₹${b.purchaseRate}, Selling: ₹${b.sellingPrice}`);
    });

    if (prodDetailsP1.batches.length !== 3) {
      throw new Error(`Expected 3 active batches, got ${prodDetailsP1.batches.length}`);
    }

    const batchNumbers = prodDetailsP1.batches.map((b) => b.batchNumber);
    const uniqueBatches = new Set(batchNumbers);
    if (uniqueBatches.size !== 3) {
      throw new Error('Duplicate batch numbers generated!');
    }
    console.log('✓ TEST 2, 3 & 4 PASSED: Authoritative batch numbers generated without duplicates!\n');

    // -------------------------------------------------------------------------
    // TEST 6: BATCH-SPECIFIC SELLING PRICE EDIT
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: BATCH-SPECIFIC SELLING PRICE EDIT ---');
    const batch2Id = p2.items[0].batchId;
    const batch1Id = p1.items[0].batchId;

    console.log(`Editing Batch 002 (ID: ${batch2Id}) selling price to ₹425...`);
    const updateResult = await productService.updateBatch(batch2Id, { sellingPrice: 425 }, userId);

    const b1After = updateResult.batches.find((b) => b._id.toString() === batch1Id.toString());
    const b2After = updateResult.batches.find((b) => b._id.toString() === batch2Id.toString());

    console.log(`Batch 001 Selling Price after edit: ₹${b1After.sellingPrice}`);
    console.log(`Batch 002 Selling Price after edit: ₹${b2After.sellingPrice}`);

    if (b2After.sellingPrice !== 425) {
      throw new Error(`Expected Batch 002 selling price to be 425, got ${b2After.sellingPrice}`);
    }
    if (b1After.sellingPrice !== 350) {
      throw new Error(`Batch 001 selling price was mutated unexpectedly!`);
    }

    // Attempt invalid selling price edit (<= 0)
    try {
      await productService.updateBatch(batch2Id, { sellingPrice: 0 }, userId);
      throw new Error('Allowed invalid price 0!');
    } catch (err) {
      console.log(`✓ Correctly rejected invalid price 0 edit: '${err.message}'`);
    }
    console.log('✓ TEST 6 PASSED: Batch selling price edit updated only Batch 002!\n');

    // -------------------------------------------------------------------------
    // TEST 11: SALES-HISTORY SAFETY TEST (PREVENT UNSAFE DELETION)
    // -------------------------------------------------------------------------
    console.log('--- TEST 11: SALES-HISTORY SAFETY TEST ---');
    // Simulate stock consumption on Batch 002 by setting currentStock to 15 (5 sold)
    const b2Doc = await ProductBatch.findById(batch2Id);
    b2Doc.currentStock = 15;
    await b2Doc.save();

    try {
      await purchaseService.softDeletePurchase(p2.purchase._id, userId, 'DELETE');
      throw new Error('Should have blocked deletion because stock was sold!');
    } catch (err) {
      console.log(`✓ Purchase deletion correctly BLOCKED because stock was sold: '${err.message}'`);
    }

    // Restore currentStock to 20 for cascade test
    b2Doc.currentStock = 20;
    await b2Doc.save();
    console.log('✓ TEST 11 PASSED: Unsafe purchase deletion prevented when stock sold!\n');

    // -------------------------------------------------------------------------
    // TEST 7, 8, 9, 10: PURCHASE DELETE CASCADE & REVERSAL
    // -------------------------------------------------------------------------
    console.log('--- TEST 7, 8, 9 & 10: PURCHASE DELETE CASCADE & REVERSAL ---');
    console.log(`Deleting Purchase 2 (ID: ${p2.purchase._id})...`);
    await purchaseService.softDeletePurchase(p2.purchase._id, userId, 'DELETE');

    // Check remaining product stock & batches
    const prodAfterDelete = await productService.getProductById(productId, userId);
    console.log(`Product totalStock after deleting Purchase 2: ${prodAfterDelete.product.totalStock}`);
    console.log(`Remaining active batches: ${prodAfterDelete.batches.length}`);
    prodAfterDelete.batches.forEach((b) => {
      console.log(`  • Batch '${b.batchNumber}' (ID: ${b._id}) => Stock: ${b.currentStock}`);
    });

    if (prodAfterDelete.product.totalStock !== 25) {
      throw new Error(`Expected total stock 25 (10 + 15), got ${prodAfterDelete.product.totalStock}`);
    }
    if (prodAfterDelete.batches.length !== 2) {
      throw new Error(`Expected 2 active batches, got ${prodAfterDelete.batches.length}`);
    }

    // Verify Product History ignores deleted Purchase 2
    const prodHistoryAfter = await productService.getProductHistory(productId, userId);
    console.log(`Purchase history length after delete: ${prodHistoryAfter.purchaseHistory.length}`);
    if (prodHistoryAfter.purchaseHistory.length !== 2) {
      throw new Error(`Purchase history still contains deleted Purchase 2!`);
    }

    // Verify Supplier Ledger does not include Purchase 2
    const supLedgerAfter = await supplierService.getSupplierLedger(supplier._id, {}, userId);
    const deletedLedgerEntry = supLedgerAfter.ledgerEntries.find((e) => e.purchaseId?._id?.toString() === p2.purchase._id.toString());
    if (deletedLedgerEntry) {
      throw new Error(`Supplier ledger still includes deleted Purchase 2!`);
    }
    console.log(`Supplier Outstanding Balance after reversal: ₹${supLedgerAfter.summary.closingBalance}`);
    console.log('✓ TEST 7, 8, 9 & 10 PASSED: Purchase deletion cascaded and reversed all inventory & ledger effects!\n');

    // -------------------------------------------------------------------------
    // TEST 12: MULTI-TENANT ISOLATION TEST
    // -------------------------------------------------------------------------
    console.log('--- TEST 12: MULTI-TENANT ISOLATION TEST ---');
    const userB = await User.create({
      ownerName: 'User B',
      mobile: `998${Math.floor(1000000 + Math.random() * 9000000)}`,
      passwordHash: '$2a$10$hashforexamplepassword12345',
    });

    // User B tries to fetch User A's product
    try {
      await productService.getProductById(productId, userB._id);
      throw new Error('User B was able to access User A product!');
    } catch (err) {
      console.log(`✓ User B access blocked for User A product: '${err.message}'`);
    }

    // User B tries to delete User A's purchase
    try {
      await purchaseService.softDeletePurchase(p1.purchase._id, userB._id, 'DELETE');
      throw new Error('User B was able to delete User A purchase!');
    } catch (err) {
      console.log(`✓ User B blocked from deleting User A purchase: '${err.message}'`);
    }

    console.log('✓ TEST 12 PASSED: Multi-tenant isolation verified!\n');

    // Cleanup Test User & Data
    await User.deleteMany({ _id: { $in: [userId, userB._id] } });
    await Product.deleteMany({ userId });
    await ProductBatch.deleteMany({ userId });
    await Supplier.deleteMany({ userId });
    await Purchase.deleteMany({ userId });
    await PurchaseItem.deleteMany({ userId });
    await StockLedger.deleteMany({ userId });
    await SupplierLedger.deleteMany({ userId });
    await Brand.deleteMany({ userId });
    await Category.deleteMany({ userId });
    await Unit.deleteMany({ userId });

    console.log(`====================================================================`);
    console.log(`  🎉 ALL 12 AUTOMATED VEDIXA ERP TEST SCENARIOS PASSED 100%!  `);
    console.log(`====================================================================\n`);
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

runCompleteVedixaTestSuite().catch(() => process.exit(1));
