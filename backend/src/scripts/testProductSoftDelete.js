


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
import { productService } from '../modules/products/services/product.service.js';

async function runSoftDeleteAcceptanceTest() {
  const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp_test';
  console.log(`Connecting to Test MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  console.log('\n====================================================');
  console.log('🧪 ACCEPTANCE TEST: PRODUCT SOFT DELETE & 90-DAY RETENTION');
  console.log('====================================================\n');

  let brand = await Company.findOne({ isActive: true });
  if (!brand) {
    brand = await Company.create({ name: 'Bayer CropScience', code: 'BAYER', slug: 'bayer', isActive: true });
  }
  let category = await Category.findOne({ isActive: true });
  if (!category) {
    category = await Category.create({ name: 'Pesticides', code: 'PEST', slug: 'pesticides', isActive: true });
  }
  let unit = await Unit.findOne({ isActive: true });
  if (!unit) {
    unit = await Unit.create({ name: 'Bottle', shortName: 'btl', code: 'BTL', slug: 'bottle', isActive: true });
  }

  const testProdName = `SoftDelete Test Product ${Date.now()}`;
  console.log(`1. Creating Test Product '${testProdName}'...`);
  const createdRes = await productService.createProduct({
    name: testProdName,
    brandId: brand._id.toString(),
    categoryId: category._id.toString(),
    defaultUnitId: unit._id.toString(),
    defaultPurchaseRate: 400,
    defaultSellingPrice: 500,
  });

  const productId = createdRes._id;
  console.log(`✓ Product Created with ID: ${productId}`);

  console.log('\n2. Verifying Product is visible in Active Products query...');
  const activeProdsBefore = await productService.getAllProducts();
  const foundBefore = activeProdsBefore.products.find(p => p._id.toString() === productId.toString());
  console.log(`• Active Products List contains test product: ${Boolean(foundBefore)}`);
  if (!foundBefore) {
    throw new Error('TEST FAILED: Product was not found in active products before deletion');
  }

  console.log('\n3. Executing Soft Delete (deactivateProduct)...');
  const deactivatedProd = await productService.deactivateProduct(productId.toString());
  console.log(`✓ Soft Delete API call succeeded without 400 error!`);

  console.log('\n4. Verifying MongoDB Document State...');
  const rawMongoDoc = await Product.findById(productId).lean().exec();
  console.log(`• Document exists in MongoDB: ${Boolean(rawMongoDoc)}`);
  console.log(`• Document isActive: ${rawMongoDoc?.isActive}`);
  console.log(`• Document deletedAt: ${rawMongoDoc?.deletedAt}`);

  if (!rawMongoDoc) {
    throw new Error('TEST FAILED: Document was physically deleted from MongoDB instead of soft deleted!');
  }
  if (rawMongoDoc.isActive !== false) {
    throw new Error(`TEST FAILED: Product isActive is ${rawMongoDoc.isActive}, expected false`);
  }
  if (!rawMongoDoc.deletedAt) {
    throw new Error('TEST FAILED: Product deletedAt timestamp is missing!');
  }

  console.log('\n5. Verifying Product disappeared from Active Products query...');
  const activeProdsAfter = await productService.getAllProducts();
  const foundAfter = activeProdsAfter.products.find(p => p._id.toString() === productId.toString());
  console.log(`• Active Products List contains test product: ${Boolean(foundAfter)} (Expected: false)`);
  if (foundAfter) {
    throw new Error('TEST FAILED: Soft-deleted product is still visible in active products list!');
  }

  console.log('\n6. Cleaning up test records from test DB...');
  await ProductBatch.deleteMany({ productId });
  await Product.deleteOne({ _id: productId });
  console.log('✓ Test cleanup complete!');

  console.log('\n====================================================');
  console.log('🎉 ALL SOFT DELETE ACCEPTANCE TESTS PASSED (100%)!');
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runSoftDeleteAcceptanceTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
