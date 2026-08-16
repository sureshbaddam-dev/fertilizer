import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { CustomerPayment } from '../modules/customers/models/customerPayment.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Company } from '../modules/masters/models/company.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { ShopDiscount } from '../modules/settings/models/shopDiscount.model.js';
import { ShopSettings } from '../modules/settings/models/shopSettings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAllData() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const users = await User.find({}).exec();
  console.log(`Found ${users.length} users in database.`);

  if (users.length === 0) {
    console.log('No users found in database.');
    await mongoose.disconnect();
    return;
  }

  const primaryUser = users[0];
  console.log(`Primary user for legacy unassigned data: ${primaryUser.mobile} (${primaryUser._id})`);

  const modelsToMigrate = [
    { name: 'Product', model: Product },
    { name: 'ProductBatch', model: ProductBatch },
    { name: 'Customer', model: Customer },
    { name: 'CustomerPayment', model: CustomerPayment },
    { name: 'Supplier', model: Supplier },
    { name: 'SupplierLedger', model: SupplierLedger },
    { name: 'Purchase', model: Purchase },
    { name: 'PurchaseItem', model: PurchaseItem },
    { name: 'StockLedger', model: StockLedger },
    { name: 'SalesInvoice', model: SalesInvoice },
    { name: 'Category', model: Category },
    { name: 'Company', model: Company },
    { name: 'Brand', model: Brand },
    { name: 'Unit', model: Unit },
    { name: 'ShopDiscount', model: ShopDiscount },
    { name: 'ShopSettings', model: ShopSettings },
  ];

  for (const { name, model } of modelsToMigrate) {
    const unassigned = await model.find({ $or: [{ userId: { $exists: false } }, { userId: null }] }).exec();
    if (unassigned.length > 0) {
      console.log(`Migrating ${unassigned.length} unassigned ${name} records to primary user...`);
      await model.updateMany(
        { $or: [{ userId: { $exists: false } }, { userId: null }] },
        { $set: { userId: primaryUser._id } }
      ).exec();
    }
  }

  console.log('✅ ALL BUSINESS DATA COLLECTIONS ARE NOW USER-SCOPED AND MIGRATED SUCCESSFULLY!');
  await mongoose.disconnect();
}

migrateAllData().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
