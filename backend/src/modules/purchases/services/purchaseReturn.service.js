import mongoose from 'mongoose';
import { PurchaseReturn } from '../models/purchaseReturn.model.js';
import { Purchase } from '../models/purchase.model.js';
import { PurchaseItem } from '../models/purchaseItem.model.js';
import { StockLedger } from '../models/stockLedger.model.js';
import { Product } from '../../products/models/product.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { SupplierLedger } from '../../suppliers/models/supplierLedger.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';
import { parseTransactionTimestamp } from '../../../utils/dateUtils.js';

export const purchaseReturnService = {
  /**
   * Get purchase history for a product to auto-determine supplier and invoice details.
   */
  async getPurchaseHistoryForReturn(productId, userId = null) {
    if (!productId) {
      throw new AppError('Product ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const productQuery = userId ? { _id: productId, userId } : { _id: productId };
    let product = await Product.findOne(productQuery).lean();
    if (!product) {
      product = await Product.findById(productId).lean();
    }
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    // Find all purchase items for this product
    const purchaseItemQuery = { productId };
    if (userId) {
      purchaseItemQuery.userId = userId;
    }
    const purchaseItems = await PurchaseItem.find(purchaseItemQuery)
      .populate({
        path: 'purchaseId',
        populate: { path: 'supplierId', select: 'name companyName mobile outstandingBalance' },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!purchaseItems || purchaseItems.length === 0) {
      // Fallback: If product was created directly without a purchase invoice
      // Try to fallback to supplier attached via brand/company if any, or default values
      const defaultSupplier = product.brandId
        ? await Supplier.findById(product.brandId).lean()
        : null;

      const fallbackInvoice = {
        purchaseId: null,
        purchaseItemId: null,
        purchaseNumber: 'DIRECT-STOCK',
        supplierInvoiceNumber: 'INIT-STOCK-001',
        purchaseDate: product.createdAt || new Date(),
        supplierId: defaultSupplier ? defaultSupplier._id : null,
        supplierName: defaultSupplier ? defaultSupplier.name : 'Primary Supplier',
        supplierCompany: defaultSupplier ? defaultSupplier.companyName : '',
        currentOutstanding: defaultSupplier ? Number(defaultSupplier.outstandingBalance || 0) : 0,
        purchaseQuantity: Number(product.totalStock || 0),
        returnedQuantity: 0,
        availableReturnQuantity: Number(product.totalStock || 0),
        purchasePrice: Number(product.defaultPurchaseRate || 0),
      };

      return {
        product: {
          _id: product._id,
          name: product.name,
          currentStock: Number(product.totalStock || 0),
          defaultPurchaseRate: Number(product.defaultPurchaseRate || 0),
        },
        hasSingleSupplier: true,
        matchingInvoices: [fallbackInvoice],
        selectedInvoice: fallbackInvoice,
      };
    }

    // Calculate previously returned quantities per purchaseId + productId
    const returnAgg = await PurchaseReturn.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), ...(userId ? { userId: new mongoose.Types.ObjectId(userId) } : {}) } },
      { $group: { _id: '$purchaseId', totalReturned: { $sum: '$quantity' } } },
    ]);

    const returnMap = {};
    returnAgg.forEach((r) => {
      if (r._id) returnMap[r._id.toString()] = r.totalReturned;
    });

    const invoiceOptions = [];
    const uniqueSuppliers = new Set();

    for (const item of purchaseItems) {
      const purchase = item.purchaseId;
      if (!purchase) continue;

      const supplier = purchase.supplierId;
      const supplierIdStr = supplier?._id?.toString() || '';
      if (supplierIdStr) uniqueSuppliers.add(supplierIdStr);

      const purchaseIdStr = purchase._id.toString();
      const previousReturned = returnMap[purchaseIdStr] || 0;
      const purchasedQty = Number(item.quantity) || 0;
      const availableReturnQty = Math.max(0, purchasedQty - previousReturned);

      invoiceOptions.push({
        purchaseId: purchase._id,
        purchaseItemId: item._id,
        purchaseNumber: purchase.purchaseNumber,
        supplierInvoiceNumber: purchase.supplierInvoiceNumber,
        purchaseDate: purchase.purchaseDate || purchase.createdAt,
        supplierId: supplier?._id || null,
        supplierName: supplier?.name || 'Unknown Supplier',
        supplierCompany: supplier?.companyName || '',
        currentOutstanding: Number(supplier?.outstandingBalance || 0),
        purchaseQuantity: purchasedQty,
        returnedQuantity: previousReturned,
        availableReturnQuantity: availableReturnQty,
        purchasePrice: Number(item.purchaseRate || product.defaultPurchaseRate || 0),
        batchId: item.batchId || null,
        batchNumber: item.batchNumber || null,
      });
    }

    const hasSingleSupplier = uniqueSuppliers.size <= 1 && invoiceOptions.length === 1;
    const selectedInvoice = invoiceOptions.length > 0 ? invoiceOptions[0] : null;

    return {
      product: {
        _id: product._id,
        name: product.name,
        currentStock: Number(product.totalStock || 0),
        defaultPurchaseRate: Number(product.defaultPurchaseRate || 0),
      },
      hasSingleSupplier,
      matchingInvoices: invoiceOptions,
      selectedInvoice,
    };
  },

  /**
   * Process Supplier Return: deduct stock, update supplier balance, create ledger entries.
   */
  async processSupplierReturn(data, authUserId = null) {
    const {
      productId,
      purchaseId,
      quantity,
      reason = 'Defective batch packaging',
      notes = '',
      createdBy = 'Ramesh Kumar',
      paymentMode = 'Cash',
      refundReference = '',
    } = data;

    const userId = authUserId || data.userId;
    if (!userId) {
      throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const returnQtyNum = Number(quantity);
    if (!productId) {
      throw new AppError('Product ID is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!returnQtyNum || returnQtyNum <= 0) {
      throw new AppError('Return quantity must be greater than 0', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Verify Product & Stock
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    const currentProductStock = Number(product.totalStock || 0);
    if (returnQtyNum > currentProductStock) {
      throw new AppError(
        `Return quantity (${returnQtyNum}) cannot exceed current available stock (${currentProductStock})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 2. Determine Purchase & PurchaseItem (or fallback)
    let purchase = null;
    let purchaseItem = null;
    let purchasePrice = Number(product.defaultPurchaseRate || 0);
    let supplierId = data.supplierId || null;

    if (purchaseId) {
      purchase = await Purchase.findById(purchaseId).populate('supplierId');
      if (purchase) {
        supplierId = purchase.supplierId?._id || purchase.supplierId || supplierId;
        purchaseItem = await PurchaseItem.findOne({ purchaseId, productId });
        if (purchaseItem && purchaseItem.purchaseRate > 0) {
          purchasePrice = Number(purchaseItem.purchaseRate);
        }
      }
    }

    // If purchase not specified or not found, try to locate latest purchase item for this product
    if (!purchaseItem && !supplierId) {
      purchaseItem = await PurchaseItem.findOne({ productId, ...(userId ? { userId } : {}) })
        .populate({ path: 'purchaseId', populate: { path: 'supplierId' } })
        .sort({ createdAt: -1 });

      if (purchaseItem) {
        purchase = purchaseItem.purchaseId;
        supplierId = purchase?.supplierId?._id || purchase?.supplierId;
        purchasePrice = Number(purchaseItem.purchaseRate || purchasePrice);
      }
    }

    // Fallback supplier if still null
    if (!supplierId) {
      const defaultSupplier = product.brandId
        ? await Supplier.findById(product.brandId)
        : await Supplier.findOne(userId ? { userId } : {});
      supplierId = defaultSupplier?._id;
    }

    if (!supplierId) {
      throw new AppError('No supplier found for this return', HTTP_STATUS.BAD_REQUEST);
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    // Check purchase-specific available return quantity if purchase is linked
    if (purchaseItem) {
      const existingReturns = await PurchaseReturn.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(productId),
            purchaseId: purchaseItem.purchaseId?._id || purchaseItem.purchaseId,
          },
        },
        { $group: { _id: null, totalReturned: { $sum: '$quantity' } } },
      ]);
      const prevReturned = existingReturns[0]?.totalReturned || 0;
      const availableFromInvoice = Number(purchaseItem.quantity) - prevReturned;

      if (availableFromInvoice > 0 && returnQtyNum > availableFromInvoice) {
        throw new AppError(
          `Return quantity (${returnQtyNum}) exceeds available return quantity (${availableFromInvoice}) from invoice ${purchase?.supplierInvoiceNumber || ''}`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    // Calculate Return Value at ORIGINAL Purchase Price
    const returnValue = normalizeMoney(returnQtyNum * purchasePrice);

    // Settlement Breakdown: Full Credit vs Full Refund vs Partial Refund
    const rawRefundAmount = Number(data.refundAmount) || 0;
    if (rawRefundAmount < 0) {
      throw new AppError('Refund amount cannot be negative', HTTP_STATUS.BAD_REQUEST);
    }
    if (rawRefundAmount > returnValue) {
      throw new AppError('Refund amount cannot exceed total return value', HTTP_STATUS.BAD_REQUEST);
    }

    const refundAmount = normalizeMoney(rawRefundAmount);
    let settlementType = data.settlementType;
    if (!settlementType) {
      if (refundAmount === 0) settlementType = 'CREDIT';
      else if (refundAmount >= returnValue) settlementType = 'REFUND';
      else settlementType = 'PARTIAL_REFUND';
    }

    const refundedAmount = refundAmount;
    const refundStatus = refundAmount === 0
      ? 'PENDING_REFUND'
      : (refundAmount >= returnValue ? 'REFUNDED' : 'PARTIALLY_REFUNDED');

    const creditAmount = normalizeMoney(Math.max(0, returnValue - refundAmount));

    // Determine effective return and refund dates
    const effectiveReturnDate = parseTransactionTimestamp(data.returnDate || data.date);
    const effectiveRefundDate = data.refundDate ? parseTransactionTimestamp(data.refundDate) : effectiveReturnDate;

    // Generate Return Number
    const count = await PurchaseReturn.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const returnNumber = `RET-${dateStr}-${String(count + 1).padStart(5, '0')}`;
    const initialRefundNumber = refundAmount > 0 ? `REF-${dateStr}-${String(count + 1).padStart(5, '0')}` : '';

    const initialRefundsList = refundAmount > 0 ? [{
      refundNumber: initialRefundNumber,
      amount: refundAmount,
      paymentMode,
      referenceNumber: refundReference,
      notes: notes ? `Initial Refund: ${notes}` : `Refund at return creation`,
      date: effectiveRefundDate,
      createdAt: new Date(),
    }] : [];

    // Execute atomic save operations
    const executeSave = async (session = null) => {
      // (A) Create Purchase Return Record
      const returnDoc = new PurchaseReturn({
        userId,
        returnNumber,
        supplierId,
        purchaseId: purchase?._id || null,
        purchaseItemId: purchaseItem?._id || null,
        productId,
        batchId: purchaseItem?.batchId || null,
        quantity: returnQtyNum,
        purchasePrice,
        returnValue,
        settlementType,
        refundAmount,
        refundedAmount,
        refundStatus,
        refunds: initialRefundsList,
        paymentMode,
        refundReference,
        reason,
        notes,
        returnDate: effectiveReturnDate,
        createdBy,
      });

      if (session) await returnDoc.save({ session });
      else await returnDoc.save();

      logger.info(`✅ Created Purchase Return Record ${returnNumber} (Total: ₹${returnValue}, Refunded: ₹${refundedAmount}, Status: ${refundStatus})`);

      // (B) Deduct Physical Stock from Product Master & Batch
      const prevStock = currentProductStock;
      const newStock = Math.max(0, prevStock - returnQtyNum);

      if (session) {
        await Product.findByIdAndUpdate(productId, { totalStock: newStock }, { session });
      } else {
        await Product.findByIdAndUpdate(productId, { totalStock: newStock });
      }

      let remainingBatchQtyToDeduct = returnQtyNum;

      if (purchaseItem?.batchId) {
        const targetBatch = await ProductBatch.findById(purchaseItem.batchId);
        if (targetBatch && targetBatch.currentStock > 0) {
          const deductFromThis = Math.min(targetBatch.currentStock, remainingBatchQtyToDeduct);
          const updatedStock = targetBatch.currentStock - deductFromThis;
          if (session) {
            await ProductBatch.findByIdAndUpdate(targetBatch._id, { currentStock: updatedStock, isActive: updatedStock > 0 }, { session });
          } else {
            await ProductBatch.findByIdAndUpdate(targetBatch._id, { currentStock: updatedStock, isActive: updatedStock > 0 });
          }
          remainingBatchQtyToDeduct -= deductFromThis;
        }
      }

      if (remainingBatchQtyToDeduct > 0) {
        const activeBatches = await ProductBatch.find({
          userId,
          productId,
          isDeleted: { $ne: true },
          currentStock: { $gt: 0 },
        }).sort({ createdAt: 1 });

        for (const b of activeBatches) {
          if (remainingBatchQtyToDeduct <= 0) break;
          if (purchaseItem?.batchId && b._id.toString() === purchaseItem.batchId.toString()) continue;
          const deductQty = Math.min(b.currentStock, remainingBatchQtyToDeduct);
          const updatedStock = b.currentStock - deductQty;
          if (session) {
            await ProductBatch.findByIdAndUpdate(b._id, { currentStock: updatedStock, isActive: updatedStock > 0 }, { session });
          } else {
            await ProductBatch.findByIdAndUpdate(b._id, { currentStock: updatedStock, isActive: updatedStock > 0 });
          }
          remainingBatchQtyToDeduct -= deductQty;
        }
      }

      logger.info(`✅ Deducted Product Stock for '${product.name}': ${prevStock} -> ${newStock}`);

      // (C) If linked to a purchase, update purchase.returnAmount and purchase.dueAmount
      if (purchase) {
        const prevReturnAmt = Number(purchase.returnAmount || 0);
        const newReturnAmt = normalizeMoney(prevReturnAmt + returnValue);
        const newDue = Math.max(
          0,
          normalizeMoney(Number(purchase.totalInvoiceAmount || 0) - Number(purchase.advanceUsed || 0) - Number(purchase.paidAmount || 0) - newReturnAmt)
        );
        purchase.returnAmount = newReturnAmt;
        purchase.dueAmount = newDue;
        if (session) {
          await purchase.save({ session });
        } else {
          await purchase.save();
        }
      }

      // (D) Create Supplier Ledger Entry (RETURN)
      const returnLedgerData = {
        userId,
        supplierId,
        purchaseId: purchase?._id || null,
        returnId: returnDoc._id,
        transactionType: 'RETURN',
        purchaseAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        returnAmount: returnValue,
        refundAmount: 0,
        settlementType,
        paymentMode,
        runningBalance: 0,
        referenceNumber: returnNumber,
        notes: `Supplier Return (${returnNumber}) for '${product.name}' [Qty: ${returnQtyNum} @ ₹${purchasePrice}]${notes ? ' | ' + notes : ''}`,
        date: effectiveReturnDate,
      };

      await SupplierLedger.create([returnLedgerData], session ? { session } : {});
      logger.info(`✅ Created Supplier Ledger RETURN Entry for ${returnNumber} (Credit: ₹${returnValue})`);

      // (D2) If immediate refund received, create separate REFUND transaction
      if (refundAmount > 0) {
        const refundLedgerData = {
          userId,
          supplierId,
          purchaseId: purchase?._id || null,
          returnId: returnDoc._id,
          transactionType: 'REFUND',
          purchaseAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          returnAmount: 0,
          refundAmount,
          settlementType,
          paymentMode,
          runningBalance: 0,
          referenceNumber: initialRefundNumber,
          notes: `Supplier Refund of ₹${refundAmount.toLocaleString('en-IN')} received via ${paymentMode}${refundReference ? ' (Ref: ' + refundReference + ')' : ''} for Return #${returnNumber}`,
          date: effectiveRefundDate,
        };

        await SupplierLedger.create([refundLedgerData], session ? { session } : {});
        logger.info(`✅ Created Supplier Ledger REFUND Entry for ${initialRefundNumber} (Refund: ₹${refundAmount})`);
      }

      // (E) Recalculate Supplier Balance accurately
      const { supplierService } = await import('../../suppliers/services/supplier.service.js');
      const newSupplierOutstanding = await supplierService.calculateSupplierBalance(supplierId, userId);

      // (F) Create Inventory Stock Ledger Entry (RETURN audit)
      const stockLedgerData = {
        userId,
        transactionType: 'PURCHASE_RETURN',
        referenceId: returnDoc._id,
        referenceNumber: returnNumber,
        productId,
        supplierId: supplier._id,
        batchId: purchaseItem?.batchId || null,
        batchNumber: purchaseItem?.batchNumber || '',
        quantity: -returnQtyNum,
        purchaseRate: purchasePrice,
        previousStock: prevStock,
        currentStock: newStock,
        reason: reason || 'Supplier return',
        notes: notes || '',
        createdBy,
        timestamp: new Date(),
      };

      await StockLedger.create([stockLedgerData], session ? { session } : {});
      logger.info(`✅ Created Inventory Stock Ledger Audit Entry`);

      return {
        returnRecord: returnDoc,
        returnNumber,
        returnValue,
        refundAmount,
        refundedAmount,
        refundStatus,
        creditAmount,
        settlementType,
        paymentMode,
        previousStock: prevStock,
        currentStock: newStock,
        newOutstanding: newSupplierOutstanding,
        supplierName: supplier.name,
        productName: product.name,
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
        if (txnErr.message?.includes('replica set member') || txnErr.message?.includes('Transactions are not supported')) {
          return await executeSave(null);
        }
        throw txnErr;
      }
    } catch (err) {
      if (err.message?.includes('replica set member') || err.message?.includes('Transactions are not supported')) {
        return await executeSave(null);
      }
      throw err;
    }
  },

  /**
   * Record a Supplier Refund for an existing Return record (full or partial).
   */
  async recordSupplierRefund(returnId, refundData, userId) {
    if (!userId) throw new Error('userId is required');
    if (!returnId || !mongoose.Types.ObjectId.isValid(returnId)) {
      throw new AppError('Invalid Return ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const returnDoc = await PurchaseReturn.findOne({ _id: returnId, userId }).populate('supplierId').populate('productId');
    if (!returnDoc) {
      throw new AppError('Purchase Return record not found', HTTP_STATUS.NOT_FOUND);
    }

    const amount = Number(refundData.amount) || 0;
    if (amount <= 0) {
      throw new AppError('Refund amount must be greater than zero', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if supplier credit from this return was already utilized in subsequent purchases
    const supplierId = returnDoc.supplierId?._id || returnDoc.supplierId;
    const [allSupplierReturns, allSupplierPurchases] = await Promise.all([
      PurchaseReturn.find({ supplierId, userId }).sort({ returnDate: 1, createdAt: 1 }).lean(),
      Purchase.find({ supplierId, userId, advanceUsed: { $gt: 0 } }).sort({ purchaseDate: 1, createdAt: 1 }).lean(),
    ]);

    let totalAdvanceConsumed = allSupplierPurchases.reduce((acc, p) => acc + (Number(p.advanceUsed) || 0), 0);

    let creditUsedForThisReturn = 0;
    for (const ret of allSupplierReturns) {
      const unrefundedOnRet = Math.max(0, (Number(ret.returnValue) || 0) - (Number(ret.refundedAmount) || 0));
      const used = Math.min(unrefundedOnRet, totalAdvanceConsumed);
      totalAdvanceConsumed = Math.max(0, totalAdvanceConsumed - used);

      if (ret._id.toString() === returnDoc._id.toString()) {
        creditUsedForThisReturn = used;
        break;
      }
    }

    const unrefundedCredit = normalizeMoney(Math.max(0, returnDoc.returnValue - Number(returnDoc.refundedAmount || 0) - creditUsedForThisReturn));

    if (unrefundedCredit <= 0) {
      if (creditUsedForThisReturn > 0) {
        throw new AppError('Supplier credit already used — refund not available', HTTP_STATUS.BAD_REQUEST);
      }
      throw new AppError('This return has already been fully refunded', HTTP_STATUS.BAD_REQUEST);
    }

    if (amount > unrefundedCredit) {
      throw new AppError(
        `Refund amount (₹${amount}) exceeds remaining available return credit (₹${unrefundedCredit})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refundCount = (returnDoc.refunds || []).length + 1;
    const refundNumber = `REF-${dateStr}-${returnDoc.returnNumber.slice(-5)}-${refundCount}`;

    const newRefundedTotal = normalizeMoney(Number(returnDoc.refundedAmount || 0) + amount);
    const newRefundStatus = newRefundedTotal >= returnDoc.returnValue ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    const effectiveRefundDate = parseTransactionTimestamp(refundData.date);

    returnDoc.refundedAmount = newRefundedTotal;
    returnDoc.refundAmount = newRefundedTotal;
    returnDoc.refundStatus = newRefundStatus;
    if (!returnDoc.refunds) returnDoc.refunds = [];
    returnDoc.refunds.push({
      refundNumber,
      amount,
      paymentMode: refundData.paymentMode || 'Cash',
      referenceNumber: refundData.referenceNumber || '',
      notes: refundData.notes || '',
      date: effectiveRefundDate,
      createdAt: new Date(),
    });
    await returnDoc.save();

    // Create separate REFUND entry in SupplierLedger
    const refundLedgerData = {
      userId,
      supplierId: returnDoc.supplierId?._id || returnDoc.supplierId,
      purchaseId: returnDoc.purchaseId || null,
      returnId: returnDoc._id,
      transactionType: 'REFUND',
      purchaseAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      returnAmount: 0,
      refundAmount: amount,
      settlementType: returnDoc.settlementType,
      paymentMode: refundData.paymentMode || 'Cash',
      runningBalance: 0,
      referenceNumber: refundNumber,
      notes: `Supplier Refund of ₹${amount.toLocaleString('en-IN')} received via ${refundData.paymentMode || 'Cash'}${refundData.referenceNumber ? ' (Ref: ' + refundData.referenceNumber + ')' : ''} for Return #${returnDoc.returnNumber}`,
      date: effectiveRefundDate,
    };

    await SupplierLedger.create(refundLedgerData);
    logger.info(`✅ Recorded Supplier Refund #${refundNumber} for Return #${returnDoc.returnNumber}: ₹${amount}`);

    // Recalculate Supplier Balance
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');
    const updatedBalance = await supplierService.calculateSupplierBalance(returnDoc.supplierId?._id || returnDoc.supplierId, userId);

    return {
      success: true,
      message: `Supplier refund of ₹${amount.toLocaleString('en-IN')} recorded successfully`,
      refundNumber,
      refundedAmount: newRefundedTotal,
      unrefundedCredit: normalizeMoney(returnDoc.returnValue - newRefundedTotal),
      refundStatus: newRefundStatus,
      updatedSupplierBalance: updatedBalance,
      returnDoc,
    };
  },

  /**
   * Update / Edit a Supplier Return record safely and recalculate stock and ledger.
   */
  async updateSupplierReturn(returnId, updateData, userId) {
    if (!userId) throw new Error('userId is required');
    if (!returnId || !mongoose.Types.ObjectId.isValid(returnId)) {
      throw new AppError('Invalid Return ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const returnDoc = await PurchaseReturn.findOne({ _id: returnId, userId }).populate('productId');
    if (!returnDoc) {
      throw new AppError('Purchase Return record not found', HTTP_STATUS.NOT_FOUND);
    }

    const oldQty = Number(returnDoc.quantity) || 0;
    const newQty = updateData.quantity !== undefined ? Number(updateData.quantity) : oldQty;
    const oldPrice = Number(returnDoc.purchasePrice) || 0;
    const newPrice = updateData.purchasePrice !== undefined ? Number(updateData.purchasePrice) : oldPrice;

    if (newQty <= 0) {
      throw new AppError('Return quantity must be greater than zero', HTTP_STATUS.BAD_REQUEST);
    }

    const newReturnValue = normalizeMoney(newQty * newPrice);
    const refundedAlready = Number(returnDoc.refundedAmount || 0);

    if (newReturnValue < refundedAlready) {
      throw new AppError(
        `Cannot reduce return value to ₹${newReturnValue} because ₹${refundedAlready} has already been refunded to bank/cash. Reverse refunds first.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Check credit usage in purchases
    const supplierId = returnDoc.supplierId?._id || returnDoc.supplierId;
    const [allSupplierReturns, allSupplierPurchases] = await Promise.all([
      PurchaseReturn.find({ supplierId, userId }).sort({ returnDate: 1, createdAt: 1 }).lean(),
      Purchase.find({ supplierId, userId, advanceUsed: { $gt: 0 } }).sort({ purchaseDate: 1, createdAt: 1 }).lean(),
    ]);

    let totalAdvanceConsumed = allSupplierPurchases.reduce((acc, p) => acc + (Number(p.advanceUsed) || 0), 0);
    let creditUsedForThisReturn = 0;
    for (const ret of allSupplierReturns) {
      const unrefundedOnRet = Math.max(0, (Number(ret.returnValue) || 0) - (Number(ret.refundedAmount) || 0));
      const used = Math.min(unrefundedOnRet, totalAdvanceConsumed);
      totalAdvanceConsumed = Math.max(0, totalAdvanceConsumed - used);

      if (ret._id.toString() === returnDoc._id.toString()) {
        creditUsedForThisReturn = used;
        break;
      }
    }

    if (newReturnValue < creditUsedForThisReturn) {
      throw new AppError(
        `Cannot reduce return value to ₹${newReturnValue} because ₹${creditUsedForThisReturn} has already been utilized as advance in subsequent purchases.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Adjust physical stock difference if quantity changed
    const deltaQty = newQty - oldQty;
    if (deltaQty !== 0 && returnDoc.productId) {
      const product = await Product.findOne({ _id: returnDoc.productId._id || returnDoc.productId, userId });
      if (product) {
        const currentStock = Number(product.totalStock || 0);
        if (deltaQty > 0 && deltaQty > currentStock) {
          throw new AppError(`Cannot return additional ${deltaQty} units because only ${currentStock} are available in stock`, HTTP_STATUS.BAD_REQUEST);
        }
        product.totalStock = Math.max(0, currentStock - deltaQty);
        await product.save();
      }
    }

    returnDoc.quantity = newQty;
    returnDoc.purchasePrice = newPrice;
    returnDoc.returnValue = newReturnValue;
    if (updateData.reason) returnDoc.reason = updateData.reason;
    if (updateData.notes !== undefined) returnDoc.notes = updateData.notes;
    returnDoc.refundStatus = refundedAlready === 0
      ? 'PENDING_REFUND'
      : (refundedAlready >= newReturnValue ? 'REFUNDED' : 'PARTIALLY_REFUNDED');

    await returnDoc.save();

    // Update corresponding RETURN ledger entry
    await SupplierLedger.findOneAndUpdate(
      { userId, returnId: returnDoc._id, transactionType: 'RETURN' },
      {
        returnAmount: newReturnValue,
        notes: `Supplier Return (${returnDoc.returnNumber}) for '${returnDoc.productId?.name || 'Product'}' [Qty: ${newQty} @ ₹${newPrice}]${returnDoc.notes ? ' | ' + returnDoc.notes : ''}`,
      }
    );

    // If linked to a purchase, update purchase.returnAmount
    if (returnDoc.purchaseId) {
      const allReturnsForPurchase = await PurchaseReturn.find({ userId, purchaseId: returnDoc.purchaseId });
      const totalPurchaseReturns = allReturnsForPurchase.reduce((sum, r) => sum + Number(r.returnValue || 0), 0);
      const { Purchase } = await import('../models/purchase.model.js');
      const purchase = await Purchase.findOne({ _id: returnDoc.purchaseId, userId });
      if (purchase) {
        purchase.returnAmount = normalizeMoney(totalPurchaseReturns);
        purchase.dueAmount = Math.max(
          0,
          normalizeMoney(Number(purchase.totalInvoiceAmount || 0) - Number(purchase.advanceUsed || 0) - Number(purchase.paidAmount || 0) - totalPurchaseReturns)
        );
        await purchase.save();
      }
    }

    // Recalculate Supplier Balance
    const { supplierService } = await import('../../suppliers/services/supplier.service.js');
    const updatedBalance = await supplierService.calculateSupplierBalance(returnDoc.supplierId, userId);

    return {
      success: true,
      message: 'Supplier return updated successfully',
      returnDoc,
      updatedBalance,
    };
  },

  /**
   * Get single Return details by ID
   */
  async getReturnById(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Return ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const returnDoc = await PurchaseReturn.findOne({ _id: id, userId })
      .populate('productId', 'name brandId categoryId defaultPurchaseRate totalStock')
      .populate('supplierId', 'name companyName mobile outstandingBalance address gstin')
      .populate('purchaseId', 'purchaseNumber supplierInvoiceNumber purchaseDate totalInvoiceAmount paidAmount dueAmount')
      .lean();

    if (!returnDoc) {
      throw new AppError('Purchase Return record not found', HTTP_STATUS.NOT_FOUND);
    }

    return returnDoc;
  },

  /**
   * Get all supplier returns audit history
   */
  async getAllReturns(userId = null) {
    const filter = userId ? { userId } : {};
    const returns = await PurchaseReturn.find(filter)
      .populate('productId', 'name brandId categoryId')
      .populate('supplierId', 'name companyName mobile outstandingBalance')
      .populate('purchaseId', 'purchaseNumber supplierInvoiceNumber purchaseDate')
      .sort({ returnDate: -1, createdAt: -1 })
      .lean();

    return returns;
  },
};

