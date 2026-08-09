import { Purchase } from '../models/purchase.model.js';
import { PurchaseItem } from '../models/purchaseItem.model.js';
import { StockLedger } from '../models/stockLedger.model.js';

export const purchaseRepository = {
  async createPurchase(purchaseData, session = null) {
    const opts = session ? { session } : {};
    const [purchase] = await Purchase.create([purchaseData], opts);
    return purchase;
  },

  async createPurchaseItem(itemData, session = null) {
    const opts = session ? { session } : {};
    const [item] = await PurchaseItem.create([itemData], opts);
    return item;
  },

  async createStockLedger(ledgerData, session = null) {
    const opts = session ? { session } : {};
    const [ledger] = await StockLedger.create([ledgerData], opts);
    return ledger;
  },

  async findAll(filter = {}, options = {}) {
    const finalFilter = filter.isDeleted !== undefined ? filter : { isDeleted: { $ne: true }, ...filter };
    const query = Purchase.find(finalFilter).populate('supplierId', 'name companyName mobile gstin');
    if (options.sort) query.sort(options.sort);
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    return await query.exec();
  },

  async findByIdPopulated(id) {
    const purchase = await Purchase.findById(id).populate('supplierId', 'name companyName mobile gstin').exec();
    if (!purchase) return null;

    const { SupplierLedger } = await import('../../suppliers/models/supplierLedger.model.js');

    const [items, payments] = await Promise.all([
      PurchaseItem.find({ purchaseId: id })
        .populate({
          path: 'productId',
          select: 'name image brandId categoryId defaultUnitId defaultPurchaseRate defaultSellingPrice defaultMrp',
          populate: [
            { path: 'brandId', select: 'name shortName logo' },
            { path: 'categoryId', select: 'name slug icon color' },
            { path: 'defaultUnitId', select: 'name shortName allowDecimals' },
          ],
        })
        .populate('batchId', 'batchNumber mfgDate expiryDate currentStock')
        .exec(),
      SupplierLedger.find({ purchaseId: id, transactionType: 'PAYMENT', isDeleted: { $ne: true } })
        .sort({ date: 1, createdAt: 1 })
        .exec(),
    ]);

    const purchaseObj = purchase.toObject();
    purchaseObj.items = items || [];
    purchaseObj.payments = payments || [];

    return { purchase: purchaseObj, items, payments };
  },

  async count(filter = {}) {
    const finalFilter = filter.isDeleted !== undefined ? filter : { isDeleted: { $ne: true }, ...filter };
    return await Purchase.countDocuments(finalFilter);
  },
};
