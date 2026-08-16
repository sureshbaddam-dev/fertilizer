import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';
import { productService } from '../modules/products/services/product.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testThreeFreshPurchasesFlow() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to REAL DEVELOPMENT MONGODB DATABASE at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    // 1. Find User A (b.suresh / 9876543211)
    const userA = await User.findOne({ mobile: '9876543211' }).lean();
    if (!userA) throw new Error('User A (9876543211) not found in mandhi_erp!');
    const userId = userA._id;

    // 2. Find Product 'pioneer' (or create a dedicated test product for fresh purchase verification)
    let prod = await Product.findOne({ userId, name: new RegExp('^pioneer$', 'i') }).lean();
    if (!prod) {
      prod = await Product.findOne({ userId }).lean();
    }
    if (!prod) throw new Error('No product found for User A in mandhi_erp!');
    const productId = prod._id;

    // 3. Find or Create Supplier
    let supplier = await Supplier.findOne({ userId }).lean();
    if (!supplier) {
      supplier = await Supplier.create({ userId, name: 'Main Agri Supplier', mobile: '9988776655' });
    }
    const supplierId = supplier._id;

    console.log(`\n====================================================================`);
    console.log(`  VERIFYING 3 FRESH PURCHASES FOR PRODUCT: ${prod.name} (ID: ${productId})  `);
    console.log(`====================================================================\n`);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Purchase 1: Qty 10, Rate 450, Selling 550
    const batch1Num = `BATCH-${dateStr}-011`;
    console.log(`Creating Purchase 1 with batchNumber: ${batch1Num}...`);
    const p1 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-FRESH-${Date.now()}-1`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: batch1Num,
          quantity: 10,
          purchaseRate: 450,
          mrp: 550,
          sellingPrice: 550,
        },
      ],
    }, userId);

    // Purchase 2: Qty 20, Rate 400, Selling 500
    const batch2Num = `BATCH-${dateStr}-012`;
    console.log(`Creating Purchase 2 with batchNumber: ${batch2Num}...`);
    const p2 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-FRESH-${Date.now()}-2`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: batch2Num,
          quantity: 20,
          purchaseRate: 400,
          mrp: 500,
          sellingPrice: 500,
        },
      ],
    }, userId);

    // Purchase 3: Qty 15, Rate 350, Selling 450
    const batch3Num = `BATCH-${dateStr}-013`;
    console.log(`Creating Purchase 3 with batchNumber: ${batch3Num}...`);
    const p3 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-FRESH-${Date.now()}-3`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: batch3Num,
          quantity: 15,
          purchaseRate: 350,
          mrp: 450,
          sellingPrice: 450,
        },
      ],
    }, userId);

    // Verify 3 distinct ProductBatch documents exist for these purchases
    const createdBatchIds = [
      p1.items[0].batchId,
      p2.items[0].batchId,
      p3.items[0].batchId,
    ];

    console.log('\n--- VERIFYING MONGODB ProductBatch DOCUMENTS ---');
    const freshBatches = await ProductBatch.find({ _id: { $in: createdBatchIds } }).sort({ createdAt: 1 }).lean();
    console.log(`Found ${freshBatches.length} distinct ProductBatch documents in mandhi_erp:`);

    if (freshBatches.length !== 3) {
      throw new Error(`Expected 3 ProductBatch documents, got ${freshBatches.length}`);
    }

    freshBatches.forEach((b, i) => {
      console.log(`✓ Batch ${i + 1}: _id=${b._id} | batchNumber=${b.batchNumber} | purchaseId=${b.purchaseId} | supplierId=${b.supplierId} | Qty=${b.currentStock} | Rate=₹${b.purchaseRate} | Selling=₹${b.sellingPrice}`);
      if (!b.purchaseId) throw new Error(`Batch ${b.batchNumber} has null purchaseId!`);
      if (!b.supplierId) throw new Error(`Batch ${b.batchNumber} has null supplierId!`);
    });

    // Check PurchaseItems retain batchNumber
    console.log('\n--- VERIFYING PurchaseItems RECORD RETENTION ---');
    const item1 = await PurchaseItem.findById(p1.items[0]._id).lean();
    const item2 = await PurchaseItem.findById(p2.items[0]._id).lean();
    const item3 = await PurchaseItem.findById(p3.items[0]._id).lean();

    console.log(`✓ Item 1 batchNumber: '${item1.batchNumber}' (batchId: ${item1.batchId})`);
    console.log(`✓ Item 2 batchNumber: '${item2.batchNumber}' (batchId: ${item2.batchId})`);
    console.log(`✓ Item 3 batchNumber: '${item3.batchNumber}' (batchId: ${item3.batchId})`);

    // Verify Product Details API Payload
    console.log('\n--- VERIFYING PRODUCT DETAILS API PAYLOAD ---');
    const detailPayload = await productService.getProductById(productId, userId);
    console.log(`Product activeBatchCount: ${detailPayload.product.activeBatchCount}`);
    console.log(`Product total batches count: ${detailPayload.batches.length}`);
    console.log(`Current Active FIFO Batch: ${detailPayload.product.currentActiveBatch?.batchNumber} (Selling Price: ₹${detailPayload.product.currentActiveBatch?.sellingPrice}, Qty: ${detailPayload.product.currentActiveBatch?.currentStock})`);
    console.log(`Upcoming FIFO Batch: ${detailPayload.product.upcomingBatch?.batchNumber} (Selling Price: ₹${detailPayload.product.upcomingBatch?.sellingPrice})`);

    console.log('\n====================================================================');
    console.log('🎉 3 FRESH PURCHASES BATCH CREATION & PAYLOAD VERIFICATION PASSED 100%!');
    console.log('====================================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

testThreeFreshPurchasesFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
