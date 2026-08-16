import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';
import { productService } from '../modules/products/services/product.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testFreshPurchaseBatchCreation() {
  const testMongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp').replace(/\/mandhi_erp(\?.*)?$/, '/mandhi_erp_test$1');

  console.log(`Connecting to DEDICATED TEST MONGODB DATABASE at ${testMongoUri}...`);
  await mongoose.connect(testMongoUri);

  try {
    console.log('\n====================================================================');
    console.log('  TESTING FRESH PURCHASES → PRODUCT BATCH CREATION FLOW  ');
    console.log('====================================================================\n');

    // 1. Create Test User
    const user = await User.create({
      ownerName: 'Batch Test Owner',
      mobile: `9333${Date.now().toString().slice(-6)}`,
      passwordHash: 'dummy_hash',
      role: 'owner',
    });
    const userId = user._id;

    // 2. Create Master Category & Unit
    const cat = await Category.create({ userId, name: 'Seeds', slug: 'seeds' });
    const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bags' });

    // 3. Create Test Supplier
    const supplier = await Supplier.create({
      userId,
      name: 'JK Seeds Supplier Ltd',
      mobile: '9888777666',
    });

    // 4. Create Test Product
    const product = await Product.create({
      userId,
      name: 'JK Seed Product Test',
      categoryId: cat._id,
      defaultUnitId: unit._id,
      totalStock: 0,
      defaultPurchaseRate: 200,
      defaultSellingPrice: 300,
    });
    const productId = product._id;

    // 5. Create Purchase 1 (20 Qty @ 250 rate, 350 selling)
    const p1 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: 'INV-1001',
      items: [
        {
          productId,
          productName: product.name,
          quantity: 20,
          purchaseRate: 250,
          mrp: 330,
          sellingPrice: 350,
        },
      ],
    }, userId);

    // 6. Create Purchase 2 (10 Qty @ 300 rate, 400 selling)
    const p2 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: 'INV-1002',
      items: [
        {
          productId,
          productName: product.name,
          quantity: 10,
          purchaseRate: 300,
          mrp: 330,
          sellingPrice: 400,
        },
      ],
    }, userId);

    // 7. Create Purchase 3 (10 Qty @ 300 rate, 400 selling)
    const p3 = await purchaseService.createPurchase({
      supplierId: supplier._id,
      supplierInvoiceNumber: 'INV-1003',
      items: [
        {
          productId,
          productName: product.name,
          quantity: 10,
          purchaseRate: 300,
          mrp: 330,
          sellingPrice: 400,
        },
      ],
    }, userId);

    // 8. Verify ProductBatch Documents in MongoDB
    const batches = await ProductBatch.find({ userId, productId }).sort({ createdAt: 1 }).lean();
    console.log(`Found ${batches.length} ProductBatch documents in MongoDB.`);

    if (batches.length !== 3) {
      throw new Error(`Expected 3 ProductBatch documents, but found ${batches.length}`);
    }

    batches.forEach((b, idx) => {
      console.log(`✓ Batch ${idx + 1}: ${b.batchNumber} | Qty: ${b.currentStock} | Rate: ₹${b.purchaseRate} | Selling: ₹${b.sellingPrice} | purchaseId: ${b.purchaseId} | supplierId: ${b.supplierId}`);
      if (!b.purchaseId) throw new Error(`Batch ${b.batchNumber} missing purchaseId!`);
      if (!b.supplierId) throw new Error(`Batch ${b.batchNumber} missing supplierId!`);
      if (b.initialQuantity <= 0) throw new Error(`Batch ${b.batchNumber} initialQuantity <= 0!`);
    });

    const updatedProduct = await Product.findById(productId).lean();
    console.log(`Total Product Stock in DB: ${updatedProduct.totalStock} (Expected: 40)`);
    if (updatedProduct.totalStock !== 40) {
      throw new Error(`Product stock mismatch! Expected 40, got ${updatedProduct.totalStock}`);
    }

    // 9. Verify Product Details API payload
    const detailPayload = await productService.getProductById(productId, userId);
    console.log(`Product Details activeBatchCount: ${detailPayload.product.activeBatchCount}`);
    console.log(`Product Details batches count: ${detailPayload.batches.length}`);

    if (detailPayload.batches.length !== 3) {
      throw new Error(`Product details payload should return 3 batches, got ${detailPayload.batches.length}`);
    }

    console.log('\n====================================================================');
    console.log('🎉 ALL FRESH PURCHASES BATCH CREATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================================\n');
  } finally {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
}

testFreshPurchaseBatchCreation().catch((err) => {
  console.error('Fresh purchase batch test error:', err);
  process.exit(1);
});
