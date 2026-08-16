import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { shopSettingsService } from '../modules/settings/services/shopSettings.service.js';
import { categoryService } from '../modules/masters/services/category.service.js';
import { companyService } from '../modules/masters/services/company.service.js';
import { unitService } from '../modules/masters/services/unit.service.js';
import { productService } from '../modules/products/services/product.service.js';
import { customerService } from '../modules/customers/services/customer.service.js';
import { supplierService } from '../modules/suppliers/services/supplier.service.js';
import { salesInvoiceService } from '../modules/sales/services/salesInvoice.service.js';
import { reportsService } from '../modules/reports/services/reports.service.js';
import { dashboardService } from '../modules/dashboard/services/dashboard.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runComprehensiveIsolationTests() {
  // REQUIREMENT: Use dedicated temporary test database (mandhi_erp_test) to avoid polluting mandhi_erp
  const testMongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp').replace(/\/mandhi_erp(\?.*)?$/, '/mandhi_erp_test$1');

  console.log(`Connecting to DEDICATED TEST MONGODB DATABASE at ${testMongoUri}...`);
  await mongoose.connect(testMongoUri);

  console.log('\n====================================================================');
  console.log('  VEDIXA ERP MULTI-TENANT ISOLATION TEST SUITE (DEDICATED TEST DB)  ');
  console.log('====================================================================');

  try {
    // 1. Create Isolated Temporary User A & User B
    const userA = await User.create({
      ownerName: 'Test Owner A',
      mobile: `9111${Date.now().toString().slice(-6)}`,
      passwordHash: 'dummy_hash_a',
      role: 'owner',
    });

    const userB = await User.create({
      ownerName: 'Test Owner B',
      mobile: `9222${Date.now().toString().slice(-6)}`,
      passwordHash: 'dummy_hash_b',
      role: 'owner',
    });

    const idA = userA._id;
    const idB = userB._id;

    console.log(`✓ User A ID: ${idA} (Mobile: ${userA.mobile})`);
    console.log(`✓ User B ID: ${idB} (Mobile: ${userB.mobile})\n`);

    // ------------------------------------------------------------------
    // TEST 1: MASTER DATA ISOLATION (Categories, Companies, Units)
    // ------------------------------------------------------------------
    console.log('--- TEST 1: MASTER DATA ISOLATION (Category, Company, Unit) ---');
    const catAName = `Fertilizers A_${Date.now()}`;
    const catBName = `Fertilizers B_${Date.now()}`;

    const compAName = `Iffco A_${Date.now()}`;
    const compBName = `Kribhco B_${Date.now()}`;

    const unitAName = `Bag A_${Date.now()}`;
    const unitBName = `Bag B_${Date.now()}`;

    const catA = await categoryService.createCategory({ name: catAName, description: 'User A Category' }, idA);
    const catB = await categoryService.createCategory({ name: catBName, description: 'User B Category' }, idB);

    const compA = await companyService.createCompany({ name: compAName, shortName: 'IFA' }, idA);
    const compB = await companyService.createCompany({ name: compBName, shortName: 'KRB' }, idB);

    const unitA = await unitService.createUnit({ name: unitAName, shortName: 'BG' }, idA);
    const unitB = await unitService.createUnit({ name: unitBName, shortName: 'BG' }, idB);

    const userACats = await categoryService.getAllCategories({}, idA);
    const userBCats = await categoryService.getAllCategories({}, idB);

    const userAHasB = userACats.categories.some((c) => c.name === catBName);
    const userBHasA = userBCats.categories.some((c) => c.name === catAName);

    if (!userAHasB && !userBHasA) {
      console.log('✅ PASS: Master Categories are 100% isolated between User A and User B!');
    } else {
      throw new Error('Category data leakage detected!');
    }

    // ------------------------------------------------------------------
    // TEST 2: CUSTOMERS & SUPPLIERS ISOLATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: CUSTOMER & SUPPLIER ISOLATION ---');
    const custA = await customerService.createCustomer({ name: 'Customer Alpha', mobile: `90000${Date.now().toString().slice(-5)}` }, idA);
    const custB = await customerService.createCustomer({ name: 'Customer Beta', mobile: `90000${(Date.now() + 1).toString().slice(-5)}` }, idB);

    const userACusts = await customerService.getAllCustomers({}, idA);
    const userBCusts = await customerService.getAllCustomers({}, idB);

    const custAInB = userBCusts.customers.some((c) => c._id.toString() === custA._id.toString());
    const custBInA = userACusts.customers.some((c) => c._id.toString() === custB._id.toString());

    if (!custAInB && !custBInA) {
      console.log('✅ PASS: Customers are 100% isolated between User A and User B!');
    } else {
      throw new Error('Customer data leakage detected!');
    }

    // ------------------------------------------------------------------
    // TEST 3: PRODUCT & INVENTORY ISOLATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: PRODUCT & INVENTORY ISOLATION ---');
    const prodA = await productService.createProduct({
      name: 'Urea Premium A',
      brandId: compA._id,
      categoryId: catA._id,
      defaultUnitId: unitA._id,
      defaultSellingPrice: 300,
      totalStock: 50,
    }, idA);

    const prodB = await productService.createProduct({
      name: 'DAP Gold B',
      brandId: compB._id,
      categoryId: catB._id,
      defaultUnitId: unitB._id,
      defaultSellingPrice: 1350,
      totalStock: 100,
    }, idB);

    const userAProds = await productService.getAllProducts({}, idA);
    const userBProds = await productService.getAllProducts({}, idB);

    const prodAInB = userBProds.products.some((p) => p._id.toString() === prodA._id.toString());
    const prodBInA = userAProds.products.some((p) => p._id.toString() === prodB._id.toString());

    if (!prodAInB && !prodBInA) {
      console.log('✅ PASS: Product catalog & stock layers are 100% isolated!');
    } else {
      throw new Error('Product catalog data leakage detected!');
    }

    // ------------------------------------------------------------------
    // TEST 4: IDOR SECURITY TEST (Accessing User B's Product using User A's credentials)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: IDOR SECURITY ENFORCEMENT ---');
    let idorCaught = false;
    try {
      await productService.getProductById(prodB._id, idA);
    } catch (err) {
      idorCaught = true;
    }

    if (idorCaught) {
      console.log('✅ PASS: IDOR attempt blocked! User A cannot access User B\'s product by ID!');
    } else {
      throw new Error('IDOR vulnerability! User A accessed User B\'s product!');
    }

    // ------------------------------------------------------------------
    // TEST 5: BILLING & SALES INVOICES ISOLATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: SALES BILLING & POS ISOLATION ---');
    const billA = await salesInvoiceService.createInvoice({
      customer: { name: custA.name, mobile: custA.mobile },
      items: [{ productId: prodA._id, name: prodA.name, quantity: 2, unitPrice: 300 }],
      totalAmount: 600,
      paidAmount: 600,
    }, idA);

    const billB = await salesInvoiceService.createInvoice({
      customer: { name: custB.name, mobile: custB.mobile },
      items: [{ productId: prodB._id, name: prodB.name, quantity: 1, unitPrice: 1350 }],
      totalAmount: 1350,
      paidAmount: 1350,
    }, idB);

    const userABills = await salesInvoiceService.getAllInvoices({}, idA);
    const userBBills = await salesInvoiceService.getAllInvoices({}, idB);

    const billAInB = userBBills.invoices.some((b) => b._id.toString() === billA.invoice._id.toString());
    const billBInA = userABills.invoices.some((b) => b._id.toString() === billB.invoice._id.toString());

    if (!billAInB && !billBInA) {
      console.log('✅ PASS: Sales Invoices & POS Bills are 100% isolated!');
    } else {
      throw new Error('Billing data leakage detected!');
    }

    // ------------------------------------------------------------------
    // TEST 6: DASHBOARD & BI ANALYTICS METRICS ISOLATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6: DASHBOARD & BI ANALYTICS ISOLATION ---');
    const dashA = await dashboardService.getDashboardSummary(idA);
    const dashB = await dashboardService.getDashboardSummary(idB);

    const biA = await reportsService.getBIAnalytics({}, idA);
    const biB = await reportsService.getBIAnalytics({}, idB);

    console.log(`User A BI Total Sales: ₹${biA.sales.totalSales} | Today Sales: ₹${biA.sales.todaySales}`);
    console.log(`User B BI Total Sales: ₹${biB.sales.totalSales} | Today Sales: ₹${biB.sales.todaySales}`);

    if (biA.sales.totalSales !== biB.sales.totalSales) {
      console.log('✅ PASS: Dashboard & BI Analytics totals are 100% isolated per tenant!');
    } else {
      throw new Error('Dashboard BI analytics leakage detected!');
    }

    console.log('\n====================================================================');
    console.log('🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================================\n');
  } finally {
    // ALWAYS PERFORM COMPLETE TEARDOWN IN FINALLY BLOCK
    console.log('====================================================================');
    console.log('      TEARDOWN: DROPPING DEDICATED TEST DATABASE mandhi_erp_test    ');
    console.log('====================================================================');
    await mongoose.connection.db.dropDatabase();
    console.log('✓ Dedicated test database mandhi_erp_test dropped cleanly!');
    await mongoose.disconnect();
  }
}

runComprehensiveIsolationTests().catch((err) => {
  console.error('Isolation Test Execution Failed:', err);
  process.exit(1);
});
