import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';
import { CustomerPayment } from '../models/customerPayment.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { logger } from '../../../config/logger.config.js';

export const customerService = {
  async getAllCustomers(query = {}) {
    const filter = { isActive: { $ne: false }, customerType: 'ADDED' };

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

    const customers = await Customer.find(filter).sort({ name: 1 }).lean().exec();

    // Summary statistics for ADDED (Customer Master) Customers ONLY
    const totalCustomers = await Customer.countDocuments({ isActive: { $ne: false }, customerType: 'ADDED' });
    const activeCustomers = await Customer.countDocuments({ isActive: { $ne: false }, customerType: 'ADDED', status: 'Active' });
    const inactiveCustomers = await Customer.countDocuments({ isActive: { $ne: false }, customerType: 'ADDED', status: 'Inactive' });
    const blockedCustomers = await Customer.countDocuments({ isActive: { $ne: false }, customerType: 'ADDED', status: 'Blocked' });

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
        advanceAmount: 3850,
      },
    };
  },

  async getGeneralCustomers(query = {}) {
    // Exclude any invoices belonging to ADDED customers
    const addedCustomers = await Customer.find({ customerType: 'ADDED' }).select('_id mobile').lean().exec();
    const addedCustomerIds = addedCustomers.map((c) => c._id);

    const filter = {
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

    const generalInvoices = await SalesInvoice.find(filter).sort({ date: -1, createdAt: -1 }).lean().exec();

    // Summary metrics strictly for GENERAL Customer bills
    const totalBills = generalInvoices.length;
    const totalPurchaseValue = generalInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
    const totalPaid = generalInvoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
    const outstanding = Math.max(0, totalPurchaseValue - totalPaid);

    // Grouping by customerName + customerMobile for General Customer Cards/Table
    const customerGroupMap = {};
    for (const inv of generalInvoices) {
      const key = `${(inv.customerName || 'General Customer').trim().toLowerCase()}_${(inv.customerMobile || '').trim()}`;
      if (!customerGroupMap[key]) {
        customerGroupMap[key] = {
          _id: inv._id.toString(),
          name: inv.customerName || 'General Customer',
          mobile: inv.customerMobile || '-',
          customerType: 'GENERAL',
          totalPurchases: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          totalBills: 0,
          lastPurchaseDate: inv.date || inv.createdAt,
          invoices: [],
        };
      }
      const grp = customerGroupMap[key];
      grp.totalBills += 1;
      grp.totalPurchases += Number(inv.totalAmount) || 0;
      grp.totalPaid += Number(inv.paidAmount) || 0;
      grp.outstandingBalance += Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0));
      grp.invoices.push(inv);
    }

    const generalCustomers = Object.values(customerGroupMap);

    return {
      customers: generalCustomers,
      invoices: generalInvoices,
      summary: {
        totalCustomers: generalCustomers.length,
        totalBills,
        totalPurchaseValue,
        totalPaid,
        outstanding,
      },
    };
  },

  async calculateCustomerBalance(customerId) {
    const customer = await Customer.findById(customerId).exec();
    if (!customer || customer.customerType === 'GENERAL') return null;

    const invoices = await SalesInvoice.find({
      $or: [
        { customerId: customer._id },
        { customerMobile: customer.mobile, customerType: 'ADDED' },
      ],
    }).sort({ date: 1, createdAt: 1 }).exec();

    const payments = await CustomerPayment.find({
      $or: [
        { customer: customer._id },
        { customerMobile: customer.mobile },
      ],
    }).sort({ date: 1, createdAt: 1 }).exec();

    const totalPurchases = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
    const totalInitialInvoicePaid = invoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
    const totalExplicitPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalPaid = totalInitialInvoicePaid + totalExplicitPayments;

    const outstandingBalance = Math.max(0, totalPurchases - totalPaid);
    const advanceBalance = Math.max(0, totalPaid - totalPurchases);
    const creditLimit = Number(customer.creditLimit || 50000);
    const availableLimit = Math.max(0, creditLimit - outstandingBalance + advanceBalance);

    customer.totalPurchases = totalPurchases;
    customer.totalPaid = totalPaid;
    customer.outstandingBalance = outstandingBalance;
    customer.advanceBalance = advanceBalance;
    await customer.save();

    let extraPaymentPool = totalExplicitPayments;
    for (const inv of invoices) {
      const invTotal = Number(inv.totalAmount) || 0;
      const initialPaid = Math.min(invTotal, Number(inv.paidAmount) || 0);
      const remainingDue = Math.max(0, invTotal - initialPaid);

      const allocatedFromPool = Math.min(extraPaymentPool, remainingDue);
      extraPaymentPool = Math.max(0, extraPaymentPool - allocatedFromPool);

      const effectivePaid = initialPaid + allocatedFromPool;
      const effectiveDue = Math.max(0, invTotal - effectivePaid);

      inv.dueAmount = effectiveDue;
      if (effectiveDue === 0) {
        inv.status = 'Paid';
        inv.dueStatus = 'No Due';
      } else if (effectivePaid > 0) {
        inv.status = 'Partial';
        inv.dueStatus = 'Due In 30 Days';
      } else {
        inv.status = 'Due';
        inv.dueStatus = 'Due In 30 Days';
      }
      await inv.save();
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

  async syncInvoicePayment(invoiceId) {
    if (!invoiceId) return null;
    let invoice = null;
    if (mongoose.Types.ObjectId.isValid(invoiceId)) {
      invoice = await SalesInvoice.findById(invoiceId).exec();
    }
    if (!invoice && typeof invoiceId === 'string') {
      invoice = await SalesInvoice.findOne({ invoiceNumber: invoiceId }).exec();
    }
    if (!invoice) return null;

    const payments = await CustomerPayment.find({
      $or: [
        { invoiceId: invoice._id },
        { invoiceNumber: invoice.invoiceNumber },
      ],
    }).exec();

    const paidFromPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalAmount = Number(invoice.totalAmount) || 0;

    const initialPaid = Number(invoice.paidAmount || 0);
    const totalCombinedPaid = initialPaid + paidFromPayments;
    const finalPaid = Math.min(totalAmount, totalCombinedPaid);
    const dueAmount = Math.max(0, totalAmount - finalPaid);

    let status = 'Due';
    if (dueAmount === 0) {
      status = 'Paid';
    } else if (finalPaid > 0) {
      status = 'Partial';
    }

    const dueStatus = dueAmount === 0 ? 'No Due' : 'Due In 30 Days';

    invoice.dueAmount = dueAmount;
    invoice.status = status;
    invoice.dueStatus = dueStatus;
    await invoice.save();

    if (invoice.customerMobile || invoice.customerName) {
      const customer = await Customer.findOne({
        $or: [
          { mobile: invoice.customerMobile },
          { name: new RegExp(`^${(invoice.customerName || '').trim()}$`, 'i') },
        ],
      }).exec();
      if (customer) {
        await this.calculateCustomerBalance(customer._id);
      }
    }

    return invoice;
  },

  async syncCustomerAndInvoices(customerId) {
    return this.calculateCustomerBalance(customerId);
  },

  async getCustomerById(id) {
    const calcData = await this.calculateCustomerBalance(id);
    if (!calcData) return null;

    const { customer, invoices, payments, totalPurchases, totalPaid, outstandingBalance, advanceBalance, creditLimit, availableLimit } = calcData;

    const invoiceTransactions = [];
    const advanceTransactions = [];

    invoices.forEach((inv) => {
      const invTotal = Number(inv.totalAmount) || 0;
      const invPaid = Number(inv.paidAmount) || 0;

      const cappedCredit = Math.min(invTotal, invPaid);
      const invoiceDue = Math.max(0, invTotal - cappedCredit);
      const overpaidSurplus = Math.max(0, invPaid - invTotal);

      invoiceTransactions.push({
        id: inv._id.toString(),
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
        credit: cappedCredit,
        dueAmount: invoiceDue,
        paymentMode: inv.paymentMode || 'Cash',
        status: inv.status,
        items: inv.items || [],
        subtotal: inv.subtotal || invTotal,
        discountAmount: inv.discountAmount || 0,
        taxAmount: inv.taxAmount || 0,
        paidAmount: invPaid,
      });

      if (overpaidSurplus > 0) {
        advanceTransactions.push({
          id: `adv-${inv._id.toString()}`,
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
          refNo: `ADV-${inv.invoiceNumber}`,
          type: 'Advance',
          particulars: `Advance Balance (Overpaid on Invoice #${inv.invoiceNumber})`,
          debit: 0,
          credit: overpaidSurplus,
          paymentMode: inv.paymentMode || 'Cash',
          notes: 'Customer Overpayment converted to Advance',
        });
      }
    });

    const paymentTransactions = payments.map((p) => ({
      id: p._id.toString(),
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
      refNo: p.refNo,
      type: 'Payment',
      particulars: `Payment Received (${p.paymentMode})`,
      debit: 0,
      credit: p.amount,
      paymentMode: p.paymentMode,
      notes: p.notes,
    }));

    let transactions = [...invoiceTransactions, ...advanceTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(a.rawDate) - new Date(b.rawDate)
    );

    let runningBalance = 0;
    const transactionsWithBalance = transactions.map((t) => {
      runningBalance = runningBalance + (t.debit || 0) - (t.credit || 0);
      const absBal = Math.abs(runningBalance);
      const formattedBalance = runningBalance > 0
        ? `Outstanding ₹${absBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : runningBalance < 0
          ? `Advance ₹${absBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '₹ 0.00';

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

  async recordPayment(customerId, paymentData) {
    const customer = await Customer.findById(customerId).exec();
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

    // 1. Save CustomerPayment permanently in MongoDB
    const payment = await CustomerPayment.create({
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

    // 2. Synchronize Customer totals & Sales Invoices via single source of truth
    await this.calculateCustomerBalance(customer._id);

    logger.info(`💰 Payment recorded: ₹${amount} for Customer ${customer.name} (Ref: ${refNo})`);
    return payment;
  },

  async updatePayment(paymentId, updateData) {
    const payment = await CustomerPayment.findById(paymentId).exec();
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
      await this.calculateCustomerBalance(payment.customer);
    }

    return payment;
  },

  async deletePayment(paymentId) {
    const payment = await CustomerPayment.findById(paymentId).exec();
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const customerId = payment.customer;
    await CustomerPayment.findByIdAndDelete(paymentId).exec();

    if (customerId) {
      await this.calculateCustomerBalance(customerId);
    }

    return { success: true, message: 'Payment deleted successfully and ledger recalculated' };
  },

  async getSuggestions() {
    const villages = await Customer.distinct('village', { village: { $ne: null, $ne: '' } });
    const mandals = await Customer.distinct('mandal', { mandal: { $ne: null, $ne: '' } });
    return {
      villages: villages.filter(Boolean).map((v) => v.trim()).sort(),
      mandals: mandals.filter(Boolean).map((m) => m.trim()).sort(),
    };
  },

  async createCustomer(data) {
    const mobileTrimmed = (data.mobile || '').trim();
    if (!mobileTrimmed) {
      throw new Error('Mobile number is required for customer registration');
    }

    const existing = await Customer.findOne({ mobile: mobileTrimmed, customerType: 'ADDED', isActive: { $ne: false } }).lean().exec();
    if (existing) {
      throw new Error(`Customer with mobile number ${mobileTrimmed} already exists`);
    }

    const nameTrimmed = (data.name || '').trim();

    return await Customer.create({
      ...data,
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

  async updateCustomer(id, data) {
    return await Customer.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean().exec();
  },

  async deleteCustomer(id) {
    const customer = await Customer.findById(id).lean().exec();
    if (!customer) {
      throw new Error('Customer not found');
    }
    if ((customer.outstandingBalance || 0) > 0) {
      throw new Error(`Cannot delete customer ${customer.name} with active outstanding balance of ₹ ${customer.outstandingBalance.toLocaleString('en-IN')}`);
    }
    return await Customer.findByIdAndDelete(id).exec();
  },

  async addNote(customerId, noteData) {
    const customer = await Customer.findById(customerId).exec();
    if (!customer) throw new Error('Customer not found');
    const text = (noteData.text || '').trim();
    if (!text) throw new Error('Note text cannot be empty');

    customer.notes.push({ text, author: noteData.author || 'Admin', createdAt: new Date() });
    await customer.save();
    return customer.notes;
  },

  async updateNote(customerId, noteId, noteData) {
    const customer = await Customer.findById(customerId).exec();
    if (!customer) throw new Error('Customer not found');
    const note = customer.notes.id(noteId);
    if (!note) throw new Error('Note not found');
    if (noteData.text) note.text = noteData.text.trim();
    await customer.save();
    return customer.notes;
  },

  async deleteNote(customerId, noteId) {
    const customer = await Customer.findById(customerId).exec();
    if (!customer) throw new Error('Customer not found');
    customer.notes.pull({ _id: noteId });
    await customer.save();
    return customer.notes;
  },

  async addDocument(customerId, docData) {
    const customer = await Customer.findById(customerId).exec();
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

  async deleteDocument(customerId, docId) {
    const customer = await Customer.findById(customerId).exec();
    if (!customer) throw new Error('Customer not found');
    customer.documents.pull({ _id: docId });
    await customer.save();
    return customer.documents;
  },
};
