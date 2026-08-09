import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Customer } from '../modules/customers/models/customer.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';

async function auditAndCleanDatabase() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🔍 AUDITING DATABASE RECORDS FOR TEST / DUMMY DATA');
  console.log('====================================================\n');

  // 1. Audit Customers
  const dummyCustomers = await Customer.find({
    $or: [
      { name: /^Test /i },
      { name: /^Acceptance /i },
      { name: /^Demo /i },
      { name: /^Dummy /i },
      { name: /^Concurrent /i },
      { name: /^Sequential /i },
      { name: /^Sample /i },
    ],
  }).lean().exec();

  console.log(`Found ${dummyCustomers.length} dummy/test customer record(s).`);
  if (dummyCustomers.length > 0) {
    dummyCustomers.forEach(c => console.log(`  • Removing Customer: '${c.name}' (ID: ${c._id})`));
    const ids = dummyCustomers.map(c => c._id);
    await Customer.deleteMany({ _id: { $in: ids } });
    console.log(`✓ Removed ${dummyCustomers.length} dummy customer(s).`);
  }

  // 2. Audit Sales Invoices
  const dummyInvoices = await SalesInvoice.find({
    $or: [
      { customerName: /^Test /i },
      { customerName: /^Acceptance /i },
      { customerName: /^Demo /i },
      { customerName: /^Dummy /i },
      { customerName: /^Concurrent /i },
      { customerName: /^Sequential /i },
      { customerName: /^Sample /i },
    ],
  }).lean().exec();

  console.log(`Found ${dummyInvoices.length} dummy/test sales invoice(s).`);
  if (dummyInvoices.length > 0) {
    dummyInvoices.forEach(inv => console.log(`  • Removing Invoice: #${inv.invoiceNumber} for '${inv.customerName}' (ID: ${inv._id})`));
    const ids = dummyInvoices.map(inv => inv._id);
    await SalesInvoice.deleteMany({ _id: { $in: ids } });
    console.log(`✓ Removed ${dummyInvoices.length} dummy invoice(s).`);
  }

  // 3. Audit Products
  const dummyProducts = await Product.find({
    $or: [
      { name: /^Test /i },
      { name: /^Acceptance /i },
      { name: /^Demo /i },
      { name: /^Dummy /i },
      { name: /^Sample /i },
    ],
  }).lean().exec();

  console.log(`Found ${dummyProducts.length} dummy/test product(s).`);
  if (dummyProducts.length > 0) {
    for (const p of dummyProducts) {
      console.log(`  • Removing Product: '${p.name}' (ID: ${p._id})`);
      await ProductBatch.deleteMany({ productId: p._id });
      await PurchaseItem.deleteMany({ productId: p._id });
      await StockLedger.deleteMany({ productId: p._id });
      await Product.deleteOne({ _id: p._id });
    }
    console.log(`✓ Removed ${dummyProducts.length} dummy product(s) and associated batches/ledgers.`);
  }

  // 4. Audit Suppliers
  const dummySuppliers = await Supplier.find({
    $or: [
      { name: /^Test /i },
      { name: /^Acceptance /i },
      { name: /^Demo /i },
      { name: /^Dummy /i },
      { name: /^Sample /i },
    ],
  }).lean().exec();

  console.log(`Found ${dummySuppliers.length} dummy/test supplier(s).`);
  if (dummySuppliers.length > 0) {
    for (const s of dummySuppliers) {
      console.log(`  • Removing Supplier: '${s.name}' (ID: ${s._id})`);
      await SupplierLedger.deleteMany({ supplierId: s._id });
      await Supplier.deleteOne({ _id: s._id });
    }
    console.log(`✓ Removed ${dummySuppliers.length} dummy supplier(s).`);
  }

  // Summary counts of genuine database records remaining
  console.log('\n====================================================');
  console.log('📊 GENUINE APPLICATION BUSINESS DATA SUMMARY');
  console.log('====================================================');
  console.log(`• Genuine Customers      : ${await Customer.countDocuments({})}`);
  console.log(`• Genuine Products       : ${await Product.countDocuments({})}`);
  console.log(`• Genuine Product Batches: ${await ProductBatch.countDocuments({})}`);
  console.log(`• Genuine Sales Invoices : ${await SalesInvoice.countDocuments({})}`);
  console.log(`• Genuine Purchases      : ${await Purchase.countDocuments({})}`);
  console.log(`• Genuine Suppliers      : ${await Supplier.countDocuments({})}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
}

auditAndCleanDatabase().catch((err) => {
  console.error('Error auditing database:', err);
  process.exit(1);
});
