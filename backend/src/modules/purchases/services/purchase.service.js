import mongoose from 'mongoose';
import { purchaseRepository } from '../repositories/purchase.repository.js';
import { productRepository } from '../../products/repositories/product.repository.js';
import { supplierRepository } from '../../suppliers/repositories/supplier.repository.js';
import { SupplierLedger } from '../../suppliers/models/supplierLedger.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const purchaseService = {
  async getAllPurchases(query = {}) {
    const filter = {};
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

  async getPurchaseById(id) {
    const data = await purchaseRepository.findByIdPopulated(id);
    if (!data) {
      throw new AppError('Purchase record not found', HTTP_STATUS.NOT_FOUND);
    }
    return data;
  },

  async createPurchase(data) {
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

    if (!items || items.length === 0) {
      throw new AppError('Purchase must contain at least one product item', HTTP_STATUS.BAD_REQUEST);
    }

    // Auto-generate Unique Purchase Header Number (guaranteed non-colliding)
    const { Purchase } = await import('../models/purchase.model.js');
    let totalDocsCount = await Purchase.countDocuments({}).exec();
    let countNum = totalDocsCount + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let autoPurchaseNumber = `PUR-${dateStr}-${String(countNum).padStart(5, '0')}`;

    while (await Purchase.findOne({ purchaseNumber: autoPurchaseNumber }).exec()) {
      countNum += 1;
      autoPurchaseNumber = `PUR-${dateStr}-${String(countNum).padStart(5, '0')}`;
    }

    const purchaseNumber = autoPurchaseNumber;
    const effectiveInvoiceNumber = supplierInvoiceNumber || purchaseNumber;

    // Helper to perform purchase save
    const executeSave = async (session = null) => {
      // 1. Calculate Totals
      let subtotal = 0;
      let totalTaxAmount = 0;

      items.forEach((item) => {
        const itemQty = Number(item.quantity) || 1;
        const itemRate = Number(item.purchaseRate) || 0;
        const lineTotal = itemQty * itemRate;
        subtotal += lineTotal;

        const tax = Number(item.taxAmount) || 0;
        totalTaxAmount += tax;
      });

      const totalInvoiceAmount = subtotal + totalTaxAmount;
      const actualPaidAmount = Number(paidAmount) || 0;
      const dueAmount = totalInvoiceAmount - actualPaidAmount;

      // 2. Create Purchase Header Record
      const purchaseData = {
        purchaseNumber,
        supplierId,
        supplierInvoiceNumber: effectiveInvoiceNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal,
        taxAmount: totalTaxAmount,
        discountAmount: 0,
        totalInvoiceAmount,
        paidAmount: actualPaidAmount,
        dueAmount,
        notes,
        createdBy,
      };

      const purchase = await purchaseRepository.createPurchase(purchaseData, session);
      logger.info(`✅ Created Purchase Header ID: ${purchase._id}`);

      // 3. Process Each Purchase Item & Update Stock & Product Master Rates
      let itemIndex = 0;
      for (const item of items) {
        itemIndex += 1;
        const product = await productRepository.findById(item.productId);
        if (!product) {
          throw new AppError(`Product ID '${item.productId}' not found`, HTTP_STATUS.BAD_REQUEST);
        }

        const qty = Number(item.quantity) || 1;
        const rate = Number(item.purchaseRate) || 0;
        const mrpVal = Number(item.mrp) || rate * 1.2;
        const sellingVal = Number(item.sellingPrice) || product.defaultSellingPrice || mrpVal;

        // Update Product master default fallback rates ONLY if not set
        const productUpdates = {};
        if (rate > 0 && (!product.defaultPurchaseRate || product.defaultPurchaseRate === 0)) {
          productUpdates.defaultPurchaseRate = rate;
        }
        if (sellingVal > 0 && (!product.defaultSellingPrice || product.defaultSellingPrice === 0)) {
          productUpdates.defaultSellingPrice = sellingVal;
        }
        if (Object.keys(productUpdates).length > 0) {
          await productRepository.update(item.productId, productUpdates, session);
          logger.info(`⭐ Initialized Product Master Fallback Rates for '${product.name}' -> Purchase: ₹${rate}, Selling: ₹${sellingVal}`);
        }

        // CREATE BATCH RECORD FOR INVENTORY COST-LAYER TRACKING
        let batchId = null;
        let batchCodeVal = null;
        const rawUserBatch = (item.batchNumber || '').toString().trim();

        const effectiveBatchNumber =
          rawUserBatch.length > 0 &&
          !rawUserBatch.toUpperCase().startsWith('BATCH-') &&
          !rawUserBatch.toUpperCase().startsWith('AUTO')
            ? rawUserBatch
            : `LOT-${Date.now().toString().slice(-6)}-${String(itemIndex).padStart(2, '0')}`;

        // Create a new distinct ProductBatch stock layer preserving purchaseRate and sellingPrice permanently
        const batchDoc = new ProductBatch({
          productId: item.productId,
          purchaseId: purchase._id,
          supplierId,
          batchNumber: effectiveBatchNumber,
          mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          purchaseRate: rate,
          mrp: mrpVal,
          sellingPrice: sellingVal,
          initialQuantity: qty,
          currentStock: qty,
          isActive: true,
        });

        const savedBatch = session ? await batchDoc.save({ session }) : await batchDoc.save();
        batchId = savedBatch._id;
        batchCodeVal = savedBatch.batchNumber;
        logger.info(`✅ Created Product Batch '${savedBatch.batchNumber}' -> Purchase Rate: ₹${rate}, Selling Price: ₹${sellingVal}, Stock: ${qty}`);

        // AUTOMATICALLY INCREMENT PRODUCT MASTER TOTAL STOCK
        const prevProductStock = product.totalStock || 0;
        await productRepository.incrementStock(item.productId, qty, session);
        logger.info(`✅ Incremented Product Master Stock (${product.name}): ${prevProductStock} -> ${prevProductStock + qty}`);

        // Populate complete purchase item snapshot details
        const discountPct = Number(item.discountPercent || 0);
        const grossRateVal = qty * rate;
        const discountAmt = Number(item.discountAmount || (grossRateVal * discountPct) / 100);
        const taxableVal = Math.max(0, grossRateVal - discountAmt);
        const gstPct = Number(item.gstPercent || product.gstRate || 18);
        const taxAmt = Number(item.taxAmount || (taxableVal * gstPct) / 100);
        const lineTot = Number(item.totalAmount || (taxableVal + taxAmt));

        const lineItemData = {
          purchaseId: purchase._id,
          productId: item.productId,
          productCode: product.code || '',
          productName: product.name || 'Agri Product',
          brandName: product.brandId?.name || product.company || '',
          categoryName: product.categoryId?.name || 'General',
          unitName: product.defaultUnitId?.shortName || 'Unit',
          hsnCode: product.hsnCode || '',
          batchId: batchId || null,
          batchNumber: batchCodeVal || null,
          mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          quantity: qty,
          purchaseRate: rate,
          mrp: mrpVal,
          sellingPrice: sellingVal,
          discountPercent: discountPct,
          discountAmount: discountAmt,
          gstPercent: gstPct,
          taxAmount: taxAmt,
          taxableAmount: taxableVal,
          lineTotal: lineTot,
          totalAmount: lineTot,
        };

        await purchaseRepository.createPurchaseItem(lineItemData, session);

        // Insert Stock Ledger Entry (Audit Trail)
        const ledgerData = {
          transactionType: 'PURCHASE',
          referenceId: purchase._id,
          referenceNumber: effectiveInvoiceNumber,
          productId: item.productId,
          batchId: batchId || null,
          batchNumber: batchCodeVal || '',
          quantity: qty,
          purchaseRate: rate,
          sellingPrice: sellingVal,
          previousStock: prevProductStock,
          currentStock: prevProductStock + qty,
          createdBy,
          timestamp: purchaseDate ? new Date(purchaseDate) : new Date(),
        };

        await purchaseRepository.createStockLedger(ledgerData, session);
        logger.info(`✅ Inserted Stock Ledger Audit Entry for '${product.name}'`);
      }

      // 4. Update Supplier Balance & Record Single Purchase Ledger Entry
      const supplier = await supplierRepository.findById(supplierId);
      const prevBalance = Number(supplier?.outstandingBalance || 0);

      const netBalanceImpact = totalInvoiceAmount - actualPaidAmount;
      const finalBalance = prevBalance + netBalanceImpact;

      const purchaseLedgerData = {
        supplierId,
        purchaseId: purchase._id,
        transactionType: 'PURCHASE',
        purchaseAmount: totalInvoiceAmount,
        paidAmount: actualPaidAmount,
        dueAmount: dueAmount,
        runningBalance: finalBalance,
        referenceNumber: effectiveInvoiceNumber,
        notes: notes ? `Purchase Invoice ${effectiveInvoiceNumber}: ${notes}` : `Purchase Invoice ${effectiveInvoiceNumber}`,
        date: purchaseDate ? new Date(purchaseDate) : new Date(),
      };

      await SupplierLedger.create([purchaseLedgerData], session ? { session } : {});
      logger.info(`✅ Recorded Purchase Ledger Entry (Net: +₹${netBalanceImpact}) -> Running Balance: ₹${finalBalance}`);

      // Update Supplier Master Outstanding Balance to finalBalance
      await supplierRepository.update(supplierId, { outstandingBalance: finalBalance }, session ? { session } : {});
      logger.info(`✅ Updated Supplier Outstanding Balance from ₹${prevBalance} to ₹${finalBalance}`);

      return purchase;
    };

    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const purchase = await executeSave(session);
        await session.commitTransaction();
        session.endSession();
        return await purchaseRepository.findByIdPopulated(purchase._id);
      } catch (txnError) {
        await session.abortTransaction();
        session.endSession();
        if (txnError.message?.includes('replica set member')) {
          logger.info('ℹ️ Standalone MongoDB detected. Executing purchase save without transaction session...');
          const purchase = await executeSave(null);
          return await purchaseRepository.findByIdPopulated(purchase._id);
        }
        throw txnError;
      }
    } catch (err) {
      if (err.message?.includes('replica set member')) {
        const purchase = await executeSave(null);
        return await purchaseRepository.findByIdPopulated(purchase._id);
      }
      throw err;
    }
  },

  // Soft-Delete Purchase Invoice with 90-Day Retention & Stock/Financial Safety
  async softDeletePurchase(id, userContext = {}, confirmation = '') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Purchase ID format', HTTP_STATUS.BAD_REQUEST);
    }
    if ((confirmation || '').toString().trim() !== 'DELETE') {
      throw new AppError('Invalid confirmation text. Must type DELETE exactly.', HTTP_STATUS.BAD_REQUEST);
    }

    const { Purchase } = await import('../models/purchase.model.js');
    const { PurchaseItem } = await import('../models/purchaseItem.model.js');
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');
    const { Product } = await import('../../products/models/product.model.js');
    const { SupplierLedger } = await import('../../suppliers/models/supplierLedger.model.js');
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');

    const purchase = await Purchase.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!purchase) {
      throw new AppError('Purchase record not found or already deleted', HTTP_STATUS.NOT_FOUND);
    }

    const items = await PurchaseItem.find({ purchaseId: purchase._id }).exec();

    // 1. Soft delete associated ProductBatch stock layers & reduce unconsumed stock from Product.totalStock
    for (const item of items) {
      if (item.batchId) {
        const batch = await ProductBatch.findById(item.batchId).exec();
        if (batch) {
          batch.isActive = false;
          batch.isDeleted = true;
          batch.deletedAt = new Date();
          await batch.save();

          const unconsumedStock = Math.max(0, Number(batch.currentStock || 0));
          if (unconsumedStock > 0 && item.productId) {
            const product = await Product.findById(item.productId).exec();
            if (product) {
              const currentTotal = Number(product.totalStock || 0);
              product.totalStock = Math.max(0, currentTotal - unconsumedStock);
              await product.save();
              logger.info(`📦 Reduced Product Master Stock for '${product.name}' by ${unconsumedStock} (Unconsumed stock of soft-deleted batch ${batch.batchNumber})`);
            }
          }
        }
      }
    }

    // 2. Mark Purchase header as soft-deleted
    purchase.isDeleted = true;
    purchase.isActive = false;
    purchase.deletedAt = new Date();
    purchase.deletedBy = userContext.name || userContext.userName || 'Admin';
    await purchase.save();

    // 3. Mark SupplierLedger entries (PURCHASE and PAYMENT) linked to this purchase as soft-deleted
    await SupplierLedger.updateMany(
      { purchaseId: purchase._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).exec();

    // 4. Recalculate Supplier Balance
    if (purchase.supplierId) {
      await supplierService.calculateSupplierBalance(purchase.supplierId);
    }

    logger.info(`🔒 Soft-deleted Purchase Invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} [${id}]`);

    return {
      success: true,
      message: `Purchase invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} soft-deleted successfully`,
      deletedPurchaseId: purchase._id,
    };
  },

  // Admin Restore Soft-Deleted Purchase Invoice
  async restorePurchase(id, userContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Purchase ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const { Purchase } = await import('../models/purchase.model.js');
    const { PurchaseItem } = await import('../models/purchaseItem.model.js');
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');
    const { Product } = await import('../../products/models/product.model.js');
    const { SupplierLedger } = await import('../../suppliers/models/supplierLedger.model.js');
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');

    const purchase = await Purchase.findOne({ _id: id, isDeleted: true }).exec();
    if (!purchase) {
      throw new AppError('Soft-deleted purchase invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    const items = await PurchaseItem.find({ purchaseId: purchase._id }).exec();

    // 1. Restore associated ProductBatch records & add unconsumed stock back to Product.totalStock
    for (const item of items) {
      if (item.batchId) {
        const batch = await ProductBatch.findById(item.batchId).exec();
        if (batch) {
          batch.isActive = true;
          batch.isDeleted = false;
          batch.deletedAt = null;
          await batch.save();

          const unconsumedStock = Math.max(0, Number(batch.currentStock || 0));
          if (unconsumedStock > 0 && item.productId) {
            const product = await Product.findById(item.productId).exec();
            if (product) {
              const currentTotal = Number(product.totalStock || 0);
              product.totalStock = currentTotal + unconsumedStock;
              await product.save();
              logger.info(`📦 Restored Product Master Stock for '${product.name}' by +${unconsumedStock} (Restored batch ${batch.batchNumber})`);
            }
          }
        }
      }
    }

    // 2. Restore Purchase header
    purchase.isDeleted = false;
    purchase.isActive = true;
    purchase.deletedAt = null;
    purchase.deletedBy = null;
    purchase.restoredAt = new Date();
    purchase.restoredBy = userContext.name || userContext.userName || 'Admin';
    await purchase.save();

    // 3. Restore SupplierLedger entries (PURCHASE and PAYMENT) linked to this purchase
    await SupplierLedger.updateMany(
      { purchaseId: purchase._id },
      { $set: { isDeleted: false, deletedAt: null } }
    ).exec();

    // 4. Recalculate Supplier Balance
    if (purchase.supplierId) {
      await supplierService.calculateSupplierBalance(purchase.supplierId);
    }

    logger.info(`🔓 Restored Purchase Invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} [${id}]`);

    return {
      success: true,
      message: `Purchase invoice #${purchase.purchaseNumber || purchase.supplierInvoiceNumber} restored successfully`,
      restoredPurchaseId: purchase._id,
    };
  },

  // Get Soft-Deleted Purchases for Admin Panel
  async getDeletedPurchases(query = {}) {
    const { Purchase } = await import('../models/purchase.model.js');
    const filter = { isDeleted: true };

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
