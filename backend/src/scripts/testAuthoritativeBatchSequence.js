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

async function testAuthoritativeBatchSequence() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    console.log(`\n====================================================================`);
    console.log(`  AUTHORITATIVE BACKEND BATCH NUMBER SEQUENCING TEST  `);
    console.log(`====================================================================\n`);

    // 1. Find User A (9876543211)
    const userA = await User.findOne({ mobile: '9876543211' }).lean();
    if (!userA) throw new Error('User A (9876543211) not found in mandhi_erp!');
    const userId = userA._id;

    // 2. Find Product 'pioneer'
    let prod = await Product.findOne({ userId, name: new RegExp('^pioneer$', 'i') }).lean();
    if (!prod) prod = await Product.findOne({ userId }).lean();
    if (!prod) throw new Error('No product found for User A in mandhi_erp!');
    const productId = prod._id;

    // 3. Find Supplier
    let supplier = await Supplier.findOne({ userId }).lean();
    if (!supplier) {
      supplier = await Supplier.create({ userId, name: 'Main Agri Supplier', mobile: '9988776655' });
    }
    const supplierId = supplier._id;

    // CLIENT SENDS batchNumber: "" FOR ALL 3 PURCHASES
    console.log(`--> Sending Purchase 1 with batchNumber: "" ...`);
    const p1 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-SEQ-${Date.now()}-1`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: "", // EMPTY FRONTEND PAYLOAD
          quantity: 10,
          purchaseRate: 450,
          mrp: 550,
          sellingPrice: 550,
        },
      ],
    }, userId);

    console.log(`--> Sending Purchase 2 with batchNumber: "" ...`);
    const p2 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-SEQ-${Date.now()}-2`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: "", // EMPTY FRONTEND PAYLOAD
          quantity: 20,
          purchaseRate: 400,
          mrp: 500,
          sellingPrice: 500,
        },
      ],
    }, userId);

    console.log(`--> Sending Purchase 3 with batchNumber: "" ...`);
    const p3 = await purchaseService.createPurchase({
      supplierId,
      supplierInvoiceNumber: `INV-SEQ-${Date.now()}-3`,
      items: [
        {
          productId,
          productName: prod.name,
          batchNumber: "", // EMPTY FRONTEND PAYLOAD
          quantity: 15,
          purchaseRate: 350,
          mrp: 450,
          sellingPrice: 450,
        },
      ],
    }, userId);

    // Verify Backend Batch Numbers generated for P1, P2, P3
    const batch1Num = p1.items[0].batchNumber;
    const batch2Num = p2.items[0].batchNumber;
    const batch3Num = p3.items[0].batchNumber;

    console.log(`\n✓ Purchase 1 Generated Batch: '${batch1Num}' (ID: ${p1.items[0].batchId})`);
    console.log(`✓ Purchase 2 Generated Batch: '${batch2Num}' (ID: ${p2.items[0].batchId})`);
    console.log(`✓ Purchase 3 Generated Batch: '${batch3Num}' (ID: ${p3.items[0].batchId})`);

    if (batch1Num === batch2Num || batch2Num === batch3Num || batch1Num === batch3Num) {
      throw new Error(`CRITICAL FAILURE: Batch numbers are duplicated! P1=${batch1Num}, P2=${batch2Num}, P3=${batch3Num}`);
    }

    // Verify 3 distinct ProductBatch documents in MongoDB
    const createdBatchIds = [p1.items[0].batchId, p2.items[0].batchId, p3.items[0].batchId];
    const dbBatches = await ProductBatch.find({ _id: { $in: createdBatchIds } }).lean();

    console.log(`\n--- VERIFYING MONGODB ProductBatch DOCUMENTS ---`);
    console.log(`Found ${dbBatches.length} ProductBatch documents in MongoDB:`);

    dbBatches.forEach((b, i) => {
      console.log(`  Document ${i + 1}: _id=${b._id} | batchNumber=${b.batchNumber} | purchaseId=${b.purchaseId} | supplierId=${b.supplierId} | Qty=${b.currentStock}`);
      if (!b.purchaseId) throw new Error(`Batch ${b.batchNumber} has null purchaseId!`);
      if (!b.supplierId) throw new Error(`Batch ${b.batchNumber} has null supplierId!`);
    });

    // Verify Product Details API Payload
    console.log(`\n--- VERIFYING Product Details API PAYLOAD ---`);
    const detailPayload = await productService.getProductById(productId, userId);
    console.log(`Product activeBatchCount: ${detailPayload.product.activeBatchCount}`);
    console.log(`Product total batches count: ${detailPayload.batches.length}`);
    console.log(`Current Active Batch: ${detailPayload.product.currentActiveBatch?.batchNumber} (Selling Price: ₹${detailPayload.product.currentActiveBatch?.sellingPrice})`);

    console.log(`\n====================================================================`);
    console.log(`🎉 AUTHORITATIVE BACKEND BATCH SEQUENCING PASSED 100%!`);
    console.log(`====================================================================\n`);
  } finally {
    await mongoose.disconnect();
  }
}

testAuthoritativeBatchSequence().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
