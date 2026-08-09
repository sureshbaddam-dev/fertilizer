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

export const purchaseReturnService = {
  /**
   * Get purchase history for a product to auto-determine supplier and invoice details.
   */
  async getPurchaseHistoryForReturn(productId) {
    if (!productId) {
      throw new AppError('Product ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    }

    // Find all purchase items for this product
    const purchaseItems = await PurchaseItem.find({ productId })
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
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
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
  async processSupplierReturn(data) {
    const {
      productId,
      purchaseId,
      quantity,
      reason = 'Defective batch packaging',
      notes = '',
      createdBy = 'Ramesh Kumar',
    } = data;

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
    let supplierId = null;

    if (purchaseId) {
      purchase = await Purchase.findById(purchaseId).populate('supplierId');
      if (purchase) {
        supplierId = purchase.supplierId?._id || purchase.supplierId;
        purchaseItem = await PurchaseItem.findOne({ purchaseId, productId });
        if (purchaseItem && purchaseItem.purchaseRate > 0) {
          purchasePrice = Number(purchaseItem.purchaseRate);
        }
      }
    }

    // If purchase not specified or not found, try to locate latest purchase item for this product
    if (!purchaseItem) {
      purchaseItem = await PurchaseItem.findOne({ productId })
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
      const defaultSupplier = product.brandId ? await Supplier.findById(product.brandId) : await Supplier.findOne();
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
    const returnValue = returnQtyNum * purchasePrice;

    // Generate Return Number
    const count = await PurchaseReturn.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const returnNumber = `RET-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // Execute atomic save operations
    const executeSave = async (session = null) => {
      // (A) Create Purchase Return Record
      const returnDoc = new PurchaseReturn({
        returnNumber,
        supplierId,
        purchaseId: purchase?._id || null,
        purchaseItemId: purchaseItem?._id || null,
        productId,
        batchId: purchaseItem?.batchId || null,
        quantity: returnQtyNum,
        purchasePrice,
        returnValue,
        reason,
        notes,
        returnDate: new Date(),
        createdBy,
      });

      if (session) await returnDoc.save({ session });
      else await returnDoc.save();

      logger.info(`✅ Created Purchase Return Record ${returnNumber} (-₹${returnValue})`);

      // (B) Deduct Physical Stock from Product Master & Batch
      const prevStock = currentProductStock;
      const newStock = Math.max(0, prevStock - returnQtyNum);

      if (session) {
        await Product.findByIdAndUpdate(productId, { totalStock: newStock }, { session });
      } else {
        await Product.findByIdAndUpdate(productId, { totalStock: newStock });
      }

      if (purchaseItem?.batchId) {
        const batch = await ProductBatch.findById(purchaseItem.batchId);
        if (batch) {
          const newBatchStock = Math.max(0, (batch.currentStock || 0) - returnQtyNum);
          if (session) {
            await ProductBatch.findByIdAndUpdate(purchaseItem.batchId, { currentStock: newBatchStock }, { session });
          } else {
            await ProductBatch.findByIdAndUpdate(purchaseItem.batchId, { currentStock: newBatchStock });
          }
        }
      }

      logger.info(`✅ Deducted Product Stock for '${product.name}': ${prevStock} -> ${newStock}`);

      // (C) Reduce Supplier Outstanding Balance
      const currentSupplierOutstanding = Number(supplier.outstandingBalance || 0);
      const newSupplierOutstanding = currentSupplierOutstanding - returnValue;

      if (session) {
        await Supplier.findByIdAndUpdate(supplierId, { outstandingBalance: newSupplierOutstanding }, { session });
      } else {
        await Supplier.findByIdAndUpdate(supplierId, { outstandingBalance: newSupplierOutstanding });
      }

      logger.info(
        `✅ Updated Supplier Outstanding Balance for '${supplier.name}': ₹${currentSupplierOutstanding} -> ₹${newSupplierOutstanding}`
      );

      // (D) Create Supplier Ledger Entry (RETURN / ADJUSTMENT)
      const supplierLedgerData = {
        supplierId,
        purchaseId: purchase?._id || null,
        transactionType: 'RETURN',
        purchaseAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        runningBalance: newSupplierOutstanding,
        referenceNumber: returnNumber,
        notes: `Supplier Return (${returnNumber}) for product '${product.name}' [Qty: ${returnQtyNum} @ ₹${purchasePrice}]: ${reason}`,
        date: new Date(),
      };

      await SupplierLedger.create([supplierLedgerData], session ? { session } : {});
      logger.info(`✅ Created Supplier Ledger Return Entry (-₹${returnValue})`);

      // (E) Create Inventory Stock Ledger Entry (RETURN audit)
      const stockLedgerData = {
        transactionType: 'RETURN',
        referenceId: returnDoc._id,
        productId,
        batchId: purchaseItem?.batchId || null,
        quantity: -returnQtyNum,
        previousStock: prevStock,
        currentStock: newStock,
        createdBy,
        timestamp: new Date(),
      };

      await StockLedger.create([stockLedgerData], session ? { session } : {});
      logger.info(`✅ Created Inventory Stock Ledger Audit Entry`);

      return {
        returnRecord: returnDoc,
        returnNumber,
        returnValue,
        previousStock: prevStock,
        currentStock: newStock,
        previousOutstanding: currentSupplierOutstanding,
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

  /**
   * Get all supplier returns audit history
   */
  async getAllReturns() {
    const returns = await PurchaseReturn.find()
      .populate('productId', 'name brandId categoryId')
      .populate('supplierId', 'name companyName mobile outstandingBalance')
      .populate('purchaseId', 'purchaseNumber supplierInvoiceNumber purchaseDate')
      .sort({ returnDate: -1 })
      .lean();

    return returns;
  },
};
