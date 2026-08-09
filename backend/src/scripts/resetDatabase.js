import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ShopSettings } from '../modules/settings/models/shopSettings.model.js';
import { ShopDiscount } from '../modules/settings/models/shopDiscount.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { PurchaseReturn } from '../modules/purchases/models/purchaseReturn.model.js';
import { StockLedger } from '../modules/purchases/models/stockLedger.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { CustomerPayment } from '../modules/customers/models/customerPayment.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Company } from '../modules/masters/models/company.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';
import { User } from '../modules/auth/user.model.js';

async function resetDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fertilizer';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('--- STARTING COMPLETE MANDHI ERP DATABASE RESET ---');

  // 1. Delete all transactional & business data
  await SalesInvoice.deleteMany({});
  console.log('✓ Sales Invoices deleted');

  await CustomerPayment.deleteMany({});
  console.log('✓ Customer Payments deleted');

  await Customer.deleteMany({});
  console.log('✓ Customers deleted');

  await Product.deleteMany({});
  console.log('✓ Products deleted');

  await ProductBatch.deleteMany({});
  console.log('✓ Product Batches deleted');

  await Supplier.deleteMany({});
  console.log('✓ Suppliers deleted');

  await SupplierLedger.deleteMany({});
  console.log('✓ Supplier Ledgers deleted');

  try {
    const PurchaseModel = mongoose.model('Purchase');
    await PurchaseModel.deleteMany({});
    console.log('✓ Purchases deleted');
  } catch (e) {
    // Model might not be compiled if not directly imported
  }

  await PurchaseItem.deleteMany({});
  console.log('✓ Purchase Items deleted');

  await PurchaseReturn.deleteMany({});
  console.log('✓ Purchase Returns deleted');

  await StockLedger.deleteMany({});
  console.log('✓ Stock Ledgers deleted');

  await Category.deleteMany({});
  console.log('✓ Categories deleted');

  await Company.deleteMany({});
  console.log('✓ Companies deleted');

  await Unit.deleteMany({});
  console.log('✓ Units deleted');

  await ShopDiscount.deleteMany({});
  console.log('✓ Shop Discounts deleted');

  // 2. Reset Shop Settings to a single blank document
  await ShopSettings.deleteMany({});
  await ShopSettings.create({
    shopName: '',
    ownerName: '',
    mobile: '',
    alternateMobile: '',
    whatsappNumber: '',
    email: '',
    address: '',
    village: '',
    mandal: '',
    district: '',
    state: '',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    fertilizerLicense: '',
    pesticideLicense: '',
    seedLicense: '',
    logoUrl: '',
    signatureUrl: '',
    shopBannerUrl: '',
    upiId: '',
    upiPayeeName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    qrCodeUrl: '',
  });
  console.log('✓ Shop Settings reset to completely blank fresh install state');

  // 3. Keep ONLY 1 Admin user, delete all extra user accounts
  const users = await User.find({}).sort({ createdAt: 1 });
  if (users.length > 0) {
    const adminUser = users.find((u) => u.role === 'admin' || u.role === 'owner') || users[0];
    await User.deleteMany({ _id: { $ne: adminUser._id } });

    // Clear custom profile fields for remaining user
    adminUser.ownerName = '';
    adminUser.shopName = '';
    adminUser.mobile = adminUser.mobile || '9848081875';
    await adminUser.save();
    console.log(`✓ Retained single login user account: ${adminUser.username || adminUser.email} (All other users deleted)`);
  }

  console.log('--- MANDHI ERP DATABASE RESET COMPLETED SUCCESSFULLY ---');
  await mongoose.disconnect();
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('Database reset error:', err);
  process.exit(1);
});
