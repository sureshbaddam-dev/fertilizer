import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';
import { CustomerPayment } from '../models/customerPayment.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { logger } from '../../../config/logger.config.js';
import { calculateInvoicePaymentStatus, normalizeMoney } from '../../../utils/pricingUtils.js';

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

    const [customers, totalCustomers, activeCustomers, inactiveCustomers, blockedCustomers] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).lean().exec(),
      Customer.countDocuments({ userId, isActive: { $ne: false }, customerType: 'ADDED' }),
      Customer.countDocuments({ userId, isActive: { $ne: false }, customerType: 'ADDED', status: 'Active' }),
      Customer.countDocuments({ userId, isActive: { $ne: false }, customerType: 'ADDED', status: 'Inactive' }),
      Customer.countDocuments({ userId, isActive: { $ne: false }, customerType: 'ADDED', status: 'Blocked' }),
    ]);

    const totalOutstanding = customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
    const customersWithDue = customers.filter((c) => (c.outstandingBalance || 0) > 0).length;

    return {
      customers,
      summary: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        blockedCustomers,
        totalOutstanding,
        customersWithDue,
        advanceAmount: 0,
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
          village: inv.customerVillage || 'Narketpally',
          district: 'Nalgonda',
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
          village: master.village || 'Narketpally',
          district: master.district || 'Nalgonda',
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

    const invoices = await SalesInvoice.find({
      userId,
      isDeleted: { $ne: true },
      $or: [
        { customerId: customer._id },
        { customerMobile: customer.mobile, customerType: 'ADDED' },
      ],
    }).sort({ date: 1, createdAt: 1 }).lean().exec();

    const payments = await CustomerPayment.find({
      userId,
      isDeleted: { $ne: true },
      $or: [
        { customer: customer._id },
        { customerMobile: customer.mobile },
      ],
    }).sort({ date: 1, createdAt: 1 }).lean().exec();

    // Linked invoice IDs that already have a CustomerPayment record
    const linkedInvoiceIds = new Set(
      payments
        .filter((p) => p.invoiceId)
        .map((p) => p.invoiceId.toString())
    );

    const totalPurchases = Math.round(invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0));

    // Sum canonical payments from CustomerPayment documents
    let totalPaidRaw = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Add paidAmount for legacy invoices that do NOT have a linked CustomerPayment
    invoices.forEach((inv) => {
      if (inv.paidAmount > 0 && !linkedInvoiceIds.has(inv._id.toString())) {
        totalPaidRaw += Number(inv.paidAmount) || 0;
      }
    });

    const totalPaid = Math.round(totalPaidRaw);
    const netBalance = totalPurchases - totalPaid;
    const outstandingBalance = Math.max(0, netBalance);
    const advanceBalance = Math.max(0, -netBalance);
    const creditLimit = Number(customer.creditLimit || 50000);
    const availableLimit = Math.max(0, creditLimit - outstandingBalance + advanceBalance);

    customer.totalPurchases = totalPurchases;
    customer.totalPaid = totalPaid;
    customer.outstandingBalance = outstandingBalance;
    customer.advanceBalance = advanceBalance;
    await customer.save();

    const invoiceBulkOps = [];
    for (const inv of invoices) {
      const invTotal = Number(inv.totalAmount) || 0;
      const effectiveDue = Math.max(0, invTotal - (inv.paidAmount || 0));
      const newStatus = calculateInvoicePaymentStatus(invTotal, inv.paidAmount, effectiveDue, inv.status);
      const newDueStatus = effectiveDue <= 0.01 ? 'No Due' : 'Due In 30 Days';

      if (
        inv.dueAmount !== effectiveDue ||
        inv.status !== newStatus ||
        inv.dueStatus !== newDueStatus
      ) {
        inv.dueAmount = effectiveDue;
        inv.status = newStatus;
        inv.dueStatus = newDueStatus;
        invoiceBulkOps.push({
          updateOne: {
            filter: { _id: inv._id },
            update: { $set: { dueAmount: effectiveDue, status: newStatus, dueStatus: newDueStatus } },
          },
        });
      }
    }

    if (invoiceBulkOps.length > 0) {
      await SalesInvoice.bulkWrite(invoiceBulkOps);
    }

    return {
      customer,
      invoices,
      payments,
      totalPurchases,
      totalPaid,
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

    const { customer, invoices, payments, totalPurchases, totalPaid, outstandingBalance, advanceBalance, creditLimit, availableLimit } = calcData;

    // Track payment IDs that are allocated/linked to invoices
    const allocatedPaymentIds = new Set();
    const invoicePaymentMap = new Map(); // invoiceId -> sumOfPayments

    payments.forEach((p) => {
      let invId = p.invoiceId ? p.invoiceId.toString() : null;
      if (!invId && p.refNo?.startsWith('PAY-BILL-')) {
        const invNum = p.refNo.replace('PAY-BILL-', '').trim();
        const matchedInv = invoices.find((i) => i.invoiceNumber === invNum);
        if (matchedInv) invId = matchedInv._id.toString();
      }

      if (invId) {
        allocatedPaymentIds.add((p._id || p.id).toString());
        const currentSum = invoicePaymentMap.get(invId) || 0;
        invoicePaymentMap.set(invId, currentSum + (Number(p.amount) || 0));
      }
    });

    const invoiceTransactions = invoices.map((inv) => {
      const invTotal = Number(inv.totalAmount) || 0;
      const invIdStr = inv._id.toString();

      // Sum of explicit payments linked to this invoice
      const explicitAllocated = invoicePaymentMap.get(invIdStr) || 0;

      // Fallback for legacy invoices without CustomerPayment doc
      const invPaid = Number(inv.paidAmount) || 0;
      const totalCredit = explicitAllocated > 0 ? explicitAllocated : invPaid;

      const invoiceDue = Math.max(0, invTotal - totalCredit);

      return {
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
        particulars: `Purchase - ${inv.items?.length || 1} Items`,
        debit: invTotal,
        credit: totalCredit,
        dueAmount: invoiceDue,
        paymentMode: inv.paymentMode || 'Cash',
        status: calculateInvoicePaymentStatus(invTotal, totalCredit, invoiceDue, inv.status),
        items: inv.items || [],
        subtotal: inv.subtotal || invTotal,
        discountAmount: inv.discountAmount || 0,
        taxAmount: inv.taxAmount || 0,
        paidAmount: totalCredit,
      };
    });

    // Standalone / unlinked payments (e.g. general advance payments not tied to an invoice)
    const unlinkedPayments = payments.filter((p) => !allocatedPaymentIds.has((p._id || p.id).toString()));

    const standalonePaymentTransactions = unlinkedPayments.map((p) => ({
      id: (p._id || p.id).toString(),
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
      refNo: p.refNo || `PAY-${(p._id || p.id).toString().slice(-6)}`,
      type: 'Payment',
      particulars: p.notes || `Received Payment (${p.paymentMode || 'Cash'})`,
      debit: 0,
      credit: Number(p.amount) || 0,
      paymentMode: p.paymentMode || 'Cash',
      notes: p.notes || '',
    }));

    const allTx = [...invoiceTransactions, ...standalonePaymentTransactions];
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
        status: inv.status,
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

    const refNo = (paymentData.refNo || '').trim() || `PAY-${Date.now().toString().slice(-6)}`;
    const paymentMode = paymentData.paymentMode || 'Cash';
    const notes = (paymentData.notes || '').trim();
    const invoiceId = paymentData.invoiceId || null;
    const invoiceNumber = (paymentData.invoiceNumber || '').trim();

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
      amount,
      paymentMode,
      refNo,
      notes,
      date: paymentData.date ? new Date(paymentData.date) : new Date(),
    });

    await this.calculateCustomerBalance(customer._id, userId);

    logger.info(`💰 Payment recorded: ₹${amount} for Customer ${customer.name} (Ref: ${refNo})`);
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

    return await Customer.create({
      ...data,
      userId,
      name: nameTrimmed || `Customer ${mobileTrimmed.slice(-4)}`,
      mobile: mobileTrimmed,
      customerType: 'ADDED',
      status: 'Active',
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      creditLimit: data.creditLimit || 50000,
    });
  },

  async updateCustomer(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    return await Customer.findOneAndUpdate({ _id: id, userId }, { $set: cleanData }, { new: true, runValidators: true }).lean().exec();
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
