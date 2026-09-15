import mongoose from 'mongoose';
import { SalesInvoice } from '../models/salesInvoice.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { CustomerPayment } from '../../customers/models/customerPayment.model.js';
import { customerService, generateNextPaymentReference } from '../../customers/services/customer.service.js';
import { Product } from '../../products/models/product.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { StockLedger } from '../../purchases/models/stockLedger.model.js';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { calculateInvoicePaymentStatus, normalizeMoney, MONEY_TOLERANCE, isConfigured, resolveEffectiveDiscount, resolveEffectiveGstRate } from '../../../utils/pricingUtils.js';

import { ShopSettings } from '../../settings/models/shopSettings.model.js';

export async function generateNextInvoiceNumber(userId) {
  if (!userId) throw new Error('userId is required');

  // 1. Dynamic Shop Name & First Alphabet Extraction (Priority: Shop Name -> Fallback 'V')
  let shopName = '';
  try {
    const settings = await ShopSettings.findOne({ userId }).lean().exec();
    shopName = (settings?.shopName || settings?.name || '').trim();
  } catch (err) {
    logger.warn(`Could not fetch ShopSettings for invoice prefix for user ${userId}:`, err);
  }

  let shopLetter = 'V';
  if (shopName) {
    const match = shopName.match(/[a-zA-Z]/);
    if (match && match[0]) {
      shopLetter = match[0].toUpperCase();
    }
  }

  // 2. Year & Month: 2-digit Year (YY) + 2-digit Month (MM)
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // '09' for Sept, '10' for Oct
  const prefix = `${shopLetter}${yy}${mm}`;

  // 3. Find highest existing sequence number for this prefix
  const prefixRegex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const legacyPrefix = `${shopLetter}${yy}${now.getMonth() + 1}`;
  const legacyRegex = new RegExp(`^${legacyPrefix}(\\d+)$`, 'i');

  const invoices = await SalesInvoice.find({
    userId,
    $or: [
      { invoiceNumber: { $regex: prefixRegex } },
      { invoiceNumber: { $regex: legacyRegex } },
    ],
  })
    .select('invoiceNumber')
    .lean()
    .exec();

  let maxSeq = 0;
  if (Array.isArray(invoices) && invoices.length > 0) {
    for (const inv of invoices) {
      if (inv?.invoiceNumber) {
        const match = inv.invoiceNumber.match(prefixRegex) || inv.invoiceNumber.match(legacyRegex);
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

export const salesInvoiceService = {
  async seedDefaultInvoices() {
    return;
  },

  async getAllInvoices(query = {}, userId) {
    if (!userId) throw new Error('userId is required');

    // 1. Authoritative DB Synchronization for userId invoices needing status sync
    const unadjustedInvoices = await SalesInvoice.find(
      {
        userId,
        $or: [
          { status: { $exists: false } },
          { dueAmount: { $exists: false } },
          { dueStatus: { $exists: false } },
        ],
      },
      { _id: 1, totalAmount: 1, paidAmount: 1, dueAmount: 1, status: 1 }
    ).lean().exec();

    if (unadjustedInvoices.length > 0) {
      const bulkSyncOps = unadjustedInvoices.map((doc) => {
        const normTotal = Math.max(0, normalizeMoney(doc.totalAmount || 0));
        const normPaid = Math.max(0, normalizeMoney(doc.paidAmount || 0));
        const effectiveDue = Math.max(0, normalizeMoney(normTotal - normPaid));
        const authStatus = calculateInvoicePaymentStatus(normTotal, normPaid, effectiveDue, doc.status);
        const dueStatus = effectiveDue <= 0.01 ? 'No Due' : 'Due In 30 Days';
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { status: authStatus, dueAmount: effectiveDue, dueStatus } },
          },
        };
      });
      await SalesInvoice.bulkWrite(bulkSyncOps);
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

    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const aggFilter = { ...filter };
    if (aggFilter.userId && typeof aggFilter.userId === 'string') {
      aggFilter.userId = userObjId;
    }

    const [invoices, summaryResult, statusCountResult] = await Promise.all([
      SalesInvoice.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      SalesInvoice.aggregate([
        { $match: aggFilter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalDue: { $sum: '$dueAmount' },
            totalCount: { $sum: 1 },
          },
        },
      ]),
      SalesInvoice.aggregate([
        { $match: { userId: userObjId, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const summaryObj = summaryResult[0] || {};
    const totalRecords = summaryObj.totalCount || 0;
    const totalAmount = summaryObj.totalAmount || 0;
    const totalPaid = summaryObj.totalPaid || 0;
    const totalDue = summaryObj.totalDue || 0;
    const totalBills = totalRecords;

    const duePercentage = totalAmount > 0 ? Number(((totalDue / totalAmount) * 100).toFixed(2)) : 0;

    const statusMap = new Map((statusCountResult || []).map((s) => [s._id, s.count]));
    const totalDbBills = (statusCountResult || []).reduce((acc, curr) => acc + (curr.count || 0), 0);

    const counters = {
      all: totalDbBills,
      paid: statusMap.get('Paid') || 0,
      partial: statusMap.get('Partial') || 0,
      due: statusMap.get('Due') || 0,
      cancelled: statusMap.get('Cancelled') || 0,
    };

    const summaryData = {
      totalBills,
      totalAmount,
      totalPaid,
      totalDue,
      duePercentage,
    };

    return {
      invoices,
      total: totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      metrics: summaryData,
      summary: summaryData,
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
      await invoice.save();
    }

    const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;

    // Fetch all valid payment records linked to this invoice
    const thisInvoicePayments = await CustomerPayment.find({
      userId,
      $or: [{ invoiceId: invoiceObj._id }, { invoiceNumber: invoiceObj.invoiceNumber }],
      isDeleted: { $ne: true },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean()
      .exec();

    const paymentRecordsTotal = thisInvoicePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const invoiceTotal = Math.max(0, Number(invoiceObj.totalAmount || 0));
    const currentPaid = paymentRecordsTotal > 0 ? paymentRecordsTotal : Math.max(0, Number(invoiceObj.paidAmount || 0));
    const currentDue = Math.max(0, invoiceTotal - currentPaid);
    const currentStatus = calculateInvoicePaymentStatus(invoiceTotal, currentPaid, currentDue, invoiceObj.status);

    invoiceObj.currentPaid = currentPaid;
    invoiceObj.currentDue = currentDue;
    invoiceObj.currentStatus = currentStatus;
    invoiceObj.payments = thisInvoicePayments;

    return invoiceObj;
  },

  async createInvoice(data, userId, reqStartTime = Date.now()) {
    if (!userId) throw new Error('userId is required');

    const tStart = Date.now();

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

    // 1. Batched Product & Batch Lookups (Single Parallel DB Query)
    const tProdReadStart = Date.now();
    const validProdIds = [];
    for (const item of items) {
      const pId = item.productId || item.id || item._id;
      if (pId && mongoose.Types.ObjectId.isValid(pId)) {
        validProdIds.push(new mongoose.Types.ObjectId(pId));
      }
    }

    const [productDocs, batchDocs] = await Promise.all([
      Product.find({ _id: { $in: validProdIds }, userId }).populate('brandId categoryId defaultUnitId').lean().exec(),
      ProductBatch.find({
        userId,
        productId: { $in: validProdIds },
        isDeleted: { $ne: true },
        isActive: { $ne: false },
        currentStock: { $gt: 0 },
      }).sort({ createdAt: 1 }).lean().exec(),
    ]);

    const productMap = new Map();
    for (const p of productDocs) {
      productMap.set(p._id.toString(), p);
    }

    const batchMap = new Map();
    for (const b of batchDocs) {
      const key = b.productId.toString();
      if (!batchMap.has(key)) batchMap.set(key, []);
      batchMap.get(key).push(b);
    }


    // 2. Stock Validation (Grouped per Product to Prevent Multi-Line Overselling)
    const tValidateStart = Date.now();
    const requestedQtyByProduct = new Map();
    for (const item of items) {
      const pIdStr = (item.productId || item.id || item._id)?.toString();
      const qty = Number(item.qty || item.quantity || 0);
      if (pIdStr && qty > 0) {
        requestedQtyByProduct.set(pIdStr, (requestedQtyByProduct.get(pIdStr) || 0) + qty);
      }
    }

    for (const [prodIdStr, totalRequestedQty] of requestedQtyByProduct.entries()) {
      let prod = productMap.get(prodIdStr);
      if (!prod && typeof prodIdStr === 'string') {
        prod = await Product.findOne({
          userId,
          $or: [{ _id: prodIdStr }, { name: new RegExp(`^${prodIdStr.trim()}$`, 'i') }, { code: prodIdStr }],
        }).populate('defaultUnitId').lean().exec();
        if (prod) productMap.set(prod._id.toString(), prod);
      }

      if (!prod) {
        throw new AppError(`Product with ID '${prodIdStr}' not found`, HTTP_STATUS.BAD_REQUEST);
      }

      const prodName = prod.name || 'Product';
      const unitName = prod.defaultUnitId?.shortName || 'Bag';
      const activeBatchesForStock = batchMap.get(prod._id.toString()) || [];

      let availableStock = 0;
      if (activeBatchesForStock.length > 0) {
        availableStock = activeBatchesForStock.reduce((sum, b) => sum + Math.max(0, Number(b.currentStock || 0)), 0);
      } else {
        availableStock = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
      }

      if (availableStock < totalRequestedQty) {
        throw new AppError(
          `Insufficient stock for "${prodName}". Available stock: ${availableStock} ${unitName}s, Total requested: ${totalRequestedQty}.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    const tSnapshotStart = Date.now();
    const itemSnapshots = [];
    const batchDeductionsToApply = [];
    const productDeductionMap = new Map();

    for (const i of items) {
      const pId = i.productId || i.id || i._id;
      const qty = Number(i.qty || i.quantity || 1);
      const inputUnitPrice = Number(i.price || i.unitPrice || 0);

      let prod = productMap.get(pId?.toString());
      const pCode = i.productCode || prod?.code || '';
      const pName = i.name || i.productName || prod?.name || 'Agri Product';
      const bName = i.brandName || prod?.brandId?.name || prod?.company || '';
      const cName = i.categoryName || prod?.categoryId?.name || 'General';
      const uName = i.unitName || prod?.defaultUnitId?.shortName || i.unit || 'Unit';
      const hsn = i.hsnCode || prod?.hsnCode || '';
      const gst = Number(i.gstRate ?? i.gstPercent ?? prod?.gstRate ?? 0);

      let remainingToAllocate = qty;
      let totalLineCost = 0;
      let totalBatchSellingRevenue = 0;
      let primaryBatchNumber = i.batchNumber || '';
      const itemBatchAllocations = [];

      if (prod) {
        const activeBatches = batchMap.get(prod._id.toString()) || [];

        for (const batch of activeBatches) {
          if (remainingToAllocate <= 0) break;

          const currentAvailable = Number(batch.currentStock || 0);
          if (currentAvailable <= 0) continue;

          const allocatedQty = Math.min(currentAvailable, remainingToAllocate);
          batch.currentStock -= allocatedQty;

          let bPurchaseRate = Number(batch.purchaseRate || 0);
          if (bPurchaseRate <= 0) {
            bPurchaseRate = Number(prod?.defaultPurchaseRate || i.purchaseCostRate || i.purchaseRate || 0);
          }
          const bSellingPrice = Number(inputUnitPrice || batch.sellingPrice || prod?.defaultSellingPrice || 0);

          batchDeductionsToApply.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            allocatedQty,
            purchaseRate: bPurchaseRate,
            sellingPrice: bSellingPrice,
            productId: prod._id,
          });

          itemBatchAllocations.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            quantity: allocatedQty,
            purchaseRate: bPurchaseRate,
            sellingPrice: bSellingPrice,
            discount: batch.discount !== undefined && batch.discount !== null && batch.discount !== '' ? batch.discount : undefined,
            discountType: batch.discountType || undefined,
            gstRate: batch.gstRate !== undefined && batch.gstRate !== null && batch.gstRate !== '' ? batch.gstRate : undefined,
          });

          totalLineCost += allocatedQty * bPurchaseRate;
          totalBatchSellingRevenue += allocatedQty * bSellingPrice;
          remainingToAllocate -= allocatedQty;
          if (!primaryBatchNumber) primaryBatchNumber = batch.batchNumber;
        }

        const prevDeduction = productDeductionMap.get(prod._id.toString()) || { totalQty: 0, sellingPrice: inputUnitPrice };
        productDeductionMap.set(prod._id.toString(), {
          totalQty: prevDeduction.totalQty + qty,
          sellingPrice: inputUnitPrice || prod.defaultSellingPrice || 0,
        });
      }

      if (remainingToAllocate > 0) {
        throw new AppError(
          `Insufficient batch stock for "${pName}". Cannot allocate ${remainingToAllocate} ${uName}s.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const distinctSellingPrices = new Set(itemBatchAllocations.map((a) => a.sellingPrice));

      if (itemBatchAllocations.length > 1 && distinctSellingPrices.size > 1) {
        for (const alloc of itemBatchAllocations) {
          const allocQty = alloc.quantity;
          const allocSellingPrice = alloc.sellingPrice;
          const allocCostRate = alloc.purchaseRate;

          const allocDiscObj = isConfigured(i.discountPct) || isConfigured(i.discVal) || isConfigured(i.discountVal)
            ? {
                discount: Number(i.discountPct ?? i.discVal ?? i.discountVal),
                discountType: i.discType || i.discountType || 'Percentage',
              }
            : resolveEffectiveDiscount(alloc, prod);

          const allocDiscVal = allocDiscObj.discount;
          const allocDiscType = allocDiscObj.discountType;
          const isAllocAmountDisc = allocDiscType.toLowerCase() === 'amount' || allocDiscType === '₹';

          const allocGrossTotal = allocQty * allocSellingPrice;
          let allocDiscountAmount = 0;
          let allocDiscountPct = 0;

          if (isAllocAmountDisc && allocDiscVal > 0) {
            const unitDisc = allocDiscVal;
            allocDiscountAmount = normalizeMoney(Math.min(allocGrossTotal, unitDisc <= allocSellingPrice ? allocQty * unitDisc : unitDisc));
            allocDiscountPct = allocGrossTotal > 0 ? normalizeMoney((allocDiscountAmount / allocGrossTotal) * 100) : 0;
          } else if (allocDiscVal > 0) {
            allocDiscountPct = allocDiscVal;
            allocDiscountAmount = normalizeMoney((allocGrossTotal * allocDiscVal) / 100);
          } else if (isConfigured(i.discountAmount) && Number(i.discountAmount) > 0) {
            allocDiscountAmount = normalizeMoney(Math.min(allocGrossTotal, Number(i.discountAmount)));
            allocDiscountPct = allocGrossTotal > 0 ? normalizeMoney((allocDiscountAmount / allocGrossTotal) * 100) : 0;
          }

          const allocTaxableAmount = Math.max(0, normalizeMoney(allocGrossTotal - allocDiscountAmount));
          const allocGstRate = isConfigured(i.gstRate) || isConfigured(i.gstPercent)
            ? Number(i.gstRate ?? i.gstPercent)
            : resolveEffectiveGstRate(alloc, prod);
          const allocGstAmount = allocGstRate > 0 ? normalizeMoney((allocTaxableAmount * allocGstRate) / 100) : 0;
          const allocLineTotal = normalizeMoney(allocTaxableAmount + allocGstAmount);
          const allocLineCost = allocQty * allocCostRate;
          const allocLineProfit = normalizeMoney(allocTaxableAmount - allocLineCost);

          itemSnapshots.push({
            productId: prod?._id || pId,
            productCode: pCode,
            productName: pName,
            brandName: bName,
            categoryName: cName,
            unitName: uName,
            unit: uName,
            hsnCode: hsn,
            image: prod?.image || i.image || '',
            batchNumber: alloc.batchNumber,
            batchAllocations: [alloc],
            quantity: allocQty,
            unitPrice: allocSellingPrice,
            purchaseCostRate: allocCostRate,
            discount: allocDiscVal,
            discountType: allocDiscType,
            discountPct: allocDiscountPct,
            discountAmount: allocDiscountAmount,
            discVal: allocDiscVal,
            discType: allocDiscType,
            gstRate: allocGstRate,
            gstAmount: allocGstAmount,
            taxAmount: allocGstAmount,
            taxableAmount: allocTaxableAmount,
            lineTotal: allocLineTotal,
            lineProfit: allocLineProfit,
            totalAmount: allocLineTotal,
          });
        }
      } else {
        const effectiveSellingUnitPrice = inputUnitPrice > 0
          ? inputUnitPrice
          : (itemBatchAllocations.length > 0 && Number(itemBatchAllocations[0].sellingPrice) > 0
              ? Number(itemBatchAllocations[0].sellingPrice)
              : Number(prod?.defaultSellingPrice || 0));

        const effectiveAverageCostRate = qty > 0 ? totalLineCost / qty : 0;
        const lineGrossTotal = qty * effectiveSellingUnitPrice;

        const primaryAlloc = itemBatchAllocations[0];
        const effDiscObj = isConfigured(i.discountPct) || isConfigured(i.discVal) || isConfigured(i.discountVal)
          ? {
              discount: Number(i.discountPct ?? i.discVal ?? i.discountVal),
              discountType: i.discType || i.discountType || 'Percentage',
            }
          : resolveEffectiveDiscount(primaryAlloc, prod);

        const discVal = effDiscObj.discount;
        const discType = effDiscObj.discountType;
        const isAmountDisc = discType.toLowerCase() === 'amount' || discType === '₹';

        let lineDiscountAmount = 0;
        let discountPct = 0;

        if (isAmountDisc && discVal > 0) {
          const unitDisc = discVal;
          lineDiscountAmount = normalizeMoney(Math.min(lineGrossTotal, unitDisc <= effectiveSellingUnitPrice ? qty * unitDisc : unitDisc));
          discountPct = lineGrossTotal > 0 ? normalizeMoney((lineDiscountAmount / lineGrossTotal) * 100) : 0;
        } else if (discVal > 0) {
          discountPct = discVal;
          lineDiscountAmount = normalizeMoney((lineGrossTotal * discVal) / 100);
        } else if (isConfigured(i.discountAmount) && Number(i.discountAmount) > 0) {
          lineDiscountAmount = normalizeMoney(Math.min(lineGrossTotal, Number(i.discountAmount)));
          discountPct = lineGrossTotal > 0 ? normalizeMoney((lineDiscountAmount / lineGrossTotal) * 100) : 0;
        }

        const lineTaxableAmount = Math.max(0, normalizeMoney(lineGrossTotal - lineDiscountAmount));
        const effectiveGstRate = isConfigured(i.gstRate) || isConfigured(i.gstPercent)
          ? Number(i.gstRate ?? i.gstPercent)
          : resolveEffectiveGstRate(primaryAlloc, prod);
        const lineGstAmount = effectiveGstRate > 0 ? normalizeMoney((lineTaxableAmount * effectiveGstRate) / 100) : 0;
        const itemLineTotal = normalizeMoney(lineTaxableAmount + lineGstAmount);
        const lineProfit = normalizeMoney(lineTaxableAmount - totalLineCost);

        itemSnapshots.push({
          productId: prod?._id || pId,
          productCode: pCode,
          productName: pName,
          brandName: bName,
          categoryName: cName,
          unitName: uName,
          unit: uName,
          hsnCode: hsn,
          image: prod?.image || i.image || '',
          batchNumber: primaryBatchNumber,
          batchAllocations: itemBatchAllocations,
          quantity: qty,
          unitPrice: effectiveSellingUnitPrice,
          purchaseCostRate: effectiveAverageCostRate,
          discount: discVal,
          discountType: discType,
          discountPct,
          discountAmount: lineDiscountAmount,
          discVal,
          discType,
          gstRate: effectiveGstRate,
          gstAmount: lineGstAmount,
          taxAmount: lineGstAmount,
          taxableAmount: lineTaxableAmount,
          lineTotal: itemLineTotal,
          lineProfit,
          totalAmount: itemLineTotal,
        });
      }
  }

  const rawGrossSubtotal = itemSnapshots.reduce((sum, s) => sum + (Number(s.quantity || 1) * Number(s.unitPrice || 0)), 0);
  const totalProductDiscounts = itemSnapshots.reduce((sum, s) => sum + (Number(s.discountAmount) || 0), 0);
  const inputTotalDiscount = Number(discountAmount || 0);

  // If there is an overall bill discount passed that exceeds product discounts, or bill discount entered
  const billDiscount = Math.max(0, inputTotalDiscount - totalProductDiscounts);

  if (billDiscount > 0 && rawGrossSubtotal > totalProductDiscounts) {
    const netTaxableBase = rawGrossSubtotal - totalProductDiscounts;
    let allocatedBillDiscSum = 0;
    itemSnapshots.forEach((s, idx) => {
      const itemTaxableBeforeBill = Number(s.taxableAmount || 0);
      const itemBillDisc = idx === itemSnapshots.length - 1
        ? Math.max(0, normalizeMoney(billDiscount - allocatedBillDiscSum))
        : normalizeMoney((itemTaxableBeforeBill / netTaxableBase) * billDiscount);
      allocatedBillDiscSum += itemBillDisc;

      const finalItemTaxable = Math.max(0, normalizeMoney(itemTaxableBeforeBill - itemBillDisc));
      const itemGst = Number(s.gstRate || 0) > 0 ? normalizeMoney((finalItemTaxable * Number(s.gstRate)) / 100) : 0;

      s.taxableAmount = finalItemTaxable;
      s.gstAmount = itemGst;
      s.lineTotal = normalizeMoney(finalItemTaxable + itemGst);
      s.totalAmount = s.lineTotal;
    });
  }

  const authoritativeSubtotal = normalizeMoney(rawGrossSubtotal);
  const authoritativeTaxAmount = normalizeMoney(itemSnapshots.reduce((sum, s) => sum + (Number(s.gstAmount) || 0), 0));
  const authoritativeDiscountAmount = normalizeMoney(totalProductDiscounts + billDiscount);
  const grandTotal = Math.max(0, normalizeMoney(authoritativeSubtotal - authoritativeDiscountAmount + authoritativeTaxAmount));

  // Normalize inputPaidAmount safely to numeric
  let paidAmount = 0;
  if (inputPaidAmount !== undefined && inputPaidAmount !== null && inputPaidAmount !== '') {
    const parsedPaid = Number(inputPaidAmount);
    paidAmount = isNaN(parsedPaid) || parsedPaid < 0 ? 0 : normalizeMoney(parsedPaid);
  }

  let prevOutstanding = Math.round(Number(customerDoc?.outstandingBalance || 0));
  let prevAdvance = Math.round(Number(customerDoc?.advanceBalance || 0));

  const advanceUsed = Math.min(prevAdvance, grandTotal);
  const netBillToPay = Math.max(0, normalizeMoney(grandTotal - advanceUsed));
  let remainingAdvance = prevAdvance - advanceUsed;

  let newBillDue = 0;
  let extraPaid = 0;
  let clearedPrevDue = 0;
  let newTotalOutstanding = prevOutstanding;
  let newCustomerAdvance = remainingAdvance;

  const roundedNetBill = Math.round(netBillToPay);
  const roundedPaid = Math.round(paidAmount);

  if (paidAmount > netBillToPay && Math.abs(paidAmount - netBillToPay) <= 0.05) {
    paidAmount = netBillToPay;
  } else if (roundedPaid > roundedNetBill && paidAmount > netBillToPay + 0.01) {
    throw new AppError(
      'Payment cannot exceed the invoice amount. Please record extra payment from Customer Ledger.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

    if (paidAmount < netBillToPay) {
      newBillDue = Math.round(netBillToPay - paidAmount);
      newTotalOutstanding = Math.round(prevOutstanding + newBillDue);
    } else {
      newBillDue = 0;
      newTotalOutstanding = prevOutstanding;
    }

    const status = calculateInvoicePaymentStatus(grandTotal, paidAmount, newBillDue, data.status);
    let dueStatus = newBillDue <= 0 ? 'No Due' : 'Due In 30 Days';


    // 3. Invoice Number Generation
    const autoInvoiceNumber = await generateNextInvoiceNumber(userId);

    const authoritativeTaxableAmount = Math.max(0, normalizeMoney(authoritativeSubtotal - authoritativeDiscountAmount));

    // 4. Save Invoice DB Document
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
      productDiscountAmount: totalProductDiscounts,
      billDiscountAmount: billDiscount,
      taxableAmount: authoritativeTaxableAmount,
      taxAmount: authoritativeTaxAmount,
      discountAmount: authoritativeDiscountAmount,
      totalAmount: grandTotal,
      grandTotal,
      paidAmount,
      dueAmount: newBillDue,
      status,
      dueStatus,
      paymentMode,
      notes,
      idempotencyKey,
    });

    // 5. Batched Stock Deductions & Stock Ledger Entries

    if (batchDeductionsToApply.length > 0) {
      const batchBulkOps = batchDeductionsToApply.map((bDeduction) => ({
        updateOne: {
          filter: { _id: bDeduction.batchId, userId, currentStock: { $gte: bDeduction.allocatedQty } },
          update: { $inc: { currentStock: -bDeduction.allocatedQty } },
        },
      }));
      await ProductBatch.bulkWrite(batchBulkOps);

      const affectedBatchIds = batchDeductionsToApply.map((b) => b.batchId);
      await ProductBatch.updateMany(
        { _id: { $in: affectedBatchIds }, currentStock: { $lte: 0 } },
        { $set: { isActive: false, currentStock: 0 } }
      );
    }

    const productBulkOps = [];
    const stockLedgerEntries = [];

    for (const [pIdStr, deduction] of productDeductionMap.entries()) {
      const prod = productMap.get(pIdStr);
      if (prod) {
        const previousStock = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
        const currentStock = Math.max(0, previousStock - deduction.totalQty);

        productBulkOps.push({
          updateOne: {
            filter: { _id: prod._id, userId },
            update: { $inc: { totalStock: -deduction.totalQty } },
          },
        });

        const matchingSnapshot = itemSnapshots.find((s) => s.productId?.toString() === prod._id.toString());
        stockLedgerEntries.push({
          userId,
          transactionType: 'SALE',
          referenceId: newInvoice._id,
          referenceNumber: newInvoice.invoiceNumber,
          productId: prod._id,
          batchId: matchingSnapshot?.batchAllocations?.[0]?.batchId || null,
          batchNumber: matchingSnapshot?.batchNumber || '',
          quantity: -deduction.totalQty,
          purchaseRate: prod.defaultPurchaseRate || 0,
          sellingPrice: deduction.sellingPrice || prod.defaultSellingPrice || 0,
          previousStock,
          currentStock,
          createdBy: 'POS System',
          timestamp: newInvoice.date,
        });
      }
    }

    if (productBulkOps.length > 0) {
      await Product.bulkWrite(productBulkOps);
    }
    if (stockLedgerEntries.length > 0) {
      await StockLedger.insertMany(stockLedgerEntries);
    }


    // 6. Customer Ledger & Payment Processing
    if (customerDoc) {
      customerDoc.totalPurchases = (customerDoc.totalPurchases || 0) + grandTotal;
      customerDoc.totalPaid = (customerDoc.totalPaid || 0) + paidAmount + advanceUsed;
      customerDoc.outstandingBalance = newTotalOutstanding;
      customerDoc.advanceBalance = newCustomerAdvance;
      await customerDoc.save();

      if (paidAmount > 0) {
        let existingPayment = await CustomerPayment.findOne({
          userId,
          invoiceId: newInvoice._id,
        }).exec();

        if (!existingPayment) {
          const payRef = await generateNextPaymentReference(userId);
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
            paymentType: 'INVOICE_PAYMENT',
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
      const hsn = i.hsnCode || prod?.hsnCode || prod?.hsn || '';

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
        const bGstRate = isConfigured(batch.gstRate) ? Number(batch.gstRate) : undefined;
        const bDisc = isConfigured(batch.discount) ? Number(batch.discount) : undefined;

        itemBatchAllocations.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          quantity: allocatedQty,
          purchaseRate: bPurchaseRate,
          sellingPrice: bSellingPrice,
          gstRate: bGstRate,
          discount: bDisc,
          discountType: batch.discountType || undefined,
          hsnCode: batch.hsnCode || undefined,
        });

        remainingToAllocate -= allocatedQty;
      }

      if (remainingToAllocate > 0 && itemBatchAllocations.length === 0) {
        const fallbackSellingPrice = inputUnitPrice || Number(prod?.defaultSellingPrice || 0);
        itemBatchAllocations.push({
          batchId: null,
          batchNumber: '',
          quantity: qty,
          purchaseRate: Number(prod?.defaultPurchaseRate || 0),
          sellingPrice: fallbackSellingPrice,
          gstRate: isConfigured(prod?.gstRate) ? Number(prod.gstRate) : undefined,
          discount: isConfigured(prod?.discount) ? Number(prod.discount) : undefined,
          discountType: prod?.discountType || undefined,
        });
      }

      const distinctSellingPrices = new Set(itemBatchAllocations.map((a) => a.sellingPrice));

      if (itemBatchAllocations.length > 1 && distinctSellingPrices.size > 1) {
        itemBatchAllocations.forEach((alloc, idx) => {
          const allocQty = alloc.quantity;
          const allocSellingPrice = alloc.sellingPrice;
          const allocLineTotal = allocQty * allocSellingPrice;
          calculatedSubtotal += allocLineTotal;

          const allocGst = isConfigured(i.gstRate) || isConfigured(i.gstPercent)
            ? Number(i.gstRate ?? i.gstPercent)
            : resolveEffectiveGstRate(alloc, prod);

          const allocDiscObj = isConfigured(i.discountPct) || isConfigured(i.discVal) || isConfigured(i.discountVal)
            ? {
                discount: Number(i.discountPct ?? i.discVal ?? i.discountVal),
                discountType: i.discType || i.discountType || 'Percentage',
              }
            : resolveEffectiveDiscount(alloc, prod);

          const allocDisc = allocDiscObj.discount;
          const allocDiscType = allocDiscObj.discountType;

          previewItems.push({
            productId: pId,
            originalProductId: pId,
            productCode: pCode,
            productName: pName,
            brandName: bName,
            categoryName: cName,
            unitName: uName,
            hsnCode: hsn,
            gstRate: allocGst,
            discount: allocDisc,
            discountType: allocDiscType,
            discVal: allocDisc,
            discType: allocDiscType,
            image: prod?.image || i.image || '',
            batchNumber: alloc.batchNumber,
            batchAllocations: [alloc],
            quantity: allocQty,
            qty: allocQty,
            unitPrice: allocSellingPrice,
            price: allocSellingPrice,
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

        const primaryAlloc = itemBatchAllocations[0];
        const itemGst = isConfigured(i.gstRate) || isConfigured(i.gstPercent)
          ? Number(i.gstRate ?? i.gstPercent)
          : resolveEffectiveGstRate(primaryAlloc, prod);

        const itemDiscObj = isConfigured(i.discountPct) || isConfigured(i.discVal) || isConfigured(i.discountVal)
          ? {
              discount: Number(i.discountPct ?? i.discVal ?? i.discountVal),
              discountType: i.discType || i.discountType || 'Percentage',
            }
          : resolveEffectiveDiscount(primaryAlloc, prod);

        const itemDisc = itemDiscObj.discount;
        const itemDiscType = itemDiscObj.discountType;

        previewItems.push({
          productId: pId,
          originalProductId: pId,
          productCode: pCode,
          productName: pName,
          brandName: bName,
          categoryName: cName,
          unitName: uName,
          hsnCode: hsn,
          gstRate: itemGst,
          discount: itemDisc,
          discountType: itemDiscType,
          discVal: itemDisc,
          discType: itemDiscType,
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

    let invoice = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await SalesInvoice.findOne({ _id: id, userId }).exec();
    }
    if (!invoice) {
      invoice = await SalesInvoice.findOne({ invoiceNumber: id, userId }).exec();
    }
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Check whether stock was actually deducted & restore stock
    const shouldRestoreStock = invoice.status !== 'Cancelled' && invoice.isStockDeducted !== false;
    const reversalStockLedgerEntries = [];

    if (shouldRestoreStock && Array.isArray(invoice.items)) {
      for (const item of invoice.items) {
        if (item.productId && item.quantity > 0) {
          const prod = await Product.findOneAndUpdate(
            { _id: item.productId, userId },
            { $inc: { totalStock: item.quantity } },
            { new: true }
          ).exec();

          if (prod) {
            const previousStockVal = Math.max(0, prod.totalStock - item.quantity);
            reversalStockLedgerEntries.push({
              userId,
              transactionType: 'INVOICE_DELETE_REVERSAL',
              referenceId: invoice._id,
              referenceNumber: invoice.invoiceNumber,
              productId: prod._id,
              batchId: item.batchAllocations?.[0]?.batchId || null,
              batchNumber: item.batchAllocations?.[0]?.batchNumber || item.batchNumber || '',
              quantity: item.quantity,
              purchaseRate: item.purchaseCostRate || prod.defaultPurchaseRate || 0,
              sellingPrice: item.unitPrice || prod.defaultSellingPrice || 0,
              previousStock: previousStockVal,
              currentStock: prod.totalStock,
              createdBy: 'System (Invoice Delete)',
              timestamp: new Date(),
            });
          }
        }

        if (item.batchAllocations && item.batchAllocations.length > 0) {
          for (const alloc of item.batchAllocations) {
            if (alloc.batchId && alloc.quantity > 0) {
              await ProductBatch.updateOne(
                { _id: alloc.batchId, userId },
                { $inc: { currentStock: alloc.quantity }, $set: { isActive: true } }
              ).exec();
            }
          }
        } else if (item.batchId) {
          await ProductBatch.updateOne(
            { _id: item.batchId, userId },
            { $inc: { currentStock: item.quantity }, $set: { isActive: true } }
          ).exec();
        } else if (item.batchNumber && item.productId) {
          await ProductBatch.updateOne(
            { productId: item.productId, batchNumber: item.batchNumber, userId },
            { $inc: { currentStock: item.quantity }, $set: { isActive: true } }
          ).exec();
        }
      }

      // 2. Insert INVOICE_DELETE_REVERSAL stock ledger entries for audit trail
      if (reversalStockLedgerEntries.length > 0) {
        await StockLedger.insertMany(reversalStockLedgerEntries);
      }

      // Clean up original SALE stock ledger entries
      await StockLedger.deleteMany({
        userId,
        referenceId: invoice._id,
        transactionType: 'SALE',
      }).exec();
    }

    // 3. Delete ALL payments directly linked to this invoice (registered, walk-in, or general)
    const payRef = `PAY-BILL-${invoice.invoiceNumber}`;
    await CustomerPayment.deleteMany({
      userId,
      $or: [
        { invoiceId: invoice._id },
        { refNo: payRef },
        { invoiceNumber: invoice.invoiceNumber },
      ],
    }).exec();

    // 4. Delete the SalesInvoice document
    await SalesInvoice.deleteOne({ _id: invoice._id, userId }).exec();

    // 5. Recalculate affected customer balance
    if (invoice.customerId) {
      await customerService.calculateCustomerBalance(invoice.customerId, userId);
    } else if (invoice.customerMobile && invoice.customerType !== 'WALK_IN') {
      const custDoc = await Customer.findOne({ userId, mobile: invoice.customerMobile }).exec();
      if (custDoc) {
        await customerService.calculateCustomerBalance(custDoc._id, userId);
      }
    }

    logger.info(`🗑️ Invoice #${invoice.invoiceNumber} deleted successfully by user ${userId}`);

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} deleted successfully, inventory restored, and payments cleaned`,
    };
  },

  async updateInvoice(id, data, userId) {
    if (!userId) throw new Error('userId is required');
    const cleanData = { ...data };
    delete cleanData.userId;
    delete cleanData._id;

    if (cleanData.totalAmount !== undefined || cleanData.paidAmount !== undefined) {
      const normTotal = Math.max(0, normalizeMoney(cleanData.totalAmount !== undefined ? cleanData.totalAmount : cleanData.grandTotal !== undefined ? cleanData.grandTotal : 0));
      const normPaid = Math.max(0, normalizeMoney(cleanData.paidAmount !== undefined ? cleanData.paidAmount : 0));
      const normDue = Math.max(0, normTotal - normPaid);
      cleanData.totalAmount = normTotal;
      cleanData.grandTotal = normTotal;
      cleanData.paidAmount = normPaid;
      cleanData.dueAmount = normDue;
      cleanData.status = calculateInvoicePaymentStatus(normTotal, normPaid, normDue, cleanData.status);
      cleanData.dueStatus = normDue <= MONEY_TOLERANCE ? 'No Due' : 'Due In 30 Days';
    }

    const updatedInvoice = await SalesInvoice.findOneAndUpdate(
      { _id: id, userId },
      { $set: cleanData },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedInvoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    if (updatedInvoice.customerId) {
      await customerService.calculateCustomerBalance(updatedInvoice.customerId, userId);
    } else if (updatedInvoice.customerMobile && updatedInvoice.customerType !== 'WALK_IN') {
      const custDoc = await Customer.findOne({ userId, mobile: updatedInvoice.customerMobile }).exec();
      if (custDoc) {
        await customerService.calculateCustomerBalance(custDoc._id, userId);
      }
    }

    return updatedInvoice;
  },

  async restoreInvoice(id, userId, docOverride = null) {
    if (!userId) throw new Error('userId is required');

    // 1. Locate existing invoice or use docOverride
    let invoice = docOverride;
    if (!invoice) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        invoice = await SalesInvoice.findOne({ _id: id, userId }).exec();
      }
      if (!invoice) {
        invoice = await SalesInvoice.findOne({ invoiceNumber: id, userId }).exec();
      }
    }

    if (!invoice) {
      throw new AppError('Invoice not found for restoration', HTTP_STATUS.NOT_FOUND);
    }

    // Check if invoice exists in DB and stock is already deducted for active invoice
    const existDoc = await SalesInvoice.findOne({ _id: invoice._id, userId }).exec();
    if (existDoc && existDoc.isStockDeducted === true && existDoc.status !== 'Cancelled' && existDoc.isActive !== false) {
      return {
        success: true,
        message: `Invoice #${invoice.invoiceNumber} is already active and stock is already deducted.`,
        invoice: existDoc,
      };
    }

    // 2. Validate current stock availability for ALL items before restoring
    const itemsToDeduct = invoice.items || [];
    for (const item of itemsToDeduct) {
      if (item.productId && item.quantity > 0) {
        const prod = await Product.findOne({ _id: item.productId, userId }).lean();
        if (!prod) {
          throw new AppError(`Product not found for invoice item '${item.productName || item.productId}'`, HTTP_STATUS.BAD_REQUEST);
        }
        if (prod.totalStock < item.quantity) {
          throw new AppError(
            `Insufficient stock to restore Invoice #${invoice.invoiceNumber}. Product '${prod.name || prod.productName}' requires ${item.quantity} units, but available stock is ${prod.totalStock}.`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }

      if (item.batchAllocations && item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          if (alloc.batchId && alloc.quantity > 0) {
            const batch = await ProductBatch.findOne({ _id: alloc.batchId, userId }).lean();
            if (batch && batch.currentStock < alloc.quantity) {
              throw new AppError(
                `Insufficient stock in batch '${alloc.batchNumber || batch.batchNumber}' to restore Invoice #${invoice.invoiceNumber}. Requires ${alloc.quantity} units, but available stock is ${batch.currentStock}.`,
                HTTP_STATUS.BAD_REQUEST
              );
            }
          }
        }
      }
    }

    // 3. Reapply inventory deductions
    const deductionStockLedgerEntries = [];
    for (const item of itemsToDeduct) {
      if (item.productId && item.quantity > 0) {
        const prod = await Product.findOneAndUpdate(
          { _id: item.productId, userId },
          { $inc: { totalStock: -item.quantity } },
          { new: true }
        ).exec();

        if (prod) {
          deductionStockLedgerEntries.push({
            userId,
            transactionType: 'INVOICE_RESTORE_DEDUCTION',
            referenceId: invoice._id,
            referenceNumber: invoice.invoiceNumber,
            productId: prod._id,
            batchId: item.batchAllocations?.[0]?.batchId || null,
            batchNumber: item.batchAllocations?.[0]?.batchNumber || item.batchNumber || '',
            quantity: item.quantity,
            purchaseRate: item.purchaseCostRate || prod.defaultPurchaseRate || 0,
            sellingPrice: item.unitPrice || prod.defaultSellingPrice || 0,
            previousStock: prod.totalStock + item.quantity,
            currentStock: prod.totalStock,
            createdBy: 'System (Invoice Restore)',
            timestamp: new Date(),
          });
        }
      }

      if (item.batchAllocations && item.batchAllocations.length > 0) {
        for (const alloc of item.batchAllocations) {
          if (alloc.batchId && alloc.quantity > 0) {
            await ProductBatch.updateOne(
              { _id: alloc.batchId, userId },
              { $inc: { currentStock: -alloc.quantity } }
            ).exec();
          }
        }
      }
    }

    // 4. Record stock ledger entries for audit trail
    if (deductionStockLedgerEntries.length > 0) {
      await StockLedger.insertMany(deductionStockLedgerEntries);
    }

    // 5. Restore/Update invoice document state
    let updatedInvoice;
    if (existDoc) {
      existDoc.isActive = true;
      existDoc.isStockDeducted = true;
      if (existDoc.status === 'Cancelled') {
        existDoc.status = 'Paid';
      }
      updatedInvoice = await existDoc.save();
    } else {
      const cleanDoc = typeof invoice.toObject === 'function' ? invoice.toObject() : { ...invoice };
      cleanDoc.isActive = true;
      cleanDoc.isStockDeducted = true;
      if (cleanDoc.status === 'Cancelled') {
        cleanDoc.status = 'Paid';
      }
      updatedInvoice = await SalesInvoice.create(cleanDoc);
    }

    // 6. Recalculate customer balance
    if (invoice.customerId) {
      await customerService.calculateCustomerBalance(invoice.customerId, userId);
    } else if (invoice.customerMobile && invoice.customerType !== 'WALK_IN') {
      const custDoc = await Customer.findOne({ userId, mobile: invoice.customerMobile }).exec();
      if (custDoc) {
        await customerService.calculateCustomerBalance(custDoc._id, userId);
      }
    }

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} restored successfully and inventory deductions reapplied.`,
      invoice: updatedInvoice,
    };
  },
};
