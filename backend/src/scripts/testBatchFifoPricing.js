import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Company } from '../modules/masters/models/company.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { productService } from '../modules/products/services/product.service.js';
import { purchaseService } from '../modules/purchases/services/purchase.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';

async function runAcceptanceTest() {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp_test';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🧪 ACCEPTANCE TEST: BATCH-WISE PRICING & FIFO SPLITTING');
  console.log('====================================================\n');

  let brand = await Company.findOne({ isActive: true });
  if (!brand) {
    brand = await Company.create({ name: 'FMC India', code: 'FMC', slug: 'fmc-india', isActive: true });
  }

  let category = await Category.findOne({ isActive: true });
  if (!category) {
    category = await Category.create({ name: 'Fertilizers', code: 'FERT', slug: 'fertilizers', isActive: true });
  }

  let unit = await Unit.findOne({ isActive: true });
  if (!unit) {
    unit = await Unit.create({ name: 'Bag', shortName: 'Bag', code: 'BAG', slug: 'bag', isActive: true });
  }

  let supplier = await Supplier.findOne({ isActive: true });
  if (!supplier) {
    supplier = await Supplier.create({ name: 'Iffco Fertilizer Supplier', mobile: '9876543210', isActive: true });
  }

  const testProductName = `Acceptance Test URIA ${Date.now()}`;

  console.log(`1. Creating Product '${testProductName}'...`);
  const createdProd = await productService.createProduct({
    name: testProductName,
    brandId: brand._id.toString(),
    categoryId: category._id.toString(),
    defaultUnitId: unit._id.toString(),
    defaultPurchaseRate: 250,
    defaultSellingPrice: 300,
  });

  const productId = createdProd._id;

  console.log('\n2. Purchasing Batch 1 (20 bags @ ₹250 purchase, ₹300 selling)...');
  const pur1 = await purchaseService.createPurchase({
    supplierId: supplier._id.toString(),
    supplierInvoiceNumber: `ACC-PUR-${Date.now()}-1`,
    purchaseDate: new Date(),
    items: [
      {
        productId: productId.toString(),
        batchNumber: 'LOT-ACC-001',
        quantity: 20,
        purchaseRate: 250,
        sellingPrice: 300,
      },
    ],
  });

  let pDetails = await productService.getProductById(productId);
  console.log(`• Total Stock: ${pDetails.product.totalStock} (Expected: 20)`);
  console.log(`• Current Active Batch: ${pDetails.product.currentActiveBatch?.batchNumber} (Stock: ${pDetails.product.currentActiveBatch?.currentStock}, Rate: ₹${pDetails.product.currentActiveBatch?.purchaseRate}, Selling: ₹${pDetails.product.currentActiveBatch?.sellingPrice})`);

  if (pDetails.product.totalStock !== 20) {
    throw new Error(`TEST FAILED: Total stock is ${pDetails.product.totalStock}, expected 20`);
  }

  console.log('\n3. Selling 8 bags (Should leave 12 bags in Batch 1)...');
  const sale1 = await salesInvoiceService.createInvoice({
    customerName: 'Acceptance Farmer 1',
    items: [
      {
        productId: productId.toString(),
        qty: 8,
      },
    ],
  });

  let batch1Doc = await ProductBatch.findOne({ productId, batchNumber: 'LOT-ACC-001' });
  console.log(`• Batch 1 Remaining: ${batch1Doc.currentStock} bags (Expected: 12)`);
  if (batch1Doc.currentStock !== 12) {
    throw new Error(`TEST FAILED: Batch 1 remaining stock is ${batch1Doc.currentStock}, expected 12`);
  }

  console.log('\n4. Purchasing Batch 2 (100 bags @ ₹300 purchase, ₹340 selling)...');
  const pur2 = await purchaseService.createPurchase({
    supplierId: supplier._id.toString(),
    supplierInvoiceNumber: `ACC-PUR-${Date.now()}-2`,
    purchaseDate: new Date(),
    items: [
      {
        productId: productId.toString(),
        batchNumber: 'LOT-ACC-002',
        quantity: 100,
        purchaseRate: 300,
        sellingPrice: 340,
      },
    ],
  });

  pDetails = await productService.getProductById(productId);
  console.log(`• Total Stock: ${pDetails.product.totalStock} bags (Expected: 112)`);
  console.log(`• Current Active Batch: ${pDetails.product.currentActiveBatch?.batchNumber} (Stock: ${pDetails.product.currentActiveBatch?.currentStock}, Purchase: ₹${pDetails.product.currentActiveBatch?.purchaseRate}, Selling: ₹${pDetails.product.currentActiveBatch?.sellingPrice})`);
  console.log(`• Upcoming Batch: ${pDetails.product.upcomingBatch?.batchNumber} (Stock: ${pDetails.product.upcomingBatch?.currentStock}, Purchase: ₹${pDetails.product.upcomingBatch?.purchaseRate}, Selling: ₹${pDetails.product.upcomingBatch?.sellingPrice})`);

  if (pDetails.product.totalStock !== 112) {
    throw new Error(`TEST FAILED: Total stock is ${pDetails.product.totalStock}, expected 112`);
  }
  if (pDetails.product.currentActiveBatch?.currentStock !== 12 || pDetails.product.currentActiveBatch?.sellingPrice !== 300) {
    throw new Error(`TEST FAILED: Active batch state mismatch`);
  }
  if (pDetails.product.upcomingBatch?.currentStock !== 100 || pDetails.product.upcomingBatch?.sellingPrice !== 340) {
    throw new Error(`TEST FAILED: Upcoming batch state mismatch`);
  }

  console.log('\n5. Creating Bill for 20 bags URIA (Split into Line 1: 12 @ ₹300 and Line 2: 8 @ ₹340)...');
  const sale2 = await salesInvoiceService.createInvoice({
    customerName: 'Acceptance Farmer 2',
    items: [
      {
        productId: productId.toString(),
        batchNumber: 'LOT-ACC-001',
        qty: 12,
        price: 300,
      },
      {
        productId: productId.toString(),
        batchNumber: 'LOT-ACC-002',
        qty: 8,
        price: 340,
      },
    ],
  });

  const subtotalAmount = sale2.invoice.subtotal;
  const grandTotalAmount = sale2.invoice.grandTotal || sale2.invoice.totalAmount;
  console.log(`✓ Invoice #${sale2.invoice.invoiceNumber} created. Subtotal: ₹${subtotalAmount}, Grand Total (with 18% GST): ₹${grandTotalAmount}`);
  sale2.invoice.items.forEach((item, idx) => {
    console.log(`  Line ${idx + 1}: ${item.productName} | Qty: ${item.quantity} | UnitPrice: ₹${item.unitPrice} | Taxable: ₹${item.taxableAmount} | LineTotal: ₹${item.lineTotal} | COGS: ₹${item.purchaseCostRate} | Profit: ₹${item.lineProfit} | Allocations: ${JSON.stringify(item.batchAllocations)}`);
  });

  if (subtotalAmount !== 6320) {
    throw new Error(`TEST FAILED: Invoice subtotal amount is ₹${subtotalAmount}, expected 6320 (12*300 + 8*340)`);
  }

  batch1Doc = await ProductBatch.findOne({ productId, batchNumber: 'LOT-ACC-001' });
  let batch2Doc = await ProductBatch.findOne({ productId, batchNumber: 'LOT-ACC-002' });
  console.log(`• Batch 1 Remaining: ${batch1Doc.currentStock} bags (Expected: 0 DEPLETED)`);
  console.log(`• Batch 2 Remaining: ${batch2Doc.currentStock} bags (Expected: 92 ACTIVE)`);

  if (batch1Doc.currentStock !== 0) {
    throw new Error(`TEST FAILED: Batch 1 stock is ${batch1Doc.currentStock}, expected 0`);
  }
  if (batch2Doc.currentStock !== 92) {
    throw new Error(`TEST FAILED: Batch 2 stock is ${batch2Doc.currentStock}, expected 92`);
  }

  console.log('\n6. Verifying Next Sale of 1 bag (Should automatically use Batch 2 @ ₹340 selling, ₹300 COGS)...');
  pDetails = await productService.getProductById(productId);
  console.log(`• Current Active Batch: ${pDetails.product.currentActiveBatch?.batchNumber} (Stock: ${pDetails.product.currentActiveBatch?.currentStock}, Selling: ₹${pDetails.product.currentActiveBatch?.sellingPrice})`);
  console.log(`• Effective Selling Price: ₹${pDetails.product.currentSellingPrice} (Expected: 340)`);

  if (pDetails.product.currentSellingPrice !== 340) {
    throw new Error(`TEST FAILED: Effective selling price after Batch 1 depletion is ₹${pDetails.product.currentSellingPrice}, expected 340`);
  }

  const sale3 = await salesInvoiceService.createInvoice({
    customerName: 'Acceptance Farmer 3',
    items: [
      {
        productId: productId.toString(),
        qty: 1,
      },
    ],
  });

  const sale3Item = sale3.invoice.items[0];
  console.log(`✓ Sale 3 completed. Invoice #${sale3.invoice.invoiceNumber}`);
  console.log(`  Unit Price Charged: ₹${sale3Item.unitPrice} (Expected: 340)`);
  console.log(`  Purchase Cost Rate (COGS): ₹${sale3Item.purchaseCostRate} (Expected: 300)`);
  console.log(`  Line Profit: ₹${sale3Item.lineProfit} (Expected: 40)`);

  if (sale3Item.unitPrice !== 340) {
    throw new Error(`TEST FAILED: Sale 3 unit price is ₹${sale3Item.unitPrice}, expected 340`);
  }
  if (sale3Item.purchaseCostRate !== 300) {
    throw new Error(`TEST FAILED: Sale 3 COGS is ₹${sale3Item.purchaseCostRate}, expected 300`);
  }
  if (sale3Item.lineProfit !== 40) {
    throw new Error(`TEST FAILED: Sale 3 Line Profit is ₹${sale3Item.lineProfit}, expected 40`);
  }

  console.log('\n7. Cleaning up test records from DB...');
  await SalesInvoice.deleteMany({ _id: { $in: [sale1.invoice._id, sale2.invoice._id, sale3.invoice._id] } });
  await Purchase.deleteMany({ _id: { $in: [pur1._id, pur2._id] } });
  await PurchaseItem.deleteMany({ productId });
  await ProductBatch.deleteMany({ productId });
  await StockLedger.deleteMany({ productId });
  await Product.deleteOne({ _id: productId });
  console.log('✓ Cleanup complete!');

  console.log('\n====================================================');
  console.log('🎉 ALL ACCEPTANCE TEST SCENARIOS PASSED WITH 100% ACCURACY!');
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
