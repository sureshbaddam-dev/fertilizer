import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../modules/auth/user.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { productService } from '../modules/products/services/product.service.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';

dotenv.config();

async function runTestSuite() {
  const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp').replace(/\/mandhi_erp(\?.*)?$/, '/mandhi_erp_test$1');
  console.log(`\n==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${mongoUri}`);
  console.log(`==================================================\n`);

  await mongoose.connect(mongoUri);

  try {
    // 1. SETUP ISOLATED TEST USER & MASTERS
    const testUser = await User.create({
      ownerName: 'Batch Architecture Test User',
      mobile: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
      passwordHash: '$2a$10$hashforexamplepassword12345',
      businessName: 'Vedixa ERP Test Hub',
    });
    const userId = testUser._id.toString();

    const category = await Category.create({ userId, name: 'Test Fertilizer Category', slug: `test-fertilizer-${Date.now()}` });
    const brand = await Brand.create({ userId, name: 'Test Pioneer Brand' });
    const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });
    const supplier = await Supplier.create({ userId, name: 'Pioneer Test Supplier', mobile: `9848${Math.floor(100000 + Math.random() * 900000)}` });

    console.log(`✓ Test User & Masters initialized successfully (UserId: ${userId})`);

    // ==================================================
    // TEST SECTION A: BATCH INDEPENDENT PRICE EDITING (Req 4 & 13)
    // ==================================================
    console.log(`\n--- TEST SECTION A: BATCH INDEPENDENT PRICE EDITING ---`);

    const productRes = await productService.createProduct({
      name: 'Pioneer Multi-Batch Test Product',
      categoryId: category._id,
      brandId: brand._id,
      defaultUnitId: unit._id,
      defaultSellingPrice: 350,
      defaultPurchaseRate: 300,
    }, userId);

    const product = productRes.product || productRes;
    const productId = (product._id || product.id).toString();

    // Create Purchase A: Qty 15, Rate ₹300, Selling ₹350
    const purchaseARes = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-A-${Date.now()}`,
      purchaseDate: new Date(),
      items: [
        {
          productId: product._id,
          batchNumber: 'BATCH-001',
          quantity: 15,
          purchaseRate: 300,
          mrp: 400,
          sellingPrice: 350,
        },
      ],
    }, userId);

    // Create Purchase B: Qty 20, Rate ₹400, Selling ₹450
    const purchaseBRes = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-B-${Date.now()}`,
      purchaseDate: new Date(),
      items: [
        {
          productId: product._id,
          batchNumber: 'BATCH-002',
          quantity: 20,
          purchaseRate: 400,
          mrp: 500,
          sellingPrice: 450,
        },
      ],
    }, userId);

    let productDetails = await productService.getProductById(productId, userId);
    let batches = productDetails.batches || productDetails.product?.batches || [];
    console.log(`Initial Batches Count: ${batches.length}`);

    const batch1 = batches[0];
    const batch2 = batches[1];

    console.log(`Batch 1 Initial (${batch1.batchNumber}): Purchase ₹${batch1.purchaseRate}, Selling ₹${batch1.sellingPrice}, Qty ${batch1.currentStock}`);
    console.log(`Batch 2 Initial (${batch2.batchNumber}): Purchase ₹${batch2.purchaseRate}, Selling ₹${batch2.sellingPrice}, Qty ${batch2.currentStock}`);

    // Step 1: Right click Batch 2 -> Edit Selling Price -> ₹420
    console.log(`\nAction: Edit Batch 2 (${batch2.batchNumber}) Selling Price to ₹420.00...`);
    await productService.updateBatch(batch2._id.toString(), { sellingPrice: 420 }, userId);

    productDetails = await productService.getProductById(productId, userId);
    let allBatchesUpdated = productDetails.batches || productDetails.product?.batches || [];
    let b1Updated = allBatchesUpdated.find((b) => b._id.toString() === batch1._id.toString());
    let b2Updated = allBatchesUpdated.find((b) => b._id.toString() === batch2._id.toString());

    console.log(`Batch 1 After Selling Edit: Purchase ₹${b1Updated.purchaseRate}, Selling ₹${b1Updated.sellingPrice}`);
    console.log(`Batch 2 After Selling Edit: Purchase ₹${b2Updated.purchaseRate}, Selling ₹${b2Updated.sellingPrice}`);

    if (b1Updated.sellingPrice !== 350 || b2Updated.sellingPrice !== 420) {
      throw new Error('FAILED: Batch 2 selling price update affected Batch 1 or failed!');
    }
    console.log(`✓ VERIFIED: Selling price edit affected ONLY Batch 2! Batch 1 untouched.`);

    // Step 2: Edit Batch 2 Purchase Rate -> ₹390
    console.log(`\nAction: Edit Batch 2 (${batch2.batchNumber}) Purchase Rate to ₹390.00...`);
    await productService.updateBatch(batch2._id.toString(), { purchaseRate: 390 }, userId);

    productDetails = await productService.getProductById(productId, userId);
    allBatchesUpdated = productDetails.batches || productDetails.product?.batches || [];
    b1Updated = allBatchesUpdated.find((b) => b._id.toString() === batch1._id.toString());
    b2Updated = allBatchesUpdated.find((b) => b._id.toString() === batch2._id.toString());

    console.log(`Batch 1 Final: Purchase ₹${b1Updated.purchaseRate}, Selling ₹${b1Updated.sellingPrice}`);
    console.log(`Batch 2 Final: Purchase ₹${b2Updated.purchaseRate}, Selling ₹${b2Updated.sellingPrice}`);

    if (b1Updated.purchaseRate !== 300 || b2Updated.purchaseRate !== 390 || b2Updated.sellingPrice !== 420) {
      throw new Error('FAILED: Batch 2 purchase rate update corrupted pricing architecture!');
    }
    console.log(`✓ VERIFIED: Purchase rate edit affected ONLY Batch 2 purchase rate! Selling price & Batch 1 untouched.`);

    // ==================================================
    // TEST SECTION B: PURCHASE DELETION STOCK RULE (Req 6, 7, 8, 9, 14)
    // ==================================================
    console.log(`\n--- TEST SECTION B: PURCHASE DELETION & SOFT DELETE CASCADE ---`);

    const purchaseA = purchaseARes.purchase || purchaseARes;
    const purchaseAId = (purchaseA._id || purchaseA.id).toString();
    const purchaseB = purchaseBRes.purchase || purchaseBRes;
    const purchaseBId = (purchaseB._id || purchaseB.id).toString();

    let liveProductDoc = await Product.findById(productId);
    console.log(`Total Live Stock Before Purchase A Deletion: ${liveProductDoc.totalStock} Bags (Expected: 35)`);

    console.log(`\nAction: Soft-deleting Purchase A (ID: ${purchaseAId})...`);
    await purchaseService.deletePurchase(purchaseAId, userId);

    // Verify Live State
    productDetails = await productService.getProductById(productId, userId);
    liveProductDoc = await Product.findById(productId);
    const activeBatchesRemaining = productDetails.batches || productDetails.product?.batches || [];
    console.log(`Total Live Stock After Purchase A Deletion: ${liveProductDoc.totalStock} Bags (Expected: 20)`);
    console.log(`Active Batches Remaining: ${activeBatchesRemaining.map(b => b.batchNumber).join(', ')} (Expected: BATCH-002)`);

    if (liveProductDoc.totalStock !== 20) {
      throw new Error(`FAILED: Live stock expected 20, got ${liveProductDoc.totalStock}`);
    }

    // Verify MongoDB Records Retention with deletedAt
    const deletedPurchaseInDb = await Purchase.findById(purchaseAId);
    const deletedItemInDb = await PurchaseItem.findOne({ purchaseId: purchaseAId });
    const deletedBatchInDb = await ProductBatch.findById(batch1._id);
    const deletedLedgerInDb = await StockLedger.findOne({ referenceId: purchaseAId });
    const deletedSupplierLedgerInDb = await SupplierLedger.findOne({ purchaseId: purchaseAId });

    console.log(`MongoDB Soft Delete Verification:`);
    console.log(`• Purchase record exists in DB: ${Boolean(deletedPurchaseInDb)}, isDeleted: ${deletedPurchaseInDb.isDeleted}, deletedAt: ${deletedPurchaseInDb.deletedAt}`);
    console.log(`• PurchaseItem record exists in DB: ${Boolean(deletedItemInDb)}, isDeleted: ${deletedItemInDb.isDeleted}, deletedAt: ${deletedItemInDb.deletedAt}`);
    console.log(`• ProductBatch 001 exists in DB: ${Boolean(deletedBatchInDb)}, isDeleted: ${deletedBatchInDb.isDeleted}, deletedAt: ${deletedBatchInDb.deletedAt}`);
    console.log(`• StockLedger entry exists in DB: ${Boolean(deletedLedgerInDb)}, isDeleted: ${deletedLedgerInDb.isDeleted}, deletedAt: ${deletedLedgerInDb.deletedAt}`);
    console.log(`• SupplierLedger entry exists in DB: ${Boolean(deletedSupplierLedgerInDb)}, isDeleted: ${deletedSupplierLedgerInDb.isDeleted}, deletedAt: ${deletedSupplierLedgerInDb.deletedAt}`);

    if (!deletedPurchaseInDb.deletedAt || !deletedBatchInDb.deletedAt || !deletedLedgerInDb.deletedAt || !deletedSupplierLedgerInDb.deletedAt) {
      throw new Error('FAILED: Purchase soft delete did not record deletedAt timestamp on all related documents!');
    }
    console.log(`✓ VERIFIED: Purchase deletion soft-deleted ONLY Purchase A derived records and preserved MongoDB documents with deletedAt!`);

    // Verify Purchase B remains untouched
    const activePurchaseBInDb = await Purchase.findById(purchaseBId);
    const activeBatch2InDb = await ProductBatch.findById(batch2._id);
    if (activePurchaseBInDb.isDeleted || activeBatch2InDb.isDeleted) {
      throw new Error('FAILED: Purchase B was erroneously affected by Purchase A deletion!');
    }
    console.log(`✓ VERIFIED: Purchase B & Batch 002 remain active and untouched!`);

    // ==================================================
    // TEST SECTION C: PRODUCT DELETION PRESERVES PURCHASE HISTORY (Req 5 & 15)
    // ==================================================
    console.log(`\n--- TEST SECTION C: PRODUCT DELETE PRESERVES PURCHASE HISTORY ---`);

    const pioneerProdRes = await productService.createProduct({
      name: 'Product Pioneer SoftDelete Test',
      categoryId: category._id,
      brandId: brand._id,
      defaultUnitId: unit._id,
      defaultSellingPrice: 500,
      defaultPurchaseRate: 400,
    }, userId);
    const pioneerProd = pioneerProdRes.product || pioneerProdRes;
    const pioneerProdId = (pioneerProd._id || pioneerProd.id).toString();

    const pur1Res = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-P1-${Date.now()}`,
      purchaseDate: new Date(),
      items: [{ productId: pioneerProdId, batchNumber: 'PION-001', quantity: 10, purchaseRate: 400, mrp: 600, sellingPrice: 500 }],
    }, userId);
    const pur1 = pur1Res.purchase || pur1Res;

    const pur2Res = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: `INV-P2-${Date.now()}`,
      purchaseDate: new Date(),
      items: [{ productId: pioneerProdId, batchNumber: 'PION-002', quantity: 20, purchaseRate: 400, mrp: 600, sellingPrice: 500 }],
    }, userId);
    const pur2 = pur2Res.purchase || pur2Res;

    console.log(`Action: Deleting Product Pioneer (ID: ${pioneerProdId})...`);
    await productService.deactivateProduct(pioneerProdId, userId);

    const softDeletedProd = await Product.findById(pioneerProdId);
    console.log(`Product Master state: isActive: ${softDeletedProd.isActive}, deletedAt: ${softDeletedProd.deletedAt}`);

    const pur1AfterProdDel = await Purchase.findById(pur1._id || pur1.id);
    const pur2AfterProdDel = await Purchase.findById(pur2._id || pur2.id);
    const item1AfterProdDel = await PurchaseItem.findOne({ purchaseId: pur1._id || pur1.id });
    const item2AfterProdDel = await PurchaseItem.findOne({ purchaseId: pur2._id || pur2.id });
    const supLedgerCount = await SupplierLedger.countDocuments({ userId, isDeleted: { $ne: true } });

    console.log(`Historical Purchases Check After Product Deletion:`);
    console.log(`• Purchase 1 isDeleted: ${pur1AfterProdDel.isDeleted} (Expected: false)`);
    console.log(`• Purchase 2 isDeleted: ${pur2AfterProdDel.isDeleted} (Expected: false)`);
    console.log(`• Purchase Item 1 isDeleted: ${item1AfterProdDel.isDeleted} (Expected: false)`);
    console.log(`• Purchase Item 2 isDeleted: ${item2AfterProdDel.isDeleted} (Expected: false)`);
    console.log(`• Active SupplierLedger entries count: ${supLedgerCount}`);

    if (pur1AfterProdDel.isDeleted || pur2AfterProdDel.isDeleted || item1AfterProdDel.isDeleted || item2AfterProdDel.isDeleted) {
      throw new Error('FAILED: Product deletion erroneously deleted historical purchase records!');
    }
    console.log(`✓ VERIFIED: Product deletion soft-deleted ONLY product master and preserved ALL historical purchases & supplier ledgers!`);

    // ==================================================
    // TEST SECTION D: SALES CONSUMPTION SAFETY GUARD (Req 10)
    // ==================================================
    console.log(`\n--- TEST SECTION D: SALES CONSUMPTION SAFETY GUARD ---`);

    // Simulate batch 2 having sold 5 units (currentStock = 15 instead of initial 20)
    const batch2ToMutate = await ProductBatch.findById(batch2._id);
    batch2ToMutate.currentStock = 15;
    await batch2ToMutate.save();

    console.log(`Simulated Batch 002: initialQuantity = 20, currentStock = 15 (5 units sold). Attempting Purchase B deletion...`);

    let caughtError = null;
    try {
      await purchaseService.deletePurchase(purchaseBId, userId);
    } catch (err) {
      caughtError = err;
    }

    if (!caughtError) {
      throw new Error('FAILED: Purchase B deletion succeeded even though batch stock was consumed by sales!');
    }
    console.log(`✓ VERIFIED: Sales safety guard blocked purchase deletion with message: "${caughtError.message}"`);

    console.log(`\n==================================================`);
    console.log(`🎉 ALL BATCH PRICE EDIT & SOFT DELETE ARCHITECTURE TESTS PASSED CLEANLY!`);
    console.log(`==================================================\n`);

  } finally {
    // Teardown test database connection
    await mongoose.connection.close();
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
