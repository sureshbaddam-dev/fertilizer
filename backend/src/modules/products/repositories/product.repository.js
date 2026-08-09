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
      .populate('defaultUnitId', 'name shortName allowDecimals');

    if (options.sort) query.sort(options.sort);
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    return await query.exec();
  },

  async findByIdPopulated(id) {
    return await Product.findById(id)
      .populate('brandId', 'name shortName logo')
      .populate('categoryId', 'name slug icon color')
      .populate('defaultUnitId', 'name shortName allowDecimals')
      .exec();
  },

  async incrementStock(productId, qty, session = null) {
    const opts = session ? { session } : {};
    return await Product.findByIdAndUpdate(
      productId,
      { $inc: { totalStock: qty } },
      { new: true, ...opts }
    ).exec();
  },

  async findBatch(productId, batchNumber, session = null) {
    const opts = session ? { session } : {};
    return await ProductBatch.findOne({ productId, batchNumber }, null, opts).exec();
  },

  async findBatchesByProduct(productId) {
    return await ProductBatch.find({ productId, isActive: true }).sort({ expiryDate: 1 }).exec();
  },

  async upsertBatch(batchData, session = null) {
    const { productId, batchNumber, quantity = 0, ...rest } = batchData;

    let batch = await ProductBatch.findOne({ productId, batchNumber }, null, session ? { session } : {});
    if (batch) {
      if (quantity) batch.currentStock += quantity;
      if (rest.purchaseRate !== undefined) batch.purchaseRate = Number(rest.purchaseRate) || 0;
      if (rest.mrp !== undefined) batch.mrp = Number(rest.mrp) || 0;
      if (rest.sellingPrice !== undefined) batch.sellingPrice = Number(rest.sellingPrice) || 0;
      if (rest.expiryDate) batch.expiryDate = rest.expiryDate;
      if (rest.mfgDate) batch.mfgDate = rest.mfgDate;
      await batch.save(session ? { session } : {});
      return batch;
    } else {
      const [newBatch] = await ProductBatch.create(
        [{
          productId,
          batchNumber,
          currentStock: Number(quantity) || 0,
          purchaseRate: Number(rest.purchaseRate) || 0,
          mrp: Number(rest.mrp) || 0,
          sellingPrice: Number(rest.sellingPrice) || 0,
          ...rest,
        }],
        session ? { session } : {}
      );
      return newBatch;
    }
  },
};
