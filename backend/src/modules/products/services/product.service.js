import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { productRepository } from '../repositories/product.repository.js';
import { ProductBatch } from '../models/productBatch.model.js';
import { companyRepository } from '../../masters/repositories/company.repository.js';
import { categoryRepository } from '../../masters/repositories/category.repository.js';
import { unitRepository } from '../../masters/repositories/unit.repository.js';
import { baseMasterService } from '../../../common/baseMaster.service.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';
import { PurchaseItem } from '../../purchases/models/purchaseItem.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { StockLedger } from '../../purchases/models/stockLedger.model.js';
import { Category } from '../../masters/models/category.model.js';
import { Brand } from '../../masters/models/brand.model.js';
import { Company } from '../../masters/models/company.model.js';
import { Unit } from '../../masters/models/unit.model.js';
import { ShopSettings } from '../../settings/models/shopSettings.model.js';
import { cloudinaryProductImageService } from './cloudinaryProductImage.service.js';
import { deleteFromCloudinary } from '../../../utils/cloudinary.utils.js';

export async function generateNextBatchNumber(userId, session = null) {
  if (!userId) throw new Error('userId is required');

  let shopName = '';
  try {
    const settings = await ShopSettings.findOne({ userId }).lean().exec();
    shopName = (settings?.shopName || settings?.name || '').trim();
  } catch (err) {
    logger.warn(`Could not fetch ShopSettings for batch prefix for user ${userId}:`, err);
  }

  let shopLetter = 'A';
  if (shopName) {
    const match = shopName.match(/[a-zA-Z]/);
    if (match && match[0]) {
      shopLetter = match[0].toUpperCase();
    }
  }

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${shopLetter}B${yy}${mm}`;

  const prefixRegex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const opts = session ? { session } : {};
  const batches = await ProductBatch.find({ userId, batchNumber: { $regex: prefixRegex } }, { batchNumber: 1 }, opts)
    .lean()
    .exec();

  let maxSeq = 0;
  if (Array.isArray(batches) && batches.length > 0) {
    for (const b of batches) {
      if (b?.batchNumber) {
        const match = b.batchNumber.match(prefixRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}${nextSeq}`;

  while (await ProductBatch.exists({ userId, batchNumber: candidate })) {
    nextSeq += 1;
    candidate = `${prefix}${nextSeq}`;
  }

  return candidate;
}

export const productService = {
  async getTopSellingProducts(query = {}, userId) {
    if (!userId) throw new Error('userId is required');

    const userObjId = new mongoose.Types.ObjectId(userId);

    // 1. Aggregate SalesInvoice items to calculate total quantity sold per product
    const salesAggregation = await SalesInvoice.aggregate([
      { $match: { userId: userObjId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSoldQty: { $sum: { $toDouble: { $ifNull: ['$items.quantity', 0] } } },
        },
      },
      { $sort: { totalSoldQty: -1 } },
    ]);

    const salesMap = new Map();
    salesAggregation.forEach((item) => {
      if (item._id) salesMap.set(item._id.toString(), item.totalSoldQty);
    });

    // 2. Fetch active products (with optional search filter)
    const filter = { userId, isActive: true };
    if (query.inStock === 'true' || query.inStockOnly === 'true') {
      filter.totalStock = { $gt: 0 };
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { barcode: searchRegex },
      ];
    }

    const productsDocs = await productRepository.findAllPopulated(filter, { sort: { name: 1 } });

    // Fetch associated product batches for bulk active FIFO batch attachment
    const productIds = productsDocs.map((p) => p._id);
    const allBatches = await ProductBatch.find({
      userId,
      productId: { $in: productIds },
      isDeleted: { $ne: true },
      isActive: true,
    }).lean().exec();

    const batchMap = {};
    allBatches.forEach((b) => {
      const pid = b.productId.toString();
      if (!batchMap[pid]) batchMap[pid] = [];
      batchMap[pid].push(b);
    });

    // Attach totalSoldQty, active batches, and effective FIFO selling price to each product
    const productsWithSales = productsDocs.map((pDoc) => {
      const pObj = pDoc.toObject ? pDoc.toObject() : { ...pDoc };
      const pIdStr = pObj._id.toString();
      const pBatches = (batchMap[pIdStr] || []).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const activeBatches = pBatches.filter((b) => (b.currentStock > 0 || b.quantityRemaining > 0) && b.isActive !== false && b.isDeleted !== true);
      const oldestActiveBatch = activeBatches[0] || null;
      const upcomingBatch = activeBatches[1] || null;

      const rawSellingPrice = oldestActiveBatch?.sellingPrice > 0
        ? oldestActiveBatch.sellingPrice
        : (pObj.defaultSellingPrice ?? pObj.sellingPrice ?? 0);
      const effectiveSellingPrice = normalizeMoney(rawSellingPrice);

      pObj.totalSoldQty = salesMap.get(pIdStr) || 0;
      pObj.batches = activeBatches.length > 0 ? activeBatches : pBatches;
      pObj.activeBatches = activeBatches;
      pObj.currentActiveBatch = oldestActiveBatch;
      pObj.upcomingBatch = upcomingBatch;
      pObj.currentSellingPrice = effectiveSellingPrice;
      pObj.sellingPrice = effectiveSellingPrice;
      pObj.defaultSellingPrice = effectiveSellingPrice;

      return pObj;
    });

    // Sort: Primary by totalSoldQty DESC, Secondary by totalStock DESC, Tertiary by name ASC
    productsWithSales.sort((a, b) => {
      if (b.totalSoldQty !== a.totalSoldQty) {
        return b.totalSoldQty - a.totalSoldQty;
      }
      if ((b.totalStock || 0) !== (a.totalStock || 0)) {
        return (b.totalStock || 0) - (a.totalStock || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return {
      products: productsWithSales,
      total: productsWithSales.length,
    };
  },

  async seedDefaultProducts() {
    return;
  },

  async getAllProducts(query = {}, userId) {
    if (!userId) throw new Error('userId is required');

    const userObjId = new mongoose.Types.ObjectId(userId);
    const filter = { userId };
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');

      // Lookup matching Brands / Companies
      const matchingBrands = await companyRepository.findAll({ userId, name: searchRegex });
      const brandIds = matchingBrands.map((b) => b._id);

      // Lookup matching Categories
      const matchingCategories = await categoryRepository.findAll({ userId, name: searchRegex });
      const categoryIds = matchingCategories.map((c) => c._id);

      // Lookup matching Batches
      const matchingBatches = await ProductBatch.find({ userId, batchNumber: searchRegex, isActive: true }).lean().exec();
      const batchProductIds = matchingBatches.map((b) => b.productId);

      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { barcode: searchRegex },
      ];

      if (brandIds.length > 0) filter.$or.push({ brandId: { $in: brandIds } });
      if (categoryIds.length > 0) filter.$or.push({ categoryId: { $in: categoryIds } });
      if (batchProductIds.length > 0) filter.$or.push({ _id: { $in: batchProductIds } });
    }

    const brandId = query.brandId || query.companyId;
    if (brandId) {
      filter.brandId = brandId;
    } else if (query.brand && query.brand !== 'ALL' && query.brand !== 'All Brands') {
      const brandRegex = new RegExp(`^${query.brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const matchingBrands = await companyRepository.findAll({ userId, name: brandRegex });
      const bIds = matchingBrands.map((b) => b._id);
      if (bIds.length > 0) filter.brandId = { $in: bIds };
    }

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    } else if (query.category && query.category !== 'ALL' && query.category !== 'All Categories' && query.category !== 'All Products') {
      const catRegex = new RegExp(`^${query.category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const matchingCats = await Category.find({ userId, name: catRegex }).lean().exec();
      const catIds = matchingCats.map((c) => c._id);
      if (catIds.length > 0) {
        filter.categoryId = { $in: catIds };
      } else {
        filter.category = catRegex;
      }
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    } else if (query.includeInactive !== 'true' && query.includeDeleted !== 'true') {
      filter.isActive = { $ne: false };
    }

    // Hide zero-stock products if inStock filter is passed
    if (query.inStock === 'true' || query.inStockOnly === 'true') {
      filter.totalStock = { $gt: 0 };
    }

    const sort = { name: 1 };
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 0;
    const skip = limit > 0 ? (page - 1) * limit : 0;
    const repoOptions = limit > 0 ? { sort, skip, limit } : { sort };

    const productsDocs = await productRepository.findAllPopulated(filter, repoOptions);
    const total = await productRepository.count(filter);

    // FETCH ASSOCIATED PRODUCT BATCHES FOR ALL PRODUCTS IN A SINGLE BULK QUERY (EXCLUDING SOFT-DELETED BATCHES)
    const productIds = productsDocs.map((p) => p._id);
    const allBatches = await ProductBatch.find({
      userId,
      productId: { $in: productIds },
      isDeleted: { $ne: true },
      isActive: true,
    }).lean().exec();

    const batchMap = {};
    allBatches.forEach((b) => {
      const pid = b.productId.toString();
      if (!batchMap[pid]) batchMap[pid] = [];
      batchMap[pid].push(b);
    });

    // BULK AGGREGATIONS FOR INWARD (PURCHASES) & OUTWARD (SALES) METRICS
    const purchaseAgg = await PurchaseItem.aggregate([
      { $match: { userId: userObjId, isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'purchases',
          localField: 'purchaseId',
          foreignField: '_id',
          as: 'purchaseDoc',
        },
      },
      {
        $unwind: { path: '$purchaseDoc', preserveNullAndEmptyArrays: true },
      },
      {
        $match: {
          $or: [
            { purchaseDoc: { $exists: false } },
            { 'purchaseDoc.isDeleted': { $ne: true } },
          ],
        },
      },
      {
        $group: {
          _id: '$productId',
          totalPurchasedQty: { $sum: { $toDouble: { $ifNull: ['$quantity', 0] } } },
          lastPurchaseDate: { $max: { $ifNull: ['$purchaseDoc.purchaseDate', '$createdAt'] } },
        },
      },
    ]);

    const purchaseMap = new Map();
    purchaseAgg.forEach((item) => {
      if (item._id) {
        purchaseMap.set(item._id.toString(), {
          totalPurchasedQty: item.totalPurchasedQty || 0,
          lastPurchaseDate: item.lastPurchaseDate || null,
        });
      }
    });

    const salesAgg = await SalesInvoice.aggregate([
      { $match: { userId: userObjId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSoldQty: { $sum: { $toDouble: { $ifNull: ['$items.quantity', 0] } } },
          lastSaleDate: { $max: { $ifNull: ['$date', '$createdAt'] } },
        },
      },
    ]);

    const salesMap = new Map();
    salesAgg.forEach((item) => {
      if (item._id) {
        salesMap.set(item._id.toString(), {
          totalSoldQty: item.totalSoldQty || 0,
          lastSaleDate: item.lastSaleDate || null,
        });
      }
    });

    // ATTACH BATCHES, INWARD/OUTWARD METRICS, EFFECTIVE SELLING PRICE, AND LAST DATES TO EACH PRODUCT DOCUMENT
    const products = productsDocs.map((pDoc) => {
      const pObj = pDoc.toObject ? pDoc.toObject() : { ...pDoc };
      const pIdStr = pObj._id.toString();
      const pBatches = (batchMap[pIdStr] || []).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      const activeBatches = pBatches.filter((b) => (b.currentStock > 0 || b.quantityRemaining > 0) && b.isActive !== false && b.isDeleted !== true);
      const oldestActiveBatch = activeBatches[0] || null;
      const rawSellingPrice = oldestActiveBatch?.sellingPrice > 0
        ? oldestActiveBatch.sellingPrice
        : (pObj.defaultSellingPrice ?? pObj.sellingPrice ?? 0);
      const effectiveSellingPrice = normalizeMoney(rawSellingPrice);

      const primaryBatchNumber = oldestActiveBatch?.batchNumber || pBatches[0]?.batchNumber || undefined;

      const purData = purchaseMap.get(pIdStr) || {};
      const saleData = salesMap.get(pIdStr) || {};

      // Compute accurate stock value from remaining batch layers
      let calculatedStockValue = 0;
      let unallocatedStock = Math.max(0, Number(pObj.totalStock || 0));

      if (pBatches.length > 0) {
        pBatches.forEach((b) => {
          const bStock = Math.max(0, Number(b.currentStock ?? b.quantityRemaining ?? 0));
          const bRate = Number(b.purchaseRate || 0);
          calculatedStockValue += bStock * bRate;
          unallocatedStock -= bStock;
        });
      }

      if (unallocatedStock > 0) {
        calculatedStockValue += unallocatedStock * Number(pObj.defaultPurchaseRate || 0);
      }

      return {
        ...pObj,
        defaultSellingPrice: effectiveSellingPrice,
        sellingPrice: effectiveSellingPrice,
        currentSellingPrice: effectiveSellingPrice,
        stockValue: calculatedStockValue,
        totalStockValue: calculatedStockValue,
        batches: pBatches,
        activeBatches,
        currentActiveBatch: oldestActiveBatch,
        upcomingBatch: activeBatches[1] || null,
        activeBatchCount: activeBatches.length,
        batchNumber: primaryBatchNumber,
        batchCode: primaryBatchNumber,
        totalPurchasedQty: purData.totalPurchasedQty || 0,
        lastPurchaseDate: purData.lastPurchaseDate || null,
        totalSoldQty: saleData.totalSoldQty || 0,
        lastSaleDate: saleData.lastSaleDate || null,
      };
    });

    return { products, total };
  },

  async getProductById(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Product ID format: '${id}'`, HTTP_STATUS.BAD_REQUEST);
    }

    const productDoc = await Product.findOne({ _id: id, userId })
      .populate('brandId', 'name shortName logo')
      .populate('categoryId', 'name slug icon color')
      .populate('defaultUnitId', 'name shortName allowDecimals')
      .exec();

    if (!productDoc) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }
    let rawBatches = await productRepository.findBatchesByProduct(id, userId);
    let validBatches = rawBatches
      .filter((b) => Boolean(b.batchNumber) && b.isDeleted !== true)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const productObj = productDoc.toObject ? productDoc.toObject() : { ...productDoc };

    // Fallback ONLY if product has stock but zero ProductBatch records exist in database
    if (validBatches.length === 0 && Number(productObj.totalStock || 0) > 0) {
      const defaultBatchNum = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`;
      const syntheticBatch = {
        _id: new mongoose.Types.ObjectId(),
        userId,
        productId: id,
        batchNumber: defaultBatchNum,
        purchaseRate: Number(productObj.defaultPurchaseRate || 0),
        sellingPrice: normalizeMoney(productObj.defaultSellingPrice || 0),
        initialQuantity: Number(productObj.totalStock || 0),
        currentStock: Number(productObj.totalStock || 0),
        isActive: true,
        status: 'ACTIVE',
      };
      validBatches.push(syntheticBatch);
    }

    const activeBatches = validBatches.filter((b) => (Number(b.currentStock) > 0 || (Number(b.initialQuantity) > 0 && b.currentStock === undefined)) && b.isActive !== false && b.isDeleted !== true);
    const oldestActiveBatch = activeBatches[0] || null;
    const upcomingBatch = activeBatches[1] || null;
    const rawSellingPrice = oldestActiveBatch?.sellingPrice > 0
      ? oldestActiveBatch.sellingPrice
      : (productObj.defaultSellingPrice ?? productObj.sellingPrice ?? 0);
    const effectiveSellingPrice = normalizeMoney(rawSellingPrice);

    const annotatedBatches = validBatches.map((b) => {
      const bObj = b.toObject ? b.toObject() : { ...b };
      let status = 'DEPLETED';
      if ((bObj.currentStock > 0 || bObj.quantityRemaining > 0 || bObj.initialQuantity > 0) && bObj.isActive !== false) {
        if (oldestActiveBatch && bObj._id.toString() === oldestActiveBatch._id.toString()) {
          status = 'ACTIVE';
        } else {
          status = 'UPCOMING';
        }
      }
      return {
        ...bObj,
        status,
        quantityPurchased: bObj.initialQuantity ?? bObj.quantityPurchased ?? 0,
        quantityRemaining: bObj.currentStock ?? bObj.quantityRemaining ?? 0,
      };
    });

    let calculatedStockValue = 0;
    let unallocatedStock = Math.max(0, Number(productObj.totalStock || 0));
    annotatedBatches.forEach((b) => {
      const bStock = Math.max(0, Number(b.currentStock ?? b.quantityRemaining ?? 0));
      const bRate = Number(b.purchaseRate || 0);
      calculatedStockValue += bStock * bRate;
      unallocatedStock -= bStock;
    });
    if (unallocatedStock > 0) {
      calculatedStockValue += unallocatedStock * Number(productObj.defaultPurchaseRate || 0);
    }

    const primaryBatchNumber = oldestActiveBatch?.batchNumber || annotatedBatches[0]?.batchNumber || undefined;

    return {
      product: {
        ...productObj,
        defaultSellingPrice: effectiveSellingPrice,
        sellingPrice: effectiveSellingPrice,
        currentSellingPrice: effectiveSellingPrice,
        currentActiveBatch: oldestActiveBatch,
        upcomingBatch: upcomingBatch,
        activeBatchCount: activeBatches.length,
        stockValue: calculatedStockValue,
        totalStockValue: calculatedStockValue,
        batches: annotatedBatches,
        batchNumber: primaryBatchNumber,
        batchCode: primaryBatchNumber,
      },
      batches: annotatedBatches,
    };
  },

  async reconcileProductBatches(productId, userId) {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return null;

    const filter = userId ? { _id: productId, userId } : { _id: productId };
    const product = await Product.findOne(filter).exec();
    if (!product) return null;

    const batchFilter = userId ? { productId, userId } : { productId };
    const batches = await ProductBatch.find(batchFilter).sort({ createdAt: 1 }).exec();

    if (!batches || batches.length === 0) return null;

    const prodObjId = new mongoose.Types.ObjectId(productId);
    const matchFilter = userId
      ? { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true }, 'items.productId': prodObjId }
      : { isDeleted: { $ne: true }, 'items.productId': prodObjId };

    const soldAgg = await SalesInvoice.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { $match: { 'items.productId': prodObjId } },
      { $group: { _id: null, totalSold: { $sum: { $toDouble: '$items.quantity' } } } },
    ]);

    const totalSoldQty = soldAgg[0]?.totalSold || 0;

    let remainingSoldToAllocate = totalSoldQty;
    let totalStockAcc = 0;

    for (const batch of batches) {
      const rawInit = Number(batch.initialQuantity);
      const rawCurrent = Number(batch.currentStock);
      const initQty = (rawInit > 0) ? rawInit : (rawCurrent > 0 ? rawCurrent : 0);

      if ((!rawInit || rawInit === 0) && initQty > 0) {
        batch.initialQuantity = initQty;
      }

      const consumedQty = Math.min(initQty, remainingSoldToAllocate);
      const newStock = Math.max(0, initQty - consumedQty);

      batch.currentStock = newStock;
      batch.isActive = newStock > 0 || initQty === 0;
      await batch.save();

      totalStockAcc += newStock;
      remainingSoldToAllocate -= Math.min(initQty, remainingSoldToAllocate);
    }

    if (totalSoldQty > 0 && product.totalStock !== totalStockAcc) {
      product.totalStock = totalStockAcc;
      await product.save();
    }

    return { totalStock: totalStockAcc, totalSold: totalSoldQty, batches };
  },

  async updateBatch(batchId, data, userId) {
    if (!userId) throw new Error('userId is required');
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      throw new AppError(`Invalid Batch ID format: '${batchId}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const batch = await ProductBatch.findOne({ _id: batchId, userId, isDeleted: { $ne: true } }).exec();
    if (!batch) {
      throw new AppError('Batch record not found or access denied', HTTP_STATUS.NOT_FOUND);
    }

    if (data.sellingPrice !== undefined) {
      const sPrice = Number(data.sellingPrice);
      if (isNaN(sPrice) || sPrice <= 0) {
        throw new AppError('Selling price must be greater than 0', HTTP_STATUS.BAD_REQUEST);
      }
      batch.sellingPrice = normalizeMoney(sPrice);
      await PurchaseItem.updateMany(
        { userId, batchId: batch._id },
        { $set: { sellingPrice: batch.sellingPrice } }
      ).exec();
      await StockLedger.updateMany(
        { userId, batchId: batch._id },
        { $set: { sellingPrice: batch.sellingPrice } }
      ).exec();
    }

    if (data.purchaseRate !== undefined) {
      const pRate = Number(data.purchaseRate);
      if (isNaN(pRate) || pRate <= 0) {
        throw new AppError('Purchase price must be greater than 0', HTTP_STATUS.BAD_REQUEST);
      }
      batch.purchaseRate = normalizeMoney(pRate);
      await PurchaseItem.updateMany(
        { userId, batchId: batch._id },
        { $set: { purchaseRate: batch.purchaseRate } }
      ).exec();
      await StockLedger.updateMany(
        { userId, batchId: batch._id },
        { $set: { purchaseRate: batch.purchaseRate } }
      ).exec();
    }

    if (data.mrp !== undefined) {
      const mrpVal = Number(data.mrp);
      if (!isNaN(mrpVal) && mrpVal >= 0) {
        batch.mrp = normalizeMoney(mrpVal);
      }
    }

    if (data.discount !== undefined) {
      const disc = Number(data.discount);
      if (!isNaN(disc) && disc >= 0) {
        batch.discount = disc;
      }
    }

    if (data.discountType !== undefined) {
      batch.discountType = data.discountType;
    }

    if (data.gstRate !== undefined) {
      const gst = Number(data.gstRate);
      if (!isNaN(gst) && gst >= 0) {
        batch.gstRate = gst;
      }
    }

    await batch.save();
    logger.info(`⭐ Updated ProductBatch '${batch.batchNumber}' (ID: ${batch._id}) -> Selling Price: ₹${batch.sellingPrice}, Purchase Rate: ₹${batch.purchaseRate}, MRP: ₹${batch.mrp}, Discount: ₹${batch.discount}, GST: ${batch.gstRate}%`);

    return await this.getProductById(batch.productId, userId);
  },

  async createProduct(data, userId) {
    if (!userId) throw new Error('userId is required');
    if (!data || typeof data !== 'object') {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST);
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Product name is required', HTTP_STATUS.BAD_REQUEST);
    }

    const productName = data.name.trim();
    const rawBatchInput = (data.batchCode || data.batchNumber || '').toString().trim();
    const incomingBatchCode = (rawBatchInput.toUpperCase().startsWith('BATCH-') || rawBatchInput.toUpperCase().startsWith('AUTO'))
      ? ''
      : rawBatchInput;

    const brandId = data.brandId || data.companyId;
    if (!brandId) {
      throw new AppError('Brand is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      throw new AppError(`Invalid Brand ID format: '${brandId}'`, HTTP_STATUS.BAD_REQUEST);
    }
    let brandDoc = await Brand.findOne({ _id: brandId, userId });
    if (!brandDoc) {
      brandDoc = await Company.findOne({ _id: brandId, userId });
    }
    if (!brandDoc) {
      throw new AppError('Selected Brand not found or access denied', HTTP_STATUS.BAD_REQUEST);
    }

    if (!data.categoryId) {
      throw new AppError('Category is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
      throw new AppError(`Invalid Category ID format: '${data.categoryId}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const categoryDoc = await Category.findOne({ _id: data.categoryId, userId });
    if (!categoryDoc) {
      throw new AppError('Selected Category not found or access denied', HTTP_STATUS.BAD_REQUEST);
    }

    const defaultUnitId = data.defaultUnitId || data.unitId;
    if (!defaultUnitId) {
      throw new AppError('Default Unit is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!mongoose.Types.ObjectId.isValid(defaultUnitId)) {
      throw new AppError(`Invalid Unit ID format: '${defaultUnitId}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const unitDoc = await Unit.findOne({ _id: defaultUnitId, userId });
    if (!unitDoc) {
      throw new AppError('Selected Unit not found or access denied', HTTP_STATUS.BAD_REQUEST);
    }

    const escapeRegex = (str) => (str || '').toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const matchingProducts = await productRepository.findAll({
      userId,
      name: new RegExp(`^${escapeRegex(productName)}$`, 'i'),
      isActive: true,
    });

    let isDuplicate = false;

    if (matchingProducts && matchingProducts.length > 0) {
      const matchingProductIds = matchingProducts.map((p) => p._id);

      if (incomingBatchCode) {
        const existingBatch = await ProductBatch.findOne({
          userId,
          productId: { $in: matchingProductIds },
          batchNumber: new RegExp(`^${escapeRegex(incomingBatchCode)}$`, 'i'),
          isActive: true,
        }).lean();

        if (existingBatch) {
          isDuplicate = true;
        }
      } else {
        const allMatchingBatches = await ProductBatch.find({
          userId,
          productId: { $in: matchingProductIds },
          isActive: true,
        }).lean();

        const prodBatchMap = new Map();
        allMatchingBatches.forEach((b) => {
          const pKey = b.productId?.toString();
          if (pKey) {
            if (!prodBatchMap.has(pKey)) prodBatchMap.set(pKey, []);
            prodBatchMap.get(pKey).push(b);
          }
        });

        for (const p of matchingProducts) {
          const pBatches = prodBatchMap.get(p._id.toString()) || [];
          const hasNonEmptyBatch = pBatches.some((b) => b.batchNumber && b.batchNumber.toString().trim().length > 0);
          if (!hasNonEmptyBatch || pBatches.length === 0) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    if (isDuplicate) {
      throw new AppError(
        'This Product with the same Batch Number already exists.',
        HTTP_STATUS.CONFLICT
      );
    }

    const payload = {
      userId,
      name: productName,
      code: (data.code && typeof data.code === 'string') ? data.code.trim() : undefined,
      barcode: (data.barcode && typeof data.barcode === 'string') ? data.barcode.trim() : undefined,
      image: (data.image && typeof data.image === 'string' && data.image.trim()) ? data.image.trim() : '/assets/urea_bag.png',
      brandId,
      categoryId: data.categoryId,
      defaultUnitId,
      hsnCode: (data.hsnCode && typeof data.hsnCode === 'string') ? data.hsnCode.trim() : undefined,
      gstRate: (data.gstRate !== undefined && data.gstRate !== null && data.gstRate !== '') ? Number(data.gstRate) : 0,
      minimumStockAlert: Number(data.minimumStockAlert || data.minStockAlert) || 10,
      defaultPurchaseRate: Number(data.defaultPurchaseRate) || 0,
      defaultMrp: Number(data.defaultMrp) || 0,
      defaultSellingPrice: Number(data.defaultSellingPrice) || 0,
      totalStock: Number(data.totalStock) || 0,
    };

    const newProduct = await productRepository.create(payload);

    if (newProduct && newProduct.image && typeof newProduct.image === 'string' && !newProduct.image.startsWith('/assets/')) {
      cloudinaryProductImageService.enrichImageLibraryRecord({
        imageUrl: newProduct.image,
        searchableName: newProduct.name,
        brand: brandDoc?.name || '',
        category: categoryDoc?.name || '',
        unit: unitDoc?.name || '',
      }).catch(() => {});
    }

    if (incomingBatchCode) {
      const batchData = {
        userId,
        productId: newProduct._id,
        batchNumber: incomingBatchCode,
        purchaseRate: Number(data.defaultPurchaseRate) || 0,
        mrp: Number(data.defaultMrp) || 0,
        sellingPrice: Number(data.defaultSellingPrice) || 0,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        quantity: Number(data.totalStock) || 0,
      };
      await productRepository.upsertBatch(batchData);
    }

    const populatedNew = await productRepository.findByIdPopulated(newProduct._id);
    const batchesNew = await productRepository.findBatchesByProduct(newProduct._id);
    const validBatchesNew = batchesNew.filter((b) => Boolean(b.batchNumber));
    const resObj = populatedNew.toObject ? populatedNew.toObject() : { ...populatedNew };

    resObj.batches = validBatchesNew;
    resObj.batchNumber = incomingBatchCode || validBatchesNew[0]?.batchNumber || undefined;
    resObj.batchCode = resObj.batchNumber;
    return resObj;
  },

  async updateProduct(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Product ID format: '${id}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const payload = {};
    if (data.name) payload.name = data.name.trim();
    if (data.code !== undefined) payload.code = data.code?.trim() || undefined;
    if (data.barcode !== undefined) payload.barcode = data.barcode?.trim() || undefined;
    if (data.image !== undefined) {
      const newImg = (data.image && typeof data.image === 'string' && data.image.trim()) ? data.image.trim() : '/assets/urea_bag.png';
      if (product.image && product.image !== newImg && product.image.includes('res.cloudinary.com')) {
        deleteFromCloudinary(product.image).catch(() => {});
      }
      payload.image = newImg;
    }

    const brandId = data.brandId || data.companyId;
    if (brandId) {
      if (!mongoose.Types.ObjectId.isValid(brandId)) {
        throw new AppError(`Invalid Brand ID format: '${brandId}'`, HTTP_STATUS.BAD_REQUEST);
      }
      let brandDoc = await Brand.findOne({ _id: brandId, userId });
      if (!brandDoc) {
        brandDoc = await Company.findOne({ _id: brandId, userId });
      }
      if (!brandDoc) {
        throw new AppError('Selected Brand not found or access denied', HTTP_STATUS.BAD_REQUEST);
      }
      payload.brandId = brandId;
    }

    if (data.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
        throw new AppError(`Invalid Category ID format: '${data.categoryId}'`, HTTP_STATUS.BAD_REQUEST);
      }
      const categoryDoc = await Category.findOne({ _id: data.categoryId, userId });
      if (!categoryDoc) {
        throw new AppError('Selected Category not found or access denied', HTTP_STATUS.BAD_REQUEST);
      }
      payload.categoryId = data.categoryId;
    }

    const defaultUnitId = data.defaultUnitId || data.unitId;
    if (defaultUnitId) {
      if (!mongoose.Types.ObjectId.isValid(defaultUnitId)) {
        throw new AppError(`Invalid Unit ID format: '${defaultUnitId}'`, HTTP_STATUS.BAD_REQUEST);
      }
      const unitDoc = await Unit.findOne({ _id: defaultUnitId, userId });
      if (!unitDoc) {
        throw new AppError('Selected Unit not found or access denied', HTTP_STATUS.BAD_REQUEST);
      }
      payload.defaultUnitId = defaultUnitId;
    }

    if (data.hsnCode !== undefined) payload.hsnCode = data.hsnCode?.trim() || undefined;
    if (data.gstRate !== undefined) payload.gstRate = Number(data.gstRate) || 0;
    if (data.discount !== undefined) payload.discount = Number(data.discount) || 0;
    if (data.discountType !== undefined) payload.discountType = data.discountType || 'Percentage';
    if (data.minimumStockAlert !== undefined || data.minStockAlert !== undefined) {
      payload.minimumStockAlert = Number(data.minimumStockAlert || data.minStockAlert) || 10;
    }
    if (data.defaultPurchaseRate !== undefined) payload.defaultPurchaseRate = Number(data.defaultPurchaseRate) || 0;
    if (data.defaultMrp !== undefined) payload.defaultMrp = Number(data.defaultMrp) || 0;
    if (data.defaultSellingPrice !== undefined) payload.defaultSellingPrice = Number(data.defaultSellingPrice) || 0;

    await productRepository.update(id, payload, userId);

    const updatedImage = payload.image || product.image;
    if (updatedImage && typeof updatedImage === 'string' && !updatedImage.startsWith('/assets/')) {
      cloudinaryProductImageService.enrichImageLibraryRecord({
        imageUrl: updatedImage,
        searchableName: payload.name || product.name,
        brand: brandDoc?.name || '',
        category: categoryDoc?.name || '',
        unit: unitDoc?.name || '',
      }).catch(() => {});
    }

    const rawBatchInput = (data.batchCode || data.batchNumber || '').toString().trim();
    const batchCode = (rawBatchInput.toUpperCase().startsWith('BATCH-') || rawBatchInput.toUpperCase().startsWith('AUTO'))
      ? ''
      : rawBatchInput;

    if (batchCode) {
      await productRepository.upsertBatch({
        productId: id,
        batchNumber: batchCode,
        purchaseRate: Number(data.defaultPurchaseRate) || product.defaultPurchaseRate || 0,
        mrp: Number(data.defaultMrp) || product.defaultMrp || 0,
        sellingPrice: Number(data.defaultSellingPrice) || product.defaultSellingPrice || 0,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        quantity: 0,
      });
    }

    const targetBatchId = data.selectedBatchId || data.batchId;
    const batchUpdateObj = {
      sellingPrice: data.sellingPrice ?? data.defaultSellingPrice,
      purchaseRate: data.purchaseRate ?? data.purchasePrice ?? data.defaultPurchaseRate,
      mrp: data.mrp ?? data.defaultMrp,
      discount: data.batchDiscount !== undefined ? data.batchDiscount : data.discount,
      discountType: data.batchDiscountType || data.discountType || 'Percentage',
      gstRate: data.batchGstRate !== undefined ? data.batchGstRate : data.gstRate,
    };

    if (targetBatchId) {
      await this.updateBatch(targetBatchId, batchUpdateObj, userId);
    } else if (data.selectedBatchNumber) {
      const bDoc = await ProductBatch.findOne({ userId, productId: id, batchNumber: data.selectedBatchNumber, isDeleted: { $ne: true } });
      if (bDoc) {
        await this.updateBatch(bDoc._id, batchUpdateObj, userId);
      }
    }

    const updatedPopulated = await productRepository.findByIdPopulated(id);
    const batches = await productRepository.findBatchesByProduct(id);
    const validBatches = batches.filter((b) => Boolean(b.batchNumber));
    const resObj = updatedPopulated.toObject ? updatedPopulated.toObject() : { ...updatedPopulated };

    resObj.batches = validBatches;
    resObj.batchNumber = batchCode || validBatches[0]?.batchNumber || undefined;
    resObj.batchCode = resObj.batchNumber;
    return resObj;
  },

  async deactivateProduct(id, userId = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Product ID format: '${id}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const product = await Product.findById(id).exec();
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    product.isActive = false;
    product.deletedAt = new Date();
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      product.deletedBy = userId;
    }

    await product.save();
    logger.info(`🔒 Soft Deleted Product '${product.name}' [${id}] -> isActive: false, deletedAt: ${product.deletedAt}`);
    return product;
  },

  async restoreProduct(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Product ID format: '${id}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const product = await Product.findById(id).exec();
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    product.isActive = true;
    product.deletedAt = null;
    product.deletedBy = null;
    await product.save();
    logger.info(`🔓 Restored Product '${product.name}' [${id}] -> isActive: true`);
    return product;
  },

  async getProductHistory(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid Product ID format: '${id}'`, HTTP_STATUS.BAD_REQUEST);
    }
    const productDoc = await productRepository.findByIdPopulated(id, userId);
    if (!productDoc) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const productId = new mongoose.Types.ObjectId(id);

    // Build batch map for rate/price fallbacks
    const batchMap = new Map();
    const batchesForProd = await ProductBatch.find({ userId, productId }).lean().exec();
    batchesForProd.forEach((b) => {
      if (b.batchNumber) batchMap.set(b.batchNumber, b);
      if (b._id) batchMap.set(b._id.toString(), b);
    });

    // 1. Fetch Purchase Items for this product from DB (excluding soft-deleted purchases/items)
    const rawPurchaseItems = await PurchaseItem.find({ userId, productId, isDeleted: { $ne: true } })
      .populate({
        path: 'purchaseId',
        select: 'purchaseNumber supplierInvoiceNumber purchaseDate supplierId isDeleted',
        populate: { path: 'supplierId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    const activePurchaseItems = rawPurchaseItems.filter((item) => item.purchaseId && item.purchaseId.isDeleted !== true);

    const purchaseHistory = activePurchaseItems.map((item) => {
      const pQty = Number(item.quantity || 0);
      const matchedBatch = item.batchId ? batchMap.get(item.batchId.toString()) : batchMap.get(item.batchNumber);

      let pRate = Number(item.purchaseRate || 0);
      if (pRate <= 0 && matchedBatch) pRate = Number(matchedBatch.purchaseRate || 0);
      if (pRate <= 0) pRate = Number(productDoc.defaultPurchaseRate || 0);

      let sPrice = Number(item.sellingPrice || 0);
      if (sPrice <= 0 && matchedBatch) sPrice = Number(matchedBatch.sellingPrice || 0);
      if (sPrice <= 0) sPrice = Number(productDoc.defaultSellingPrice || 0);

      const pDate = item.purchaseId?.purchaseDate || item.createdAt;
      return {
        id: item._id.toString(),
        date: pDate ? new Date(pDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        rawDate: pDate,
        invoiceNumber: item.purchaseId?.supplierInvoiceNumber || item.purchaseId?.purchaseNumber || 'PUR-REF',
        batchNumber: item.batchNumber || matchedBatch?.batchNumber || 'N/A',
        quantity: pQty,
        purchaseRate: pRate,
        rate: pRate,
        sellingPrice: sPrice,
        price: sPrice,
        amount: Number(item.totalAmount || pQty * pRate),
        supplierId: item.purchaseId?.supplierId?._id ? item.purchaseId.supplierId._id.toString() : null,
        supplierName: item.purchaseId?.supplierId?.name || 'General Supplier',
      };
    });

    const totalPurchasedQty = purchaseHistory.reduce((sum, p) => sum + p.quantity, 0);
    const lastPurchaseDate = purchaseHistory.length > 0 ? purchaseHistory[0].date : null;

    // 2. Fetch Sales Invoices containing this product from DB
    const rawSalesInvoices = await SalesInvoice.find({ userId, 'items.productId': productId })
      .sort({ date: -1, createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalSoldQty = 0;
    let monthlySalesQty = 0;
    let yearlySalesQty = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    const salesHistory = [];

    rawSalesInvoices.forEach((inv) => {
      const invDate = inv.date ? new Date(inv.date) : new Date(inv.createdAt);
      const isThisMonth = invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      const isThisYear = invDate.getFullYear() === currentYear;

      (inv.items || []).forEach((item) => {
        if (item.productId && item.productId.toString() === id) {
          const qty = Number(item.quantity || 0);
          let sPrice = Number(item.unitPrice || 0);
          let cogs = Number(item.purchaseCostRate || 0);

          const itemBatch = item.batchNumber ? batchMap.get(item.batchNumber) : null;
          if (sPrice <= 0 && itemBatch) sPrice = Number(itemBatch.sellingPrice || 0);
          if (sPrice <= 0) sPrice = Number(productDoc.defaultSellingPrice || 0);

          if (cogs <= 0 && itemBatch) cogs = Number(itemBatch.purchaseRate || 0);
          if (cogs <= 0) cogs = Number(productDoc.defaultPurchaseRate || 0);

          const totalAmt = Number(item.totalAmount || qty * sPrice);
          const lineProfit = Number(item.lineProfit !== undefined ? item.lineProfit : ((sPrice - cogs) * qty));

          totalSoldQty += qty;
          if (isThisMonth) {
            monthlySalesQty += qty;
            monthlyRevenue += totalAmt;
          }
          if (isThisYear) {
            yearlySalesQty += qty;
            yearlyRevenue += totalAmt;
          }

          if (Array.isArray(item.batchAllocations) && item.batchAllocations.length > 0) {
            item.batchAllocations.forEach((alloc, aIdx) => {
              const aQty = Number(alloc.quantity || 0);
              const allocBatch = alloc.batchId ? batchMap.get(alloc.batchId.toString()) : batchMap.get(alloc.batchNumber);

              let aSelling = Number(alloc.sellingPrice || 0);
              if (aSelling <= 0 && allocBatch) aSelling = Number(allocBatch.sellingPrice || 0);
              if (aSelling <= 0) aSelling = sPrice;

              let aCogs = Number(alloc.purchaseRate || 0);
              if (aCogs <= 0 && allocBatch) aCogs = Number(allocBatch.purchaseRate || 0);
              if (aCogs <= 0) aCogs = cogs;

              const aProfit = (aSelling - aCogs) * aQty;
              salesHistory.push({
                id: `${inv._id}_${item._id}_${aIdx}`,
                date: invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                rawDate: invDate,
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.customerName || 'Retail Customer',
                batchNumber: alloc.batchNumber || item.batchNumber || 'N/A',
                quantity: aQty,
                sellingPrice: aSelling,
                price: aSelling,
                purchaseRate: aCogs,
                rate: aCogs,
                cogs: aCogs,
                profit: aProfit,
                unitProfit: aQty > 0 ? aProfit / aQty : 0,
                totalAmount: aQty * aSelling,
              });
            });
          } else {
            salesHistory.push({
              id: `${inv._id}_${item._id}`,
              date: invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              rawDate: invDate,
              invoiceNumber: inv.invoiceNumber,
              customerName: inv.customerName || 'Retail Customer',
              batchNumber: item.batchNumber || 'N/A',
              quantity: qty,
              sellingPrice: sPrice,
              price: sPrice,
              purchaseRate: cogs,
              rate: cogs,
              cogs: cogs,
              profit: lineProfit,
              unitProfit: qty > 0 ? lineProfit / qty : 0,
              totalAmount: totalAmt,
            });
          }
        }
      });
    });

    const lastSaleDate = salesHistory.length > 0 ? salesHistory[0].date : null;

    // 3. Fetch StockLedger entries or synthesize complete Stock History audit log (excluding soft-deleted)
    const ledgerEntries = await StockLedger.find({ userId, productId, isDeleted: { $ne: true } })
      .sort({ timestamp: -1, createdAt: -1 })
      .lean()
      .exec();

    let stockHistory = [];

    if (ledgerEntries.length > 0) {
      stockHistory = ledgerEntries.map((l) => ({
        id: l._id.toString(),
        date: l.timestamp
          ? new Date(l.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : new Date(l.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        rawDate: l.timestamp || l.createdAt,
        type: l.transactionType || 'PURCHASE',
        batchNumber: l.batchNumber || 'N/A',
        quantity: l.quantity,
        formattedQuantity: l.quantity > 0 ? `+${l.quantity}` : `${l.quantity}`,
        purchaseRate: Number(l.purchaseRate || 0),
        sellingPrice: Number(l.sellingPrice || 0),
        stockAfter: Number(l.currentStock || 0),
        previousStock: Number(l.previousStock || 0),
        reference: l.referenceNumber || (l.referenceId ? l.referenceId.toString() : 'SYS-REF'),
      }));
    } else {
      const mergedEvents = [];

      purchaseHistory.forEach((p) => {
        mergedEvents.push({
          type: 'PURCHASE',
          date: p.rawDate,
          batchNumber: p.batchNumber,
          quantity: p.quantity,
          purchaseRate: p.purchaseRate,
          sellingPrice: p.sellingPrice,
          reference: p.invoiceNumber,
        });
      });

      salesHistory.forEach((s) => {
        mergedEvents.push({
          type: 'SALE',
          date: s.rawDate,
          batchNumber: s.batchNumber,
          quantity: -s.quantity,
          purchaseRate: s.cogs,
          sellingPrice: s.sellingPrice,
          reference: s.invoiceNumber,
        });
      });

      mergedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningStock = 0;
      const historyWithStock = mergedEvents.map((evt, idx) => {
        const prev = runningStock;
        runningStock += evt.quantity;
        return {
          id: `synth_${idx}`,
          date: evt.date
            ? new Date(evt.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          rawDate: evt.date,
          type: evt.type,
          batchNumber: evt.batchNumber || 'N/A',
          quantity: evt.quantity,
          formattedQuantity: evt.quantity > 0 ? `+${evt.quantity}` : `${evt.quantity}`,
          purchaseRate: evt.purchaseRate,
          sellingPrice: evt.sellingPrice,
          previousStock: prev,
          stockAfter: runningStock,
          reference: evt.reference,
        };
      });

      stockHistory = historyWithStock.reverse();
    }

    return {
      productId: id,
      totalPurchasedQty,
      totalSoldQty,
      lastPurchaseDate,
      lastSaleDate,
      monthlySalesQty,
      yearlySalesQty,
      monthlyRevenue,
      yearlyRevenue,
      purchaseHistory,
      salesHistory,
      stockHistory,
    };
  },

  async getProductInventoryDetails(productId) {
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError('Invalid Product ID', HTTP_STATUS.BAD_REQUEST);
    }

    const id = productId.toString();
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Fetch Purchase Items for this product from DB (handling both ObjectId & String IDs)
    const rawPurchaseItems = await PurchaseItem.find({
      $or: [{ productId: productId }, { productId: id }],
    })
      .populate({
        path: 'purchaseId',
        select: 'purchaseNumber supplierInvoiceNumber purchaseDate supplierId',
        populate: { path: 'supplierId', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const purchaseHistory = rawPurchaseItems.map((item) => {
      const pQty = Number(item.quantity || 0);
      const pRate = Number(item.purchaseRate || 0);
      return {
        id: item._id.toString(),
        date: item.purchaseId?.purchaseDate
          ? new Date(item.purchaseId.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        rawDate: item.purchaseId?.purchaseDate || item.createdAt,
        invoiceNumber: item.purchaseId?.supplierInvoiceNumber || item.purchaseId?.purchaseNumber || 'PUR-REF',
        supplierId: item.purchaseId?.supplierId?._id ? item.purchaseId.supplierId._id.toString() : null,
        supplierName: item.purchaseId?.supplierId?.name || 'General Supplier',
        quantity: pQty,
        rate: pRate,
        amount: Number(item.totalAmount || pQty * pRate),
        batchNumber: item.batchNumber || null,
      };
    });

    const totalInward = purchaseHistory.reduce((sum, p) => sum + p.quantity, 0);
    const lastPurchase = purchaseHistory.length > 0 ? purchaseHistory[0] : null;

    const latestPurchasePrice = lastPurchase && lastPurchase.rate > 0
      ? lastPurchase.rate
      : Number(product.defaultPurchaseRate || product.purchasePrice || 0);

    // 2. Fetch Sales Invoices containing this product from DB
    const rawSalesInvoices = await SalesInvoice.find({
      $or: [
        { 'items.productId': productId },
        { 'items.productId': id },
        { 'items.id': id },
        { 'items._id': productId },
      ],
    })
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalOutward = 0;
    let monthlySalesQty = 0;
    let yearlySalesQty = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    const salesHistory = [];

    rawSalesInvoices.forEach((inv) => {
      const invDate = inv.date ? new Date(inv.date) : new Date(inv.createdAt);
      const isThisMonth = invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      const isThisYear = invDate.getFullYear() === currentYear;

      (inv.items || []).forEach((item) => {
        const itemProdId = item.productId || item.id || item._id;
        if (itemProdId && itemProdId.toString() === id) {
          const qty = Number(item.quantity || item.qty || 0);
          const price = Number(item.unitPrice || item.price || 0);
          const totalAmt = Number(item.totalAmount || qty * price);

          totalOutward += qty;
          if (isThisMonth) {
            monthlySalesQty += qty;
            monthlyRevenue += totalAmt;
          }
          if (isThisYear) {
            yearlySalesQty += qty;
            yearlyRevenue += totalAmt;
          }

          salesHistory.push({
            id: `${inv._id}_${item._id || itemProdId}`,
            date: invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: invDate,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || 'Retail Customer',
            quantity: qty,
            price: price,
            amount: totalAmt,
          });
        }
      });
    });

    const lastSale = salesHistory.length > 0 ? salesHistory[0] : null;
    const currentStock = Math.max(0, Number(product.totalStock ?? product.currentStock ?? (totalInward - totalOutward)));
    const stockValue = currentStock * latestPurchasePrice;

    return {
      product: {
        _id: product._id,
        name: product.name,
        code: product.code,
        image: product.image,
        brandName: product.brandId?.name || 'N/A',
        categoryName: product.categoryId?.name || 'Uncategorized',
        unitName: product.defaultUnitId?.shortName || product.unit || 'Bag',
        minimumStockAlert: product.minimumStockAlert || 10,
        defaultSellingPrice: product.defaultSellingPrice || 0,
        defaultPurchaseRate: product.defaultPurchaseRate || 0,
      },
      currentStock,
      stockValue,
      latestPurchasePrice,
      totalInward,
      totalOutward,
      lastPurchase,
      lastSale,
      monthlySales: {
        quantity: monthlySalesQty,
        revenue: monthlyRevenue,
      },
      yearlySales: {
        quantity: yearlySalesQty,
        revenue: yearlyRevenue,
      },
      purchaseHistory,
      salesHistory,
      purchaseHistoryCount: purchaseHistory.length,
      salesHistoryCount: salesHistory.length,
    };
  },
};
