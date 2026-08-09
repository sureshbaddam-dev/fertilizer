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

async function debugAll() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🔍 DUMPING ALL PRODUCTS & BATCHES IN MANDHI_ERP DB');
  console.log('====================================================\n');

  const products = await Product.find({}).lean().exec();
  console.log(`TOTAL PRODUCTS IN DB: ${products.length}`);
  products.forEach(p => console.log(`• Product: '${p.name}' | ID: ${p._id} | Code: '${p.code}' | Stock: ${p.totalStock} | DefaultSell: ₹${p.defaultSellingPrice}`));

  const batches = await ProductBatch.find({}).sort({ createdAt: 1 }).lean().exec();
  console.log(`\nTOTAL PRODUCT BATCHES IN DB: ${batches.length}`);
  batches.forEach((b, idx) => {
    console.log(`• [Batch ${idx + 1}] _id: ${b._id} | ProdID: ${b.productId} | Num: '${b.batchNumber}' | Purchase: ₹${b.purchaseRate} | Selling: ₹${b.sellingPrice} | Init: ${b.initialQuantity} | Current: ${b.currentStock} | isActive: ${b.isActive} | Created: ${b.createdAt}`);
  });

  const purItems = await PurchaseItem.find({}).sort({ createdAt: 1 }).lean().exec();
  console.log(`\nTOTAL PURCHASE ITEMS IN DB: ${purItems.length}`);
  purItems.forEach((pi, idx) => {
    console.log(`• [PurItem ${idx + 1}] ProdID: ${pi.productId} | Batch: '${pi.batchNumber}' | Qty: ${pi.quantity} | Rate: ₹${pi.purchaseRate} | Selling: ₹${pi.sellingPrice}`);
  });

  const invoices = await SalesInvoice.find({}).sort({ date: 1, createdAt: 1 }).lean().exec();
  console.log(`\nTOTAL SALES INVOICES IN DB: ${invoices.length}`);
  invoices.forEach((inv, idx) => {
    console.log(`• [Inv ${idx + 1}] #: ${inv.invoiceNumber} | Customer: ${inv.customerName} | Date: ${inv.date}`);
    (inv.items || []).forEach((item, iIdx) => {
      console.log(`    Item ${iIdx + 1}: Name: '${item.productName}' | ProdID: ${item.productId} | Qty: ${item.quantity} | UnitPrice: ₹${item.unitPrice} | Batch: '${item.batchNumber}' | Allocations: ${JSON.stringify(item.batchAllocations || [])}`);
    });
  });

  const ledger = await StockLedger.find({}).sort({ timestamp: 1, createdAt: 1 }).lean().exec();
  console.log(`\nTOTAL STOCK LEDGER ENTRIES IN DB: ${ledger.length}`);
  ledger.forEach((l, idx) => {
    console.log(`• [Ledger ${idx + 1}] ProdID: ${l.productId} | Type: ${l.transactionType} | Batch: '${l.batchNumber}' | Qty: ${l.quantity} | Stock After: ${l.currentStock} | Ref: ${l.referenceNumber}`);
  });

  await mongoose.disconnect();
}

debugAll().catch((err) => {
  console.error('Error debugging all:', err);
  process.exit(1);
});
