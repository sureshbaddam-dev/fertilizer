import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';

async function reconcileUrea() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🛠️ RECONCILING URIA BATCHES & STOCK');
  console.log('====================================================\n');

  const uriaProduct = await Product.findOne({ name: /uria/i }).exec();
  if (!uriaProduct) {
    console.error('❌ URIA product not found!');
    process.exit(1);
  }

  const productId = uriaProduct._id;
  console.log(`URIA Product ID: ${productId}`);

  // Fetch batches sorted by createdAt ASC
  const batches = await ProductBatch.find({ productId }).sort({ createdAt: 1 }).exec();
  console.log(`Found ${batches.length} batches for URIA.`);

  // Fix Batch 3 selling price if it was set to 300 instead of 340
  if (batches[2]) {
    batches[2].sellingPrice = 340;
    await batches[2].save();
    console.log(`✓ Updated Batch 3 (${batches[2].batchNumber}) sellingPrice to ₹340.`);
  }

  // Fetch sales invoices
  const invoices = await SalesInvoice.find({ 'items.productId': productId }).sort({ date: 1, createdAt: 1 }).lean().exec();
  let totalSold = 0;
  invoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      if (item.productId && item.productId.toString() === productId.toString()) {
        totalSold += Number(item.quantity || 0);
      }
    });
  });

  console.log(`Total Sales Invoice Qty for URIA: ${totalSold} bags.`);

  // FIFO Re-allocation of totalSold across batches
  let remainingSoldToAllocate = totalSold;
  let totalStockAcc = 0;

  for (const batch of batches) {
    const initQty = Math.max(0, Number(batch.initialQuantity || 0));
    const consumedQty = Math.min(initQty, remainingSoldToAllocate);
    const newStock = initQty - consumedQty;

    batch.currentStock = newStock;
    batch.isActive = newStock > 0;
    await batch.save();

    totalStockAcc += newStock;
    remainingSoldToAllocate -= consumedQty;
    console.log(`  • Batch '${batch.batchNumber}' (ID: ${batch._id}) -> Init: ${initQty}, Consumed: ${consumedQty}, New Stock: ${newStock}, SellingPrice: ₹${batch.sellingPrice}`);
  }

  uriaProduct.totalStock = totalStockAcc;
  await uriaProduct.save();

  console.log(`\n✓ Reconciled URIA Total Stock: ${totalStockAcc} bags.`);

  await mongoose.disconnect();
}

reconcileUrea().catch((err) => {
  console.error('Error reconciling urea:', err);
  process.exit(1);
});
