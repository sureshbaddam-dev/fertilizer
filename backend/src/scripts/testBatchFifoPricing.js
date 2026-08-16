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
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { productService } from '../modules/products/services/product.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runTestFifoSuite() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // 1. Initialize Test User & Masters
  const user = await User.create({
    ownerName: 'FIFO Test User',
    mobile: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'VEDIXA FIFO Test Corp',
  });
  const userId = user._id;
  console.log(`✓ Test User initialized (UserId: ${userId})`);

  // Clean test data for this user
  await Product.deleteMany({ userId });
  await ProductBatch.deleteMany({ userId });
  await Purchase.deleteMany({ userId });
  await PurchaseItem.deleteMany({ userId });
  await SalesInvoice.deleteMany({ userId });
  await StockLedger.deleteMany({ userId });

  const category = await Category.create({ userId, name: 'Test Fertilizer Category', slug: `test-fertilizer-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Test Pioneer Brand' });
  const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

  // Create Product Pioneer
  const product = await Product.create({
    userId,
    name: 'Pioneer FIFO Test',
    code: 'PIONEER-001',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 300,
    defaultSellingPrice: 400,
    totalStock: 0,
    isActive: true,
  });
  const productId = product._id;

  // Helper to setup Batch 005 (15 @ 450) and Batch 007 (10 @ 650)
  const setupBatches = async () => {
    await ProductBatch.deleteMany({ userId, productId });
    await SalesInvoice.deleteMany({ userId });

    const batch5 = await ProductBatch.create({
      userId,
      productId,
      batchNumber: 'BATCH-005',
      initialQuantity: 15,
      currentStock: 15,
      purchaseRate: 300,
      sellingPrice: 450,
      isActive: true,
      createdAt: new Date('2026-08-11T10:00:00Z'),
    });

    const batch7 = await ProductBatch.create({
      userId,
      productId,
      batchNumber: 'BATCH-007',
      initialQuantity: 10,
      currentStock: 10,
      purchaseRate: 400,
      sellingPrice: 650,
      isActive: true,
      createdAt: new Date('2026-08-11T11:00:00Z'),
    });

    await Product.updateOne({ _id: productId }, { $set: { totalStock: 25, isActive: true } });

    return { batch5, batch7 };
  };

  // ==================================================
  // TEST 1: Normal Sale (Sell 10 Bags)
  // ==================================================
  console.log(`\n--- TEST 1: NORMAL SALE (SELL 10 BAGS) ---`);
  await setupBatches();

  let sale1 = await salesInvoiceService.createInvoice(
    {
      customerName: 'Test Farmer A',
      items: [{ productId: productId.toString(), qty: 10 }],
    },
    userId
  );

  let b5 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-005' });
  let b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });
  let prodState = await productService.getProductById(productId, userId);

  console.log(`Sale 1 Total Amount: ₹${sale1.invoice.totalAmount}`);
  console.log(`Batch 005 Remaining Stock: ${b5.currentStock} Bags (Expected: 5)`);
  console.log(`Batch 007 Remaining Stock: ${b7.currentStock} Bags (Expected: 10)`);
  console.log(`Current Active Batch: ${prodState.product.currentActiveBatch.batchNumber}`);
  console.log(`Effective Selling Price: ₹${prodState.product.currentSellingPrice}`);

  if (b5.currentStock !== 5 || sale1.invoice.totalAmount !== 4500 || prodState.product.currentSellingPrice !== 450) {
    throw new Error(`TEST 1 FAILED: Incorrect stock deduction or pricing for normal sale.`);
  }
  console.log(`✓ TEST 1 PASSED: Batch 005 supplied 10 bags @ ₹450 = ₹4,500. Batch 005 remaining = 5.`);

  // ==================================================
  // TEST 2: Batch Exhaustion & Automatic Price Switching (Sell 5 Bags)
  // ==================================================
  console.log(`\n--- TEST 2: BATCH EXHAUSTION & AUTOMATIC PRICE SWITCHING (SELL 5 BAGS) ---`);

  let sale2 = await salesInvoiceService.createInvoice(
    {
      customerName: 'Test Farmer B',
      items: [{ productId: productId.toString(), qty: 5 }],
    },
    userId
  );

  b5 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-005' });
  b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });
  prodState = await productService.getProductById(productId, userId);

  console.log(`Sale 2 Total Amount: ₹${sale2.invoice.totalAmount}`);
  console.log(`Batch 005 Remaining Stock: ${b5.currentStock} Bags (Expected: 0)`);
  console.log(`Batch 007 Remaining Stock: ${b7.currentStock} Bags (Expected: 10)`);
  console.log(`New Current Active Batch: ${prodState.product.currentActiveBatch.batchNumber} (Expected: BATCH-007)`);
  console.log(`New Effective Selling Price: ₹${prodState.product.currentSellingPrice} (Expected: ₹650.00)`);

  if (b5.currentStock !== 0 || prodState.product.currentActiveBatch.batchNumber !== 'BATCH-007' || prodState.product.currentSellingPrice !== 650) {
    throw new Error(`TEST 2 FAILED: Automatic price switching to Batch 007 failed!`);
  }
  console.log(`✓ TEST 2 PASSED: Batch 005 exhausted. Current active batch automatically became BATCH-007 @ ₹650.00!`);

  // ==================================================
  // TEST 3: Sell Remaining Active Batch (Sell 10 Bags)
  // ==================================================
  console.log(`\n--- TEST 3: SELL REMAINING ACTIVE BATCH (SELL 10 BAGS) ---`);

  let sale3 = await salesInvoiceService.createInvoice(
    {
      customerName: 'Test Farmer C',
      items: [{ productId: productId.toString(), qty: 10 }],
    },
    userId
  );

  b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });
  prodState = await productService.getProductById(productId, userId);

  console.log(`Sale 3 Total Amount: ₹${sale3.invoice.totalAmount} (Expected: ₹6,500)`);
  console.log(`Batch 007 Remaining Stock: ${b7.currentStock} Bags (Expected: 0)`);
  console.log(`Active Batch Count: ${prodState.product.activeBatchCount} (Expected: 0)`);

  if (b7.currentStock !== 0 || sale3.invoice.totalAmount !== 6500) {
    throw new Error(`TEST 3 FAILED: Incorrect sale 3 execution.`);
  }
  console.log(`✓ TEST 3 PASSED: Batch 007 supplied 10 bags @ ₹650 = ₹6,500. All active stock depleted.`);

  // ==================================================
  // TEST 4: Single Bill Crossing Multiple Batches (Sell 16 Bags in 1 Bill)
  // ==================================================
  console.log(`\n--- TEST 4: SINGLE BILL CROSSING MULTIPLE BATCHES (SELL 16 BAGS) ---`);
  await setupBatches();

  let preview = await salesInvoiceService.previewInvoice(
    { items: [{ productId: productId.toString(), qty: 16 }] },
    userId
  );

  console.log(`Invoice Preview Items Count: ${preview.items.length} (Expected: 2 split items)`);
  preview.items.forEach((item, idx) => {
    console.log(`  Split ${idx + 1}: Batch ${item.batchNumber} -> ${item.qty} Bags @ ₹${item.price} = ₹${item.totalAmount}`);
  });
  console.log(`Preview Subtotal: ₹${preview.subtotal} (Expected: ₹7,400)`);

  let sale4 = await salesInvoiceService.createInvoice(
    {
      customerName: 'Test Farmer D',
      items: [{ productId: productId.toString(), qty: 16 }],
    },
    userId
  );

  b5 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-005' });
  b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });
  let liveProd = await Product.findById(productId);

  console.log(`Sale 4 Invoice Items Count: ${sale4.invoice.items.length}`);
  console.log(`Sale 4 Invoice Subtotal: ₹${sale4.invoice.subtotal} (Expected: ₹7,400)`);
  console.log(`Batch 005 Remaining Stock: ${b5.currentStock} Bags (Expected: 0)`);
  console.log(`Batch 007 Remaining Stock: ${b7.currentStock} Bags (Expected: 9)`);
  console.log(`Product Live Total Stock: ${liveProd.totalStock} Bags (Expected: 9)`);

  if (sale4.invoice.subtotal !== 7400 || b5.currentStock !== 0 || b7.currentStock !== 9 || liveProd.totalStock !== 9) {
    throw new Error(`TEST 4 FAILED: Single bill multi-batch allocation failed!`);
  }
  console.log(`✓ TEST 4 PASSED: 16 bags allocated across Batch 005 (15 @ ₹450 = ₹6,750) and Batch 007 (1 @ ₹650 = ₹650). Subtotal = ₹7,400!`);

  // ==================================================
  // TEST 5: Insufficient Stock Guard (Request 26 Bags when Total Stock = 25)
  // ==================================================
  console.log(`\n--- TEST 5: INSUFFICIENT STOCK GUARD (REQUEST 26 BAGS WHEN STOCK = 25) ---`);
  await setupBatches();

  let errorCaught = false;
  try {
    await salesInvoiceService.createInvoice(
      {
        customerName: 'Test Farmer E',
        items: [{ productId: productId.toString(), qty: 26 }],
      },
      userId
    );
  } catch (err) {
    errorCaught = true;
    console.log(`Caught Expected Error: "${err.message}"`);
  }

  liveProd = await Product.findById(productId);
  b5 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-005' });
  b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });

  if (!errorCaught || liveProd.totalStock !== 25 || b5.currentStock !== 15 || b7.currentStock !== 10) {
    throw new Error(`TEST 5 FAILED: Insufficient stock guard did not reject over-selling!`);
  }
  console.log(`✓ TEST 5 PASSED: Sale of 26 bags rejected cleanly. No negative stock or corrupted records created.`);

  // ==================================================
  // TEST 6: Batch Price Edit Isolation
  // ==================================================
  console.log(`\n--- TEST 6: BATCH PRICE EDIT ISOLATION ---`);
  await setupBatches();

  let b7Doc = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });
  console.log(`Action: Editing Batch 007 selling price from ₹650 to ₹675...`);
  await productService.updateBatch(b7Doc._id.toString(), { sellingPrice: 675 }, userId);

  b5 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-005' });
  b7 = await ProductBatch.findOne({ userId, batchNumber: 'BATCH-007' });

  console.log(`Batch 005 Selling Price: ₹${b5.sellingPrice} (Expected: ₹450)`);
  console.log(`Batch 007 Selling Price: ₹${b7.sellingPrice} (Expected: ₹675)`);

  if (b5.sellingPrice !== 450 || b7.sellingPrice !== 675) {
    throw new Error(`TEST 6 FAILED: Editing Batch 007 affected Batch 005!`);
  }

  // Sell 15 bags (exhausts Batch 005)
  await salesInvoiceService.createInvoice(
    { customerName: 'Test Farmer F', items: [{ productId: productId.toString(), qty: 15 }] },
    userId
  );

  prodState = await productService.getProductById(productId, userId);
  console.log(`Effective Selling Price after Batch 005 exhaustion: ₹${prodState.product.currentSellingPrice} (Expected: ₹675.00)`);

  if (prodState.product.currentSellingPrice !== 675) {
    throw new Error(`TEST 6 FAILED: Next effective price did not pick up edited Batch 007 price ₹675!`);
  }
  console.log(`✓ TEST 6 PASSED: Batch 007 price edit was isolated. After Batch 005 exhaustion, effective billing price automatically became ₹675.00!`);

  console.log(`\n==================================================`);
  console.log(`🎉 ALL FIFO BATCH BILLING & AUTOMATIC PRICE SWITCHING TESTS PASSED CLEANLY!`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runTestFifoSuite().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
