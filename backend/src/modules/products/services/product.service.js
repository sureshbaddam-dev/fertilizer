import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { productRepository } from '../repositories/product.repository.js';
import { ProductBatch } from '../models/productBatch.model.js';
import { categoryRepository } from '../../masters/repositories/category.repository.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';
import { PurchaseItem } from '../../purchases/models/purchaseItem.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { StockLedger } from '../../purchases/models/stockLedger.model.js';
import { Category } from '../../masters/models/category.model.js';
import { Brand } from '../../masters/models/brand.model.js';
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

/**
 * Private helper: Resolves the supplier for a product/batch from PurchaseItem history
 */
async function resolveSupplierFromBatch({ batchId = null, batchNumber = '', productId = null, session = null } = {}) {
  const opts = session ? { session } : {};
  let resolvedSupplier = null;

  if (batchId) {
    const pItem = await PurchaseItem.findOne({ batchId }, null, opts)
      .populate({ path: 'purchaseId', populate: { path: 'supplierId', select: 'name companyName mobile' } })
      .lean();
    if (pItem?.purchaseId?.supplierId) {
      resolvedSupplier = pItem.purchaseId.supplierId;
    }
  }

  if (!resolvedSupplier && batchNumber && productId) {
    const pItem = await PurchaseItem.findOne({ batchNumber, productId }, null, opts)
      .populate({ path: 'purchaseId', populate: { path: 'supplierId', select: 'name companyName mobile' } })
      .lean();
    if (pItem?.purchaseId?.supplierId) {
      resolvedSupplier = pItem.purchaseId.supplierId;
    }
  }

  if (!resolvedSupplier && productId) {
    const pItem = await PurchaseItem.findOne({ productId }, null, opts)
      .sort({ createdAt: -1 })
      .populate({ path: 'purchaseId', populate: { path: 'supplierId', select: 'name companyName mobile' } })
      .lean();
    if (pItem?.purchaseId?.supplierId) {
      resolvedSupplier = pItem.purchaseId.supplierId;
    }
  }

  return resolvedSupplier;
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

      // Parallelize lookups for matching Brands, Categories, and Batches
      const [matchingBrands, matchingCategories, matchingBatches] = await Promise.all([
        Brand.find({ userId, name: searchRegex }).lean().exec(),
        categoryRepository.findAll({ userId, name: searchRegex }),
        ProductBatch.find({ userId, batchNumber: searchRegex, isActive: true }).lean().exec(),
      ]);

      const brandIds = matchingBrands.map((b) => b._id);
      const categoryIds = matchingCategories.map((c) => c._id);
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
      const matchingBrands = await Brand.find({ userId, name: brandRegex }).lean().exec();
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
    } else if (
      query.includeInactive === 'true' ||
      query.includeDeleted === 'true' ||
      query.forInventory === 'true' ||
      query.inventory === 'true'
    ) {
      // Do not restrict isActive: return all products (active and archived) for complete inventory/stock management
    } else {
      filter.isActive = true;
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

    const [productsDocs, total] = await Promise.all([
      productRepository.findAllPopulated(filter, repoOptions),
      productRepository.count(filter),
    ]);

    if (!productsDocs || productsDocs.length === 0) {
      return { products: [], total: total || 0 };
    }

    // FETCH ASSOCIATED PRODUCT BATCHES & INWARD/OUTWARD METRICS FOR TARGET PRODUCT IDS IN PARALLEL
    const productIds = productsDocs.map((p) => p._id);
    const productObjIds = productIds.map((id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)));

    const [allBatches, purchaseAgg, salesAgg, adjustmentAgg] = await Promise.all([
      ProductBatch.find({
        userId,
        productId: { $in: productIds },
        isDeleted: { $ne: true },
        isActive: true,
      }).lean().exec(),
      PurchaseItem.aggregate([
        { $match: { userId: userObjId, productId: { $in: productObjIds }, isDeleted: { $ne: true } } },
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
      ]),
      SalesInvoice.aggregate([
        {
          $match: {
            userId: userObjId,
            status: { $ne: 'Cancelled' },
            isDeleted: { $ne: true },
            'items.productId': { $in: productObjIds },
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': { $in: productObjIds } } },
        {
          $group: {
            _id: '$items.productId',
            totalSoldQty: { $sum: { $toDouble: { $ifNull: ['$items.quantity', 0] } } },
            lastSaleDate: { $max: { $ifNull: ['$date', '$createdAt'] } },
          },
        },
      ]),
      StockLedger.aggregate([
        {
          $match: {
            userId: userObjId,
            productId: { $in: productObjIds },
            isDeleted: { $ne: true },
            transactionType: { $in: ['DAMAGE', 'PURCHASE_RETURN', 'RETURN'] },
          },
        },
        {
          $group: {
            _id: { productId: '$productId', type: '$transactionType' },
            totalQty: { $sum: { $abs: { $toDouble: { $ifNull: ['$quantity', 0] } } } },
          },
        },
      ]),
    ]);

    const batchMap = {};
    allBatches.forEach((b) => {
      const pid = b.productId.toString();
      if (!batchMap[pid]) batchMap[pid] = [];
      batchMap[pid].push(b);
    });

    const purchaseMap = new Map();
    purchaseAgg.forEach((item) => {
      if (item._id) {
        purchaseMap.set(item._id.toString(), {
          totalPurchasedQty: item.totalPurchasedQty || 0,
          lastPurchaseDate: item.lastPurchaseDate || null,
        });
      }
    });

    const salesMap = new Map();
    salesAgg.forEach((item) => {
      if (item._id) {
        salesMap.set(item._id.toString(), {
          totalSoldQty: item.totalSoldQty || 0,
          lastSaleDate: item.lastSaleDate || null,
        });
      }
    });

    const damageMap = new Map();
    const returnMap = new Map();
    adjustmentAgg.forEach((item) => {
      if (item._id?.productId) {
        const pid = item._id.productId.toString();
        const type = (item._id.type || '').toUpperCase();
        if (type === 'DAMAGE') {
          damageMap.set(pid, (damageMap.get(pid) || 0) + (item.totalQty || 0));
        } else if (type === 'PURCHASE_RETURN' || type === 'RETURN') {
          returnMap.set(pid, (returnMap.get(pid) || 0) + (item.totalQty || 0));
        }
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

      const openingBatches = pBatches.filter((b) => b.isOpeningStock === true);
      const totalOpeningStockQty = openingBatches.reduce((sum, b) => sum + Number(b.initialQuantity || b.currentStock || 0), 0);
      const totalPurchasedQty = purData.totalPurchasedQty || 0;
      const totalInward = totalOpeningStockQty + totalPurchasedQty;

      const totalSoldQty = saleData.totalSoldQty || 0;
      const totalDamagedQty = damageMap.get(pIdStr) || 0;
      const totalReturnedQty = returnMap.get(pIdStr) || 0;
      const totalOutward = totalSoldQty + totalDamagedQty + totalReturnedQty;

      // Authoritative Stock Reconciliation: Current Stock = Total Inward - Total Outward
      const calculatedCurrentStock = Math.max(0, totalInward - totalOutward);

      // Compute accurate stock value from remaining active batch layers up to calculatedCurrentStock
      let remainingStockToValue = calculatedCurrentStock;
      let calculatedStockValue = 0;

      const activeBatchesSorted = [...activeBatches].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      for (const b of activeBatchesSorted) {
        if (remainingStockToValue <= 0) break;
        const bStock = Math.max(0, Number(b.currentStock ?? b.quantityRemaining ?? 0));
        if (bStock <= 0) continue;
        const allocated = Math.min(bStock, remainingStockToValue);
        const bRate = Number(b.purchaseRate ?? pObj.defaultPurchaseRate ?? 0);
        calculatedStockValue += allocated * bRate;
        remainingStockToValue -= allocated;
      }

      if (remainingStockToValue > 0) {
        const fallbackRate = Number(
          pObj.defaultPurchaseRate ||
          activeBatches[0]?.purchaseRate ||
          pBatches[0]?.purchaseRate ||
          pObj.purchaseRate ||
          pObj.purchasePrice ||
          0
        );
        calculatedStockValue += remainingStockToValue * fallbackRate;
      }

      const effectivePurchaseRate = activeBatches[0]?.purchaseRate || pBatches[0]?.purchaseRate || pObj.defaultPurchaseRate || pObj.purchasePrice || 0;

      return {
        ...pObj,
        totalStock: calculatedCurrentStock,
        currentStock: calculatedCurrentStock,
        defaultPurchaseRate: pObj.defaultPurchaseRate > 0 ? pObj.defaultPurchaseRate : effectivePurchaseRate,
        purchaseRate: pObj.purchaseRate > 0 ? pObj.purchaseRate : effectivePurchaseRate,
        purchasePrice: pObj.purchasePrice > 0 ? pObj.purchasePrice : effectivePurchaseRate,
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
        totalOpeningStockQty,
        totalPurchasedQty,
        totalInward,
        totalSoldQty,
        totalDamagedQty,
        totalReturnedQty,
        totalOutward,
        lastPurchaseDate: purData.lastPurchaseDate || null,
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
    const userObjId = new mongoose.Types.ObjectId(userId);

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

    const targetProdObjId = new mongoose.Types.ObjectId(id);
    const [purchaseAgg, salesAgg, adjustmentAgg] = await Promise.all([
      PurchaseItem.aggregate([
        { $match: { userId: userObjId, productId: targetProdObjId, isDeleted: { $ne: true } } },
        {
          $lookup: {
            from: 'purchases',
            localField: 'purchaseId',
            foreignField: '_id',
            as: 'purchaseDoc',
          },
        },
        { $unwind: { path: '$purchaseDoc', preserveNullAndEmptyArrays: true } },
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
      ]),
      SalesInvoice.aggregate([
        {
          $match: {
            userId: userObjId,
            status: { $ne: 'Cancelled' },
            isDeleted: { $ne: true },
            'items.productId': targetProdObjId,
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': targetProdObjId } },
        {
          $group: {
            _id: '$items.productId',
            totalSoldQty: { $sum: { $toDouble: { $ifNull: ['$items.quantity', 0] } } },
            lastSaleDate: { $max: { $ifNull: ['$date', '$createdAt'] } },
          },
        },
      ]),
      StockLedger.aggregate([
        {
          $match: {
            userId: userObjId,
            productId: targetProdObjId,
            isDeleted: { $ne: true },
            transactionType: { $in: ['DAMAGE', 'PURCHASE_RETURN', 'RETURN'] },
          },
        },
        {
          $group: {
            _id: '$transactionType',
            totalQty: { $sum: { $abs: { $toDouble: { $ifNull: ['$quantity', 0] } } } },
          },
        },
      ]),
    ]);

    const totalPurchasedQty = purchaseAgg[0]?.totalPurchasedQty || 0;
    const totalSoldQty = salesAgg[0]?.totalSoldQty || 0;
    let totalDamagedQty = 0;
    let totalReturnedQty = 0;
    adjustmentAgg.forEach((item) => {
      const type = (item._id || '').toUpperCase();
      if (type === 'DAMAGE') totalDamagedQty += item.totalQty || 0;
      else if (type === 'PURCHASE_RETURN' || type === 'RETURN') totalReturnedQty += item.totalQty || 0;
    });

    const openingBatches = annotatedBatches.filter((b) => b.isOpeningStock === true);
    const totalOpeningStockQty = openingBatches.reduce((sum, b) => sum + Number(b.initialQuantity || b.currentStock || 0), 0);
    const totalInward = totalOpeningStockQty + totalPurchasedQty;
    const totalOutward = totalSoldQty + totalDamagedQty + totalReturnedQty;
    const calculatedCurrentStock = Math.max(0, totalInward - totalOutward);

    // Compute accurate stock value from remaining active batch layers up to calculatedCurrentStock
    let remainingStockToValue = calculatedCurrentStock;
    let calculatedStockValue = 0;

    const activeBatchesSorted = [...activeBatches].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    for (const b of activeBatchesSorted) {
      if (remainingStockToValue <= 0) break;
      const bStock = Math.max(0, Number(b.currentStock ?? b.quantityRemaining ?? 0));
      if (bStock <= 0) continue;
      const allocated = Math.min(bStock, remainingStockToValue);
      const bRate = Number(b.purchaseRate ?? productObj.defaultPurchaseRate ?? 0);
      calculatedStockValue += allocated * bRate;
      remainingStockToValue -= allocated;
    }

    if (remainingStockToValue > 0) {
      const fallbackRate = Number(
        productObj.defaultPurchaseRate ||
        activeBatches[0]?.purchaseRate ||
        validBatches[0]?.purchaseRate ||
        productObj.purchaseRate ||
        productObj.purchasePrice ||
        0
      );
      calculatedStockValue += remainingStockToValue * fallbackRate;
    }

    const primaryBatchNumber = oldestActiveBatch?.batchNumber || annotatedBatches[0]?.batchNumber || undefined;
    const effectivePurchaseRate = activeBatches[0]?.purchaseRate || validBatches[0]?.purchaseRate || productObj.defaultPurchaseRate || productObj.purchasePrice || 0;

    return {
      product: {
        ...productObj,
        totalStock: calculatedCurrentStock,
        currentStock: calculatedCurrentStock,
        defaultPurchaseRate: productObj.defaultPurchaseRate > 0 ? productObj.defaultPurchaseRate : effectivePurchaseRate,
        purchaseRate: productObj.purchaseRate > 0 ? productObj.purchaseRate : effectivePurchaseRate,
        purchasePrice: productObj.purchasePrice > 0 ? productObj.purchasePrice : effectivePurchaseRate,
        defaultSellingPrice: effectiveSellingPrice,
        sellingPrice: effectiveSellingPrice,
        currentSellingPrice: effectiveSellingPrice,
        currentActiveBatch: oldestActiveBatch,
        upcomingBatch: upcomingBatch,
        activeBatchCount: activeBatches.length,
        stockValue: calculatedStockValue,
        totalStockValue: calculatedStockValue,
        totalOpeningStockQty,
        totalPurchasedQty,
        totalInward,
        totalSoldQty,
        totalDamagedQty,
        totalReturnedQty,
        totalOutward,
        lastPurchaseDate: purchaseAgg[0]?.lastPurchaseDate || null,
        lastSaleDate: salesAgg[0]?.lastSaleDate || null,
        batches: annotatedBatches,
        batchNumber: primaryBatchNumber,
        batchCode: primaryBatchNumber,
      },
      batches: annotatedBatches,
    };
  },

  /**
   * Record Damaged Stock Write-off: atomically deduct product and batch stock, create StockLedger entry.
   */
  async recordDamagedStock(data, authUserId = null) {
    const userId = authUserId || data.userId;
    if (!userId) {
      throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const {
      productId,
      quantity,
      reason = 'Bag torn during unloading',
      notes = '',
      batchId = null,
      date,
      createdBy = 'Godown Staff',
    } = data;

    const damageQtyNum = Number(quantity);
    if (!productId) {
      throw new AppError('Product ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!damageQtyNum || damageQtyNum <= 0) {
      throw new AppError('Damaged quantity must be greater than 0', HTTP_STATUS.BAD_REQUEST);
    }

    const product = await Product.findOne({ _id: productId, userId });
    if (!product) {
      throw new AppError('Product not found or access denied', HTTP_STATUS.NOT_FOUND);
    }

    const currentStock = Number(product.totalStock || 0);
    if (damageQtyNum > currentStock) {
      throw new AppError(
        `Damaged quantity (${damageQtyNum}) cannot exceed available stock (${currentStock})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const executeSave = async (session = null) => {
      // 1. Deduct Product.totalStock
      const newStock = Math.max(0, currentStock - damageQtyNum);
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, userId },
        { totalStock: newStock },
        session ? { session, new: true } : { new: true }
      );

      // 2. Deduct from Batches (Prioritize selected batchId, then FIFO)
      let remainingToDeduct = damageQtyNum;
      let effectivePurchasePrice = Number(product.defaultPurchaseRate || product.purchasePrice || 0);
      let deductedBatchId = null;
      let deductedBatchNumber = '';

      const activeBatches = await ProductBatch.find({
        userId,
        productId,
        isDeleted: { $ne: true },
        currentStock: { $gt: 0 },
      }).sort({ createdAt: 1 });

      if (batchId) {
        const targetIdx = activeBatches.findIndex((b) => b._id.toString() === batchId.toString());
        if (targetIdx > -1) {
          const [target] = activeBatches.splice(targetIdx, 1);
          activeBatches.unshift(target);
        }
      }

      for (const b of activeBatches) {
        if (remainingToDeduct <= 0) break;
        const deductQty = Math.min(b.currentStock, remainingToDeduct);
        const updatedBatchStock = b.currentStock - deductQty;
        await ProductBatch.findByIdAndUpdate(
          b._id,
          { currentStock: updatedBatchStock, isActive: updatedBatchStock > 0 },
          session ? { session } : {}
        );
        remainingToDeduct -= deductQty;
        if (!deductedBatchId) {
          deductedBatchId = b._id;
          deductedBatchNumber = b.batchNumber;
        }
        if (b.purchaseRate > 0 && effectivePurchasePrice === 0) {
          effectivePurchasePrice = Number(b.purchaseRate);
        }
      }

      const damageValue = damageQtyNum * effectivePurchasePrice;

      // Resolve supplier from batch or purchase history for audit traceability
      const supplierDoc = await resolveSupplierFromBatch({
        batchId: deductedBatchId,
        batchNumber: deductedBatchNumber,
        productId,
        session,
      });
      const resolvedSupplierId = supplierDoc?._id || supplierDoc || null;

      // 3. Create StockLedger entry with transactionType: 'DAMAGE'
      await StockLedger.create(
        [
          {
            userId,
            transactionType: 'DAMAGE',
            productId,
            supplierId: resolvedSupplierId || null,
            batchId: deductedBatchId || null,
            batchNumber: deductedBatchNumber || '',
            quantity: -damageQtyNum,
            purchaseRate: effectivePurchasePrice,
            previousStock: currentStock,
            currentStock: newStock,
            reason: reason || 'Defective / Damaged stock write-off',
            notes: notes || '',
            referenceNumber: `DAM-${Date.now().toString().slice(-6)}`,
            createdBy,
            timestamp: date ? new Date(date) : new Date(),
            isDeleted: false,
          },
        ],
        session ? { session } : {}
      );

      return {
        product: updatedProduct,
        previousStock: currentStock,
        currentStock: newStock,
        damagedQuantity: damageQtyNum,
        purchaseRate: effectivePurchasePrice,
        damageValue,
        reason,
        notes,
      };
    };

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const result = await executeSave(session);
        await session.commitTransaction();
        session.endSession();
        return result;
      } catch (txnErr) {
        await session.abortTransaction();
        session.endSession();
        if (txnErr.message?.includes('replica set member')) {
          return await executeSave(null);
        }
        throw txnErr;
      }
    } catch (err) {
      if (err.message?.includes('replica set member')) {
        return await executeSave(null);
      }
      throw err;
    }
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
    const brandDoc = await Brand.findOne({ _id: brandId, userId });
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
      image: (data.image && typeof data.image === 'string' && data.image.trim()) ? data.image.trim() : '',
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
      const newImg = (data.image && typeof data.image === 'string' && data.image.trim()) ? data.image.trim() : '';
      if (product.image && product.image !== newImg && product.image.includes('res.cloudinary.com')) {
        deleteFromCloudinary(product.image).catch(() => {});
      }
      payload.image = newImg;
    }

    let brandDoc = null;
    let categoryDoc = null;
    let unitDoc = null;

    const brandId = data.brandId || data.companyId;
    if (brandId) {
      if (!mongoose.Types.ObjectId.isValid(brandId)) {
        throw new AppError(`Invalid Brand ID format: '${brandId}'`, HTTP_STATUS.BAD_REQUEST);
      }
      brandDoc = await Brand.findOne({ _id: brandId, userId });
      if (!brandDoc) {
        throw new AppError('Selected Brand not found or access denied', HTTP_STATUS.BAD_REQUEST);
      }
      payload.brandId = brandId;
    }

    if (data.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
        throw new AppError(`Invalid Category ID format: '${data.categoryId}'`, HTTP_STATUS.BAD_REQUEST);
      }
      categoryDoc = await Category.findOne({ _id: data.categoryId, userId });
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
      unitDoc = await Unit.findOne({ _id: defaultUnitId, userId });
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
          if (cogs <= 0) {
            // Find any batch for this product with a valid purchaseRate
            for (const [, b] of batchMap.entries()) {
              if (b.productId && b.productId.toString() === id && Number(b.purchaseRate || 0) > 0) {
                cogs = Number(b.purchaseRate);
                break;
              }
            }
          }
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
    let totalSupplierReturnedQty = 0;
    let totalDamagedQty = 0;

    if (ledgerEntries.length > 0) {
      ledgerEntries.forEach((l) => {
        const type = (l.transactionType || '').toUpperCase();
        const qty = Math.abs(Number(l.quantity || 0));
        if (type === 'PURCHASE_RETURN' || type === 'RETURN') {
          totalSupplierReturnedQty += qty;
        } else if (type === 'DAMAGE') {
          totalDamagedQty += qty;
        }
      });

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

    const openingBatches = await ProductBatch.find({
      userId,
      productId,
      isOpeningStock: true,
      isDeleted: { $ne: true },
    }).lean().exec();

    const totalOpeningStockQty = openingBatches.reduce((sum, b) => sum + Number(b.initialQuantity || b.currentStock || 0), 0);
    const totalInward = totalOpeningStockQty + totalPurchasedQty;
    const totalOutward = totalSoldQty + totalSupplierReturnedQty + totalDamagedQty;
    const currentStock = Math.max(0, totalInward - totalOutward);

    const activeBatches = await ProductBatch.find({
      userId,
      productId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 }).lean().exec();

    const batches = activeBatches.map((b) => ({
      id: b._id.toString(),
      batchNumber: b.batchNumber || 'N/A',
      isOpeningStock: Boolean(b.isOpeningStock),
      initialQuantity: Number(b.initialQuantity || 0),
      currentStock: Number(b.currentStock || 0),
      purchaseRate: Number(b.purchaseRate || 0),
      sellingPrice: Number(b.sellingPrice || 0),
      mrp: Number(b.mrp || 0),
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : null,
      isActive: b.isActive !== false && b.currentStock > 0,
      status: (b.currentStock || 0) > 0 ? 'Active' : 'Depleted',
    }));

    return {
      productId: id,
      totalOpeningStockQty,
      totalPurchasedQty,
      totalInward,
      totalSupplierReturnedQty,
      totalReturnedQty: totalSupplierReturnedQty,
      totalDamagedQty,
      totalSoldQty,
      totalOutward,
      currentStock,
      lastPurchaseDate,
      lastSaleDate,
      monthlySalesQty,
      yearlySalesQty,
      monthlyRevenue,
      yearlyRevenue,
      purchaseHistory,
      salesHistory,
      stockHistory,
      batches,
    };
  },

  /**
   * Get all stock adjustments (DAMAGE & PURCHASE_RETURN) for unified inventory audit table
   */
  async getStockAdjustments(query = {}, userId = null) {
    const filter = {
      isDeleted: { $ne: true },
      transactionType: { $in: ['DAMAGE', 'PURCHASE_RETURN', 'RETURN', 'ADJUSTMENT'] },
    };

    if (userId) {
      filter.userId = userId;
    }

    if (query.type) {
      if (query.type === 'DAMAGE') {
        filter.transactionType = 'DAMAGE';
      } else if (query.type === 'PURCHASE_RETURN' || query.type === 'SUPPLIER_RETURN' || query.type === 'RETURN') {
        filter.transactionType = { $in: ['PURCHASE_RETURN', 'RETURN'] };
      }
    }

    if (query.productId) {
      filter.productId = query.productId;
    }

    if (query.supplierId) {
      filter.supplierId = query.supplierId;
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        filter.timestamp.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    // 1. Fetch all matching ledger entries
    const ledgerEntries = await StockLedger.find(filter)
      .populate({
        path: 'productId',
        select: 'name brandId categoryId unit defaultUnitId image',
        populate: [
          { path: 'brandId', select: 'name' },
          { path: 'categoryId', select: 'name' },
          { path: 'defaultUnitId', select: 'shortName name' },
        ],
      })
      .populate('batchId', 'batchNumber expiryDate mfgDate purchaseRate')
      .populate('supplierId', 'name companyName mobile')
      .sort({ timestamp: -1, createdAt: -1 })
      .lean();

    // 2. Fetch purchase return references for return records that lack supplier info
    const returnRefIds = ledgerEntries
      .filter((e) => (e.transactionType === 'PURCHASE_RETURN' || e.transactionType === 'RETURN') && e.referenceId && !e.supplierId)
      .map((e) => e.referenceId);

    let returnDocsMap = new Map();
    if (returnRefIds.length > 0) {
      const { PurchaseReturn } = await import('../../purchases/models/purchaseReturn.model.js');
      const returnDocs = await PurchaseReturn.find({ _id: { $in: returnRefIds } })
        .populate('supplierId', 'name companyName mobile')
        .lean();
      returnDocs.forEach((doc) => {
        returnDocsMap.set(doc._id.toString(), doc);
      });
    }

    // 3. For damage/adjustment records that lack supplier info, resolve from PurchaseItem relations
    const missingSupplierEntries = ledgerEntries.filter(
      (e) => !e.supplierId && e.transactionType !== 'PURCHASE_RETURN' && e.transactionType !== 'RETURN'
    );

    let batchSupplierMap = new Map();
    let batchNumSupplierMap = new Map();
    let prodSupplierMap = new Map();

    if (missingSupplierEntries.length > 0) {
      const batchIds = missingSupplierEntries.filter((e) => e.batchId).map((e) => e.batchId?._id || e.batchId);
      const batchNumbers = missingSupplierEntries.filter((e) => e.batchNumber).map((e) => e.batchNumber);
      const productIds = missingSupplierEntries.map((e) => e.productId?._id || e.productId);

      const purchaseItems = await PurchaseItem.find({
        $or: [
          { batchId: { $in: batchIds } },
          { batchNumber: { $in: batchNumbers } },
          { productId: { $in: productIds } },
        ],
      })
        .populate({
          path: 'purchaseId',
          populate: { path: 'supplierId', select: 'name companyName mobile' },
        })
        .sort({ createdAt: -1 })
        .lean();

      for (const item of purchaseItems) {
        const supp = item.purchaseId?.supplierId;
        if (supp) {
          if (item.batchId && !batchSupplierMap.has(item.batchId.toString())) {
            batchSupplierMap.set(item.batchId.toString(), supp);
          }
          if (
            item.batchNumber &&
            item.productId &&
            !batchNumSupplierMap.has(`${item.productId.toString()}_${item.batchNumber}`)
          ) {
            batchNumSupplierMap.set(`${item.productId.toString()}_${item.batchNumber}`, supp);
          }
          if (item.productId && !prodSupplierMap.has(item.productId.toString())) {
            prodSupplierMap.set(item.productId.toString(), supp);
          }
        }
      }
    }

    // 4. Transform entries and compute summary
    let totalDamagedQty = 0;
    let totalDamagedValue = 0;
    let damagedCount = 0;

    let totalReturnedQty = 0;
    let totalReturnValue = 0;
    let returnCount = 0;

    const adjustments = ledgerEntries.map((entry) => {
      const isDamage = entry.transactionType === 'DAMAGE';
      const isReturn = entry.transactionType === 'PURCHASE_RETURN' || entry.transactionType === 'RETURN';
      const qty = Math.abs(Number(entry.quantity) || 0);
      const rate = Number(entry.purchaseRate || 0);
      const val = normalizeMoney(qty * rate);

      // Resolve supplier name reliably without guessing
      let resolvedSupplierId = entry.supplierId?._id || entry.supplierId || null;
      let resolvedSupplierName = entry.supplierId?.name || entry.supplierId?.companyName || '';

      if (isReturn && (!resolvedSupplierName || !resolvedSupplierId) && entry.referenceId) {
        const linkedReturn = returnDocsMap.get(entry.referenceId.toString());
        if (linkedReturn?.supplierId) {
          resolvedSupplierId = linkedReturn.supplierId._id || linkedReturn.supplierId;
          resolvedSupplierName = linkedReturn.supplierId.name || linkedReturn.supplierId.companyName || '';
        }
      }

      if (isDamage && (!resolvedSupplierName || !resolvedSupplierId)) {
        const bId = entry.batchId?._id || entry.batchId;
        const pId = entry.productId?._id || entry.productId;
        const bNum = entry.batchNumber || entry.batchId?.batchNumber;

        let resolvedSupp = null;
        if (bId && batchSupplierMap.has(bId.toString())) {
          resolvedSupp = batchSupplierMap.get(bId.toString());
        } else if (pId && bNum && batchNumSupplierMap.has(`${pId.toString()}_${bNum}`)) {
          resolvedSupp = batchNumSupplierMap.get(`${pId.toString()}_${bNum}`);
        } else if (pId && prodSupplierMap.has(pId.toString())) {
          resolvedSupp = prodSupplierMap.get(pId.toString());
        }

        if (resolvedSupp) {
          resolvedSupplierId = resolvedSupp._id || resolvedSupp;
          resolvedSupplierName = resolvedSupp.name || resolvedSupp.companyName || '';
        }
      }

      if (isDamage) {
        damagedCount++;
        totalDamagedQty += qty;
        totalDamagedValue = normalizeMoney(totalDamagedValue + val);
      } else if (isReturn) {
        returnCount++;
        totalReturnedQty += qty;
        totalReturnValue = normalizeMoney(totalReturnValue + val);
      }

      const prod = entry.productId || {};
      const batchNum = entry.batchNumber || entry.batchId?.batchNumber || (entry.batchId ? 'Assigned' : 'N/A');
      const refNum = entry.referenceNumber || (isDamage ? `DAM-${entry._id.toString().slice(-6).toUpperCase()}` : `RET-${entry._id.toString().slice(-6).toUpperCase()}`);
      const reasonText = entry.reason || (isDamage ? 'Damaged / defective write-off' : 'Supplier return');

      return {
        _id: entry._id,
        date: entry.timestamp || entry.createdAt,
        type: isDamage ? 'DAMAGE' : 'PURCHASE_RETURN',
        productId: prod._id || null,
        productName: prod.name || 'Unknown Product',
        category: prod.categoryId?.name || prod.category || '',
        brand: prod.brandId?.name || prod.company || '',
        unit: prod.defaultUnitId?.shortName || prod.unit || 'Bag',
        image: prod.image || '',
        supplierId: resolvedSupplierId,
        supplierName: resolvedSupplierName || (isReturn ? 'Supplier' : 'N/A'),
        quantity: qty,
        batchId: entry.batchId?._id || entry.batchId || null,
        batchNumber: batchNum,
        purchaseRate: rate,
        totalValue: val,
        reason: reasonText,
        notes: entry.notes || '',
        referenceNumber: refNum,
        previousStock: entry.previousStock ?? null,
        currentStock: entry.currentStock ?? null,
        createdBy: entry.createdBy || 'System',
        createdAt: entry.createdAt,
      };
    });

    const summary = {
      totalDamagedQty,
      totalDamagedValue,
      damagedCount,
      totalReturnedQty,
      totalReturnValue,
      returnCount,
      totalAdjustedQty: totalDamagedQty + totalReturnedQty,
      totalAdjustedValue: normalizeMoney(totalDamagedValue + totalReturnValue),
      totalCount: adjustments.length,
    };

    return {
      adjustments,
      summary,
    };
  },

  /**
   * Add Opening Stock for a product
   * Creates a dedicated opening stock batch and updates product totalStock without creating any Purchase or SupplierLedger entry.
   */
  async addOpeningStock(data, userId) {
    if (!userId) throw new AppError('User ID is required', HTTP_STATUS.UNAUTHORIZED);

    const {
      productId,
      quantity,
      purchaseRate = 0,
      costRate = 0,
      sellingPrice = 0,
      mrp = 0,
      batchNumber,
      mfgDate = null,
      expiryDate = null,
      supplierId = null,
      notes = '',
      openingDate = null,
    } = data;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new AppError('Valid Product ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError('Opening stock quantity must be greater than zero', HTTP_STATUS.BAD_REQUEST);
    }

    const product = await Product.findOne({ _id: productId, userId, isDeleted: { $ne: true } }).exec();
    if (!product) {
      throw new AppError('Product not found or inactive', HTTP_STATUS.NOT_FOUND);
    }

    const rate = Number(
      purchaseRate ||
      costRate ||
      data.rate ||
      data.cost ||
      data.unitCost ||
      data.purchasePrice ||
      data.costPrice ||
      product.defaultPurchaseRate ||
      0
    );
    if (isNaN(rate) || rate < 0) {
      throw new AppError('Cost/Purchase rate cannot be negative', HTTP_STATUS.BAD_REQUEST);
    }

    // Generate or format Batch Number
    const datePart = openingDate
      ? new Date(openingDate).toISOString().slice(0, 10).replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let finalBatchNumber = (batchNumber || '').trim();
    if (!finalBatchNumber) {
      const existingOpeningCount = await ProductBatch.countDocuments({
        userId,
        productId,
        isOpeningStock: true,
      }).exec();
      finalBatchNumber = `OPN-${datePart}-${String(existingOpeningCount + 1).padStart(3, '0')}`;
    }

    // Check for duplicate active batch number on this product
    const duplicateBatch = await ProductBatch.findOne({
      userId,
      productId,
      batchNumber: finalBatchNumber,
      isDeleted: { $ne: true },
    }).exec();

    if (duplicateBatch) {
      throw new AppError(`A batch with number "${finalBatchNumber}" already exists for this product.`, HTTP_STATUS.BAD_REQUEST);
    }

    const finalSellingPrice = Number(
      sellingPrice ||
      data.saleRate ||
      data.sellingRate ||
      data.price ||
      data.unitPrice ||
      product.defaultSellingPrice ||
      rate ||
      0
    );
    const finalMrp = Number(mrp || product.defaultMrp || finalSellingPrice || rate || 0);

    const prevProductStock = Number(product.totalStock || 0);
    const newProductStock = prevProductStock + qty;

    // Create Opening Stock ProductBatch (purchaseId is strictly null)
    const newBatch = await ProductBatch.create({
      userId,
      productId: product._id,
      productName: product.name,
      purchaseId: null,
      supplierId: supplierId && mongoose.Types.ObjectId.isValid(supplierId) ? supplierId : null,
      batchNumber: finalBatchNumber,
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      purchaseRate: normalizeMoney(rate),
      mrp: normalizeMoney(finalMrp),
      sellingPrice: normalizeMoney(finalSellingPrice),
      initialQuantity: qty,
      currentStock: qty,
      isOpeningStock: true,
      isActive: true,
      createdAt: openingDate ? new Date(openingDate) : new Date(),
    });

    // Update product stock and fallback default rates if not set
    product.totalStock = newProductStock;
    if ((!product.defaultPurchaseRate || product.defaultPurchaseRate === 0) && rate > 0) {
      product.defaultPurchaseRate = normalizeMoney(rate);
    }
    if ((!product.defaultSellingPrice || product.defaultSellingPrice === 0) && finalSellingPrice > 0) {
      product.defaultSellingPrice = normalizeMoney(finalSellingPrice);
    }
    await product.save();

    // Insert StockLedger entry for full auditability
    await StockLedger.create({
      userId,
      transactionType: 'OPENING_STOCK',
      referenceId: newBatch._id,
      referenceNumber: finalBatchNumber,
      productId: product._id,
      batchId: newBatch._id,
      batchNumber: finalBatchNumber,
      quantity: qty,
      purchaseRate: normalizeMoney(rate),
      sellingPrice: normalizeMoney(finalSellingPrice),
      previousStock: prevProductStock,
      currentStock: newProductStock,
      reason: 'Opening Inventory Stock',
      notes: (notes || 'Initial opening stock entry').trim(),
      supplierId: newBatch.supplierId || null,
      timestamp: openingDate ? new Date(openingDate) : new Date(),
    });

    logger.info(`✅ Added Opening Stock: Product "${product.name}", Qty: ${qty}, Batch: ${finalBatchNumber}, Cost: ₹${rate}`);

    return {
      batch: newBatch,
      product: {
        _id: product._id,
        name: product.name,
        totalStock: product.totalStock,
      },
    };
  },

  /**
   * Get all Opening Stock batches
   */
  async getOpeningStockList(query = {}, userId) {
    if (!userId) throw new AppError('User ID is required', HTTP_STATUS.UNAUTHORIZED);

    const filter = {
      userId,
      isOpeningStock: true,
      isDeleted: { $ne: true },
    };

    if (query.productId && mongoose.Types.ObjectId.isValid(query.productId)) {
      filter.productId = new mongoose.Types.ObjectId(query.productId);
    }

    const batches = await ProductBatch.find(filter)
      .populate({
        path: 'productId',
        select: 'name code barcode image categoryId brandId defaultUnitId totalStock',
        populate: [
          { path: 'categoryId', select: 'name' },
          { path: 'brandId', select: 'name' },
          { path: 'defaultUnitId', select: 'name shortName' },
        ],
      })
      .populate('supplierId', 'name mobile')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    let totalOpeningQty = 0;
    let totalOpeningValue = 0;
    let totalRemainingQty = 0;
    let totalRemainingValue = 0;

    const formattedList = batches.map((b) => {
      const initQty = Number(b.initialQuantity || 0);
      const curStock = Number(b.currentStock || 0);
      const consumedQty = Math.max(0, initQty - curStock);
      const rate = Number(b.purchaseRate || 0);
      const initVal = normalizeMoney(initQty * rate);
      const remVal = normalizeMoney(curStock * rate);

      totalOpeningQty += initQty;
      totalOpeningValue = normalizeMoney(totalOpeningValue + initVal);
      totalRemainingQty += curStock;
      totalRemainingValue = normalizeMoney(totalRemainingValue + remVal);

      return {
        _id: b._id,
        batchNumber: b.batchNumber,
        productId: b.productId?._id || b.productId,
        productName: b.productId?.name || b.productName || 'Unknown Product',
        productIsActive: b.productId?.isActive !== false,
        productImage: b.productId?.image || '',
        category: b.productId?.categoryId?.name || 'General',
        brand: b.productId?.brandId?.name || '',
        unit: b.productId?.defaultUnitId?.shortName || 'Bag',
        initialQuantity: initQty,
        currentStock: curStock,
        consumedQuantity: consumedQty,
        purchaseRate: rate,
        sellingPrice: Number(b.sellingPrice || 0),
        mrp: Number(b.mrp || 0),
        initialValue: initVal,
        remainingValue: remVal,
        mfgDate: b.mfgDate,
        expiryDate: b.expiryDate,
        isFullyConsumed: curStock === 0,
        supplierName: b.supplierId?.name || 'N/A',
        createdAt: b.createdAt,
      };
    });

    return {
      openingStocks: formattedList,
      summary: {
        totalRecords: formattedList.length,
        totalOpeningQty,
        totalOpeningValue,
        totalRemainingQty,
        totalRemainingValue,
        totalConsumedQty: totalOpeningQty - totalRemainingQty,
      },
    };
  },

  /**
   * Update an existing Opening Stock batch
   */
  async updateOpeningStock(batchId, data, userId) {
    if (!userId) throw new AppError('User ID is required', HTTP_STATUS.UNAUTHORIZED);

    const batch = await ProductBatch.findOne({
      _id: batchId,
      userId,
      isOpeningStock: true,
      isDeleted: { $ne: true },
    }).exec();

    if (!batch) {
      throw new AppError('Opening stock record not found', HTTP_STATUS.NOT_FOUND);
    }

    const product = await Product.findOne({ _id: batch.productId, userId, isDeleted: { $ne: true } }).exec();
    if (!product) {
      throw new AppError('Associated product not found', HTTP_STATUS.NOT_FOUND);
    }

    // Update batchNumber if provided
    if (data.batchNumber !== undefined && data.batchNumber.trim()) {
      const newBatchNum = data.batchNumber.trim();
      if (newBatchNum !== batch.batchNumber) {
        const dup = await ProductBatch.findOne({
          userId,
          productId: batch.productId,
          batchNumber: newBatchNum,
          _id: { $ne: batch._id },
          isDeleted: { $ne: true },
        }).exec();
        if (dup) {
          throw new AppError(`A batch with number "${newBatchNum}" already exists for this product.`, HTTP_STATUS.BAD_REQUEST);
        }
        batch.batchNumber = newBatchNum;
      }
    }

    const consumedQty = Math.max(0, (batch.initialQuantity || 0) - (batch.currentStock || 0));

    // If updating quantity, validate new quantity
    if (data.quantity !== undefined && data.quantity !== null) {
      const newQty = Number(data.quantity);
      if (isNaN(newQty) || newQty <= 0) {
        throw new AppError('Quantity must be greater than zero', HTTP_STATUS.BAD_REQUEST);
      }

      const qtyDelta = newQty - batch.initialQuantity;
      batch.initialQuantity = newQty;
      batch.currentStock = Math.max(0, newQty - consumedQty);
      batch.isActive = batch.currentStock > 0;

      product.totalStock = Math.max(0, (product.totalStock || 0) + qtyDelta);
      await product.save();
    }

    if (data.purchaseRate !== undefined || data.costRate !== undefined || data.rate !== undefined || data.cost !== undefined || data.openingRate !== undefined) {
      const rate = Number(data.purchaseRate ?? data.costRate ?? data.rate ?? data.cost ?? data.openingRate ?? 0);
      if (rate >= 0) {
        batch.purchaseRate = normalizeMoney(rate);
        if ((!product.defaultPurchaseRate || product.defaultPurchaseRate === 0) && rate > 0) {
          product.defaultPurchaseRate = normalizeMoney(rate);
          await product.save();
        }
      }
    }

    if (data.sellingPrice !== undefined || data.saleRate !== undefined || data.sellingRate !== undefined || data.price !== undefined) {
      const sp = Number(data.sellingPrice ?? data.saleRate ?? data.sellingRate ?? data.price ?? 0);
      if (sp >= 0) {
        batch.sellingPrice = normalizeMoney(sp);
        if ((!product.defaultSellingPrice || product.defaultSellingPrice === 0) && sp > 0) {
          product.defaultSellingPrice = normalizeMoney(sp);
          await product.save();
        }
      }
    }

    if (data.mrp !== undefined) {
      const mrpVal = Number(data.mrp);
      if (mrpVal >= 0) batch.mrp = normalizeMoney(mrpVal);
    }

    if (data.mfgDate !== undefined) batch.mfgDate = data.mfgDate ? new Date(data.mfgDate) : null;
    if (data.expiryDate !== undefined) batch.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    await batch.save();

    logger.info(`✅ Updated Opening Stock Batch "${batch.batchNumber}" for Product "${product.name}"`);

    return {
      batch,
      product: {
        _id: product._id,
        name: product.name,
        totalStock: product.totalStock,
      },
    };
  },

  /**
   * Delete an Opening Stock batch
   */
  async deleteOpeningStock(batchId, userId) {
    if (!userId) throw new AppError('User ID is required', HTTP_STATUS.UNAUTHORIZED);

    const batch = await ProductBatch.findOne({
      _id: batchId,
      userId,
      isOpeningStock: true,
      isDeleted: { $ne: true },
    }).exec();

    if (!batch) {
      throw new AppError('Opening stock record not found', HTTP_STATUS.NOT_FOUND);
    }

    const product = await Product.findOne({ _id: batch.productId, userId }).exec();
    if (product) {
      product.totalStock = Math.max(0, (product.totalStock || 0) - (batch.initialQuantity || batch.currentStock || 0));
      await product.save();
    }

    batch.isDeleted = true;
    batch.deletedAt = new Date();
    batch.isActive = false;
    await batch.save();

    // Insert reversal in StockLedger
    if (product) {
      await StockLedger.create({
        userId,
        transactionType: 'ADJUSTMENT',
        referenceId: batch._id,
        referenceNumber: batch.batchNumber,
        productId: product._id,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        quantity: -batch.initialQuantity,
        purchaseRate: batch.purchaseRate,
        previousStock: (product.totalStock || 0) + batch.initialQuantity,
        currentStock: product.totalStock || 0,
        reason: 'Opening stock deleted/cancelled',
        notes: `Opening batch ${batch.batchNumber} removed`,
        timestamp: new Date(),
      });
    }

    logger.info(`🗑️ Deleted Opening Stock Batch "${batch.batchNumber}"`);

    return {
      success: true,
      message: `Opening stock batch "${batch.batchNumber}" deleted successfully`,
    };
  },
};
