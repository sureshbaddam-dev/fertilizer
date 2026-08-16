import mongoose from 'mongoose';
import { SalesInvoice } from '../models/salesInvoice.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { CustomerPayment } from '../../customers/models/customerPayment.model.js';
import { customerService } from '../../customers/services/customer.service.js';
import { Product } from '../../products/models/product.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { StockLedger } from '../../purchases/models/stockLedger.model.js';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { calculateInvoicePaymentStatus, normalizeMoney } from '../../../utils/pricingUtils.js';

import { ShopSettings } from '../../settings/models/shopSettings.model.js';

export async function generateNextInvoiceNumber(userId) {
  if (!userId) throw new Error('userId is required');

  // 1. Dynamic Shop Name & First Alphabet Extraction
  let shopName = '';
  try {
    const settings = await ShopSettings.findOne({ userId }).lean().exec();
    shopName = (settings?.shopName || settings?.name || '').trim();
  } catch (err) {
    logger.warn(`Could not fetch ShopSettings for invoice prefix for user ${userId}:`, err);
  }

  let shopLetter = 'A';
  if (shopName) {
    const match = shopName.match(/[a-zA-Z]/);
    if (match && match[0]) {
      shopLetter = match[0].toUpperCase();
    }
  }

  // 2. Year & Month (YYMM)
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${shopLetter}${yy}${mm}`;

  // 3. Find highest existing sequence number for this prefix
  const prefixRegex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const invoices = await SalesInvoice.find({ userId, invoiceNumber: { $regex: prefixRegex } })
    .select('invoiceNumber')
    .lean()
    .exec();

  let maxSeq = 0;

  if (Array.isArray(invoices) && invoices.length > 0) {
    for (const inv of invoices) {
      if (inv?.invoiceNumber) {
        const match = inv.invoiceNumber.match(prefixRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}${nextSeq}`;

  while (await SalesInvoice.exists({ userId, invoiceNumber: candidate })) {
    nextSeq += 1;
    candidate = `${prefix}${nextSeq}`;
  }

  return candidate;
}

export const salesInvoiceService = {
  async seedDefaultInvoices() {
    return;
  },

  async getAllInvoices(query = {}, userId) {
    if (!userId) throw new Error('userId is required');

    // 1. Authoritative DB Synchronization for userId invoices
    const allDbInvoicesDocs = await SalesInvoice.find({ userId }).exec();
    for (const doc of allDbInvoicesDocs) {
      const normTotal = Math.max(0, normalizeMoney(doc.totalAmount || 0));
      const normPaid = Math.max(0, normalizeMoney(doc.paidAmount || 0));
      const effectiveDue = Math.max(0, normalizeMoney(normTotal - normPaid));
      const authStatus = calculateInvoicePaymentStatus(normTotal, normPaid, effectiveDue, doc.status);

      if (doc.status !== authStatus || Math.abs((doc.dueAmount || 0) - effectiveDue) > 0.001) {
        doc.status = authStatus;
        doc.dueAmount = effectiveDue;
        doc.dueStatus = effectiveDue <= 0.01 ? 'No Due' : 'Due In 30 Days';
        await doc.save();
      }
    }

    const filter = { userId };

    if (query.status && query.status !== 'all') {
      filter.status = new RegExp(`^${query.status}$`, 'i');
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const toDate = new Date(query.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    if (query.customer) {
      filter.customerName = new RegExp(query.customer.trim(), 'i');
    }

    if (query.paymentStatus && query.paymentStatus !== 'all') {
      filter.status = new RegExp(`^${query.paymentStatus}$`, 'i');
    }

    if (query.dueStatus && query.dueStatus !== 'all') {
      if (query.dueStatus === 'nodue') filter.dueStatus = 'No Due';
      if (query.dueStatus === 'duein30') filter.dueStatus = 'Due In 30 Days';
      if (query.dueStatus === 'overdue') filter.dueStatus = 'Overdue';
    }

    if (query.paymentMode && query.paymentMode !== 'all') {
      filter.paymentMode = query.paymentMode;
    }

    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.max(1, parseInt(query.limit || 10, 10));
    const skip = (page - 1) * limit;

    const invoices = await SalesInvoice.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const totalRecords = await SalesInvoice.countDocuments(filter);
    const allMatchingDocs = await SalesInvoice.find(filter).lean().exec();

    let totalBills = allMatchingDocs.length;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    allMatchingDocs.forEach((doc) => {
      totalAmount += doc.totalAmount || 0;
      totalPaid += doc.paidAmount || 0;
      totalDue += doc.dueAmount || 0;
    });

    const duePercentage = totalAmount > 0 ? Number(((totalDue / totalAmount) * 100).toFixed(1)) : 0;

    const allDbInvoices = await SalesInvoice.find({ userId }).lean().exec();
    const counters = {
      all: allDbInvoices.length,
      paid: allDbInvoices.filter((i) => i.status === 'Paid').length,
      partial: allDbInvoices.filter((i) => i.status === 'Partial').length,
      due: allDbInvoices.filter((i) => i.status === 'Due').length,
      cancelled: allDbInvoices.filter((i) => i.status === 'Cancelled').length,
    };

    return {
      invoices,
      total: totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      metrics: {
        totalBills,
        totalAmount,
        totalPaid,
        totalDue,
        duePercentage,
      },
      counters,
    };
  },

  async getInvoiceById(id, userId) {
    if (!userId) throw new Error('userId is required');
    let invoice = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await SalesInvoice.findOne({ _id: id, userId }).exec();
    }
    if (!invoice && id) {
      invoice = await SalesInvoice.findOne({ invoiceNumber: id, userId }).exec();
    }
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    const normTotal = Math.max(0, normalizeMoney(invoice.totalAmount || 0));
    const normPaid = Math.max(0, normalizeMoney(invoice.paidAmount || 0));
    const effectiveDue = Math.max(0, normalizeMoney(normTotal - normPaid));
    const authStatus = calculateInvoicePaymentStatus(normTotal, normPaid, effectiveDue, invoice.status);

    if (invoice.status !== authStatus || Math.abs((invoice.dueAmount || 0) - effectiveDue) > 0.001) {
      invoice.status = authStatus;
      invoice.dueAmount = effectiveDue;
      invoice.dueStatus = effectiveDue <= 0.01 ? 'No Due' : 'Due In 30 Days';
      await invoice.save();
    }

    return invoice.toObject ? invoice.toObject() : invoice;
  },

  async createInvoice(data, userId) {
    if (!userId) throw new Error('userId is required');
    const {
      customer: customerObj,
      customerName: inputCustomerName,
      customerMobile: inputCustomerMobile,
      items = [],
      subtotal = 0,
      discountAmount = 0,
      taxAmount = 0,
      totalAmount = 0,
      paidAmount: inputPaidAmount,
      paymentMode = 'Cash',
      notes = '',
    } = data;

    const customerName = (customerObj?.name || inputCustomerName || 'General Customer').trim();
    const customerMobile = (customerObj?.mobile || inputCustomerMobile || '').trim();

    let customerDoc = null;
    let customerTypeVal = 'GENERAL';

    const reqCustId = customerObj?._id || data.customerId;
    if (reqCustId && mongoose.Types.ObjectId.isValid(reqCustId)) {
      const foundCust = await Customer.findOne({ _id: reqCustId, userId }).exec();
      if (foundCust && foundCust.customerType === 'ADDED') {
        customerDoc = foundCust;
        customerTypeVal = 'ADDED';
      }
    } else if (data.customerType === 'ADDED' && customerMobile) {
      const foundCust = await Customer.findOne({ userId, mobile: customerMobile, customerType: 'ADDED', isActive: true }).exec();
      if (foundCust) {
        customerDoc = foundCust;
        customerTypeVal = 'ADDED';
      }
    }

    const idempotencyKey = data.idempotencyKey || null;
    if (idempotencyKey) {
      const existingInv = await SalesInvoice.findOne({ userId, idempotencyKey }).exec();
      if (existingInv) {
        return {
          invoice: existingInv,
          customer: customerDoc,
          advanceUsed: 0,
          newBillDue: existingInv.dueAmount,
          clearedPrevDue: 0,
        };
      }
    }

    for (const item of items) {
      const prodId = item.productId || item.id || item._id;
      const qty = Number(item.qty || item.quantity || 0);
      if (prodId && qty > 0) {
        let prod = null;
        if (mongoose.Types.ObjectId.isValid(prodId)) {
          prod = await Product.findOne({ _id: prodId, userId }).populate('defaultUnitId').exec();
        }
        if (!prod && typeof prodId === 'string') {
          prod = await Product.findOne({
            userId,
            $or: [{ name: new RegExp(`^${prodId.trim()}$`, 'i') }, { code: prodId }],
          }).populate('defaultUnitId').exec();
        }

        if (!prod) {
          throw new AppError(`Product with ID '${prodId}' not found`, HTTP_STATUS.BAD_REQUEST);
        }

        const prodName = prod.name || item.name || item.productName || 'Product';
        const unitName = prod.defaultUnitId?.shortName || item.unit || 'Bag';

        const activeBatchesForStock = await ProductBatch.find({
          userId,
          productId: prod._id,
          isDeleted: { $ne: true },
          isActive: { $ne: false },
          currentStock: { $gt: 0 },
        }).lean().exec();

        let availableStock = 0;
        if (activeBatchesForStock.length > 0) {
          availableStock = activeBatchesForStock.reduce((sum, b) => sum + Math.max(0, Number(b.currentStock || 0)), 0);
        } else {
          availableStock = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
        }

        if (availableStock < qty) {
          throw new AppError(
            `Only ${availableStock} ${unitName}s available for "${prodName}". Requested: ${qty}.`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }
    }

    const itemSnapshots = [];
    const batchDeductionsToApply = [];
    const virtualBatchStockMap = new Map();

    for (const i of items) {
      const pId = i.productId || i.id || i._id;
      const qty = Number(i.qty || i.quantity || 1);
      const inputUnitPrice = Number(i.price || i.unitPrice || 0);

      let prod = null;
      if (pId && mongoose.Types.ObjectId.isValid(pId)) {
        prod = await Product.findOne({ _id: pId, userId }).populate('brandId categoryId defaultUnitId').lean().exec();
      }

      const pCode = i.productCode || prod?.code || '';
      const pName = i.name || i.productName || prod?.name || 'Agri Product';
      const bName = i.brandName || prod?.brandId?.name || prod?.company || '';
      const cName = i.categoryName || prod?.categoryId?.name || 'General';
      const uName = i.unitName || prod?.defaultUnitId?.shortName || i.unit || 'Unit';
      const hsn = i.hsnCode || prod?.hsnCode || '';
      const gst = Number(i.gstRate ?? i.gstPercent ?? prod?.gstRate ?? 18);

      let remainingToAllocate = qty;
      let totalLineCost = 0;
      let totalBatchSellingRevenue = 0;
      let primaryBatchNumber = i.batchNumber || '';
      const itemBatchAllocations = [];

      if (pId) {
        const activeBatches = await ProductBatch.find({
          userId,
          productId: pId,
          isDeleted: { $ne: true },
          isActive: { $ne: false },
          currentStock: { $gt: 0 },
        }).sort({ createdAt: 1 }).lean().exec();

        for (const batch of activeBatches) {
          if (remainingToAllocate <= 0) break;

          const bIdStr = batch._id.toString();
          const currentAvailable = virtualBatchStockMap.has(bIdStr)
            ? virtualBatchStockMap.get(bIdStr)
            : Number(batch.currentStock || 0);

          if (currentAvailable <= 0) continue;

          const allocatedQty = Math.min(currentAvailable, remainingToAllocate);
          virtualBatchStockMap.set(bIdStr, currentAvailable - allocatedQty);

          const bPurchaseRate = Number(batch.purchaseRate || 0);
          const bSellingPrice = Number(batch.sellingPrice || prod?.defaultSellingPrice || inputUnitPrice || 0);

          batchDeductionsToApply.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            allocatedQty,
            purchaseRate: bPurchaseRate,
            sellingPrice: bSellingPrice,
            productId: pId,
          });

          itemBatchAllocations.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            quantity: allocatedQty,
            purchaseRate: bPurchaseRate,
            sellingPrice: bSellingPrice,
          });

          totalLineCost += allocatedQty * bPurchaseRate;
          totalBatchSellingRevenue += allocatedQty * bSellingPrice;
          remainingToAllocate -= allocatedQty;
          if (!primaryBatchNumber) primaryBatchNumber = batch.batchNumber;
        }
      }

      if (remainingToAllocate > 0) {
        const fallbackCostRate = Number(i.purchaseCostRate || i.purchaseRate || prod?.defaultPurchaseRate || 0);
        const fallbackSellingPrice = inputUnitPrice || Number(prod?.defaultSellingPrice || 0);
        totalLineCost += remainingToAllocate * fallbackCostRate;
        totalBatchSellingRevenue += remainingToAllocate * fallbackSellingPrice;
      }

      const distinctSellingPrices = new Set(itemBatchAllocations.map((a) => a.sellingPrice));
      const discountPct = Number(i.discountPct || i.discountPercent || 0);

      if (itemBatchAllocations.length > 1 && distinctSellingPrices.size > 1) {
        for (const alloc of itemBatchAllocations) {
          const allocQty = alloc.quantity;
          const allocSellingPrice = alloc.sellingPrice;
          const allocCostRate = alloc.purchaseRate;

          const allocGrossTotal = allocQty * allocSellingPrice;
          const allocDiscountAmount = (allocGrossTotal * discountPct) / 100;
          const allocTaxableAmount = Math.max(0, allocGrossTotal - allocDiscountAmount);
          const hasItemGst = i.gstAmount !== undefined || i.taxableAmount !== undefined || Number(i.gstRate || 0) > 0;
          const allocGstAmount = hasItemGst ? (allocTaxableAmount * gst) / 100 : 0;
          const allocLineTotal = allocTaxableAmount + allocGstAmount;
          const allocLineCost = allocQty * allocCostRate;
          const allocLineProfit = allocTaxableAmount - allocLineCost;

          itemSnapshots.push({
            productId: pId,
            productCode: pCode,
            productName: pName,
            brandName: bName,
            categoryName: cName,
            unitName: uName,
            hsnCode: hsn,
            image: prod?.image || i.image || '',
            batchNumber: alloc.batchNumber,
            batchAllocations: [alloc],
            quantity: allocQty,
            unitPrice: allocSellingPrice,
            purchaseCostRate: allocCostRate,
            discountPct,
            discountAmount: allocDiscountAmount,
            gstRate: hasItemGst ? gst : 0,
            gstAmount: allocGstAmount,
            taxableAmount: allocTaxableAmount,
            lineTotal: allocLineTotal,
            lineProfit: allocLineProfit,
            totalAmount: allocLineTotal,
          });
        }
      } else {
        const effectiveSellingUnitPrice = itemBatchAllocations.length > 0
          ? Number(itemBatchAllocations[0].sellingPrice)
          : inputUnitPrice;

        const effectiveAverageCostRate = qty > 0 ? totalLineCost / qty : 0;
        const lineGrossTotal = qty * effectiveSellingUnitPrice;
        const lineDiscountAmount = i.discountAmount !== undefined ? Number(i.discountAmount) : (lineGrossTotal * discountPct) / 100;
        const lineTaxableAmount = i.taxableAmount !== undefined ? Number(i.taxableAmount) : Math.max(0, lineGrossTotal - lineDiscountAmount);
        const hasItemGst = i.gstAmount !== undefined || i.taxableAmount !== undefined || Number(i.gstRate || 0) > 0;
        const lineGstAmount = i.gstAmount !== undefined ? Number(i.gstAmount) : (hasItemGst ? (lineTaxableAmount * gst) / 100 : 0);
        const itemLineTotal = i.lineTotal !== undefined ? Number(i.lineTotal) : (lineTaxableAmount + lineGstAmount);
        const lineProfit = lineTaxableAmount - totalLineCost;

        itemSnapshots.push({
          productId: pId,
          productCode: pCode,
          productName: pName,
          brandName: bName,
          categoryName: cName,
          unitName: uName,
          hsnCode: hsn,
          image: prod?.image || i.image || '',
          batchNumber: primaryBatchNumber,
          batchAllocations: itemBatchAllocations,
          quantity: qty,
          unitPrice: effectiveSellingUnitPrice,
          purchaseCostRate: effectiveAverageCostRate,
          discountPct,
          discountAmount: lineDiscountAmount,
          gstRate: hasItemGst ? gst : 0,
          gstAmount: lineGstAmount,
          taxableAmount: lineTaxableAmount,
          lineTotal: itemLineTotal,
          lineProfit,
          totalAmount: itemLineTotal,
        });
      }
    }

    const authoritativeSubtotal = itemSnapshots.reduce((sum, s) => sum + (Number(s.lineTotal) || Number(s.totalAmount) || 0), 0);
    const authoritativeTaxAmount = itemSnapshots.reduce((sum, s) => sum + (Number(s.gstAmount) || 0), 0);
    const authoritativeDiscountAmount = Number(discountAmount || 0);
    const grandTotal = Math.max(0, Math.round((authoritativeSubtotal - authoritativeDiscountAmount + Number.EPSILON) * 100) / 100);

    let paidAmount = inputPaidAmount !== undefined ? Number(inputPaidAmount) : grandTotal;
    if (isNaN(paidAmount) || paidAmount < 0) paidAmount = grandTotal;

    let prevOutstanding = Number(customerDoc?.outstandingBalance || 0);
    let prevAdvance = Number(customerDoc?.advanceBalance || 0);

    const advanceUsed = Math.min(prevAdvance, grandTotal);
    const netBillToPay = grandTotal - advanceUsed;
    let remainingAdvance = prevAdvance - advanceUsed;

    let newBillDue = 0;
    let extraPaid = 0;
    let clearedPrevDue = 0;
    let newTotalOutstanding = prevOutstanding;
    let newCustomerAdvance = remainingAdvance;

    if (paidAmount < netBillToPay) {
      newBillDue = netBillToPay - paidAmount;
      newTotalOutstanding = prevOutstanding + newBillDue;
    } else if (paidAmount === netBillToPay) {
      newBillDue = 0;
      newTotalOutstanding = prevOutstanding;
    } else {
      newBillDue = 0;
      extraPaid = paidAmount - netBillToPay;

      if (prevOutstanding > 0) {
        clearedPrevDue = Math.min(prevOutstanding, extraPaid);
        const remainingExtra = extraPaid - clearedPrevDue;
        newTotalOutstanding = prevOutstanding - clearedPrevDue;
        newCustomerAdvance = remainingAdvance + remainingExtra;
      } else {
        newCustomerAdvance = remainingAdvance + extraPaid;
        newTotalOutstanding = 0;
      }
    }

    const status = calculateInvoicePaymentStatus(grandTotal, paidAmount, newBillDue, data.status);
    let dueStatus = newBillDue <= 0.01 ? 'No Due' : 'Due In 30 Days';

    const autoInvoiceNumber = await generateNextInvoiceNumber(userId);

    const newInvoice = await SalesInvoice.create({
      userId,
      invoiceNumber: autoInvoiceNumber,
      date: data.date ? new Date(data.date) : new Date(),
      customerId: customerDoc ? customerDoc._id : null,
      customerType: customerTypeVal,
      customerName,
      customerMobile,
      customerAddress: (customerObj?.address || data.customerAddress || '').trim(),
      items: itemSnapshots,
      subtotal: authoritativeSubtotal,
      taxAmount: authoritativeTaxAmount,
      discountAmount: authoritativeDiscountAmount,
      totalAmount: grandTotal,
      paidAmount,
      dueAmount: newBillDue,
      status,
      dueStatus,
      paymentMode,
      notes,
      idempotencyKey,
    });

    for (const bDeduction of batchDeductionsToApply) {
      const updatedBatch = await ProductBatch.findOneAndUpdate(
        { _id: bDeduction.batchId, userId, currentStock: { $gte: bDeduction.allocatedQty } },
        { $inc: { currentStock: -bDeduction.allocatedQty } },
        { new: true }
      ).exec();

      if (!updatedBatch) {
        throw new AppError(
          `Insufficient stock in batch '${bDeduction.batchNumber}' due to a concurrent update. Please try again.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      if (updatedBatch.currentStock === 0) {
        updatedBatch.isActive = false;
        await updatedBatch.save();
      }
    }

    for (const item of items) {
      const prodId = item.productId || item.id || item._id;
      const qty = Number(item.qty || item.quantity || 0);
      if (prodId && qty > 0) {
        let prod = null;
        if (mongoose.Types.ObjectId.isValid(prodId)) {
          prod = await Product.findOne({ _id: prodId, userId }).exec();
        }
        if (!prod && typeof prodId === 'string') {
          prod = await Product.findOne({
            userId,
            $or: [{ name: new RegExp(`^${prodId.trim()}$`, 'i') }, { code: prodId }],
          }).exec();
        }
        if (prod) {
          const previousStock = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
          const currentStock = Math.max(0, previousStock - qty);
          prod.totalStock = currentStock;
          await prod.save();

          await StockLedger.create({
            userId,
            transactionType: 'SALE',
            referenceId: newInvoice._id,
            referenceNumber: newInvoice.invoiceNumber,
            productId: prod._id,
            batchId: itemSnapshots.find((s) => s.productId?.toString() === prod._id.toString())?.batchAllocations[0]?.batchId || null,
            batchNumber: itemSnapshots.find((s) => s.productId?.toString() === prod._id.toString())?.batchNumber || '',
            quantity: -qty,
            purchaseRate: prod.defaultPurchaseRate || 0,
            sellingPrice: item.price || item.unitPrice || prod.defaultSellingPrice || 0,
            previousStock,
            currentStock,
            createdBy: 'POS System',
            timestamp: newInvoice.date,
          });
        }
      }
    }

    if (customerDoc) {
      customerDoc.totalPurchases = (customerDoc.totalPurchases || 0) + grandTotal;
      customerDoc.totalPaid = (customerDoc.totalPaid || 0) + paidAmount + advanceUsed;
      customerDoc.outstandingBalance = newTotalOutstanding;
      customerDoc.advanceBalance = newCustomerAdvance;
      await customerDoc.save();

      if (paidAmount > 0) {
        const payRef = `PAY-BILL-${newInvoice.invoiceNumber}`;
        const existingPayment = await CustomerPayment.findOne({
          userId,
          $or: [
            { invoiceId: newInvoice._id },
            { refNo: payRef },
          ],
        }).exec();

        if (!existingPayment) {
          await CustomerPayment.create({
            userId,
            customer: customerDoc._id,
            customerName: customerDoc.name,
            customerMobile: customerDoc.mobile,
            invoiceId: newInvoice._id,
            invoiceNumber: newInvoice.invoiceNumber,
            amount: paidAmount,
            paymentMode,
            refNo: payRef,
            notes: `Direct payment on Sales Bill #${newInvoice.invoiceNumber}`,
            date: newInvoice.date,
          });
        }
      }

      await customerService.calculateCustomerBalance(customerDoc._id, userId);
    }

    return {
      invoice: newInvoice,
      customer: customerDoc,
      advanceUsed,
      newBillDue,
      clearedPrevDue,
    };
  },

  async previewInvoice(data, userId) {
    if (!userId) throw new Error('userId is required');
    const { items = [] } = data;
    if (!items || items.length === 0) {
      return { items: [], subtotal: 0, totalAmount: 0 };
    }

    const previewItems = [];
    let calculatedSubtotal = 0;
    const virtualBatchStockMap = new Map();

    for (const i of items) {
      const pId = i.productId || i.id || i._id;
      const qty = Number(i.qty || i.quantity || 1);
      const inputUnitPrice = Number(i.price || i.unitPrice || 0);

      if (!pId || qty <= 0) continue;

      let prod = null;
      if (mongoose.Types.ObjectId.isValid(pId)) {
        prod = await Product.findOne({ _id: pId, userId }).populate('brandId categoryId defaultUnitId').lean().exec();
      }

      const pCode = i.productCode || prod?.code || '';
      const pName = i.name || i.productName || prod?.name || 'Agri Product';
      const bName = i.brandName || prod?.brandId?.name || prod?.company || '';
      const cName = i.categoryName || prod?.categoryId?.name || 'General';
      const uName = i.unitName || prod?.defaultUnitId?.shortName || i.unit || 'Bag';

      const activeBatches = await ProductBatch.find({
        userId,
        productId: pId,
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        currentStock: { $gt: 0 },
      }).sort({ createdAt: 1 }).lean().exec();

      let totalStockAvailable = 0;
      if (activeBatches.length > 0) {
        totalStockAvailable = activeBatches.reduce((sum, b) => sum + Math.max(0, Number(b.currentStock || 0)), 0);
      } else if (prod) {
        totalStockAvailable = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
      }

      const isInsufficient = qty > totalStockAvailable;

      let remainingToAllocate = qty;
      const itemBatchAllocations = [];

      for (const batch of activeBatches) {
        if (remainingToAllocate <= 0) break;
        const bIdStr = batch._id.toString();
        const currentAvailable = virtualBatchStockMap.has(bIdStr)
          ? virtualBatchStockMap.get(bIdStr)
          : Number(batch.currentStock || 0);

        if (currentAvailable <= 0) continue;

        const allocatedQty = Math.min(currentAvailable, remainingToAllocate);
        virtualBatchStockMap.set(bIdStr, currentAvailable - allocatedQty);

        const bPurchaseRate = Number(batch.purchaseRate || 0);
        const bSellingPrice = Number(batch.sellingPrice || prod?.defaultSellingPrice || inputUnitPrice || 0);

        itemBatchAllocations.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          quantity: allocatedQty,
          purchaseRate: bPurchaseRate,
          sellingPrice: bSellingPrice,
        });

        remainingToAllocate -= allocatedQty;
      }

      if (remainingToAllocate > 0) {
        const fallbackSellingPrice = inputUnitPrice || Number(prod?.defaultSellingPrice || 0);
        itemBatchAllocations.push({
          batchId: null,
          batchNumber: '',
          quantity: remainingToAllocate,
          purchaseRate: Number(prod?.defaultPurchaseRate || 0),
          sellingPrice: fallbackSellingPrice,
        });
      }

      const distinctSellingPrices = new Set(itemBatchAllocations.map((a) => a.sellingPrice));

      if (itemBatchAllocations.length > 1 && distinctSellingPrices.size > 1) {
        itemBatchAllocations.forEach((alloc, idx) => {
          const allocLineTotal = alloc.quantity * alloc.sellingPrice;
          calculatedSubtotal += allocLineTotal;

          previewItems.push({
            productId: pId,
            originalProductId: pId,
            productCode: pCode,
            productName: pName,
            brandName: bName,
            categoryName: cName,
            unitName: uName,
            image: prod?.image || i.image || '',
            batchNumber: alloc.batchNumber,
            batchAllocations: [alloc],
            quantity: alloc.quantity,
            qty: alloc.quantity,
            unitPrice: alloc.sellingPrice,
            price: alloc.sellingPrice,
            totalAmount: allocLineTotal,
            lineTotal: allocLineTotal,
            totalStockAvailable,
            insufficientStock: isInsufficient,
            isFifoSplit: true,
            fifoSplitNotice: idx > 0
              ? `Taken from next batch at ₹${alloc.sellingPrice} (Previous batch contained ${itemBatchAllocations[0].quantity} ${uName}s @ ₹${itemBatchAllocations[0].sellingPrice})`
              : undefined,
          });
        });
      } else {
        const effectiveSellingUnitPrice = itemBatchAllocations.length > 0
          ? Number(itemBatchAllocations[0].sellingPrice)
          : inputUnitPrice;

        const lineTotal = qty * effectiveSellingUnitPrice;
        calculatedSubtotal += lineTotal;

        previewItems.push({
          productId: pId,
          originalProductId: pId,
          productCode: pCode,
          productName: pName,
          brandName: bName,
          categoryName: cName,
          unitName: uName,
          image: prod?.image || i.image || '',
          batchNumber: itemBatchAllocations[0]?.batchNumber || '',
          batchAllocations: itemBatchAllocations,
          quantity: qty,
          qty,
          unitPrice: effectiveSellingUnitPrice,
          price: effectiveSellingUnitPrice,
          totalAmount: lineTotal,
          lineTotal,
          totalStockAvailable,
          insufficientStock: isInsufficient,
        });
      }
    }

    return {
      items: previewItems,
      subtotal: calculatedSubtotal,
      totalAmount: calculatedSubtotal,
    };
  },

  async deleteInvoice(id, userId) {
    if (!userId) throw new Error('userId is required');
    const invoice = await SalesInvoice.findOne({ _id: id, userId }).exec();
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    for (const item of invoice.items) {
      if (item.productId && item.quantity > 0) {
        const prod = await Product.findOne({ _id: item.productId, userId }).exec();
        if (prod) {
          prod.totalStock = (prod.totalStock || 0) + item.quantity;
          await prod.save();
        }
      }

      if (item.batchAllocations && item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          if (alloc.batchId && alloc.quantity > 0) {
            await ProductBatch.findOneAndUpdate(
              { _id: alloc.batchId, userId },
              { $inc: { currentStock: alloc.quantity } }
            ).exec();
          }
        }
      }
    }

    if (invoice.customerId) {
      await CustomerPayment.deleteMany({ userId, invoiceId: invoice._id }).exec();
    }

    await SalesInvoice.findOneAndDelete({ _id: id, userId }).exec();

    if (invoice.customerId) {
      await customerService.calculateCustomerBalance(invoice.customerId, userId);
    }

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} deleted successfully and inventory restored`,
    };
  },

  async updateInvoice(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    const updatedInvoice = await SalesInvoice.findOneAndUpdate(
      { _id: id, userId },
      { $set: cleanData },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedInvoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }
    return updatedInvoice;
  },
};
