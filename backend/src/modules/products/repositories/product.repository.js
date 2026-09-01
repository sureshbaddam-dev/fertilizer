import { Product } from '../models/product.model.js';
import { ProductBatch } from '../models/productBatch.model.js';
import { createBaseMasterRepository } from '../../../common/baseMaster.repository.js';

const baseRepo = createBaseMasterRepository(Product);

export const productRepository = {
  ...baseRepo,

  async findAllPopulated(filter = {}, options = {}) {
    const query = Product.find(filter)
      .populate('brandId', 'name shortName logo')
      .populate('categoryId', 'name slug icon color')
      .populate('defaultUnitId', 'name shortName allowDecimals')
      .lean();

    if (options.sort) query.sort(options.sort);
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    return await query.exec();
  },

  async findByIdPopulated(id, userId = null) {
    const filter = userId ? { _id: id, userId } : { _id: id };
    return await Product.findOne(filter)
      .populate('brandId', 'name shortName logo')
      .populate('categoryId', 'name slug icon color')
      .populate('defaultUnitId', 'name shortName allowDecimals')
      .exec();
  },

  async incrementStock(productId, qty, session = null, userId = null) {
    const opts = session ? { session } : {};
    const filter = userId ? { _id: productId, userId } : { _id: productId };
    return await Product.findOneAndUpdate(
      filter,
      { $inc: { totalStock: qty } },
      { new: true, ...opts }
    ).exec();
  },

  async findBatch(productId, batchNumber, session = null, userId = null) {
    const opts = session ? { session } : {};
    const filter = userId ? { productId, batchNumber, userId } : { productId, batchNumber };
    return await ProductBatch.findOne(filter, null, opts).exec();
  },

  async findBatchesByProduct(productId, userId = null) {
    const filter = userId ? { productId, userId, isDeleted: { $ne: true } } : { productId, isDeleted: { $ne: true } };
    return await ProductBatch.find(filter).sort({ createdAt: 1 }).exec();
  },

  async upsertBatch(batchData, session = null) {
    const { productId, batchNumber, quantity = 0, userId, ...rest } = batchData;

    const filter = userId ? { productId, batchNumber, userId } : { productId, batchNumber };
    let batch = await ProductBatch.findOne(filter, null, session ? { session } : {});
    if (batch) {
      if (quantity) {
        batch.initialQuantity = (batch.initialQuantity || 0) + quantity;
        batch.currentStock += quantity;
      }
      if (rest.purchaseRate !== undefined) batch.purchaseRate = Number(rest.purchaseRate) || 0;
      if (rest.mrp !== undefined) batch.mrp = Number(rest.mrp) || 0;
      if (rest.sellingPrice !== undefined) batch.sellingPrice = Number(rest.sellingPrice) || 0;
      if (rest.expiryDate) batch.expiryDate = rest.expiryDate;
      if (rest.mfgDate) batch.mfgDate = rest.mfgDate;
      batch.isActive = batch.currentStock > 0;
      await batch.save(session ? { session } : {});
      return batch;
    } else {
      const initQty = Number(quantity) || Number(rest.currentStock) || Number(rest.initialQuantity) || 0;
      const [newBatch] = await ProductBatch.create(
        [{
          productId,
          batchNumber,
          userId,
          initialQuantity: initQty,
          currentStock: initQty,
          purchaseRate: Number(rest.purchaseRate) || 0,
          mrp: Number(rest.mrp) || 0,
          sellingPrice: Number(rest.sellingPrice) || 0,
          isActive: true,
          ...rest,
        }],
        session ? { session } : {}
      );
      return newBatch;
    }
  },
};
