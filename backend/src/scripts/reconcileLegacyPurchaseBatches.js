import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function reconcileLegacyBatches() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const purchaseItems = await PurchaseItem.find({}).lean().exec();
  console.log(`Found ${purchaseItems.length} purchase items in database.`);

  let createdBatchesCount = 0;

  for (const item of purchaseItems) {
    if (!item.productId || !item.purchaseId || !item.userId) continue;

    // Check if a batch already exists for this exact purchase item
    const existingBatch = await ProductBatch.findOne({
      userId: item.userId,
      productId: item.productId,
      purchaseId: item.purchaseId,
    }).exec();

    if (!existingBatch) {
      const parentPurchase = await Purchase.findById(item.purchaseId).lean().exec();
      const supplierId = parentPurchase?.supplierId || null;

      const dateStr = new Date(item.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
      const existingCount = await ProductBatch.countDocuments({ userId: item.userId, productId: item.productId }).exec();
      let seq = existingCount + 1;
      let batchNumber = item.batchNumber && item.batchNumber.trim() && !item.batchNumber.startsWith('BATCH-20260810-001')
        ? item.batchNumber.trim()
        : `BATCH-${dateStr}-${String(seq).padStart(3, '0')}`;

      while (await ProductBatch.findOne({ userId: item.userId, productId: item.productId, batchNumber }).exec()) {
        seq += 1;
        batchNumber = `BATCH-${dateStr}-${String(seq).padStart(3, '0')}`;
      }

      const qty = Number(item.quantity || 0);
      const newBatch = await ProductBatch.create({
        userId: item.userId,
        productId: item.productId,
        purchaseId: item.purchaseId,
        supplierId,
        batchNumber,
        mfgDate: item.mfgDate,
        expiryDate: item.expiryDate,
        purchaseRate: Number(item.purchaseRate || 0),
        mrp: Number(item.mrp || 0),
        sellingPrice: Number(item.sellingPrice || 0),
        initialQuantity: qty,
        currentStock: qty,
        isActive: qty > 0,
      });

      await PurchaseItem.updateOne(
        { _id: item._id },
        { $set: { batchId: newBatch._id, batchNumber: newBatch.batchNumber } }
      ).exec();

      createdBatchesCount += 1;
    }
  }

  // Deactivate or clean up unassigned merged legacy auto-batches (purchaseId: null) if purchase-specific batches exist
  const unassignedBatches = await ProductBatch.find({ purchaseId: null }).exec();
  for (const batch of unassignedBatches) {
    const hasPurchaseBatches = await ProductBatch.findOne({
      userId: batch.userId,
      productId: batch.productId,
      purchaseId: { $ne: null },
    }).exec();

    if (hasPurchaseBatches) {
      console.log(`Cleaning up merged unassigned legacy batch ${batch.batchNumber} (ID: ${batch._id}) for product ${batch.productId}...`);
      await ProductBatch.deleteOne({ _id: batch._id }).exec();
    }
  }

  console.log(`✅ Reconciled ${createdBatchesCount} legacy purchase batches successfully!`);
  await mongoose.disconnect();
}

reconcileLegacyBatches().catch((err) => {
  console.error('Legacy batch reconciliation error:', err);
  process.exit(1);
});
