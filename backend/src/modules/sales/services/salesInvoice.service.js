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

const DEFAULT_INVOICES = [
  {
    invoiceNumber: 'INV-2026-0101',
    date: new Date('2026-07-28T10:30:00Z'),
    customerName: 'Ramesh Kumar',
    customerMobile: '9848011223',
    customerAddress: 'Tenali, Guntur District',
    items: [
      { productName: 'Urea Fertilizer 50kg', quantity: 10, unitPrice: 270, totalAmount: 2700 },
      { productName: 'DAP (Di-ammonium Phosphate) 50kg', quantity: 5, unitPrice: 1350, totalAmount: 6750 },
    ],
    subtotal: 9450,
    taxAmount: 472.5,
    discountAmount: 0,
    totalAmount: 9922.5,
    paidAmount: 9922.5,
    dueAmount: 0,
    status: 'Paid',
    dueStatus: 'No Due',
    paymentMode: 'UPI',
    notes: 'Paid via GPay UPI #998811',
  },
  {
    invoiceNumber: 'INV-2026-0102',
    date: new Date('2026-07-26T14:15:00Z'),
    customerName: 'Venkat Reddy',
    customerMobile: '9848022334',
    customerAddress: 'Bapatla, Andhra Pradesh',
    items: [
      { productName: 'NPK 19-19-19 Complex 50kg', quantity: 15, unitPrice: 1420, totalAmount: 21300 },
      { productName: 'Neem Oil Organic Pesticide 1L', quantity: 10, unitPrice: 450, totalAmount: 4500 },
    ],
    subtotal: 25800,
    taxAmount: 1290,
    discountAmount: 500,
    totalAmount: 26590,
    paidAmount: 15000,
    dueAmount: 11590,
    status: 'Partial',
    dueStatus: 'Due In 30 Days',
    paymentMode: 'Cash',
    notes: 'Advance cash paid ₹15,000. Balance due in 2 weeks.',
  },
];

export async function generateNextInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `INV-${currentYear}-`;
  const yearRegex = new RegExp(`^INV-${currentYear}-\\d+$`, 'i');

  const invoices = await SalesInvoice.find({ invoiceNumber: { $regex: yearRegex } })
    .select('invoiceNumber')
    .lean()
    .exec();

  let maxSeq = 1000;

  if (Array.isArray(invoices) && invoices.length > 0) {
    for (const inv of invoices) {
      if (inv?.invoiceNumber) {
        const parts = inv.invoiceNumber.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;

  while (await SalesInvoice.exists({ invoiceNumber: candidate })) {
    nextSeq += 1;
    candidate = `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  return candidate;
}

export const salesInvoiceService = {
  async seedDefaultInvoices() {
    return;
  },

  async getAllInvoices(query = {}) {
    const filter = {};

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

    const allDbInvoices = await SalesInvoice.find().lean().exec();
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
      totalPages: Math.ceil(totalRecords / limit),
      summary: {
        totalBills,
        totalAmount,
        totalPaid,
        totalDue,
        duePercentage,
      },
      counters,
    };
  },

  async getInvoiceById(id) {
    let invoice = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      invoice = await SalesInvoice.findById(id).lean().exec();
    }
    if (!invoice && id) {
      invoice = await SalesInvoice.findOne({ invoiceNumber: id }).lean().exec();
    }
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }
    return invoice;
  },

  async createInvoice(data) {
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

    // 1. Locate Customer in MongoDB ONLY if an explicit ADDED Customer ID or ADDED type is requested
    let customerDoc = null;
    let customerTypeVal = 'GENERAL';

    const reqCustId = customerObj?._id || data.customerId;
    if (reqCustId && mongoose.Types.ObjectId.isValid(reqCustId)) {
      const foundCust = await Customer.findById(reqCustId).exec();
      if (foundCust && foundCust.customerType === 'ADDED') {
        customerDoc = foundCust;
        customerTypeVal = 'ADDED';
      }
    } else if (data.customerType === 'ADDED' && customerMobile) {
      const foundCust = await Customer.findOne({ mobile: customerMobile, customerType: 'ADDED', isActive: true }).exec();
      if (foundCust) {
        customerDoc = foundCust;
        customerTypeVal = 'ADDED';
      }
    }

    // 0. Check Idempotency Key to prevent duplicate bill submission
    const idempotencyKey = data.idempotencyKey || null;
    if (idempotencyKey) {
      const existingInv = await SalesInvoice.findOne({ idempotencyKey }).exec();
      if (existingInv) {
        logger.info(`🛡️ Duplicate bill submission blocked by idempotency key: ${idempotencyKey}`);
        return {
          invoice: existingInv,
          customer: customerDoc,
          advanceUsed: 0,
          newBillDue: existingInv.dueAmount,
          clearedPrevDue: 0,
        };
      }
    }

    // 1. Check Product Stock Availability (Validates Product document stock only)
    for (const item of items) {
      const prodId = item.productId || item.id || item._id;
      const qty = Number(item.qty || item.quantity || 0);
      if (prodId && qty > 0) {
        let prod = null;
        if (mongoose.Types.ObjectId.isValid(prodId)) {
          prod = await Product.findById(prodId).exec();
        }
        if (!prod && typeof prodId === 'string') {
          prod = await Product.findOne({
            $or: [{ name: new RegExp(`^${prodId.trim()}$`, 'i') }, { code: prodId }],
          }).exec();
        }

        const prodName = prod ? prod.name : (item.name || item.productName || 'Product');
        const currentStock = prod ? Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0)) : 0;
        const validationPassed = currentStock >= qty;

        // Print debug logs before validation
        console.log('====================================================');
        console.log('--- PRODUCT STOCK VALIDATION AUDIT LOG ---');
        console.log('Product Name:', prodName);
        console.log('ProductId:', prod ? prod._id.toString() : prodId);
        console.log('Requested Qty:', qty);
        console.log('Current Product Stock:', currentStock);
        console.log('Validation Result:', validationPassed ? 'PASSED' : 'FAILED');
        console.log('Mongo Query used:', `Product.findById("${prodId}")`);
        console.log('====================================================');

        logger.info({
          prodName,
          productId: prod ? prod._id.toString() : prodId,
          requestedQty: qty,
          currentProductStock: currentStock,
          validationResult: validationPassed ? 'PASSED' : 'FAILED',
          mongoQueryUsed: `Product.findById("${prodId}")`,
        }, '🔍 PRODUCT STOCK VALIDATION AUDIT LOG');

        if (!prod) {
          throw new AppError(`Product with ID '${prodId}' not found`, HTTP_STATUS.BAD_REQUEST);
        }

        if (currentStock < qty) {
          throw new AppError(
            `Only ${currentStock} units available for "${prodName}". Requested: ${qty}.`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }
    }

    const grandTotal = Number(totalAmount || 0);
    let paidAmount = inputPaidAmount !== undefined ? Number(inputPaidAmount) : grandTotal;
    if (isNaN(paidAmount) || paidAmount < 0) paidAmount = grandTotal;

    let prevOutstanding = Number(customerDoc?.outstandingBalance || 0);
    let prevAdvance = Number(customerDoc?.advanceBalance || 0);

    // Step A: Auto-apply available advance to bill
    const advanceUsed = Math.min(prevAdvance, grandTotal);
    const netBillToPay = grandTotal - advanceUsed;
    let remainingAdvance = prevAdvance - advanceUsed;

    // Step B: Payment and Overpaid / Underpaid Calculations
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

    // Determine Invoice status & due status
    let status = 'Paid';
    let dueStatus = 'No Due';
    if (newBillDue > 0) {
      status = paidAmount > 0 || advanceUsed > 0 ? 'Partial' : 'Due';
      dueStatus = 'Due In 30 Days';
    }

    // 2. FIFO Batch Stock Allocation & Line Costing Snapshot (In-Memory Allocation)
    const itemSnapshots = [];
    const batchDeductionsToApply = [];
    const virtualBatchStockMap = new Map();

    for (const i of items) {
      const pId = i.productId || i.id || i._id;
      const qty = Number(i.qty || i.quantity || 1);
      const inputUnitPrice = Number(i.price || i.unitPrice || 0);

      let prod = null;
      if (pId && mongoose.Types.ObjectId.isValid(pId)) {
        prod = await Product.findById(pId).populate('brandId categoryId defaultUnitId').lean().exec();
      }

      const pCode = i.productCode || prod?.code || '';
      const pName = i.name || i.productName || prod?.name || 'Agri Product';
      const bName = i.brandName || prod?.brandId?.name || prod?.company || '';
      const cName = i.categoryName || prod?.categoryId?.name || 'General';
      const uName = i.unitName || prod?.defaultUnitId?.shortName || i.unit || 'Unit';
      const hsn = i.hsnCode || prod?.hsnCode || '';
      const gst = Number(i.gstRate ?? i.gstPercent ?? prod?.gstRate ?? 18);

      // FIFO Batch Allocation & Accurate COGS & Batch Selling Price Calculation
      let remainingToAllocate = qty;
      let totalLineCost = 0;
      let totalBatchSellingRevenue = 0;
      let primaryBatchNumber = i.batchNumber || '';
      const itemBatchAllocations = [];

      if (pId) {
        const activeBatches = await ProductBatch.find({
          productId: pId,
          isActive: true,
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

      // Fallback cost & selling rate if unallocated quantity remains (e.g. legacy stock without batch entries)
      if (remainingToAllocate > 0) {
        const fallbackCostRate = Number(i.purchaseCostRate || i.purchaseRate || prod?.defaultPurchaseRate || 0);
        const fallbackSellingPrice = inputUnitPrice || Number(prod?.defaultSellingPrice || 0);
        totalLineCost += remainingToAllocate * fallbackCostRate;
        totalBatchSellingRevenue += remainingToAllocate * fallbackSellingPrice;
      }

      // Determine if batch allocations span multiple selling prices and split itemSnapshots accordingly
      const distinctSellingPrices = new Set(itemBatchAllocations.map((a) => a.sellingPrice));
      const discountPct = Number(i.discountPct || i.discountPercent || 0);

      logger.info(`🔍 AUTHORITATIVE BACKEND FIFO ALLOCATION AUDIT FOR INVOICE CREATION:
        Product: ${pName} (${pId})
        Requested Qty: ${qty}
        Input Price: ₹${inputUnitPrice}
        Allocations: ${JSON.stringify(itemBatchAllocations)}
        Distinct Prices Count: ${distinctSellingPrices.size}
      `);

      if (itemBatchAllocations.length > 1 && distinctSellingPrices.size > 1) {
        // Multi-batch sale with DIFFERENT selling prices -> Split into separate line itemSnapshots
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
        // Single batch sale or multi-batch with identical selling prices -> Consolidated itemSnapshot
        const effectiveUnitPrice = (inputUnitPrice > 0 && itemBatchAllocations.length === 0)
          ? inputUnitPrice
          : (qty > 0 ? totalBatchSellingRevenue / qty : Number(prod?.defaultSellingPrice || 0));

        const weightedCostRate = qty > 0 ? totalLineCost / qty : Number(prod?.defaultPurchaseRate || 0);
        const grossLineTotal = qty * effectiveUnitPrice;
        const discountAmount = Number(i.discountAmount || (grossLineTotal * discountPct) / 100);
        const taxableAmount = Math.max(0, grossLineTotal - discountAmount);

        const hasItemGst = i.gstAmount !== undefined || i.taxableAmount !== undefined || Number(i.gstRate || 0) > 0;
        const gstAmount = hasItemGst ? Number(i.gstAmount || (taxableAmount * gst) / 100) : 0;
        const lineTotal = taxableAmount + gstAmount;
        const lineProfit = Number(taxableAmount - totalLineCost);

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
          unitPrice: effectiveUnitPrice,
          purchaseCostRate: weightedCostRate,
          discountPct,
          discountAmount,
          gstRate: hasItemGst ? gst : 0,
          gstAmount,
          taxableAmount,
          lineTotal,
          lineProfit,
          totalAmount: lineTotal,
        });
      }
    }

    // Compute final pre-tax subtotal, tax total, and grandTotal authoritatively from itemSnapshots
    const computedTaxableSubtotal = itemSnapshots.reduce((acc, item) => acc + Number(item.taxableAmount || 0), 0);
    const computedGstTotal = itemSnapshots.reduce((acc, item) => acc + Number(item.gstAmount || 0), 0);
    const computedLineTotalSum = itemSnapshots.reduce((acc, item) => acc + Number(item.lineTotal || 0), 0);

    const headerDiscount = Number(discountAmount || 0);
    const finalSubtotal = computedTaxableSubtotal;
    const finalTaxAmount = Number(taxAmount || 0) > 0 ? Number(taxAmount) : computedGstTotal;
    const finalGrandTotal = Math.max(0, finalSubtotal - headerDiscount + finalTaxAmount);

    const finalPaidAmount = inputPaidAmount !== undefined ? Math.min(finalGrandTotal, Math.max(0, Number(inputPaidAmount))) : finalGrandTotal;
    const finalDueAmount = Math.max(0, finalGrandTotal - finalPaidAmount);

    // 3. Save Sales Invoice with Concurrency Retry Loop for E11000 duplicate invoiceNumber
    let attempts = 0;
    const maxAttempts = 5;
    let invoice = null;

    while (attempts < maxAttempts) {
      attempts += 1;
      const candidateInvoiceNumber = await generateNextInvoiceNumber();

      try {
        invoice = await SalesInvoice.create({
          invoiceNumber: candidateInvoiceNumber,
          date: new Date(),
          customerId: customerDoc ? customerDoc._id : null,
          customerType: customerTypeVal,
          customerName,
          customerMobile,
          customerAddress: customerDoc ? `${customerDoc.village}, ${customerDoc.mandal}` : '',
          items: itemSnapshots,
          subtotal: finalSubtotal,
          taxAmount: finalTaxAmount,
          discountAmount: headerDiscount,
          totalAmount: finalGrandTotal,
          paidAmount: finalPaidAmount,
          dueAmount: finalDueAmount,
          status: finalDueAmount > 0 ? (finalPaidAmount > 0 ? 'Partial' : 'Due') : 'Paid',
          dueStatus: finalDueAmount > 0 ? 'Due In 30 Days' : 'No Due',
          paymentMode,
          notes,
          idempotencyKey,
        });

        // Creation succeeded! Break retry loop.
        break;
      } catch (err) {
        const isDuplicateInvoiceNumber =
          err.code === 11000 &&
          (err.keyPattern?.invoiceNumber ||
            (err.errmsg && err.errmsg.includes('invoiceNumber')) ||
            (err.message && err.message.includes('invoiceNumber')));

        if (isDuplicateInvoiceNumber && attempts < maxAttempts) {
          logger.warn(`⚠️ Invoice number collision detected on attempt ${attempts}. Retrying with next sequence...`);
          continue;
        }

        throw err;
      }
    }

    if (!invoice) {
      throw new AppError('Failed to generate a unique invoice number after multiple attempts.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // 4. NOW Apply Stock Reductions on ProductBatch & Product Master + Record Stock Ledger Audit Trail
    for (const bDed of batchDeductionsToApply) {
      const bDoc = await ProductBatch.findById(bDed.batchId).exec();
      if (bDoc) {
        const prevStock = bDoc.currentStock;
        bDoc.currentStock = Math.max(0, bDoc.currentStock - bDed.allocatedQty);
        if (bDoc.currentStock === 0) {
          bDoc.isActive = false;
        }
        await bDoc.save();

        // Record StockLedger entry for this batch deduction
        try {
          await StockLedger.create({
            transactionType: 'SALE',
            referenceId: invoice._id,
            referenceNumber: invoice.invoiceNumber,
            productId: bDed.productId,
            batchId: bDed.batchId,
            batchNumber: bDed.batchNumber,
            quantity: -bDed.allocatedQty,
            purchaseRate: bDed.purchaseRate,
            sellingPrice: bDed.sellingPrice,
            previousStock: prevStock,
            currentStock: bDoc.currentStock,
            createdBy: 'System (Sales)',
            timestamp: invoice.date || new Date(),
          });
        } catch (lErr) {
          logger.error({ err: lErr }, 'Error creating StockLedger record for sale deduction');
        }

        logger.info(`📦 FIFO Allocated ${bDed.allocatedQty} units from Batch '${bDoc.batchNumber}' for Invoice #${invoice.invoiceNumber}`);
      }
    }

    for (const item of items) {
      const prodId = item.productId || item.id || item._id;
      const qty = Number(item.qty || item.quantity || 0);
      if (prodId && qty > 0) {
        try {
          let prod = null;
          if (mongoose.Types.ObjectId.isValid(prodId)) {
            prod = await Product.findById(prodId).exec();
          }
          if (!prod && typeof prodId === 'string') {
            prod = await Product.findOne({
              $or: [{ name: new RegExp(`^${prodId.trim()}$`, 'i') }, { code: prodId }],
            }).exec();
          }

          if (prod) {
            const currentStock = Math.max(0, Number(prod.totalStock ?? prod.currentStock ?? 0));
            const newStock = Math.max(0, currentStock - qty);
            prod.totalStock = newStock;
            await prod.save();
            logger.info(`📦 Product stock updated for "${prod.name}": ${currentStock} ➔ ${newStock}`);
          }
        } catch (e) {
          logger.error({ err: e }, `Failed to reduce stock for product ${prodId}`);
        }
      }
    }

    // 5. Synchronize Customer Document & Invoice Balances ONLY for ADDED customers
    if (customerDoc && customerTypeVal === 'ADDED') {
      await customerService.syncCustomerAndInvoices(customerDoc._id);
    }

    return {
      invoice,
      customer: customerDoc,
      advanceUsed,
      newBillDue,
      clearedPrevDue,
    };
  },

  async deleteInvoice(id) {
    let invoice = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      invoice = await SalesInvoice.findById(id).exec();
    }
    if (!invoice && id) {
      invoice = await SalesInvoice.findOne({ invoiceNumber: id }).exec();
    }
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    // 1. Restore Inventory Stock for every billed item at batch level
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    for (const item of items) {
      const prodId = item.productId || item.product || item._id;
      const qty = Number(item.quantity || item.qty || 0);
      if (prodId && qty > 0) {
        try {
          await Product.findByIdAndUpdate(prodId, { $inc: { totalStock: qty } }).exec();

          // If item recorded batch allocations, restore to exact batches
          if (Array.isArray(item.batchAllocations) && item.batchAllocations.length > 0) {
            for (const alloc of item.batchAllocations) {
              let batchDoc = null;
              if (alloc.batchId) {
                batchDoc = await ProductBatch.findById(alloc.batchId).exec();
              }
              if (!batchDoc && alloc.batchNumber) {
                batchDoc = await ProductBatch.findOne({ productId: prodId, batchNumber: alloc.batchNumber }).exec();
              }

              if (batchDoc) {
                const prevStock = batchDoc.currentStock;
                batchDoc.currentStock += alloc.quantity;
                batchDoc.isActive = true;
                await batchDoc.save();

                await StockLedger.create({
                  transactionType: 'SALE_RETURN',
                  referenceId: invoice._id,
                  referenceNumber: invoice.invoiceNumber,
                  productId: prodId,
                  batchId: batchDoc._id,
                  batchNumber: batchDoc.batchNumber,
                  quantity: alloc.quantity,
                  purchaseRate: alloc.purchaseRate || batchDoc.purchaseRate || 0,
                  sellingPrice: alloc.sellingPrice || batchDoc.sellingPrice || 0,
                  previousStock: prevStock,
                  currentStock: batchDoc.currentStock,
                  createdBy: 'System (Cancellation)',
                  timestamp: new Date(),
                });
              }
            }
          } else if (item.batchNumber) {
            const batchDoc = await ProductBatch.findOne({ productId: prodId, batchNumber: item.batchNumber }).exec();
            if (batchDoc) {
              const prevStock = batchDoc.currentStock;
              batchDoc.currentStock += qty;
              batchDoc.isActive = true;
              await batchDoc.save();

              await StockLedger.create({
                transactionType: 'SALE_RETURN',
                referenceId: invoice._id,
                referenceNumber: invoice.invoiceNumber,
                productId: prodId,
                batchId: batchDoc._id,
                batchNumber: batchDoc.batchNumber,
                quantity: qty,
                purchaseRate: batchDoc.purchaseRate || 0,
                sellingPrice: batchDoc.sellingPrice || 0,
                previousStock: prevStock,
                currentStock: batchDoc.currentStock,
                createdBy: 'System (Cancellation)',
                timestamp: new Date(),
              });
            }
          }
        } catch (e) {
          logger.error({ err: e }, `Failed to restore stock for product ${prodId}`);
        }
      }
    }

    // 2. Adjust Customer totals via single source of truth
    let customer = null;
    if (invoice.customerMobile || invoice.customerName) {
      customer = await Customer.findOne({
        $or: [{ mobile: invoice.customerMobile }, { name: invoice.customerName }],
      }).exec();
    }

    // 3. Delete SalesInvoice Document
    await SalesInvoice.findByIdAndDelete(invoice._id).exec();

    if (customer) {
      await customerService.calculateCustomerBalance(customer._id);
    }

    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} deleted successfully and stock restored`,
      deletedInvoiceId: invoice._id,
    };
  },

  async updateInvoice(id, payload) {
    let invoice = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      invoice = await SalesInvoice.findById(id).exec();
    }
    if (!invoice && id) {
      invoice = await SalesInvoice.findOne({ invoiceNumber: id }).exec();
    }
    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    if (payload.customerName !== undefined) invoice.customerName = payload.customerName;
    if (payload.customerMobile !== undefined) invoice.customerMobile = payload.customerMobile;
    if (payload.customerAddress !== undefined) invoice.customerAddress = payload.customerAddress;
    if (payload.items !== undefined) {
      invoice.items = payload.items.map((i) => {
        const qty = Number(i.quantity || i.qty || 1);
        const price = Number(i.unitPrice !== undefined && i.unitPrice !== null ? i.unitPrice : (i.sellingPrice || i.price || i.rate || 0));
        return {
          productId: i.productId || i.id,
          productName: i.productName || i.name || 'Agri Product',
          quantity: qty,
          unitPrice: price,
          totalAmount: Number(i.totalAmount !== undefined && i.totalAmount !== null ? i.totalAmount : (qty * price)),
        };
      });
    }
    if (payload.subtotal !== undefined) invoice.subtotal = payload.subtotal;
    if (payload.discountAmount !== undefined) invoice.discountAmount = payload.discountAmount;
    if (payload.taxAmount !== undefined) invoice.taxAmount = payload.taxAmount;
    if (payload.totalAmount !== undefined) invoice.totalAmount = payload.totalAmount;
    if (payload.paidAmount !== undefined) invoice.paidAmount = payload.paidAmount;
    if (payload.paymentMode !== undefined) invoice.paymentMode = payload.paymentMode;
    if (payload.notes !== undefined) invoice.notes = payload.notes;

    const grandTotal = Number(invoice.totalAmount || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    invoice.dueAmount = Math.max(0, grandTotal - paidAmount);
    invoice.status = invoice.dueAmount === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');

    await invoice.save();

    if (invoice.customerMobile || invoice.customerName) {
      const customer = await Customer.findOne({
        $or: [{ mobile: invoice.customerMobile }, { name: invoice.customerName }],
      }).exec();
      if (customer) {
        await customerService.calculateCustomerBalance(customer._id);
      }
    }

    return invoice;
  },

  // Read-only FIFO allocation preview for frontend billing drawer (does NOT deduct stock)
  async previewInvoice(payload = {}) {
    const items = payload.items || [];
    const discountAmount = Number(payload.discountAmount || 0);

    const itemSnapshots = [];
    const virtualBatchStockMap = new Map();

    for (const i of items) {
      const pId = i.productId || i.id || i._id;
      const qty = Number(i.qty || i.quantity || 1);
      const inputUnitPrice = Number(i.price || i.unitPrice || 0);

      let prod = null;
      if (pId && mongoose.Types.ObjectId.isValid(pId)) {
        prod = await Product.findById(pId).populate('brandId categoryId defaultUnitId').lean().exec();
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
          productId: pId,
          isActive: true,
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
        for (let idx = 0; idx < itemBatchAllocations.length; idx += 1) {
          const alloc = itemBatchAllocations[idx];
          const allocQty = alloc.quantity;
          const allocSellingPrice = alloc.sellingPrice;
          const allocCostRate = alloc.purchaseRate;

          const allocGrossTotal = allocQty * allocSellingPrice;
          const allocDiscountAmount = (allocGrossTotal * discountPct) / 100;
          const allocTaxableAmount = Math.max(0, allocGrossTotal - allocDiscountAmount);
          const hasItemGst = i.gstAmount !== undefined || i.taxableAmount !== undefined || Number(i.gstRate || 0) > 0;
          const allocGstAmount = hasItemGst ? (allocTaxableAmount * gst) / 100 : 0;
          const allocLineTotal = allocTaxableAmount + allocGstAmount;

          itemSnapshots.push({
            id: `${pId}-batch-${alloc.batchNumber || idx}`,
            originalProductId: pId,
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
            qty: allocQty,
            unitPrice: allocSellingPrice,
            price: allocSellingPrice,
            lineTotal: allocLineTotal,
            isFifoSplit: true,
            fifoSplitNotice: idx > 0
              ? `Taken from next batch at ₹${allocSellingPrice} (Previous batch contained ${itemBatchAllocations[0].quantity} ${uName}s @ ₹${itemBatchAllocations[0].sellingPrice})`
              : undefined,
          });
        }
      } else {
        const effectiveUnitPrice = (inputUnitPrice > 0 && itemBatchAllocations.length === 0)
          ? inputUnitPrice
          : (qty > 0 ? totalBatchSellingRevenue / qty : Number(prod?.defaultSellingPrice || 0));

        const grossLineTotal = qty * effectiveUnitPrice;
        const lineDiscountAmount = Number(i.discountAmount || (grossLineTotal * discountPct) / 100);
        const taxableAmount = Math.max(0, grossLineTotal - lineDiscountAmount);

        const hasItemGst = i.gstAmount !== undefined || i.taxableAmount !== undefined || Number(i.gstRate || 0) > 0;
        const gstAmount = hasItemGst ? Number(i.gstAmount || (taxableAmount * gst) / 100) : 0;
        const lineTotal = taxableAmount + gstAmount;

        itemSnapshots.push({
          id: pId,
          originalProductId: pId,
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
          qty,
          unitPrice: effectiveUnitPrice,
          price: effectiveUnitPrice,
          lineTotal,
        });
      }
    }

    const computedTaxableSubtotal = itemSnapshots.reduce((acc, item) => acc + Number(item.lineTotal || 0), 0);
    const finalSubtotal = computedTaxableSubtotal;
    const finalGrandTotal = Math.max(0, finalSubtotal - discountAmount);

    return {
      items: itemSnapshots,
      subtotal: finalSubtotal,
      grandTotal: finalGrandTotal,
    };
  },
};
