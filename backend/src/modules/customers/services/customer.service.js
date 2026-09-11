import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';
import { CustomerPayment } from '../models/customerPayment.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { ShopSettings } from '../../settings/models/shopSettings.model.js';
import { logger } from '../../../config/logger.config.js';
import { calculateInvoicePaymentStatus, normalizeMoney } from '../../../utils/pricingUtils.js';

export async function generateNextPaymentReference(userId) {
  if (!userId) throw new Error('userId is required');

  // 1. Dynamic Shop Name & First Alphabet Extraction (Priority: Shop Name -> Fallback 'V')
  let shopName = '';
  try {
    const settings = await ShopSettings.findOne({ userId }).lean().exec();
    shopName = (settings?.shopName || settings?.name || '').trim();
  } catch (err) {
    logger.warn(`Could not fetch ShopSettings for payment prefix for user ${userId}:`, err);
  }

  let shopLetter = 'V';
  if (shopName) {
    const match = shopName.match(/[a-zA-Z]/);
    if (match && match[0]) {
      shopLetter = match[0].toUpperCase();
    }
  }

  // 2. Year & Month (P + SHOP_INITIAL + YY + MM)
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // '09' for Sept, '10' for Oct
  const prefix = `P${shopLetter}${yy}${mm}`;

  // 3. Find highest existing sequence number for this payment prefix
  const prefixRegex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const legacyPrefix = `P${shopLetter}${yy}${now.getMonth() + 1}`;
  const legacyRegex = new RegExp(`^${legacyPrefix}(\\d+)$`, 'i');

  const payments = await CustomerPayment.find({
    userId,
    $or: [
      { refNo: { $regex: prefixRegex } },
      { refNo: { $regex: legacyRegex } },
    ],
  })
    .select('refNo')
    .lean()
    .exec();

  let maxSeq = 0;
  if (Array.isArray(payments) && payments.length > 0) {
    for (const p of payments) {
      if (p?.refNo) {
        const match = p.refNo.match(prefixRegex) || p.refNo.match(legacyRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  const nextSeqStr = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSeqStr}`;
}

export const customerService = {
  async getAllCustomers(query = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const filter = { userId, isActive: { $ne: false }, customerType: 'ADDED' };

    if (query.status && query.status !== 'all') {
      filter.status = new RegExp(`^${query.status.trim()}$`, 'i');
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { mobile: searchRegex },
        { village: searchRegex },
        { mandal: searchRegex },
        { district: searchRegex },
      ];
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    const [customers, countsAgg] = await Promise.all([
      Customer.find(filter)
        .select(
          '_id name mobile village mandal district address customerType type status openingBalance openingBalanceType openingBalanceDate openingBalanceNotes totalPurchases totalPaid outstandingBalance advanceBalance creditLimit gstin createdAt updatedAt'
        )
        .sort({ name: 1 })
        .lean()
        .exec(),
      Customer.aggregate([
        { $match: { userId: userObjId, isActive: { $ne: false }, customerType: 'ADDED' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let totalCustomers = 0;
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    let blockedCustomers = 0;

    countsAgg.forEach((item) => {
      const cnt = Number(item.count || 0);
      totalCustomers += cnt;
      const statusLower = (item._id || '').toLowerCase();
      if (statusLower === 'active') activeCustomers += cnt;
      else if (statusLower === 'inactive') inactiveCustomers += cnt;
      else if (statusLower === 'blocked') blockedCustomers += cnt;
      else activeCustomers += cnt;
    });

    const outOfSyncCustomerIds = [];
    customers.forEach((c) => {
      const totalDebits = Number(c.totalPurchases) || 0;
      const totalCredits = Number(c.totalPaid) || 0;
      const expectedDue = Math.round(Math.max(0, totalDebits - totalCredits));
      const expectedAdv = Math.round(Math.max(0, totalCredits - totalDebits));

      if (c.outstandingBalance !== expectedDue || c.advanceBalance !== expectedAdv) {
        c.outstandingBalance = expectedDue;
        c.advanceBalance = expectedAdv;
        outOfSyncCustomerIds.push({
          id: c._id,
          outstandingBalance: expectedDue,
          advanceBalance: expectedAdv,
        });
      }
    });

    if (outOfSyncCustomerIds.length > 0) {
      Customer.bulkWrite(
        outOfSyncCustomerIds.map((item) => ({
          updateOne: {
            filter: { _id: item.id },
            update: { $set: { outstandingBalance: item.outstandingBalance, advanceBalance: item.advanceBalance } },
          },
        }))
      ).catch((err) => logger.warn(`Error syncing customer balances in getAllCustomers: ${err.message}`));
    }

    const totalOutstanding = customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
    const customersWithDue = customers.filter((c) => (c.outstandingBalance || 0) > 0).length;
    const totalAdvance = customers.reduce((acc, c) => acc + (c.advanceBalance || 0), 0);

    return {
      customers,
      summary: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        blockedCustomers,
        totalOutstanding,
        customersWithDue,
        advanceAmount: totalAdvance,
      },
    };
  },

  async getGeneralCustomers(query = {}, userId) {
    if (!userId) throw new Error('userId is required');

    // 1. Exclude ADDED customers
    const addedCustomers = await Customer.find({ userId, customerType: 'ADDED' }).select('_id mobile').lean().exec();
    const addedCustomerIds = addedCustomers.map((c) => c._id);
    const addedMobiles = new Set(addedCustomers.map((c) => (c.mobile || '').trim()));

    // 2. Fetch General Customer master documents
    const generalMasterCusts = await Customer.find({
      userId,
      customerType: 'GENERAL',
      isActive: { $ne: false },
    }).lean().exec();

    // 3. Build query filter for general invoices
    const filter = {
      userId,
      isDeleted: { $ne: true },
      customerId: { $nin: addedCustomerIds },
      customerType: { $ne: 'ADDED' },
    };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
      ];
    }

    const generalInvoices = await SalesInvoice.find(filter)
      .select('_id invoiceNumber customerName customerMobile customerVillage totalAmount paidAmount dueAmount date createdAt updatedAt')
      .sort({ date: -1, createdAt: -1 })
      .lean()
      .exec();

    const customerGroupMap = {};

    // 4. Group and accumulate general invoices directly from authoritative invoice totalAmount and paidAmount
    for (const inv of generalInvoices) {
      const mob = (inv.customerMobile || '').trim();
      if (mob && addedMobiles.has(mob)) continue;

      const name = (inv.customerName || 'General Customer').trim();
      const key = `${name.toLowerCase()}_${mob}`;

      if (!customerGroupMap[key]) {
        customerGroupMap[key] = {
          _id: inv._id.toString(),
          name,
          mobile: mob || '-',
          village: inv.customerVillage || '',
          district: '',
          customerType: 'GENERAL',
          totalPurchases: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          totalBills: 0,
          lastPurchaseDate: inv.date || inv.createdAt,
          invoices: [],
          createdAt: inv.createdAt || inv.date,
          updatedAt: inv.updatedAt || inv.createdAt || inv.date,
        };
      }

      const grp = customerGroupMap[key];
      const invTotal = Number(inv.totalAmount) || 0;
      const invPaid = Number(inv.paidAmount) || 0;
      const invDue = Math.max(0, invTotal - invPaid);

      grp.totalBills += 1;
      grp.totalPurchases += invTotal;
      grp.totalPaid += invPaid;
      grp.outstandingBalance += invDue;
      if (!grp.lastPurchaseDate || new Date(inv.date || inv.createdAt) > new Date(grp.lastPurchaseDate)) {
        grp.lastPurchaseDate = inv.date || inv.createdAt;
      }
      grp.invoices.push(inv);
    }

    // 5. Include any General Customer master records that have 0 invoices
    for (const master of generalMasterCusts) {
      const mob = (master.mobile || '').trim();
      if (mob && addedMobiles.has(mob)) continue;
      const name = (master.name || 'General Customer').trim();
      const key = `${name.toLowerCase()}_${mob}`;

      if (!customerGroupMap[key]) {
        customerGroupMap[key] = {
          _id: master._id.toString(),
          name,
          mobile: mob || '-',
          village: master.village || '',
          district: master.district || '',
          customerType: 'GENERAL',
          totalPurchases: Number(master.totalPurchases || 0),
          totalPaid: Number(master.totalPaid || 0),
          outstandingBalance: Number(master.outstandingBalance || 0),
          totalBills: 0,
          lastPurchaseDate: master.updatedAt || master.createdAt,
          invoices: [],
          createdAt: master.createdAt,
          updatedAt: master.updatedAt,
        };
      } else {
        // Synchronize master document ID if available
        customerGroupMap[key]._id = master._id.toString();
        // Authoritative update of master document in DB if out of sync
        if (
          master.totalPurchases !== customerGroupMap[key].totalPurchases ||
          master.totalPaid !== customerGroupMap[key].totalPaid ||
          master.outstandingBalance !== customerGroupMap[key].outstandingBalance
        ) {
          Customer.updateOne(
            { _id: master._id },
            {
              $set: {
                totalPurchases: customerGroupMap[key].totalPurchases,
                totalPaid: customerGroupMap[key].totalPaid,
                outstandingBalance: customerGroupMap[key].outstandingBalance,
              },
            }
          ).catch((err) => logger.warn(`Failed to sync general master customer balance: ${err.message}`));
        }
      }
    }

    const generalCustomers = Object.values(customerGroupMap);

    const totalBills = generalInvoices.length;
    const totalPurchaseValue = generalCustomers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);
    const totalPaidSum = generalCustomers.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
    const totalOutstandingSum = generalCustomers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);

    return {
      generalCustomers,
      customers: generalCustomers,
      summary: {
        totalBills,
        totalPurchaseValue,
        totalPaid: totalPaidSum,
        outstanding: totalOutstandingSum,
        totalCustomers: generalCustomers.length,
      },
    };
  },

  async calculateCustomerBalance(customerId, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer || customer.customerType === 'GENERAL') return null;

    const invoices = await SalesInvoice.find(
      {
        userId,
        isDeleted: { $ne: true },
        $or: [
          { customerId: customer._id },
          { customerMobile: customer.mobile, customerType: 'ADDED' },
        ],
      },
      {
        _id: 1,
        invoiceNumber: 1,
        date: 1,
        createdAt: 1,
        items: 1,
        subtotal: 1,
        discountAmount: 1,
        taxAmount: 1,
        totalAmount: 1,
        paidAmount: 1,
        dueAmount: 1,
        paymentMode: 1,
        status: 1,
        dueStatus: 1,
      }
    ).sort({ date: 1, createdAt: 1 }).lean().exec();

    const payments = await CustomerPayment.find(
      {
        userId,
        isDeleted: { $ne: true },
        $or: [
          { customer: customer._id },
          { customerMobile: customer.mobile },
        ],
      },
      {
        _id: 1,
        amount: 1,
        invoiceId: 1,
        invoiceNumber: 1,
        paymentType: 1,
        paymentMode: 1,
        date: 1,
        createdAt: 1,
        refNo: 1,
        notes: 1,
      }
    ).sort({ date: 1, createdAt: 1 }).lean().exec();

    let legacyPaidTotal = 0;
    const directInvoicePaymentMap = new Map();
    let advancePaymentSum = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (amt <= 0) return;

      let linkedInvId = p.invoiceId ? p.invoiceId.toString() : null;
      if (!linkedInvId && p.invoiceNumber) {
        const matched = invoices.find((i) => (i.invoiceNumber || '').trim() === p.invoiceNumber.trim());
        if (matched) linkedInvId = matched._id.toString();
      }
      if (!linkedInvId && p.refNo?.startsWith('PAY-BILL-')) {
        const invNum = p.refNo.replace('PAY-BILL-', '').trim();
        const matched = invoices.find((i) => (i.invoiceNumber || '').trim() === invNum);
        if (matched) linkedInvId = matched._id.toString();
      }

      const pType = p.paymentType || (linkedInvId ? 'INVOICE_PAYMENT' : 'GENERAL_PAYMENT');

      if (pType === 'ADVANCE') {
        advancePaymentSum += amt;
      } else if (linkedInvId) {
        const curr = directInvoicePaymentMap.get(linkedInvId) || 0;
        directInvoicePaymentMap.set(linkedInvId, curr + amt);
      } else {
        advancePaymentSum += amt;
      }
    });

    let totalInvoiceDueSum = 0;
    let totalInvoicePaidSum = 0;

    invoices.forEach((inv) => {
      const invIdStr = inv._id.toString();
      const invTotal = Math.max(0, Number(inv.totalAmount || 0));
      let invPaid = 0;
      if (directInvoicePaymentMap.has(invIdStr)) {
        invPaid = directInvoicePaymentMap.get(invIdStr);
      } else {
        invPaid = Math.max(0, Number(inv.paidAmount || 0));
        legacyPaidTotal += invPaid;
      }
      const invDue = Math.max(0, invTotal - invPaid);
      totalInvoicePaidSum += invPaid;
      totalInvoiceDueSum += invDue;
    });

    const totalPurchases = Math.round(invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0));
    const totalPaymentsSum = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalPaid = Math.round(totalPaymentsSum + legacyPaidTotal);

    const netBalance = totalPurchases - totalPaid;
    const outstandingBalance = Math.round(Math.max(0, netBalance));
    const advanceBalance = Math.round(Math.max(0, -netBalance));

    const creditLimit = Number(customer.creditLimit || 50000);
    const availableLimit = Math.max(0, creditLimit - outstandingBalance + advanceBalance);

    customer.totalPurchases = totalPurchases;
    customer.totalPaid = totalPaid;
    customer.outstandingBalance = outstandingBalance;
    customer.advanceBalance = advanceBalance;

    await Customer.updateOne(
      { _id: customer._id },
      {
        $set: {
          totalPurchases,
          totalPaid,
          outstandingBalance,
          advanceBalance,
        },
      }
    );

    return {
      customer,
      invoices,
      payments,
      totalPurchases,
      totalPaid,
      totalInvoicePaid: totalInvoicePaidSum,
      totalInvoiceDue: totalInvoiceDueSum,
      outstandingBalance,
      advanceBalance,
      creditLimit,
      availableLimit,
    };
  },

  async getCustomerById(id, userId) {
    if (!userId) throw new Error('userId is required');
    const calcData = await this.calculateCustomerBalance(id, userId);
    if (!calcData) return null;

    const {
      customer,
      invoices,
      payments,
      totalPurchases,
      totalPaid,
      totalInvoicePaid,
      totalInvoiceDue,
      outstandingBalance,
      advanceBalance,
      creditLimit,
      availableLimit,
    } = calcData;

    // Map payments to linked invoices (by invoiceId, invoiceNumber, or PAY-BILL- refNo)
    const invoicePaymentMap = new Map();
    const otherPayments = [];

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (amt <= 0) return;

      let matchedInv = null;
      if (p.invoiceId) {
        matchedInv = invoices.find((i) => i._id.toString() === p.invoiceId.toString());
      }
      if (!matchedInv && p.invoiceNumber) {
        matchedInv = invoices.find((i) => (i.invoiceNumber || '').trim() === p.invoiceNumber.trim());
      }
      if (!matchedInv && p.refNo?.startsWith('PAY-BILL-')) {
        const invNum = p.refNo.replace('PAY-BILL-', '').trim();
        matchedInv = invoices.find((i) => (i.invoiceNumber || '').trim() === invNum);
      }

      if (matchedInv) {
        const invIdStr = matchedInv._id.toString();
        const existing = invoicePaymentMap.get(invIdStr) || { totalPayment: 0, paymentRecords: [] };
        existing.totalPayment += amt;
        existing.paymentRecords.push(p);
        invoicePaymentMap.set(invIdStr, existing);
      } else {
        otherPayments.push(p);
      }
    });

    const invoiceTransactions = [];
    const paymentTransactions = [];

    invoices.forEach((inv) => {
      const invTotal = Number(inv.totalAmount) || 0;
      const invIdStr = inv._id.toString();
      const paymentInfo = invoicePaymentMap.get(invIdStr);

      let allocatedCredit = 0;
      let paymentModeVal = inv.paymentMode || 'Cash';

      if (paymentInfo) {
        allocatedCredit = paymentInfo.totalPayment;
        if (paymentInfo.paymentRecords.length > 0 && paymentInfo.paymentRecords[0].paymentMode) {
          paymentModeVal = paymentInfo.paymentRecords[0].paymentMode;
        }
      } else {
        allocatedCredit = Math.min(invTotal, Number(inv.paidAmount || 0));
      }

      const invPaid = allocatedCredit;
      const invDue = Math.max(0, invTotal - invPaid);
      const currentStatus = calculateInvoicePaymentStatus(invTotal, invPaid, invDue, inv.status);

      inv.currentPaid = invPaid;
      inv.currentDue = invDue;
      inv.currentStatus = currentStatus;

      invoiceTransactions.push({
        id: invIdStr,
        date: new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: new Date(inv.date || inv.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        rawDate: inv.date || inv.createdAt,
        refNo: inv.invoiceNumber,
        type: 'Invoice',
        particulars: `Purchase - ${inv.items?.length || 1} Item${(inv.items && inv.items.length === 1) || !inv.items ? '' : 's'}`,
        amount: invTotal,
        paid: invPaid,
        balance: invDue,
        debit: invTotal,
        credit: invPaid,
        dueAmount: invDue,
        paymentMode: paymentModeVal,
        status: currentStatus,
        items: inv.items || [],
        subtotal: inv.subtotal || invTotal,
        discountAmount: inv.discountAmount || 0,
        taxAmount: inv.taxAmount || 0,
        paidAmount: invPaid,
      });
    });

    otherPayments.forEach((p) => {
      const pIdStr = (p._id || p.id).toString();
      const amt = Number(p.amount) || 0;
      if (amt > 0) {
        const pType = p.paymentType || 'GENERAL_PAYMENT';
        let particularsText = p.notes || '';
        if (!particularsText) {
          if (pType === 'ADVANCE') {
            particularsText = `Received Advance (${p.paymentMode || 'Cash'})`;
          } else {
            particularsText = `Received Payment (${p.paymentMode || 'Cash'})`;
          }
        }

        paymentTransactions.push({
          id: pIdStr,
          date: new Date(p.date || p.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          time: new Date(p.date || p.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          rawDate: p.date || p.createdAt,
          refNo: p.refNo || `PAY-${pIdStr.slice(-6)}`,
          type: pType === 'ADVANCE' ? 'Advance' : 'Payment',
          paymentType: pType,
          particulars: particularsText,
          amount: 0,
          paid: amt,
          balance: 0,
          debit: 0,
          credit: amt,
          paymentMode: p.paymentMode || 'Cash',
          notes: p.notes || '',
        });
      }
    });

    // Ledger transactions contain ONLY Invoices, Payments, and Advances (Starts at balance = 0)
    const allTx = [...invoiceTransactions, ...paymentTransactions];
    allTx.sort((a, b) => {
      const diff = new Date(a.rawDate) - new Date(b.rawDate);
      if (diff !== 0) return diff;
      if (a.type === 'Invoice' && b.type === 'Payment') return -1;
      if (a.type === 'Payment' && b.type === 'Invoice') return 1;
      return 0;
    });

    let runningBalance = 0;
    const transactionsWithBalance = allTx.map((t) => {
      runningBalance = runningBalance + t.debit - t.credit;

      const formattedBalance = runningBalance > 0
        ? `₹ ${runningBalance.toLocaleString('en-IN')} Dr`
        : runningBalance < 0
          ? `₹ ${Math.abs(runningBalance).toLocaleString('en-IN')} Cr`
          : `₹ 0`;

      return {
        ...t,
        balance: runningBalance,
        runningBalance,
        formattedBalance,
      };
    });

    return {
      customer: {
        _id: customer._id,
        name: customer.name,
        mobile: customer.mobile,
        village: customer.village,
        mandal: customer.mandal,
        district: customer.district,
        state: customer.state,
        customerCode: customer.customerCode,
        type: customer.type,
        status: customer.status,
        gstin: customer.gstin,
        createdAt: customer.createdAt,
        totalPurchases,
        totalPaid,
        totalInvoicePaid,
        totalInvoiceDue,
        outstandingBalance,
        advanceBalance,
        creditLimit,
        availableLimit,
        notes: customer.notes || [],
        documents: customer.documents || [],
      },
      transactions: transactionsWithBalance.reverse(),
      invoices,
      payments,
      recentInvoices: invoices.slice(-5).reverse().map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        date: new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        amount: inv.totalAmount,
        status: inv.currentStatus || inv.status,
      })),
    };
  },

  async recordPayment(customerId, paymentData, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) {
      throw new Error('Customer not found');
    }

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const refNo = (paymentData.refNo || '').trim() || (await generateNextPaymentReference(userId));
    const paymentMode = paymentData.paymentMode || 'Cash';
    const invoiceId = paymentData.invoiceId || null;
    const invoiceNumber = (paymentData.invoiceNumber || '').trim();
    let paymentType = paymentData.paymentType || (invoiceId || invoiceNumber ? 'INVOICE_PAYMENT' : 'GENERAL_PAYMENT');
    let notes = (paymentData.notes || '').trim();

    if (paymentType === 'INVOICE_PAYMENT' && !notes && invoiceNumber) {
      notes = `Payment on Sales Bill #${invoiceNumber}`;
    } else if (!notes) {
      notes = 'Payment Received';
    }

    if (refNo) {
      const existingPay = await CustomerPayment.findOne({ userId, customer: customer._id, refNo }).exec();
      if (existingPay) {
        logger.warn(`⚠️ Duplicate payment submit blocked for RefNo: ${refNo}`);
        return existingPay;
      }
    }

    const payment = await CustomerPayment.create({
      userId,
      customer: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      invoiceId,
      invoiceNumber,
      paymentType,
      amount,
      paymentMode,
      refNo,
      notes,
      date: paymentData.date ? new Date(paymentData.date) : new Date(),
    });

    await this.calculateCustomerBalance(customer._id, userId);

    logger.info(`💰 Payment recorded: ₹${amount} (${paymentType}) for Customer ${customer.name} (Ref: ${refNo})`);
    return payment;
  },

  async updatePayment(paymentId, updateData, userId) {
    if (!userId) throw new Error('userId is required');
    const payment = await CustomerPayment.findOne({ _id: paymentId, userId }).exec();
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const newAmount = updateData.amount !== undefined ? parseFloat(updateData.amount) : payment.amount;

    if (isNaN(newAmount) || newAmount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (updateData.paymentMode) payment.paymentMode = updateData.paymentMode;
    if (updateData.refNo) payment.refNo = updateData.refNo.trim();
    if (updateData.notes !== undefined) payment.notes = updateData.notes.trim();
    if (updateData.date) payment.date = new Date(updateData.date);
    payment.amount = newAmount;
    await payment.save();

    if (payment.customer) {
      await this.calculateCustomerBalance(payment.customer, userId);
    }

    return payment;
  },

  async deletePayment(paymentId, userId) {
    if (!userId) throw new Error('userId is required');
    const payment = await CustomerPayment.findOne({ _id: paymentId, userId }).exec();
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const customerId = payment.customer;
    await CustomerPayment.findOneAndDelete({ _id: paymentId, userId }).exec();

    if (customerId) {
      await this.calculateCustomerBalance(customerId, userId);
    }

    return { success: true, message: 'Payment deleted successfully and ledger recalculated' };
  },

  async getSuggestions(userId) {
    if (!userId) throw new Error('userId is required');
    const villages = await Customer.distinct('village', { userId, village: { $ne: null, $ne: '' } });
    const mandals = await Customer.distinct('mandal', { userId, mandal: { $ne: null, $ne: '' } });
    return {
      villages: villages.filter(Boolean).map((v) => v.trim()).sort(),
      mandals: mandals.filter(Boolean).map((m) => m.trim()).sort(),
    };
  },

  async createCustomer(data, userId) {
    if (!userId) throw new Error('userId is required');
    const mobileTrimmed = (data.mobile || '').trim();
    if (!mobileTrimmed) {
      throw new Error('Mobile number is required for customer registration');
    }

    const existing = await Customer.findOne({ userId, mobile: mobileTrimmed, customerType: 'ADDED', isActive: { $ne: false } }).lean().exec();
    if (existing) {
      throw new Error(`Customer with mobile number ${mobileTrimmed} already exists`);
    }

    const nameTrimmed = (data.name || '').trim();

    const customer = await Customer.create({
      ...data,
      userId,
      name: nameTrimmed || `Customer ${mobileTrimmed.slice(-4)}`,
      mobile: mobileTrimmed,
      customerType: 'ADDED',
      status: 'Active',
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      advanceBalance: 0,
      creditLimit: data.creditLimit || 50000,
    });

    await this.calculateCustomerBalance(customer._id, userId);

    return await Customer.findById(customer._id).lean().exec();
  },

  async updateCustomer(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    const updated = await Customer.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true, runValidators: true }).exec();
    if (updated) {
      await this.calculateCustomerBalance(updated._id, userId);
    }

    return await Customer.findById(id).lean().exec();
  },

  async deleteCustomer(id, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: id, userId }).lean().exec();
    if (!customer) {
      throw new Error('Customer not found');
    }
    if ((customer.outstandingBalance || 0) > 0) {
      throw new Error(`Cannot delete customer ${customer.name} with active outstanding balance of ₹ ${customer.outstandingBalance.toLocaleString('en-IN')}`);
    }
    return await Customer.findOneAndDelete({ _id: id, userId }).exec();
  },

  async addNote(customerId, noteData, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) throw new Error('Customer not found');
    const text = (noteData.text || '').trim();
    if (!text) throw new Error('Note text cannot be empty');

    customer.notes.push({ text, author: noteData.author || 'Admin', createdAt: new Date() });
    await customer.save();
    return customer.notes;
  },

  async updateNote(customerId, noteId, noteData, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) throw new Error('Customer not found');
    const note = customer.notes.id(noteId);
    if (!note) throw new Error('Note not found');
    if (noteData.text) note.text = noteData.text.trim();
    await customer.save();
    return customer.notes;
  },

  async deleteNote(customerId, noteId, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) throw new Error('Customer not found');
    customer.notes.pull({ _id: noteId });
    await customer.save();
    return customer.notes;
  },

  async addDocument(customerId, docData, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) throw new Error('Customer not found');
    const title = (docData.title || '').trim();
    const fileUrl = (docData.fileUrl || '').trim();
    if (!title || !fileUrl) throw new Error('Document title and fileUrl are required');

    customer.documents.push({
      title,
      fileUrl,
      fileType: docData.fileType || 'PDF',
      uploadedAt: new Date(),
    });
    await customer.save();
    return customer.documents;
  },

  async deleteDocument(customerId, docId, userId) {
    if (!userId) throw new Error('userId is required');
    const customer = await Customer.findOne({ _id: customerId, userId }).exec();
    if (!customer) throw new Error('Customer not found');
    customer.documents.pull({ _id: docId });
    await customer.save();
    return customer.documents;
  },
};
