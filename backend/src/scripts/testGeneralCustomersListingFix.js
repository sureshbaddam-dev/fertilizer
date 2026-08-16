import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../modules/auth/user.model.js';
import { Customer } from '../modules/customers/models/customer.model.js';
import { Product } from '../modules/products/models/product.model.js';
import { ProductBatch } from '../modules/products/models/productBatch.model.js';
import { Category } from '../modules/masters/models/category.model.js';
import { Brand } from '../modules/masters/models/brand.model.js';
import { Unit } from '../modules/masters/models/unit.model.js';

import { customerService } from '../modules/customers/services/customer.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';

const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mandhi_erp_test';

async function runGeneralCustomersListingTests() {
  console.log(`==================================================`);
  console.log(`CONNECTING TO TEST DATABASE: ${TEST_DB_URI}`);
  console.log(`==================================================\n`);

  await mongoose.connect(TEST_DB_URI);

  // Setup Test User & Masters
  const user = await User.create({
    ownerName: 'General Customer Directory Test User',
    mobile: `993${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: '$2a$10$hashforexamplepassword12345',
    businessName: 'Vedixa General Customers Test Hub',
  });
  const userId = user._id;

  const category = await Category.create({ userId, name: 'General Agri', slug: `agri-${Date.now()}` });
  const brand = await Brand.create({ userId, name: 'Nagarjuna' });
  const unit = await Unit.create({ userId, name: 'Bags', shortName: 'Bag' });

  const product = await Product.create({
    userId,
    name: 'Nagarjuna DAP 50kg',
    code: 'DAP-100',
    categoryId: category._id,
    brandId: brand._id,
    defaultUnitId: unit._id,
    defaultPurchaseRate: 1200,
    defaultSellingPrice: 1350,
    totalStock: 500,
    isActive: true,
  });

  await ProductBatch.create({
    userId,
    productId: product._id,
    batchNumber: 'BATCH-DAP-001',
    initialQuantity: 500,
    currentStock: 500,
    purchaseRate: 1200,
    sellingPrice: 1350,
    isActive: true,
  });

  // 1. Create POS Billing General Customer
  console.log(`--- Creating POS Sales Bill for General Customer 'General Ramesh' (Mobile: 9888877771) ---`);
  await salesInvoiceService.createInvoice(
    {
      customerName: 'General Ramesh',
      customerMobile: '9888877771',
      customerType: 'GENERAL',
      items: [{ productId: product._id.toString(), qty: 2, price: 1350 }],
      paidAmount: 2700,
    },
    userId
  );

  // 2. Create Master General Customer
  console.log(`--- Creating Master General Customer 'General Suresh' (Mobile: 9888877772) ---`);
  await Customer.create({
    userId,
    name: 'General Suresh',
    mobile: '9888877772',
    customerType: 'GENERAL',
    village: 'Narketpally',
    district: 'Nalgonda',
  });

  // 3. Create ADDED Customer (Must be excluded from General Customers)
  console.log(`--- Creating ADDED Customer 'Added Ram' (Mobile: 9888877773) ---`);
  await Customer.create({
    userId,
    name: 'Added Ram',
    mobile: '9888877773',
    customerType: 'ADDED',
    type: 'Regular',
  });

  // 4. Query getGeneralCustomers API
  console.log(`\n--- Querying customerService.getGeneralCustomers ---`);
  const res = await customerService.getGeneralCustomers({}, userId);

  console.log(`API Result Summary:`);
  console.log(`  Total Customers Found: ${res.generalCustomers.length}`);
  console.log(`  Total Bills: ${res.summary.totalBills}`);
  console.log(`  Total Purchase Value: ₹${res.summary.totalPurchaseValue}`);
  console.log(`  Total Paid: ₹${res.summary.totalPaid}`);

  console.log(`Customers List Returned:`);
  res.generalCustomers.forEach((c) => console.log(`  - Name: ${c.name}, Mobile: ${c.mobile}, Type: ${c.customerType}, Purchases: ₹${c.totalPurchases}`));

  const foundRamesh = res.generalCustomers.find((c) => c.mobile === '9888877771');
  const foundSuresh = res.generalCustomers.find((c) => c.mobile === '9888877772');
  const foundAddedRam = res.generalCustomers.find((c) => c.mobile === '9888877773');

  if (!foundRamesh) throw new Error(`Failed: General Ramesh from POS Sales Invoice was not returned!`);
  if (!foundSuresh) throw new Error(`Failed: General Suresh from Master Customer document was not returned!`);
  if (foundAddedRam) throw new Error(`Failed: Added Customer Ram was incorrectly included in General Customers list!`);

  console.log(`✓ GENERAL CUSTOMER DIRECTORY LISTING TEST PASSED CLEANLY!`);

  await mongoose.disconnect();
  process.exit(0);
}

runGeneralCustomersListingTests().catch((err) => {
  console.error(`❌ TEST SUITE FAILED:`, err);
  mongoose.disconnect();
  process.exit(1);
});
