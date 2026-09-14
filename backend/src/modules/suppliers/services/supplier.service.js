import mongoose from 'mongoose';
import { Supplier } from '../models/supplier.model.js';
import { SupplierLedger } from '../models/supplierLedger.model.js';
import { PurchaseItem } from '../../purchases/models/purchaseItem.model.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';
import { normalizeMoney } from '../../../utils/pricingUtils.js';
import { parseTransactionTimestamp, getEffectiveTransactionTimestamp } from '../../../utils/dateUtils.js';

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
    const [suppliersDocs, allLedgerDocs] = await Promise.all([
      Supplier.find(filter).sort(sort).lean().exec(),
      SupplierLedger.find({ userId, isDeleted: { $ne: true } }).sort({ date: -1 }).lean().exec(),
    ]);

    const ledgerMap = new Map();
    for (const item of allLedgerDocs) {
      const sKey = item.supplierId?.toString();
      if (sKey) {
        if (!ledgerMap.has(sKey)) ledgerMap.set(sKey, []);
        ledgerMap.get(sKey).push(item);
      }
    }

    let overallOutstanding = 0;
    let overallGrossPurchases = 0;
    let overallReturns = 0;
    let overallPayments = 0;
    let overallRefunds = 0;

    const enrichedSuppliers = suppliersDocs.map((supObj) => {
      const sId = supObj._id.toString();
      const ledger = ledgerMap.get(sId) || [];

      let supGrossPurchases = 0;
      let supReturns = 0;
      let supTotalPayments = 0;
      let supTotalRefunds = 0;
      let lastPurchaseDate = null;
      let lastPaymentDate = null;
      let lastPaymentAmount = 0;

      ledger.forEach((item) => {
        const pAmt = Number(item.purchaseAmount) || 0;
        const pdAmt = Number(item.paidAmount) || 0;
        const retAmt = Number(item.returnAmount) || 0;
        const refAmt = Number(item.refundAmount) || 0;

        if (item.transactionType === 'PURCHASE') {
          supGrossPurchases += pAmt;
          if (!lastPurchaseDate) lastPurchaseDate = item.date;
        } else if (item.transactionType === 'RETURN') {
          supReturns += retAmt;
        } else if (item.transactionType === 'REFUND') {
          supTotalRefunds += refAmt;
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
      overallGrossPurchases += supGrossPurchases;
      overallReturns += supReturns;
      overallPayments += supTotalPayments;
      overallRefunds += supTotalRefunds;

      return {
        ...supObj,
        grossPurchases: normalizeMoney(supGrossPurchases),
        totalPurchases: normalizeMoney(supGrossPurchases),
        purchaseReturns: normalizeMoney(supReturns),
        netPurchases: normalizeMoney(supGrossPurchases - supReturns),
        totalPayments: normalizeMoney(supTotalPayments),
        totalRefunds: normalizeMoney(supTotalRefunds),
        lastPurchaseDate,
        lastPaymentDate,
        lastPaymentAmount,
      };
    });

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
        totalOutstandingDue: normalizeMoney(overallOutstanding),
        grossPurchasesAmount: normalizeMoney(overallGrossPurchases),
        totalPurchasesAmount: normalizeMoney(overallGrossPurchases),
        purchaseReturnsAmount: normalizeMoney(overallReturns),
        netPurchasesAmount: normalizeMoney(overallGrossPurchases - overallReturns),
        totalPaymentsAmount: normalizeMoney(overallPayments),
        totalRefundsAmount: normalizeMoney(overallRefunds),
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

    let allLedgerDocs = [];
    try {
      allLedgerDocs = await SupplierLedger.find(filter)
        .populate('purchaseId')
        .populate({
          path: 'returnId',
          populate: { path: 'productId', select: 'name brandId categoryId' },
        })
        .sort({ date: 1, createdAt: 1, _id: 1 })
        .lean()
        .exec();

      // Ensure 100% deterministic ascending chronological sorting in memory using effective timestamp
      allLedgerDocs.sort((a, b) => {
        const timeA = getEffectiveTransactionTimestamp(a).getTime();
        const timeB = getEffectiveTransactionTimestamp(b).getTime();
        if (timeA !== timeB) return timeA - timeB;
        const createdA = new Date(a.createdAt || 0).getTime();
        const createdB = new Date(b.createdAt || 0).getTime();
        if (createdA !== createdB) return createdA - createdB;
        return (a._id?.toString() || '').localeCompare(b._id?.toString() || '');
      });
    } catch (err) {
      logger.error({ err }, 'Error fetching supplier ledger entries');
      allLedgerDocs = [];
    }

    const purchaseIds = allLedgerDocs.map((e) => e.purchaseId?._id).filter(Boolean);

    let allPurchaseItems = [];
    let allLinkedPayments = [];

    if (purchaseIds.length > 0) {
      try {
        [allPurchaseItems, allLinkedPayments] = await Promise.all([
          PurchaseItem.find({ userId, purchaseId: { $in: purchaseIds } }).populate('productId').lean().exec(),
          SupplierLedger.find({ userId, purchaseId: { $in: purchaseIds }, transactionType: 'PAYMENT', isDeleted: { $ne: true } }).lean().exec(),
        ]);
      } catch (err) {
        logger.error({ err }, 'Error batch fetching purchase items/payments for supplier ledger');
      }
    }

    const itemsMap = new Map();
    allPurchaseItems.forEach((pi) => {
      const pKey = pi.purchaseId?.toString();
      if (pKey) {
        if (!itemsMap.has(pKey)) itemsMap.set(pKey, []);
        itemsMap.get(pKey).push(pi);
      }
    });

    const paymentsMap = new Map();
    allLinkedPayments.forEach((lp) => {
      const pKey = lp.purchaseId?.toString();
      if (pKey) {
        if (!paymentsMap.has(pKey)) paymentsMap.set(pKey, []);
        paymentsMap.get(pKey).push(lp);
      }
    });

    // Track FIFO credit usage from subsequent purchases
    let totalAdvanceUsedPool = allLedgerDocs
      .filter((e) => e.transactionType === 'PURCHASE')
      .reduce((acc, p) => acc + (Number(p.advanceUsed || p.purchaseId?.advanceUsed) || 0), 0);

    const returnCreditUsageMap = new Map();
    allLedgerDocs
      .filter((e) => e.transactionType === 'RETURN')
      .forEach((r) => {
        const retAmt = Number(r.returnAmount || r.returnValue) || 0;
        const refAmt = Number(r.refundAmount || r.returnId?.refundedAmount) || 0;
        const unrefunded = Math.max(0, retAmt - refAmt);
        const used = Math.min(unrefunded, totalAdvanceUsedPool);
        totalAdvanceUsedPool = Math.max(0, totalAdvanceUsedPool - used);
        const rKey = r._id?.toString();
        if (rKey) {
          returnCreditUsageMap.set(rKey, {
            creditUsed: used,
            availableCredit: Math.max(0, unrefunded - used),
            isCreditUsed: unrefunded > 0 && used >= unrefunded,
          });
        }
      });

    let running = 0;
    const enrichedEntries = allLedgerDocs.map((entry) => {
      let itemCount = 1;
      if (entry.purchaseId && entry.purchaseId._id) {
        const pKey = entry.purchaseId._id.toString();
        const purchaseItems = itemsMap.get(pKey) || [];
        const linkedPayments = paymentsMap.get(pKey) || [];
        entry.purchaseId.items = purchaseItems;
        entry.purchaseId.payments = linkedPayments;
        entry.payments = linkedPayments;
        itemCount = purchaseItems.length || 1;
      } else if (entry.returnId) {
        itemCount = Number(entry.returnId.quantity) || 1;
      }

      entry.itemCount = itemCount;

      const pAmt = Number(entry.purchaseAmount) || 0;
      const pdAmt = Number(entry.paidAmount) || 0;
      const retAmt = Number(entry.returnAmount) || 0;
      const refAmt = Number(entry.refundAmount || entry.returnId?.refundedAmount || entry.returnId?.refundAmount) || 0;

      if (entry.transactionType === 'PURCHASE') {
        running = normalizeMoney(running + pAmt - pdAmt);
      } else if (entry.transactionType === 'PAYMENT') {
        if (!entry.referenceNumber?.startsWith('PAY-PUR-')) {
          running = normalizeMoney(running - pdAmt);
        }
      } else if (entry.transactionType === 'ADJUSTMENT') {
        running = normalizeMoney(running + pAmt - pdAmt);
      } else if (entry.transactionType === 'RETURN') {
        // Return creates supplier credit for returnAmount (reducing balance)
        running = normalizeMoney(running - retAmt);

        const rKey = entry._id?.toString();
        const usage = returnCreditUsageMap.get(rKey) || { creditUsed: 0, availableCredit: 0, isCreditUsed: false };
        entry.creditUsed = usage.creditUsed;
        entry.availableCredit = usage.availableCredit;
        entry.isCreditUsed = usage.isCreditUsed;

        if (refAmt >= retAmt && retAmt > 0) {
          entry.creditStatus = 'REFUNDED';
        } else if (usage.isCreditUsed) {
          entry.creditStatus = 'CREDIT_USED';
        } else {
          entry.creditStatus = 'CREDIT_AVAILABLE';
        }
      } else if (entry.transactionType === 'REFUND') {
        // Refund pays back credit to our bank/cash, reducing our supplier credit
        running = normalizeMoney(running + (Number(entry.refundAmount) || 0));
      }

      entry.date = getEffectiveTransactionTimestamp(entry);
      entry.runningBalance = running;
      return entry;
    });

    let activeEntries = enrichedEntries.filter((entry) => {
      if (entry.transactionType === 'PAYMENT' && entry.referenceNumber?.startsWith('PAY-PUR-')) {
        return false;
      }
      return true;
    });

    if (query.transactionType && query.transactionType !== 'ALL') {
      if (query.transactionType === 'RETURNS') {
        activeEntries = activeEntries.filter((e) => e.transactionType === 'RETURN' || e.transactionType === 'REFUND');
      } else {
        activeEntries = activeEntries.filter((e) => e.transactionType === query.transactionType);
      }
    }

    let grossPurchases = 0;
    let totalPayments = 0;
    let totalReturns = 0;
    let totalRefunds = 0;
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

    // Summary calculation over ALL active entries (not filtered by subtab)
    enrichedEntries.forEach((item) => {
      const pAmt = Number(item.purchaseAmount) || 0;
      const pdAmt = Number(item.paidAmount) || 0;
      const retAmt = Number(item.returnAmount) || 0;
      const refAmt = Number(item.refundAmount) || 0;

      if (item.transactionType === 'PURCHASE') {
        grossPurchases += pAmt;
        purchaseCount += 1;
        lastPurchaseDate = item.date;

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
      } else if (item.transactionType === 'RETURN') {
        totalReturns += retAmt;
      } else if (item.transactionType === 'REFUND') {
        totalRefunds += refAmt;
      }

      if (pdAmt > 0 && item.transactionType !== 'RETURN') {
        totalPayments += pdAmt;
        lastPaymentDate = item.date;
        lastPaymentAmount = pdAmt;
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

    const closingBalance = normalizeMoney(supplier.outstandingBalance !== undefined ? supplier.outstandingBalance : running);
    const avgPurchaseValue = purchaseCount > 0 ? Math.round(grossPurchases / purchaseCount) : 0;

    return {
      supplier,
      ledgerEntries: activeEntries,
      paymentsList: paymentsList.reverse().slice(0, 5),
      summary: {
        grossPurchases: normalizeMoney(grossPurchases),
        totalPurchases: normalizeMoney(grossPurchases),
        purchaseReturns: normalizeMoney(totalReturns),
        netPurchases: normalizeMoney(grossPurchases - totalReturns),
        totalPayments: normalizeMoney(totalPayments),
        totalRefunds: normalizeMoney(totalRefunds),
        closingBalance,
        overdueAmount: normalizeMoney(overdueAmount),
        dueIn30Days: normalizeMoney(dueIn30Days),
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

    const prevBalance = normalizeMoney(supplier.outstandingBalance || 0);
    const newBalance = normalizeMoney(prevBalance - amount);

    const targetPurchaseId = data.purchaseId && mongoose.Types.ObjectId.isValid(data.purchaseId) ? data.purchaseId : null;

    const paymentLedgerData = {
      userId,
      supplierId,
      purchaseId: targetPurchaseId,
      transactionType: 'PAYMENT',
      purchaseAmount: 0,
      paidAmount: amount,
      dueAmount: 0,
      returnAmount: 0,
      runningBalance: newBalance,
      referenceNumber: data.referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
      notes: `${data.paymentMode || 'Cash'} Payment${data.notes ? ': ' + data.notes : ''}`,
      date: parseTransactionTimestamp(data.date || data.paymentDate),
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
        purchase.paidAmount = normalizeMoney(totalPaid);
        purchase.dueAmount = Math.max(
          0,
          normalizeMoney(Number(purchase.totalInvoiceAmount || 0) - Number(purchase.advanceUsed || 0) - totalPaid - Number(purchase.returnAmount || 0))
        );
        await purchase.save();
      }
    }

    logger.info(`✅ Recorded Supplier Payment -₹${amount} (Linked Purchase: ${targetPurchaseId || 'None'})`);
    return entry;
  },

  async calculateSupplierBalance(supplierId, userId) {
    if (!userId) throw new Error('userId is required');
    if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) return 0;
    const ledger = await SupplierLedger.find({ userId, supplierId, isDeleted: { $ne: true } }).sort({ date: 1, createdAt: 1, _id: 1 }).exec();

    ledger.sort((a, b) => {
      const timeA = getEffectiveTransactionTimestamp(a).getTime();
      const timeB = getEffectiveTransactionTimestamp(b).getTime();
      if (timeA !== timeB) return timeA - timeB;
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      if (createdA !== createdB) return createdA - createdB;
      return (a._id?.toString() || '').localeCompare(b._id?.toString() || '');
    });

    let balance = 0;
    const bulkOps = [];
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
      } else if (entry.transactionType === 'RETURN') {
        const retAmt = normalizeMoney(entry.returnAmount || 0);
        balance -= retAmt;
      } else if (entry.transactionType === 'REFUND') {
        const refAmt = normalizeMoney(entry.refundAmount || 0);
        balance += refAmt;
      }
      balance = normalizeMoney(balance);
      if (entry.runningBalance !== balance) {
        entry.runningBalance = balance;
        bulkOps.push({
          updateOne: {
            filter: { _id: entry._id },
            update: { $set: { runningBalance: balance } },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await SupplierLedger.bulkWrite(bulkOps);
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
        purchase.paidAmount = normalizeMoney(totalPaid);
        purchase.dueAmount = Math.max(
          0,
          normalizeMoney(Number(purchase.totalInvoiceAmount || 0) - Number(purchase.advanceUsed || 0) - totalPaid - Number(purchase.returnAmount || 0))
        );
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
        purchase.paidAmount = normalizeMoney(totalPaid);
        purchase.dueAmount = Math.max(
          0,
          normalizeMoney(Number(purchase.totalInvoiceAmount || 0) - Number(purchase.advanceUsed || 0) - totalPaid - Number(purchase.returnAmount || 0))
        );
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
