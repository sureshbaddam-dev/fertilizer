import mongoose from 'mongoose';
import { purchaseRepository } from '../repositories/purchase.repository.js';
import { productRepository } from '../../products/repositories/product.repository.js';
import { supplierRepository } from '../../suppliers/repositories/supplier.repository.js';
import { SupplierLedger } from '../../suppliers/models/supplierLedger.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Product } from '../../products/models/product.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';
import { generateNextBatchNumber } from '../../products/services/product.service.js';

export const purchaseService = {
  async getAllPurchases(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId };
    if (query.search) {
      filter.$or = [
        { purchaseNumber: { $regex: query.search, $options: 'i' } },
        { supplierInvoiceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.supplierId) filter.supplierId = query.supplierId;

    const sort = { createdAt: -1 };
    const purchases = await purchaseRepository.findAll(filter, { sort });
    const total = await purchaseRepository.count(filter);

    return { purchases, total };
  },

  async getPurchaseById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const data = await purchaseRepository.findByIdPopulated(id, userId);
    if (!data) {
      throw new AppError('Purchase record not found', HTTP_STATUS.NOT_FOUND);
    }
    return data;
  },

  async createPurchase(data, userId) {
    if (!userId) throw new Error('userId is required');
    const {
      supplierId,
      supplierInvoiceNumber,
      purchaseDate,
      dueDate,
      paidAmount = 0,
      notes,
      items = [],
      createdBy = 'Ramesh Kumar',
    } = data;

    if (!supplierId) {
      throw new AppError('Supplier is required', HTTP_STATUS.BAD_REQUEST);
    }
    const supplierDoc = await Supplier.findOne({ _id: supplierId, userId });
    if (!supplierDoc) {
      throw new AppError('Selected Supplier not found or access denied', HTTP_STATUS.BAD_REQUEST);
    }

    if (!items || items.length === 0) {
      throw new AppError('Purchase must contain at least one product item', HTTP_STATUS.BAD_REQUEST);
    }

    for (const item of items) {
      if (item.productId) {
        const prodDoc = await Product.findOne({ _id: item.productId, userId });
        if (!prodDoc) {
          throw new AppError(`Product not found or access denied: '${item.productName || item.productId}'`, HTTP_STATUS.BAD_REQUEST);
        }
      }
    }

    const { Purchase } = await import('../models/purchase.model.js');

    const executeSave = async (session = null) => {
      let totalDocsCount = await Purchase.countDocuments({ userId }, session ? { session } : {}).exec();
      let countNum = totalDocsCount + 1;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      let autoPurchaseNumber = `PUR-${dateStr}-${String(countNum).padStart(5, '0')}`;

      while (await Purchase.findOne({ userId, purchaseNumber: autoPurchaseNumber }, null, session ? { session } : {}).exec()) {
        countNum += 1;
        autoPurchaseNumber = `PUR-${dateStr}-${String(countNum).padStart(5, '0')}`;
      }

      const purchaseNumber = autoPurchaseNumber;
      const effectiveInvoiceNumber = supplierInvoiceNumber || purchaseNumber;

      let subtotal = 0;
      let totalTaxAmount = 0;

      items.forEach((item) => {
        const itemQty = Number(item.quantity) || 1;
        const itemRate = normalizeMoney(item.purchaseRate || 0);
        const lineTotal = itemQty * itemRate;
        subtotal += lineTotal;

        const tax = normalizeMoney(item.taxAmount || 0);
        totalTaxAmount += tax;
      });

      const totalInvoiceAmount = normalizeMoney(subtotal + totalTaxAmount);
      const actualPaidAmount = normalizeMoney(paidAmount || 0);
      const dueAmount = normalizeMoney(totalInvoiceAmount - actualPaidAmount);

      const purchaseData = {
        userId,
        purchaseNumber,
        supplierId,
        supplierInvoiceNumber: effectiveInvoiceNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal: normalizeMoney(subtotal),
        taxAmount: normalizeMoney(totalTaxAmount),
        totalInvoiceAmount,
        paidAmount: actualPaidAmount,
        dueAmount,
        notes,
        createdBy,
      };

      const newPurchase = await purchaseRepository.createPurchase(purchaseData, session);

      const createdItems = [];
      const assignedInCurrentPurchase = new Set();

      for (const item of items) {
        const itemQty = Number(item.quantity) || 1;
        const itemRate = normalizeMoney(item.purchaseRate || 0);
        const itemMrp = normalizeMoney(item.mrp || 0);
        const itemSellingPrice = normalizeMoney(item.sellingPrice || 0);

        let batchNumber = (item.batchNumber || '').trim();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const datePrefix = `BATCH-${dateStr}-`;

        // Authoritative backend batch sequence [SHOP_LETTER]B[YY][MM][SERIAL]:
        if (!batchNumber || batchNumber.toUpperCase().startsWith('BATCH-') || batchNumber.toUpperCase().startsWith('AUTO')) {
          batchNumber = await generateNextBatchNumber(userId, session);
        }

        assignedInCurrentPurchase.add(batchNumber);

        // Always create a new, distinct ProductBatch for each purchase item line
        const [batchRecord] = await ProductBatch.create(
          [
            {
              userId,
              productId: item.productId,
              purchaseId: newPurchase._id,
              supplierId: newPurchase.supplierId,
              batchNumber,
              mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              purchaseRate: itemRate,
              mrp: itemMrp,
              sellingPrice: itemSellingPrice,
              initialQuantity: itemQty,
              currentStock: itemQty,
              isActive: true,
              isDeleted: false,
            },
          ],
          session ? { session } : {}
        );

        const batchId = batchRecord._id;
        batchNumber = batchRecord.batchNumber;

        const purchaseItemData = {
          userId,
          purchaseId: newPurchase._id,
          productId: item.productId,
          productCode: item.productCode || '',
          productName: item.productName || '',
          brandName: item.brandName || '',
          categoryName: item.categoryName || '',
          unitName: item.unitName || 'Unit',
          hsnCode: item.hsnCode || '',
          batchId,
          batchNumber,
          mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          quantity: itemQty,
          purchaseRate: itemRate,
          mrp: itemMrp,
          sellingPrice: itemSellingPrice,
          discountPercent: Number(item.discountPercent) || 0,
          discountAmount: normalizeMoney(item.discountAmount || 0),
          gstPercent: Number(item.gstPercent) || 18,
          taxAmount: normalizeMoney(item.taxAmount || 0),
          taxableAmount: normalizeMoney(item.taxableAmount || 0),
          lineTotal: normalizeMoney(itemQty * itemRate),
          totalAmount: normalizeMoney((itemQty * itemRate) + (Number(item.taxAmount) || 0)),
          isDeleted: false,
        };

        const createdItem = await purchaseRepository.createPurchaseItem(purchaseItemData, session);
        createdItems.push(createdItem);

        const currentProduct = await productRepository.findById(item.productId, userId);
        const previousStock = currentProduct ? currentProduct.totalStock : 0;
        const updatedProduct = await productRepository.incrementStock(item.productId, itemQty, session, userId);
        const currentStock = updatedProduct ? updatedProduct.totalStock : previousStock + itemQty;

        const stockLedgerData = {
          userId,
          transactionType: 'PURCHASE',
          referenceId: newPurchase._id,
          referenceNumber: newPurchase.purchaseNumber,
          productId: item.productId,
          batchId,
          batchNumber,
          quantity: itemQty,
          purchaseRate: itemRate,
          sellingPrice: itemSellingPrice,
          previousStock,
          currentStock,
          createdBy,
          timestamp: newPurchase.purchaseDate,
          isDeleted: false,
        };

        await purchaseRepository.createStockLedger(stockLedgerData, session);
      }

      const { Supplier } = await import('../../suppliers/models/supplier.model.js');
      const supplier = await Supplier.findOne({ _id: supplierId, userId }).exec();
      const prevSupplierBalance = supplier ? normalizeMoney(supplier.outstandingBalance || 0) : 0;
      const newSupplierBalance = normalizeMoney(prevSupplierBalance + dueAmount);

      const ledgerEntries = [];
      const purchaseLedgerData = {
        userId,
        supplierId,
        purchaseId: newPurchase._id,
        transactionType: 'PURCHASE',
        purchaseAmount: totalInvoiceAmount,
        paidAmount: actualPaidAmount,
        dueAmount,
        runningBalance: newSupplierBalance,
        referenceNumber: newPurchase.purchaseNumber,
        notes: `Purchase Invoice #${effectiveInvoiceNumber}`,
        date: newPurchase.purchaseDate,
        isDeleted: false,
      };

      const purchaseLedgerEntry = session
        ? (await SupplierLedger.create([purchaseLedgerData], { session }))[0]
        : await SupplierLedger.create(purchaseLedgerData);
      ledgerEntries.push(purchaseLedgerEntry);

      if (supplier) {
        if (session) {
          await Supplier.findOneAndUpdate({ _id: supplierId, userId }, { outstandingBalance: newSupplierBalance }, { session });
        } else {
          await Supplier.findOneAndUpdate({ _id: supplierId, userId }, { outstandingBalance: newSupplierBalance });
        }
      }

      return {
        purchase: newPurchase,
        items: createdItems,
        ledgerEntries,
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
      } catch (txnError) {
        await session.abortTransaction();
        session.endSession();
        throw txnError;
      }
    } catch (err) {
      logger.warn({ err }, 'MongoDB Standalone Mode detected: Fallback execution without Session Transaction');
      return await executeSave(null);
    }
  },

  async deletePurchase(id, userId, confirmation = 'DELETE') {
    return await this.softDeletePurchase(id, userId, confirmation);
  },

  async softDeletePurchase(id, userId, confirmation = '') {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Purchase ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const reqConfirmation = (confirmation || 'DELETE').toString().trim();
    if (reqConfirmation !== 'DELETE') {
      throw new AppError('Invalid confirmation text. Must type DELETE exactly.', HTTP_STATUS.BAD_REQUEST);
    }

    const { Purchase } = await import('../models/purchase.model.js');
    const { PurchaseItem } = await import('../models/purchaseItem.model.js');
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');
    const { Product } = await import('../../products/models/product.model.js');
    const { SupplierLedger } = await import('../../suppliers/models/supplierLedger.model.js');
    const { StockLedger } = await import('../models/stockLedger.model.js');
    const { SalesInvoice } = await import('../../sales/models/salesInvoice.model.js');
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');
    const { productService } = await import('../../products/services/product.service.js');

    const purchase = await Purchase.findOne({ _id: id, userId, isDeleted: { $ne: true } }).exec();
    if (!purchase) {
      throw new AppError('Purchase record not found or already deleted', HTTP_STATUS.NOT_FOUND);
    }

    // 1. SAFETY CHECK FOR SALES CONSUMPTION (Requirement 6)
    const batchesForPurchase = await ProductBatch.find({ userId, purchaseId: purchase._id, isDeleted: { $ne: true } }).exec();

    for (const batch of batchesForPurchase) {
      const initQty = Number(batch.initialQuantity || 0);
      const currStock = Number(batch.currentStock || 0);

      if (currStock < initQty) {
        throw new AppError(
          `Cannot delete purchase invoice. Product batch '${batch.batchNumber}' created by this purchase has already participated in sales/consumption (${initQty - currStock} units sold). Reverse sales invoices first.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const salesWithBatch = await SalesInvoice.findOne({
        userId,
        'items.batchAllocations.batchId': batch._id,
      }).lean().exec();

      if (salesWithBatch) {
        throw new AppError(
          `Cannot delete purchase invoice. Product batch '${batch.batchNumber}' is referenced in Sales Invoice #${salesWithBatch.invoiceNumber}. Reverse sales invoices first.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    // 2. FULL CASCADE REVERSAL (Requirement 5)
    purchase.isDeleted = true;
    purchase.isActive = false;
    purchase.deletedAt = new Date();
    purchase.deletedBy = userId;
    await purchase.save();

    await PurchaseItem.updateMany(
      { userId, purchaseId: purchase._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();

    const items = await PurchaseItem.find({ userId, purchaseId: purchase._id }).lean().exec();
    const affectedProductIds = new Set(items.map((i) => i.productId?.toString()).filter(Boolean));

    const batchIds = [];
    for (const batch of batchesForPurchase) {
      batchIds.push(batch._id);
      batch.isActive = false;
      batch.isDeleted = true;
      batch.currentStock = 0;
      batch.deletedAt = new Date();
      await batch.save();
    }

    await StockLedger.updateMany(
      { userId, referenceId: purchase._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();
    if (batchIds.length > 0) {
      await StockLedger.updateMany(
        { userId, batchId: { $in: batchIds } },
        { $set: { isDeleted: true, deletedAt: new Date() } }
      ).exec();
    }

    await SupplierLedger.updateMany(
      { userId, purchaseId: purchase._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();

    if (purchase.supplierId) {
      await supplierService.calculateSupplierBalance(purchase.supplierId, userId);
    }

    for (const prodIdStr of affectedProductIds) {
      const prodObjId = new mongoose.Types.ObjectId(prodIdStr);
      const remainingActiveBatches = await ProductBatch.find({
        userId,
        productId: prodObjId,
        isDeleted: { $ne: true },
        isActive: true,
      }).lean().exec();

      const newTotalStock = remainingActiveBatches.reduce(
        (sum, b) => sum + Math.max(0, Number(b.currentStock || 0)),
        0
      );

      await Product.findOneAndUpdate(
        { _id: prodObjId, userId },
        { totalStock: newTotalStock }
      ).exec();

      await productService.reconcileProductBatches(prodObjId, userId);
    }

    logger.info(`🔒 Soft-deleted Purchase Invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} [${id}]`);

    return {
      success: true,
      message: `Purchase invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} soft-deleted successfully`,
      deletedPurchaseId: purchase._id,
    };
  },

  async restorePurchase(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Purchase ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const { Purchase } = await import('../models/purchase.model.js');
    const { PurchaseItem } = await import('../models/purchaseItem.model.js');
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');
    const { Product } = await import('../../products/models/product.model.js');
    const { SupplierLedger } = await import('../../suppliers/models/supplierLedger.model.js');
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');

    const purchase = await Purchase.findOne({ _id: id, userId, isDeleted: true }).exec();
    if (!purchase) {
      throw new AppError('Soft-deleted purchase invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    const items = await PurchaseItem.find({ userId, purchaseId: purchase._id }).exec();

    for (const item of items) {
      if (item.batchId) {
        const batch = await ProductBatch.findOne({ _id: item.batchId, userId }).exec();
        if (batch) {
          batch.isActive = true;
          batch.isDeleted = false;
          batch.deletedAt = null;
          await batch.save();

          const unconsumedStock = Math.max(0, Number(batch.currentStock || 0));
          if (unconsumedStock > 0 && item.productId) {
            const product = await Product.findOne({ _id: item.productId, userId }).exec();
            if (product) {
              const currentTotal = Number(product.totalStock || 0);
              product.totalStock = currentTotal + unconsumedStock;
              await product.save();
            }
          }
        }
      }
    }

    purchase.isDeleted = false;
    purchase.isActive = true;
    purchase.deletedAt = null;
    purchase.deletedBy = null;
    purchase.restoredAt = new Date();
    purchase.restoredBy = userId;
    await purchase.save();

    await SupplierLedger.updateMany(
      { userId, purchaseId: purchase._id },
      { $set: { isDeleted: false, deletedAt: null } }
    ).exec();

    if (purchase.supplierId) {
      await supplierService.calculateSupplierBalance(purchase.supplierId, userId);
    }

    return {
      success: true,
      message: `Purchase invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} restored successfully`,
      restoredPurchaseId: purchase._id,
    };
  },

  async getDeletedPurchases(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const { Purchase } = await import('../models/purchase.model.js');
    const filter = { userId, isDeleted: true };

    if (query.search) {
      filter.$or = [
        { purchaseNumber: { $regex: query.search, $options: 'i' } },
        { supplierInvoiceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name companyName mobile gstin')
      .sort({ deletedAt: -1 })
      .lean()
      .exec();

    return { purchases, total: purchases.length };
  },
};
