import mongoose from 'mongoose';
import { Supplier } from '../models/supplier.model.js';
import { supplierRepository } from '../repositories/supplier.repository.js';
import { SupplierLedger } from '../models/supplierLedger.model.js';
import { PurchaseItem } from '../../purchases/models/purchaseItem.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';

export const supplierService = {
  async getAllSuppliers(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId };
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
    const suppliersDocs = await Supplier.find(filter).sort(sort).exec();

    let overallOutstanding = 0;
    let overallPurchases = 0;
    let overallPayments = 0;

    const enrichedSuppliers = await Promise.all(
      suppliersDocs.map(async (sup) => {
        const supObj = sup.toObject ? sup.toObject() : { ...sup };
        const sId = supObj._id;

        let ledger = [];
        try {
          ledger = await SupplierLedger.find({ userId, supplierId: sId, isDeleted: { $ne: true } }).sort({ date: -1 }).exec();
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
          const pAmt = Number(item.purchaseAmount) || 0;
          const pdAmt = Number(item.paidAmount) || 0;

          if (item.transactionType === 'PURCHASE') {
            supTotalPurchases += pAmt;
            if (!lastPurchaseDate) lastPurchaseDate = item.date;
          }

          if (pdAmt > 0) {
            if (!(item.transactionType === 'PAYMENT' && item.referenceNumber?.startsWith('PAY-PUR-'))) {
              supTotalPayments += pdAmt;
              if (!lastPaymentDate) {
                lastPaymentDate = item.date;
                lastPaymentAmount = pdAmt;
              }
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

  async getSupplierById(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findOne({ _id: id, userId }).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }
    return supplier;
  },

  async createSupplier(data, userId) {
    if (!userId) throw new Error('userId is required');

    const mobileTrim = (data.mobile || '').toString().replace(/\s+/g, '').trim();
    if (mobileTrim && !data.allowDuplicateMobile) {
      const existingMobile = await Supplier.findOne({ userId, mobile: mobileTrim, isActive: true }).exec();
      if (existingMobile) {
        throw new AppError(`Supplier with mobile number '${mobileTrim}' already exists`, HTTP_STATUS.CONFLICT);
      }
    }

    const nameTrim = (data.name || '').toString().trim();
    try {
      return await Supplier.create({
        ...data,
        userId,
        name: nameTrim,
        mobile: mobileTrim,
      });
    } catch (err) {
      if (err.code === 11000 && (err.keyPattern?.mobile || (err.message && err.message.includes('mobile')))) {
        console.warn('⚠️ Stale unique mobile index encountered in MongoDB. Cleaning up index and saving supplier...');
        try {
          const idxName = err.indexName || 'userId_1_mobile_1';
          await Supplier.collection.dropIndex(idxName);
        } catch (e) {
          // ignore drop error
        }
        return await Supplier.create({
          ...data,
          userId,
          name: nameTrim,
          mobile: mobileTrim,
        });
      }
      throw err;
    }
  },

  async updateSupplier(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    const supplier = await Supplier.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true }).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }
    return supplier;
  },

  async deactivateSupplier(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findOne({ _id: id, userId }).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    supplier.isActive = false;
    supplier.deletedAt = new Date();
    supplier.deletedBy = userId;
    await supplier.save();
    logger.info(`🔒 Soft Deleted Supplier '${supplier.name}' [${id}]`);
    return supplier;
  },

  async restoreSupplier(id, userId) {
    if (!userId) throw new Error('userId is required');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findOne({ _id: id, userId }).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    supplier.isActive = true;
    supplier.deletedAt = null;
    supplier.deletedBy = null;
    await supplier.save();
    logger.info(`🔓 Restored Supplier '${supplier.name}' [${id}]`);
    return supplier;
  },

  async getSupplierLedger(supplierId, query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const supplier = await Supplier.findOne({ _id: supplierId, userId }).exec();
    if (!supplier) {
      throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    }

    const filter = { userId, supplierId, isDeleted: { $ne: true } };
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

    const enrichedEntries = await Promise.all(
      ledgerEntries.map(async (entry) => {
        if (entry.purchaseId && entry.purchaseId._id) {
          try {
            const [purchaseItems, linkedPayments] = await Promise.all([
              PurchaseItem.find({ userId, purchaseId: entry.purchaseId._id }).populate('productId').lean().exec(),
              SupplierLedger.find({ userId, purchaseId: entry.purchaseId._id, transactionType: 'PAYMENT', isDeleted: { $ne: true } }).lean().exec(),
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
      const pAmt = Number(item.purchaseAmount) || 0;
      const pdAmt = Number(item.paidAmount) || 0;

      if (item.transactionType === 'PURCHASE') {
        totalPurchases += pAmt;
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
      }

      if (pdAmt > 0) {
        totalPayments += pdAmt;
        if (!lastPaymentDate) {
          lastPaymentDate = item.date;
          lastPaymentAmount = pdAmt;
        }
        if (item.transactionType === 'PAYMENT') {
          paymentsList.push({
            _id: item._id,
            date: item.date,
            amount: pdAmt,
            method: item.notes || 'Payment',
            referenceNumber: item.referenceNumber,
          });
        }
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

  async recordSupplierPayment(supplierId, data, userId) {
    if (!userId) throw new Error('userId is required');
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new AppError('Invalid Supplier ID format', HTTP_STATUS.BAD_REQUEST);
    }
    const supplier = await Supplier.findOne({ _id: supplierId, userId }).exec();
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
      userId,
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
    await Supplier.findOneAndUpdate({ _id: supplierId, userId }, { outstandingBalance: newBalance });

    if (targetPurchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findOne({ _id: targetPurchaseId, userId }).exec();
      if (purchase) {
        const activePayments = await SupplierLedger.find({
          userId,
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

    logger.info(`✅ Recorded Supplier Payment -₹${amount} (Linked Purchase: ${targetPurchaseId || 'None'})`);
    return entry;
  },

  async calculateSupplierBalance(supplierId, userId) {
    if (!userId) throw new Error('userId is required');
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) return 0;
    const ledger = await SupplierLedger.find({ userId, supplierId, isDeleted: { $ne: true } }).sort({ date: 1, createdAt: 1 }).exec();

    let balance = 0;
    for (const entry of ledger) {
      if (entry.transactionType === 'PURCHASE') {
        const purchaseAmt = normalizeMoney(entry.purchaseAmount || 0);
        const paidAmt = normalizeMoney(entry.paidAmount ?? 0);
        balance += (purchaseAmt - paidAmt);
      } else if (entry.transactionType === 'PAYMENT') {
        if (!entry.referenceNumber?.startsWith('PAY-PUR-')) {
          balance -= normalizeMoney(entry.paidAmount || 0);
        }
      } else if (entry.transactionType === 'ADJUSTMENT') {
        balance += normalizeMoney(entry.purchaseAmount || 0) - normalizeMoney(entry.paidAmount || 0);
      }
      balance = normalizeMoney(balance);
      entry.runningBalance = balance;
      await entry.save();
    }

    balance = normalizeMoney(balance);
    await Supplier.findOneAndUpdate({ _id: supplierId, userId }, { outstandingBalance: balance });
    return balance;
  },

  async softDeletePayment(paymentId, userId, confirmation = '') {
    if (!userId) throw new Error('userId is required');
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new AppError('Invalid Payment ID format', HTTP_STATUS.BAD_REQUEST);
    }
    if ((confirmation || '').toString().trim() !== 'DELETE') {
      throw new AppError('Invalid confirmation text. Must type DELETE exactly.', HTTP_STATUS.BAD_REQUEST);
    }

    const payment = await SupplierLedger.findOne({ _id: paymentId, userId, transactionType: 'PAYMENT', isDeleted: { $ne: true } }).exec();
    if (!payment) {
      throw new AppError('Active payment record not found', HTTP_STATUS.NOT_FOUND);
    }

    payment.isDeleted = true;
    payment.deletedAt = new Date();
    await payment.save();

    if (payment.purchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findOne({ _id: payment.purchaseId, userId }).exec();
      if (purchase) {
        const remainingPayments = await SupplierLedger.find({
          userId,
          purchaseId: purchase._id,
          transactionType: 'PAYMENT',
          isDeleted: { $ne: true },
        }).lean().exec();

        const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
        purchase.paidAmount = totalPaid;
        purchase.dueAmount = Math.max(0, Number(purchase.totalInvoiceAmount || 0) - totalPaid);
        await purchase.save();
      }
    }

    const updatedBalance = await this.calculateSupplierBalance(payment.supplierId, userId);

    return {
      message: 'Payment soft-deleted successfully',
      paymentId,
      supplierId: payment.supplierId,
      updatedBalance,
    };
  },

  async restorePayment(paymentId, userId) {
    if (!userId) throw new Error('userId is required');
    if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new AppError('Invalid Payment ID format', HTTP_STATUS.BAD_REQUEST);
    }

    const payment = await SupplierLedger.findOne({ _id: paymentId, userId, transactionType: 'PAYMENT', isDeleted: true }).exec();
    if (!payment) {
      throw new AppError('Soft-deleted payment record not found', HTTP_STATUS.NOT_FOUND);
    }

    payment.isDeleted = false;
    payment.deletedAt = null;
    await payment.save();

    if (payment.purchaseId) {
      const { Purchase } = await import('../../purchases/models/purchase.model.js');
      const purchase = await Purchase.findOne({ _id: payment.purchaseId, userId }).exec();
      if (purchase) {
        const activePayments = await SupplierLedger.find({
          userId,
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

    const updatedBalance = await this.calculateSupplierBalance(payment.supplierId, userId);

    return {
      message: 'Payment restored successfully',
      paymentId,
      supplierId: payment.supplierId,
      updatedBalance,
    };
  },
};
