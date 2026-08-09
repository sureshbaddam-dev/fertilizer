import mongoose from 'mongoose';
import { Supplier } from '../models/supplier.model.js';
import { supplierRepository } from '../repositories/supplier.repository.js';
import { SupplierLedger } from '../models/supplierLedger.model.js';
import { PurchaseItem } from '../../purchases/models/purchaseItem.model.js';
import { baseMasterService } from '../../../common/baseMaster.service.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const supplierService = {

  async getAllSuppliers(query = {}) {
    const filter = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { companyName: { $regex: query.search, $options: 'i' } },
        { mobile: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status === 'active') filter.isActive = true;
    if (query.status === 'inactive') filter.isActive = false;

    const sort = { name: 1 };
    const suppliersDocs = await supplierRepository.findAll(filter, { sort });

    let overallOutstanding = 0;
    let overallPurchases = 0;
    let overallPayments = 0;

    const enrichedSuppliers = await Promise.all(
      suppliersDocs.map(async (sup) => {
        const supObj = sup.toObject ? sup.toObject() : { ...sup };
        const sId = supObj._id;

        let ledger = [];
        try {
          ledger = await SupplierLedger.find({ supplierId: sId, isDeleted: { $ne: true } }).sort({ date: -1 }).exec();
        } catch (err) {
          logger.error({ err }, `Failed to fetch ledger for supplier ${sId}`);
          ledger = [];
        }

        let supTotalPurchases = 0;
        let supTotalPayments = 0;
        let lastPurchaseDate = null;
        let lastPaymentDate = null;
        let lastPaymentAmount = 0;

        ledger.forEach((item) => {
          if (item.transactionType === 'PURCHASE') {
            supTotalPurchases += Number(item.purchaseAmount) || 0;
            if (!lastPurchaseDate) lastPurchaseDate = item.date;
          } else if (item.transactionType === 'PAYMENT') {
            supTotalPayments += Number(item.paidAmount) || 0;
            if (!lastPaymentDate) {
              lastPaymentDate = item.date;
              lastPaymentAmount = Number(item.paidAmount) || 0;
            }
          }
        });

        const due = Number(supObj.outstandingBalance) || 0;
        overallOutstanding += due;
        overallPurchases += supTotalPurchases;
        overallPayments += supTotalPayments;

        return {
          ...supObj,
          totalPurchases: supTotalPurchases,
          totalPayments: supTotalPayments,
          lastPurchaseDate,
          lastPaymentDate,
          lastPaymentAmount,
        };
      })
    );

    let finalSuppliers = enrichedSuppliers;
    if (query.status === 'outstanding') {
      finalSuppliers = enrichedSuppliers.filter((s) => (s.outstandingBalance || 0) > 0);
    } else if (query.status === 'nodue') {
      finalSuppliers = enrichedSuppliers.filter((s) => (s.outstandingBalance || 0) <= 0);
    }

    const activeCount = enrichedSuppliers.filter((s) => s.isActive !== false).length;
    const inactiveCount = enrichedSuppliers.filter((s) => s.isActive === false).length;

    return {
      suppliers: finalSuppliers,
      total: finalSuppliers.length,
      summaryStats: {
        totalSuppliers: enrichedSuppliers.length,
        activeSuppliers: activeCount,
        inactiveSuppliers: inactiveCount,
        totalOutstandingDue: overallOutstanding,
        totalPurchasesAmount: overallPurchases,
        totalPaymentsAmount: overallPayments,
      },
    };
  },

  async getSupplierById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }
    return supplier;
  },

  async createSupplier(data) {
    const existing = await supplierRepository.findByName(data.name);
    if (existing) {
      throw new AppError(`Supplier with name '${data.name}' already exists`, HTTP_STATUS.CONFLICT);
    }
    return await supplierRepository.create(data);
  },

  async updateSupplier(id, data) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }
    return await supplierRepository.update(id, data);
  },

  async deactivateSupplier(id, userId = null) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findById(id).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    supplier.isActive = false;
    supplier.deletedAt = new Date();
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      supplier.deletedBy = userId;
    }

    await supplier.save();
    logger.info(`🔒 Soft Deleted Supplier '${supplier.name}' [${id}] -> isActive: false, deletedAt: ${supplier.deletedAt}`);
    return supplier;
  },

  async restoreSupplier(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findById(id).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    supplier.isActive = true;
    supplier.deletedAt = null;
    supplier.deletedBy = null;
    await supplier.save();
    logger.info(`🔓 Restored Supplier '${supplier.name}' [${id}] -> isActive: true`);
    return supplier;
  },

  async getSupplierLedger(supplierId, query = {}) {
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const supplier = await supplierRepository.findById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    const filter = { supplierId, isDeleted: { $ne: true } };
    if (query.transactionType && query.transactionType !== 'ALL') {
      filter.transactionType = query.transactionType;
    }

    let ledgerEntries = [];
    try {
      ledgerEntries = await SupplierLedger.find(filter)
        .populate('purchaseId')
        .sort({ date: -1, createdAt: -1 })
        .lean()
        .exec();
    } catch (err) {
      logger.error({ err }, 'Error fetching supplier ledger entries');
      ledgerEntries = [];
    }

    // Populate purchase items and linked payments safely for each purchase record
    const enrichedEntries = await Promise.all(
      ledgerEntries.map(async (entry) => {
        if (entry.purchaseId && entry.purchaseId._id) {
          try {
            const [purchaseItems, linkedPayments] = await Promise.all([
              PurchaseItem.find({ purchaseId: entry.purchaseId._id }).populate('productId').lean().exec(),
              SupplierLedger.find({ purchaseId: entry.purchaseId._id, transactionType: 'PAYMENT', isDeleted: { $ne: true } }).lean().exec(),
            ]);
            entry.purchaseId.items = purchaseItems || [];
            entry.purchaseId.payments = linkedPayments || [];
            entry.payments = linkedPayments || [];
          } catch (err) {
            logger.error({ err }, `Error populating items/payments for purchase ${entry.purchaseId._id}`);
            entry.purchaseId.items = [];
            entry.purchaseId.payments = [];
            entry.payments = [];
          }
        }
        return entry;
      })
    );

    // Filter out legacy duplicate initial payment rows (where referenceNumber starts with 'PAY-PUR-')
    const activeEntries = enrichedEntries.filter((entry) => {
      if (entry.transactionType === 'PAYMENT' && entry.referenceNumber?.startsWith('PAY-PUR-')) {
        return false;
      }
      return true;
    });

    let totalPurchases = 0;
    let totalPayments = 0;
    let purchaseCount = 0;
    let totalItemsPurchased = 0;
    let overdueAmount = 0;
    let dueIn30Days = 0;

    let lastPurchaseDate = null;
    let lastPaymentDate = null;
    let lastPaymentAmount = 0;
    const paymentsList = [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    activeEntries.forEach((item) => {
      if (item.transactionType === 'PURCHASE') {
        const amt = Number(item.purchaseAmount) || 0;
        totalPurchases += amt;
        purchaseCount += 1;
        if (!lastPurchaseDate) lastPurchaseDate = item.date;

        if (item.purchaseId) {
          const pItems = item.purchaseId.items || [];
          pItems.forEach((pi) => {
            totalItemsPurchased += Number(pi.quantity) || 1;
          });

          const pDue = Number(item.purchaseId.dueAmount) || 0;
          if (pDue > 0) {
            const pDate = new Date(item.purchaseId.purchaseDate || item.date);
            if (pDate < thirtyDaysAgo) {
              overdueAmount += pDue;
            } else {
              dueIn30Days += pDue;
            }
          }
        }
      } else if (item.transactionType === 'PAYMENT') {
        const amt = Number(item.paidAmount) || 0;
        totalPayments += amt;
        if (!lastPaymentDate) {
          lastPaymentDate = item.date;
          lastPaymentAmount = amt;
        }
        paymentsList.push({
          _id: item._id,
          date: item.date,
          amount: amt,
          method: item.notes || 'Payment',
          referenceNumber: item.referenceNumber,
        });
      }
    });

    const closingBalance = Number(supplier.outstandingBalance) || 0;
    const avgPurchaseValue = purchaseCount > 0 ? Math.round(totalPurchases / purchaseCount) : 0;

    return {
      supplier,
      ledgerEntries: activeEntries,
      paymentsList: paymentsList.slice(0, 5),
      summary: {
        totalPurchases,
        totalPayments,
        closingBalance,
        overdueAmount,
        dueIn30Days,
        totalItemsPurchased,
        lastPurchaseDate,
        lastPaymentDate,
        lastPaymentAmount,
        avgPurchaseValue,
      },
    };
  },

  async recordSupplierPayment(supplierId, data) {
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await supplierRepository.findById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    const amount = Number(data.amount) || 0;
    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', HTTP_STATUS.BAD_REQUEST);
    }

    const prevBalance = Number(supplier.outstandingBalance) || 0;
    const newBalance = prevBalance - amount;

    const targetPurchaseId = data.purchaseId && mongoose.Types.ObjectId.isValid(data.purchaseId) ? data.purchaseId : null;

    const paymentLedgerData = {
      supplierId,
      purchaseId: targetPurchaseId,
      transactionType: 'PAYMENT',
      purchaseAmount: 0,
      paidAmount: amount,
      dueAmount: 0,
      runningBalance: newBalance,
      referenceNumber: data.referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
      notes: `${data.paymentMode || 'Cash'} Payment${data.notes ? ': ' + data.notes : ''}`,
      date: data.date ? new Date(data.date) : new Date(),
    };

    const entry = await SupplierLedger.create(paymentLedgerData);
    await supplierRepository.update(supplierId, { outstandingBalance: newBalance });

    // If linked to a purchase invoice, update purchase paid & due amounts
    if (targetPurchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findById(targetPurchaseId).exec();
      if (purchase) {
        const activePayments = await SupplierLedger.find({
          purchaseId: purchase._id,
          transactionType: 'PAYMENT',
          isDeleted: { $ne: true },
        }).lean().exec();

        const totalPaid = activePayments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
        purchase.paidAmount = totalPaid;
        purchase.dueAmount = Math.max(0, Number(purchase.totalInvoiceAmount || 0) - totalPaid);
        await purchase.save();
        logger.info(`✅ Updated Purchase [${purchase._id}] with linked payment -> Total Paid: ₹${totalPaid}, Outstanding: ₹${purchase.dueAmount}`);
      }
    }

    logger.info(`✅ Recorded Supplier Payment -₹${amount} (Linked Purchase: ${targetPurchaseId || 'None'}) -> New Outstanding: ₹${newBalance}`);

    return entry;
  },

  async calculateSupplierBalance(supplierId) {
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) return 0;
    const ledger = await SupplierLedger.find({ supplierId, isDeleted: { $ne: true } }).sort({ date: 1, createdAt: 1 }).exec();

    let balance = 0;
    for (const entry of ledger) {
      if (entry.transactionType === 'PURCHASE') {
        const purchaseAmt = Number(entry.purchaseAmount || 0);
        const paidAmt = Number(entry.paidAmount ?? 0);
        balance += (purchaseAmt - paidAmt);
      } else if (entry.transactionType === 'PAYMENT') {
        // Skip legacy duplicate initial payment entries to prevent double counting
        if (!entry.referenceNumber?.startsWith('PAY-PUR-')) {
          balance -= Number(entry.paidAmount || 0);
        }
      } else if (entry.transactionType === 'ADJUSTMENT') {
        balance += Number(entry.purchaseAmount || 0) - Number(entry.paidAmount || 0);
      }
      entry.runningBalance = balance;
      await entry.save();
    }

    await supplierRepository.update(supplierId, { outstandingBalance: balance });
    logger.info(`✅ Recalculated Supplier Balance for [${supplierId}] -> Final Balance: ₹${balance}`);
    return balance;
  },

  async softDeletePayment(paymentId, userContext = {}, confirmation = '') {
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new AppError('Invalid Payment ID format', HTTP_STATUS.BAD_REQUEST);
    }
    if ((confirmation || '').toString().trim() !== 'DELETE') {
      throw new AppError('Invalid confirmation text. Must type DELETE exactly.', HTTP_STATUS.BAD_REQUEST);
    }

    const payment = await SupplierLedger.findOne({ _id: paymentId, transactionType: 'PAYMENT', isDeleted: { $ne: true } }).exec();
    if (!payment) {
      throw new AppError('Active payment record not found', HTTP_STATUS.NOT_FOUND);
    }

    payment.isDeleted = true;
    payment.deletedAt = new Date();
    await payment.save();

    logger.info(`🗑️ Soft-deleted Supplier Payment [${paymentId}] (-₹${payment.paidAmount})`);

    // If payment was linked to a purchase, recalculate purchase paid & due amounts
    if (payment.purchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findById(payment.purchaseId).exec();
      if (purchase) {
        const remainingPayments = await SupplierLedger.find({
          purchaseId: purchase._id,
          transactionType: 'PAYMENT',
          isDeleted: { $ne: true },
        }).lean().exec();

        const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
        purchase.paidAmount = totalPaid;
        purchase.dueAmount = Math.max(0, Number(purchase.totalInvoiceAmount || 0) - totalPaid);
        await purchase.save();
        logger.info(`✅ Recalculated Purchase [${purchase._id}] -> Paid: ₹${totalPaid}, Due: ₹${purchase.dueAmount}`);
      }
    }

    // Recalculate supplier running balance
    const updatedBalance = await this.calculateSupplierBalance(payment.supplierId);

    return {
      message: 'Payment soft-deleted successfully',
      paymentId,
      supplierId: payment.supplierId,
      updatedBalance,
    };
  },

  async restorePayment(paymentId, userContext = {}) {
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new AppError('Invalid Payment ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const payment = await SupplierLedger.findOne({ _id: paymentId, transactionType: 'PAYMENT', isDeleted: true }).exec();
    if (!payment) {
      throw new AppError('Soft-deleted payment record not found', HTTP_STATUS.NOT_FOUND);
    }

    payment.isDeleted = false;
    payment.deletedAt = null;
    await payment.save();

    logger.info(`🔄 Restored Supplier Payment [${paymentId}] (₹${payment.paidAmount})`);

    if (payment.purchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findById(payment.purchaseId).exec();
      if (purchase) {
        const activePayments = await SupplierLedger.find({
          purchaseId: purchase._id,
          transactionType: 'PAYMENT',
          isDeleted: { $ne: true },
        }).lean().exec();

        const totalPaid = activePayments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
        purchase.paidAmount = totalPaid;
        purchase.dueAmount = Math.max(0, Number(purchase.totalInvoiceAmount || 0) - totalPaid);
        await purchase.save();
      }
    }

    const updatedBalance = await this.calculateSupplierBalance(payment.supplierId);

    return {
      message: 'Payment restored successfully',
      paymentId,
      supplierId: payment.supplierId,
      updatedBalance,
    };
  },
};
