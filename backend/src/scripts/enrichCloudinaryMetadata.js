import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { Product } from '../modules/products/models/product.model.js';
import '../modules/masters/models/brand.model.js';
import '../modules/masters/models/category.model.js';
import '../modules/masters/models/unit.model.js';
import { cloudinary } from '../config/cloudinary.config.js';

export async function enrichAllCloudinaryAssets() {
  await mongoose.connect(envConfig.mongo.uri);
  console.log('🔌 Connected to MongoDB');

  const products = await Product.find({ image: { $regex: 'cloudinary.com' } })
    .populate('brandId', 'name')
    .populate('categoryId', 'name')
    .populate('defaultUnitId', 'name')
    .lean();

  console.log(`📦 Found ${products.length} products with Cloudinary images`);
  let enrichedCount = 0;

  for (const p of products) {
    const rawImage = (p.image || '').trim();
    if (!rawImage.includes('/upload/')) continue;

    const parts = rawImage.split('/upload/');
    if (!parts[1]) continue;

    const pathWithoutVersion = parts[1].replace(/^v\d+\//, '');
    const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, '');

    const productName = (p.name || '').trim();
    const brandName = (p.brandId?.name || p.brand || '').trim();
    const categoryName = (p.categoryId?.name || p.category || '').trim();
    const unitName = (p.defaultUnitId?.name || p.unit || '').trim();

    const contextObj = {};
    if (productName) contextObj.productName = productName;
    if (brandName) contextObj.brand = brandName;
    if (categoryName) contextObj.category = categoryName;
    if (unitName) contextObj.unit = unitName;

    const ctxStr = Object.entries(contextObj)
      .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, ' ')}`)
      .join('|');

    if (ctxStr) {
      try {
        await cloudinary.uploader.add_context(ctxStr, [publicId]);
        enrichedCount++;
        console.log(`✅ Enriched (${publicId}): ${ctxStr}`);
      } catch (err) {
        console.error(`❌ Error enriching (${publicId}):`, err.message);
      }
    }
  }

  console.log(`\n🎉 Total Cloudinary assets enriched: ${enrichedCount}`);
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('enrichCloudinaryMetadata.js')) {
  enrichAllCloudinaryAssets().then(() => process.exit(0)).catch(console.error);
}
