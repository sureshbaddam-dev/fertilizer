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

  return `${prefix}${maxSeq + 1}`;
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

    const duePercentage = totalAmount > 0 ? Number(((totalDue / totalAmount) * 100).toFixed(1)) : 0;

    const statusMap = new Map((statusCountResult || []).map((s) => [s._id, s.count]));
    const totalDbBills = (statusCountResult || []).reduce((acc, curr) => acc + (curr.count || 0), 0);

    const counters = {
      all: totalDbBills,
      paid: statusMap.get('Paid') || 0,
      partial: statusMap.get('Partial') || 0,
      due: statusMap.get('Due') || 0,
      cancelled: statusMap.get('Cancelled') || 0,
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
      await invoice.save();
    }

    return invoice.toObject ? invoice.toObject() : invoice;
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

    const tCustomerLookup = Date.now() - tStart;
    console.log(`[BILL TIMING] Customer lookup: ${tCustomerLookup}ms`);

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

    const tProductLookup = Date.now() - tProdReadStart;
    console.log(`[BILL TIMING] Product lookup: ${tProductLookup}ms`);

    // 2. Stock Validation & Item Snapshots (In-Memory Processing)
    const tValidateStart = Date.now();
    for (const item of items) {
      const prodId = item.productId || item.id || item._id;
      const qty = Number(item.qty || item.quantity || 0);
      if (prodId && qty > 0) {
        let prod = productMap.get(prodId?.toString());
        if (!prod && typeof prodId === 'string') {
          prod = await Product.findOne({
            userId,
            $or: [{ name: new RegExp(`^${prodId.trim()}$`, 'i') }, { code: prodId }],
          }).populate('defaultUnitId').lean().exec();
          if (prod) productMap.set(prod._id.toString(), prod);
        }

        if (!prod) {
          throw new AppError(`Product with ID '${prodId}' not found`, HTTP_STATUS.BAD_REQUEST);
        }

        const prodName = prod.name || item.name || item.productName || 'Product';
        const unitName = prod.defaultUnitId?.shortName || item.unit || 'Bag';
        const activeBatchesForStock = batchMap.get(prod._id.toString()) || [];

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
    const tValidation = Date.now() - tValidateStart;
    console.log(`[BILL TIMING] Request validation: ${tValidation}ms`);
    console.log(`[BILL TIMING] Stock validation: ${tValidation}ms`);

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

          const bPurchaseRate = Number(batch.purchaseRate || 0);
          const bSellingPrice = Number(batch.sellingPrice || prod?.defaultSellingPrice || inputUnitPrice || 0);

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
            productId: prod?._id || pId,
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
          productId: prod?._id || pId,
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

    const rawGrossSubtotal = itemSnapshots.reduce((sum, s) => sum + (Number(s.quantity || 1) * Number(s.unitPrice || 0)), 0);
    const totalItemDiscounts = itemSnapshots.reduce((sum, s) => sum + (Number(s.discountAmount) || 0), 0);
    const authoritativeDiscountAmount = Number(discountAmount || 0) || totalItemDiscounts;

    if (authoritativeDiscountAmount > 0 && totalItemDiscounts === 0 && rawGrossSubtotal > 0) {
      let allocatedDiscSum = 0;
      itemSnapshots.forEach((s, idx) => {
        const itemGross = (Number(s.quantity) || 1) * (Number(s.unitPrice) || 0);
        const itemDisc = idx === itemSnapshots.length - 1
          ? Math.max(0, Math.round((authoritativeDiscountAmount - allocatedDiscSum) * 100) / 100)
          : Math.round(((itemGross / rawGrossSubtotal) * authoritativeDiscountAmount) * 100) / 100;
        allocatedDiscSum += itemDisc;
        s.discountAmount = itemDisc;
        s.taxableAmount = Math.max(0, itemGross - itemDisc);
        s.lineTotal = Math.max(0, itemGross - itemDisc + (Number(s.gstAmount) || 0));
        s.totalAmount = s.lineTotal;
      });
    }

    const authoritativeSubtotal = Math.round(rawGrossSubtotal > 0 ? rawGrossSubtotal : itemSnapshots.reduce((sum, s) => sum + (Number(s.lineTotal) || Number(s.totalAmount) || 0), 0));
    const authoritativeTaxAmount = Math.round(itemSnapshots.reduce((sum, s) => sum + (Number(s.gstAmount) || 0), 0));
    const roundedDiscountAmount = Math.round(authoritativeDiscountAmount);
    const grandTotal = Math.max(0, Math.round(authoritativeSubtotal - roundedDiscountAmount + authoritativeTaxAmount));

    let paidAmount = inputPaidAmount !== undefined ? Math.round(Number(inputPaidAmount)) : grandTotal;
    if (isNaN(paidAmount) || paidAmount < 0) paidAmount = grandTotal;

    let prevOutstanding = Math.round(Number(customerDoc?.outstandingBalance || 0));
    let prevAdvance = Math.round(Number(customerDoc?.advanceBalance || 0));

    const advanceUsed = Math.min(prevAdvance, grandTotal);
    const netBillToPay = grandTotal - advanceUsed;
    let remainingAdvance = prevAdvance - advanceUsed;

    let newBillDue = 0;
    let extraPaid = 0;
    let clearedPrevDue = 0;
    let newTotalOutstanding = prevOutstanding;
    let newCustomerAdvance = remainingAdvance;

    if (paidAmount < netBillToPay) {
      newBillDue = Math.round(netBillToPay - paidAmount);
      newTotalOutstanding = Math.round(prevOutstanding + newBillDue);
    } else if (paidAmount === netBillToPay) {
      newBillDue = 0;
      newTotalOutstanding = prevOutstanding;
    } else {
      newBillDue = 0;
      extraPaid = Math.round(paidAmount - netBillToPay);

      if (prevOutstanding > 0) {
        clearedPrevDue = Math.min(prevOutstanding, extraPaid);
        const remainingExtra = extraPaid - clearedPrevDue;
        newTotalOutstanding = Math.round(prevOutstanding - clearedPrevDue);
        newCustomerAdvance = Math.round(remainingAdvance + remainingExtra);
      } else {
        newCustomerAdvance = Math.round(remainingAdvance + extraPaid);
        newTotalOutstanding = 0;
      }
    }

    const status = calculateInvoicePaymentStatus(grandTotal, paidAmount, newBillDue, data.status);
    let dueStatus = newBillDue <= 0 ? 'No Due' : 'Due In 30 Days';

    const tItemsProc = Date.now() - tSnapshotStart;
    console.log(`[BILL TIMING] Invoice items processing: ${tItemsProc}ms`);

    // 3. Invoice Number Generation
    const tNumStart = Date.now();
    const autoInvoiceNumber = await generateNextInvoiceNumber(userId);
    const tNumGen = Date.now() - tNumStart;
    console.log(`[BILL TIMING] Invoice number generation: ${tNumGen}ms`);

    // 4. Save Invoice DB Document
    const tInvSaveStart = Date.now();
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
    const tInvSave = Date.now() - tInvSaveStart;
    console.log(`[BILL TIMING] Invoice database save: ${tInvSave}ms`);

    // 5. Batched Stock Deductions & Stock Ledger Entries
    const tStockDedStart = Date.now();

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
            update: { $set: { totalStock: currentStock } },
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

    const tStockDed = Date.now() - tStockDedStart;
    console.log(`[BILL TIMING] Stock deduction: ${tStockDed}ms`);
    console.log(`[BILL TIMING] Transaction creation: ${tStockDed}ms`);

    // 6. Customer Ledger & Payment Processing
    const tLedgerStart = Date.now();
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
    const tLedger = Date.now() - tLedgerStart;
    console.log(`[BILL TIMING] Customer ledger update: ${tLedger}ms`);

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

    const session = await mongoose.startSession();
    let isTransactionStarted = false;

    try {
      try {
        session.startTransaction();
        isTransactionStarted = true;
      } catch (_err) {
        // Session / transaction not supported on standalone mongod without replica set
      }

      const opts = isTransactionStarted ? { session } : {};

      const invoice = await SalesInvoice.findOne({ _id: id, userId }, null, opts).exec();
      if (!invoice) {
        throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
      }

      // 1. Check whether stock was actually deducted & restore stock
      const shouldRestoreStock = invoice.status !== 'Cancelled';
      const reversalStockLedgerEntries = [];

      if (shouldRestoreStock) {
        for (const item of invoice.items || []) {
          if (item.productId && item.quantity > 0) {
            const prod = await Product.findOneAndUpdate(
              { _id: item.productId, userId },
              { $inc: { totalStock: item.quantity } },
              { new: true, ...opts }
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
                  { $inc: { currentStock: alloc.quantity } },
                  opts
                ).exec();
              }
            }
          }
        }

        // 2. Insert INVOICE_DELETE_REVERSAL stock ledger entries for audit trail
        if (reversalStockLedgerEntries.length > 0) {
          await StockLedger.insertMany(reversalStockLedgerEntries, opts);
        }

        // Clean up original SALE stock ledger entries
        await StockLedger.deleteMany(
          {
            userId,
            referenceId: invoice._id,
            transactionType: 'SALE',
          },
          opts
        ).exec();
      }

      // 3. Delete ALL payments directly linked to this invoice (registered, walk-in, or general)
      const payRef = `PAY-BILL-${invoice.invoiceNumber}`;
      await CustomerPayment.deleteMany(
        {
          userId,
          $or: [
            { invoiceId: invoice._id },
            { refNo: payRef },
          ],
        },
        opts
      ).exec();

      // 4. Delete the SalesInvoice document
      await SalesInvoice.deleteOne({ _id: invoice._id, userId }, opts).exec();

      if (isTransactionStarted) {
        await session.commitTransaction();
        isTransactionStarted = false; // Mark committed so catch block won't abort
      }

      // 5. Recalculate affected customer balance AFTER transaction commit
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
        message: `Invoice #${invoice.invoiceNumber} deleted successfully, inventory restored, and payments cleaned`,
      };
    } catch (error) {
      if (isTransactionStarted) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
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

  async restoreInvoice(id, userId, docOverride = null) {
    if (!userId) throw new Error('userId is required');

    const session = await mongoose.startSession();
    let isTransactionStarted = false;

    try {
      try {
        session.startTransaction();
        isTransactionStarted = true;
      } catch (_err) {
        // Transaction not supported on standalone mongod without replica set
      }

      const opts = isTransactionStarted ? { session } : {};

      // 1. Locate existing invoice or use docOverride
      let invoice = docOverride;
      if (!invoice) {
        invoice = await SalesInvoice.findOne({ _id: id, userId }, null, opts).exec();
        if (!invoice && mongoose.Types.ObjectId.isValid(id)) {
          invoice = await SalesInvoice.findById(id, null, opts).exec();
        }
      }

      if (!invoice) {
        throw new AppError('Invoice not found for restoration', HTTP_STATUS.NOT_FOUND);
      }

      // Check if invoice exists in DB and stock is already deducted for active invoice
      const existDoc = await SalesInvoice.findOne({ _id: invoice._id }, null, opts).exec();
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
          const prod = await Product.findOne({ _id: item.productId, userId }, null, opts).lean();
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
              const batch = await ProductBatch.findOne({ _id: alloc.batchId, userId }, null, opts).lean();
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
            { new: true, ...opts }
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
                { $inc: { currentStock: -alloc.quantity } },
                opts
              ).exec();
            }
          }
        }
      }

      // 4. Record stock ledger entries for audit trail
      if (deductionStockLedgerEntries.length > 0) {
        await StockLedger.insertMany(deductionStockLedgerEntries, opts);
      }

      // 5. Restore/Update invoice document state
      let updatedInvoice;
      if (existDoc) {
        existDoc.isActive = true;
        existDoc.isStockDeducted = true;
        if (existDoc.status === 'Cancelled') {
          existDoc.status = 'Paid';
        }
        updatedInvoice = await existDoc.save(opts);
      } else {
        const cleanDoc = typeof invoice.toObject === 'function' ? invoice.toObject() : { ...invoice };
        cleanDoc.isActive = true;
        cleanDoc.isStockDeducted = true;
        if (cleanDoc.status === 'Cancelled') {
          cleanDoc.status = 'Paid';
        }
        const createdDocs = await SalesInvoice.create([cleanDoc], opts);
        updatedInvoice = Array.isArray(createdDocs) ? createdDocs[0] : createdDocs;
      }

      if (isTransactionStarted) {
        await session.commitTransaction();
        isTransactionStarted = false;
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
    } catch (error) {
      if (isTransactionStarted) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  },
};
