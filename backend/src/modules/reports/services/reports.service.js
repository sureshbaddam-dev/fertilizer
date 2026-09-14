import mongoose from 'mongoose';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { Purchase } from '../../purchases/models/purchase.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { CustomerPayment } from '../../customers/models/customerPayment.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { StockLedger } from '../../purchases/models/stockLedger.model.js';
import { productService } from '../../products/services/product.service.js';

export const reportsService = {
  async getBIAnalytics(filters = {}, userId) {
    if (!userId) throw new Error('userId is required');
    const userObjId = new mongoose.Types.ObjectId(userId);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfToday = new Date(currentYear, currentMonth, now.getDate());
    const endOfToday = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPrevMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const startOfYear = new Date(currentYear, 0, 1);

    // Parse date period filters if supplied
    let periodStartDate = null;
    let periodEndDate = null;
    if (filters.dateRange === 'TODAY') {
      periodStartDate = startOfToday;
      periodEndDate = endOfToday;
    } else if (filters.dateRange === 'THIS_WEEK') {
      periodStartDate = startOfWeek;
      periodEndDate = endOfToday;
    } else if (filters.dateRange === 'THIS_MONTH') {
      periodStartDate = startOfMonth;
      periodEndDate = endOfToday;
    } else if (filters.dateRange === 'THIS_YEAR') {
      periodStartDate = startOfYear;
      periodEndDate = endOfToday;
    } else if (filters.startDate && filters.endDate) {
      periodStartDate = new Date(filters.startDate);
      periodEndDate = new Date(filters.endDate);
    }

    // Build base SalesInvoice match query excluding cancelled/void invoices
    const salesMatch = {
      userId: userObjId,
      status: { $ne: 'Cancelled' },
    };

    if (periodStartDate && periodEndDate) {
      salesMatch.createdAt = { $gte: periodStartDate, $lte: periodEndDate };
    }

    if (filters.customer && filters.customer !== 'ALL') {
      if (mongoose.Types.ObjectId.isValid(filters.customer)) {
        salesMatch.customerId = new mongoose.Types.ObjectId(filters.customer);
      } else {
        salesMatch.customerName = new RegExp(filters.customer, 'i');
      }
    }

    if (filters.paymentMode && filters.paymentMode !== 'ALL') {
      salesMatch.paymentMode = filters.paymentMode;
    }

    // Build base Purchase match query excluding cancelled purchases
    const purchaseMatch = {
      userId: userObjId,
      status: { $ne: 'Cancelled' },
    };

    if (periodStartDate && periodEndDate) {
      purchaseMatch.purchaseDate = { $gte: periodStartDate, $lte: periodEndDate };
    }

    if (filters.supplier && filters.supplier !== 'ALL') {
      if (mongoose.Types.ObjectId.isValid(filters.supplier)) {
        purchaseMatch.supplierId = new mongoose.Types.ObjectId(filters.supplier);
      } else {
        purchaseMatch.supplierName = new RegExp(filters.supplier, 'i');
      }
    }

    // Build CustomerPayment match query
    const paymentMatch = {
      userId: userObjId,
    };

    if (filters.paymentMode && filters.paymentMode !== 'ALL') {
      paymentMatch.paymentMode = filters.paymentMode;
    }

    if (filters.customer && filters.customer !== 'ALL' && mongoose.Types.ObjectId.isValid(filters.customer)) {
      paymentMatch.customer = new mongoose.Types.ObjectId(filters.customer);
    }

    const [
      salesHeaderFacetResult,
      salesItemFacetResult,
      purchaseFacetResult,
      productServiceResult,
      customerBalanceResult,
      supplierBalanceResult,
      validPaymentResult,
      openingStockBatchResult,
      openingStockLedgerResult,
    ] = await Promise.all([
      // 1a. SalesInvoice Header-Level MongoDB Facet Aggregation Pipeline
      SalesInvoice.aggregate([
        { $match: salesMatch },
        {
          $facet: {
            todaySales: [
              { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],
            weeklySales: [
              { $match: { createdAt: { $gte: startOfWeek } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],
            monthlySales: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],
            prevMonthlySales: [
              { $match: { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],
            yearlySales: [
              { $match: { createdAt: { $gte: startOfYear } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ],
            totalSales: [
              {
                $group: {
                  _id: null,
                  taxableSalesVal: { $sum: { $ifNull: ['$subtotal', { $subtract: ['$totalAmount', '$taxAmount'] }] } },
                  totalGstCollected: { $sum: { $ifNull: ['$taxAmount', 0] } },
                  grandTotalVal: { $sum: '$totalAmount' },
                  totalSalesVal: { $sum: { $ifNull: ['$totalAmount', '$subtotal'] } },
                  totalPaid: { $sum: '$paidAmount' },
                  totalDue: { $sum: '$dueAmount' },
                  totalInvoices: { $sum: 1 },
                },
              },
            ],
            topCustomers: [
              {
                $group: {
                  _id: { $ifNull: ['$customerName', 'Walk-in Customer'] },
                  name: { $first: { $ifNull: ['$customerName', 'Walk-in Customer'] } },
                  revenue: { $sum: { $ifNull: ['$totalAmount', '$subtotal'] } },
                  paid: { $sum: '$paidAmount' },
                  dues: { $sum: '$dueAmount' },
                  billsCount: { $sum: 1 },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 10 },
            ],
            recentSales: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  id: '$_id',
                  docNo: { $ifNull: ['$invoiceNumber', 'INV-000'] },
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  party: { $ifNull: ['$customerName', 'Walk-in Customer'] },
                  amount: { $ifNull: ['$totalAmount', '$subtotal'] },
                  status: { $ifNull: ['$status', 'Paid'] },
                },
              },
            ],
            dailySalesTrend: [
              { $match: { createdAt: { $gte: startOfMonth, $lte: endOfToday } } },
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  sales: { $sum: '$totalAmount' },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),

      // 1b. SalesInvoice Item-Level Single-Unwind Aggregation Pipeline
      SalesInvoice.aggregate([
        { $match: salesMatch },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: 'products',
            let: { pId: '$items.productId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toString: '$_id' }, { $toString: '$$pId' }],
                  },
                },
              },
            ],
            as: 'productDoc',
          },
        },
        {
          $lookup: {
            from: 'productbatches',
            let: { pId: '$items.productId', bNum: '$items.batchNumber' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { $and: [{ $ne: ['$$bNum', ''] }, { $ne: ['$$bNum', null] }, { $eq: ['$batchNumber', '$$bNum'] }] },
                          { $eq: [{ $toString: '$productId' }, { $toString: '$$pId' }] },
                        ],
                      },
                      { $gt: ['$purchaseRate', 0] },
                    ],
                  },
                },
              },
              { $sort: { isOpeningStock: -1, createdAt: 1 } },
              { $limit: 1 },
            ],
            as: 'matchedBatchDoc',
          },
        },
        {
          $addFields: {
            batchAllocTotalCost: {
              $reduce: {
                input: { $ifNull: ['$items.batchAllocations', []] },
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    {
                      $multiply: [
                        { $toDouble: { $ifNull: ['$$this.quantity', 0] } },
                        { $toDouble: { $ifNull: ['$$this.purchaseRate', 0] } },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            resolvedPurchaseCostRate: {
              $cond: [
                { $gt: ['$batchAllocTotalCost', 0] },
                {
                  $divide: [
                    '$batchAllocTotalCost',
                    { $cond: [{ $gt: [{ $toDouble: { $ifNull: ['$items.quantity', 1] } }, 0] }, { $toDouble: '$items.quantity' }, 1] },
                  ],
                },
                {
                  $cond: [
                    { $gt: [{ $toDouble: { $ifNull: ['$items.purchaseCostRate', 0] } }, 0] },
                    { $toDouble: '$items.purchaseCostRate' },
                    {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: [{ $arrayElemAt: ['$matchedBatchDoc.purchaseRate', 0] }, 0] } }, 0] },
                        { $toDouble: { $arrayElemAt: ['$matchedBatchDoc.purchaseRate', 0] } },
                        { $toDouble: { $ifNull: [{ $arrayElemAt: ['$productDoc.defaultPurchaseRate', 0] }, 0] } },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $addFields: {
            resolvedItemCost: {
              $cond: [
                { $gt: ['$batchAllocTotalCost', 0] },
                '$batchAllocTotalCost',
                {
                  $multiply: [
                    { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                    '$resolvedPurchaseCostRate',
                  ],
                },
              ],
            },
            resolvedItemRevenue: {
              $cond: [
                { $gt: [{ $toDouble: { $ifNull: ['$items.taxableAmount', 0] } }, 0] },
                { $toDouble: '$items.taxableAmount' },
                {
                  $multiply: [
                    { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                    { $toDouble: { $ifNull: ['$items.unitPrice', 0] } },
                  ],
                },
              ],
            },
          },
        },
        {
          $addFields: {
            resolvedLineProfit: {
              $subtract: ['$resolvedItemRevenue', '$resolvedItemCost'],
            },
          },
        },
        {
          $facet: {
            totalProfit: [
              {
                $group: {
                  _id: null,
                  totalGrossProfit: {
                    $sum: '$resolvedLineProfit',
                  },
                  totalCOGS: {
                    $sum: '$resolvedItemCost',
                  },
                },
              },
            ],
            topProducts: [
              {
                $group: {
                  _id: { $ifNull: ['$items.productId', '$items.productName'] },
                  name: { $first: { $ifNull: ['$items.productName', 'Product'] } },
                  quantitySold: { $sum: { $toDouble: { $ifNull: ['$items.quantity', 0] } } },
                  salesValue: {
                    $sum: '$resolvedItemRevenue',
                  },
                  profit: {
                    $sum: '$resolvedLineProfit',
                  },
                },
              },
              { $sort: { salesValue: -1 } },
              { $limit: 10 },
            ],
            monthlySalesTrend: [
              {
                $group: {
                  _id: { $month: '$createdAt' },
                  sales: {
                    $sum: '$resolvedItemRevenue',
                  },
                  profit: {
                    $sum: '$resolvedLineProfit',
                  },
                },
              },
              { $sort: { _id: 1 } },
            ],
            yearlySalesTrend: [
              {
                $group: {
                  _id: { $year: '$createdAt' },
                  sales: {
                    $sum: '$resolvedItemRevenue',
                  },
                  profit: {
                    $sum: '$resolvedLineProfit',
                  },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),

      // 2. Purchase MongoDB Facet Aggregation Pipeline
      Purchase.aggregate([
        { $match: purchaseMatch },
        {
          $facet: {
            todayPurchase: [
              { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
              { $group: { _id: null, total: { $sum: '$totalInvoiceAmount' } } },
            ],
            weeklyPurchase: [
              { $match: { createdAt: { $gte: startOfWeek } } },
              { $group: { _id: null, total: { $sum: '$totalInvoiceAmount' } } },
            ],
            monthlyPurchase: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $group: { _id: null, total: { $sum: '$totalInvoiceAmount' } } },
            ],
            prevMonthlyPurchase: [
              { $match: { createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
              { $group: { _id: null, total: { $sum: '$totalInvoiceAmount' } } },
            ],
            yearlyPurchase: [
              { $match: { createdAt: { $gte: startOfYear } } },
              { $group: { _id: null, total: { $sum: '$totalInvoiceAmount' } } },
            ],
            totalPurchase: [
              {
                $group: {
                  _id: null,
                  totalPurchaseVal: { $sum: '$totalInvoiceAmount' },
                  totalPaid: { $sum: '$paidAmount' },
                  totalDue: { $sum: '$dueAmount' },
                  totalBills: { $sum: 1 },
                },
              },
            ],
            topSuppliers: [
              {
                $group: {
                  _id: '$supplierId',
                  supplierName: { $first: { $ifNull: ['$supplierName', 'Supplier'] } },
                  totalPurchased: { $sum: '$totalInvoiceAmount' },
                  totalPaid: { $sum: '$paidAmount' },
                  balance: { $sum: '$dueAmount' },
                },
              },
              { $sort: { totalPurchased: -1 } },
              { $limit: 10 },
            ],
            recentPurchases: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  id: '$_id',
                  docNo: { $ifNull: ['$purchaseInvoiceNumber', 'PUR-000'] },
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  party: { $ifNull: ['$supplierName', 'Supplier'] },
                  amount: { $ifNull: ['$totalInvoiceAmount', 0] },
                  status: { $ifNull: ['$status', 'Completed'] },
                },
              },
            ],
            monthlyPurchaseTrend: [
              {
                $group: {
                  _id: { $month: '$createdAt' },
                  purchase: { $sum: '$totalInvoiceAmount' },
                  paid: { $sum: '$paidAmount' },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]),

      // 3. Product Inventory from Authoritative Product Service
      productService.getAllProducts({ includeInactive: 'true' }, userId),

      // 4. Customer MongoDB Aggregation Pipeline
      Customer.aggregate([
        { $match: { userId: userObjId, isActive: true } },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$outstandingBalance' },
            totalAdvance: { $sum: '$advanceBalance' },
          },
        },
      ]),

      // 5. Supplier MongoDB Aggregation Pipeline
      Supplier.aggregate([
        { $match: { userId: userObjId, isActive: true } },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$outstandingBalance' },
          },
        },
      ]),

      // 6. Valid CustomerPayment Aggregation Pipeline (Excludes orphaned/cancelled payments)
      CustomerPayment.aggregate([
        { $match: paymentMatch },
        {
          $lookup: {
            from: 'salesinvoices',
            localField: 'invoiceId',
            foreignField: '_id',
            as: 'linkedInvoice',
          },
        },
        {
          $match: {
            $or: [
              { invoiceId: { $exists: false } },
              { invoiceId: null },
              {
                'linkedInvoice.0': { $exists: true },
                'linkedInvoice.0.status': { $ne: 'Cancelled' },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            cashCollection: {
              $sum: {
                $cond: [{ $eq: ['$paymentMode', 'Cash'] }, '$amount', 0],
              },
            },
            totalCollection: { $sum: '$amount' },
          },
        },
      ]),

      // 7. Business-Level Opening Stock Valuation from ProductBatch
      ProductBatch.aggregate([
        {
          $match: {
            userId: userObjId,
            isOpeningStock: true,
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            totalOpeningStockValue: {
              $sum: {
                $multiply: [
                  { $toDouble: { $ifNull: ['$initialQuantity', '$currentStock'] } },
                  { $toDouble: { $ifNull: ['$purchaseRate', 0] } },
                ],
              },
            },
            totalOpeningStockQty: {
              $sum: { $toDouble: { $ifNull: ['$initialQuantity', '$currentStock'] } },
            },
          },
        },
      ]),

      // 8. Business-Level Opening Stock Valuation from StockLedger (Fallback audit)
      StockLedger.aggregate([
        {
          $match: {
            userId: userObjId,
            transactionType: 'OPENING_STOCK',
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            totalOpeningStockValue: {
              $sum: {
                $multiply: [
                  { $toDouble: { $ifNull: ['$quantity', 0] } },
                  { $toDouble: { $ifNull: ['$purchaseRate', 0] } },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const salesDataObj = { ...(salesHeaderFacetResult[0] || {}), ...(salesItemFacetResult[0] || {}) };
    const purchaseDataObj = purchaseFacetResult[0] || {};
    const allProductsList = productServiceResult?.products || [];

    const totalInvoicesCount = salesDataObj.totalSales?.[0]?.totalInvoices || 0;

    const todaySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.todaySales?.[0]?.total || 0) : 0);
    const weeklySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.weeklySales?.[0]?.total || 0) : 0);
    const monthlySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.monthlySales?.[0]?.total || 0) : 0);
    const prevMonthlySales = Math.round(salesDataObj.prevMonthlySales?.[0]?.total || 0);
    const yearlySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.yearlySales?.[0]?.total || 0) : 0);
    const totalSalesVal = Math.round(totalInvoicesCount > 0 ? (salesDataObj.totalSales?.[0]?.totalSalesVal || 0) : 0);
    const totalSalesPaid = Math.round(totalInvoicesCount > 0 ? (salesDataObj.totalSales?.[0]?.totalPaid || 0) : 0);

    const todayPurchase = Math.round(purchaseDataObj.todayPurchase?.[0]?.total || 0);
    const weeklyPurchase = Math.round(purchaseDataObj.weeklyPurchase?.[0]?.total || 0);
    const monthlyPurchase = Math.round(purchaseDataObj.monthlyPurchase?.[0]?.total || 0);
    const prevMonthlyPurchase = Math.round(purchaseDataObj.prevMonthlyPurchase?.[0]?.total || 0);
    const yearlyPurchase = Math.round(purchaseDataObj.yearlyPurchase?.[0]?.total || 0);
    const totalPurchaseVal = Math.round(purchaseDataObj.totalPurchase?.[0]?.totalPurchaseVal || 0);
    const totalPurchasePaid = Math.round(purchaseDataObj.totalPurchase?.[0]?.totalPaid || 0);

    // Authoritative Current Stock Valuation exactly matching Inventory Page
    const currentStockVal = Math.round(
      allProductsList.reduce((sum, p) => sum + Number(p.stockValue ?? p.totalStockValue ?? 0), 0)
    );
    const totalProductsCount = allProductsList.length;
    const lowStockCount = allProductsList.filter((p) => {
      const stock = Number(p.totalStock ?? p.currentStock ?? 0);
      const minAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);
      return stock > 0 && stock <= minAlert;
    }).length;
    const outOfStockCount = allProductsList.filter((p) => Number(p.totalStock ?? p.currentStock ?? 0) <= 0).length;
    const mostPurchasedProducts = allProductsList
      .map((p) => ({
        name: p.name,
        stock: Number(p.totalStock || 0),
        value: Number(p.stockValue ?? p.totalStockValue ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const totalAdvanceCollections = Math.round(customerBalanceResult[0]?.totalAdvance || 0);
    const finalSupplierOutstanding = Math.round(supplierBalanceResult[0]?.totalOutstanding || 0);

    // Fetch individual customer balances and unpaid invoices to accurately compute Opening Balance Dues vs Current Invoice Dues
    const [activeCustomers, activeInvoices] = await Promise.all([
      Customer.find({ userId: userObjId, isActive: { $ne: false } })
        .select('_id name mobile customerType openingBalance openingBalanceType outstandingBalance advanceBalance')
        .lean()
        .exec(),
      SalesInvoice.find({
        userId: userObjId,
        status: { $ne: 'Cancelled' },
        isDeleted: { $ne: true },
      })
        .select('_id invoiceNumber customerId customerName customerMobile totalAmount paidAmount dueAmount status')
        .lean()
        .exec(),
    ]);

    let totalCustomerDues = 0;
    const customerReceivablesList = [];

    const addedMobiles = new Set();
    const addedIds = new Set();

    activeCustomers
      .filter((c) => c.customerType === 'ADDED' || !c.customerType)
      .forEach((c) => {
        const cIdStr = c._id.toString();
        addedIds.add(cIdStr);
        if (c.mobile) addedMobiles.add(c.mobile.trim());

        const totalDue = Math.round(Number(c.outstandingBalance) || 0);
        totalCustomerDues += totalDue;

        if (totalDue > 0) {
          customerReceivablesList.push({
            id: cIdStr,
            name: c.name || 'Unnamed Customer',
            mobile: c.mobile || '-',
            dues: totalDue,
            totalDue,
            customerType: 'ADDED',
          });
        }
      });

    // Process General Customers with unpaid invoice balances
    const generalDueInvoices = activeInvoices.filter(
      (i) =>
        (!i.customerId || !addedIds.has(i.customerId.toString())) &&
        (!i.customerMobile || !addedMobiles.has(i.customerMobile.trim())) &&
        (Number(i.dueAmount) || 0) > 0
    );

    const generalCustomerMap = {};
    generalDueInvoices.forEach((inv) => {
      const name = (inv.customerName || 'General Customer').trim();
      const mobile = (inv.customerMobile || '-').trim();
      const key = `${name.toLowerCase()}_${mobile}`;

      if (!generalCustomerMap[key]) {
        generalCustomerMap[key] = {
          id: inv._id.toString(),
          name,
          mobile,
          dues: 0,
          totalDue: 0,
          customerType: 'GENERAL',
        };
      }

      const invDue = Math.round(Number(inv.dueAmount) || 0);
      generalCustomerMap[key].dues += invDue;
      generalCustomerMap[key].totalDue += invDue;
    });

    Object.values(generalCustomerMap).forEach((g) => {
      totalCustomerDues += g.totalDue;
      customerReceivablesList.push(g);
    });

    customerReceivablesList.sort((a, b) => b.totalDue - a.totalDue);

    // Total Collections is calculated dynamically from valid CustomerPayment records or valid bill payments
    const validPaymentsCollection = Math.round(validPaymentResult[0]?.totalCollection || 0);
    const totalCollection = Math.round(totalInvoicesCount > 0 ? Math.max(totalSalesPaid, validPaymentsCollection) : validPaymentsCollection);

    // Accurate COGS and Gross Profit calculation using FIFO layers
    const totalCOGS = totalInvoicesCount > 0 ? Math.round(salesDataObj.totalProfit?.[0]?.totalCOGS || 0) : 0;
    const totalGrossProfit = totalInvoicesCount > 0
      ? Math.round(salesDataObj.totalProfit?.[0]?.totalGrossProfit ?? (totalSalesVal - totalCOGS))
      : 0;

    // Total Business Opening Stock Value derived from authoritative product batches or batch aggregates
    let openingStockValFromProducts = 0;
    allProductsList.forEach((p) => {
      (p.batches || []).forEach((b) => {
        if (b.isOpeningStock) {
          const qty = Number(b.initialQuantity ?? b.quantityPurchased ?? b.currentStock ?? 0);
          const rate = Number(b.purchaseRate ?? p.defaultPurchaseRate ?? 0);
          openingStockValFromProducts += qty * rate;
        }
      });
    });

    const batchOpeningVal = Math.round(openingStockBatchResult?.[0]?.totalOpeningStockValue || 0);
    const ledgerOpeningVal = Math.round(openingStockLedgerResult?.[0]?.totalOpeningStockValue || 0);
    const totalOpeningStockVal = openingStockValFromProducts > 0
      ? Math.round(openingStockValFromProducts)
      : (batchOpeningVal > 0 ? batchOpeningVal : ledgerOpeningVal);

    // Safe Sales Growth % calculation
    let salesGrowthPct = 0;
    if (prevMonthlySales > 0) {
      salesGrowthPct = Number((((monthlySales - prevMonthlySales) / prevMonthlySales) * 100).toFixed(1));
    } else if (monthlySales > 0) {
      salesGrowthPct = 100;
    }

    // Safe Purchase Growth % calculation
    let purchaseGrowthPct = 0;
    if (prevMonthlyPurchase > 0) {
      purchaseGrowthPct = Number((((monthlyPurchase - prevMonthlyPurchase) / prevMonthlyPurchase) * 100).toFixed(1));
    } else if (monthlyPurchase > 0) {
      purchaseGrowthPct = 100;
    }

    const avgBillValue = totalInvoicesCount > 0 ? Math.round(totalSalesVal / totalInvoicesCount) : 0;
    const profitPctVal = totalSalesVal > 0 ? Number(((totalGrossProfit / totalSalesVal) * 100).toFixed(1)) : 0;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesMap = {};
    const monthlyProfitMap = {};
    (salesDataObj.monthlySalesTrend || []).forEach((m) => {
      monthlySalesMap[m._id] = m.sales || 0;
      monthlyProfitMap[m._id] = m.profit || 0;
    });
    const monthlyPurchaseMap = {};
    (purchaseDataObj.monthlyPurchaseTrend || []).forEach((m) => {
      monthlyPurchaseMap[m._id] = m.purchase || 0;
    });

    const monthlySalesTrend = [];
    for (let m = 1; m <= 12; m++) {
      const sVal = monthlySalesMap[m] || 0;
      const pVal = monthlyPurchaseMap[m] || 0;
      const profVal = monthlyProfitMap[m] || 0;
      monthlySalesTrend.push({
        month: monthNames[m - 1],
        sales: sVal,
        purchase: pVal,
        profit: profVal,
        cashFlow: sVal - pVal,
      });
    }

    const dailySalesTrend = (salesDataObj.dailySalesTrend || []).map((d) => ({
      date: d._id,
      sales: d.sales || 0,
      count: d.count || 0,
    }));

    const yearlySalesTrend = (salesDataObj.yearlySalesTrend || []).map((y) => ({
      year: `${y._id}`,
      sales: y.sales || 0,
      purchase: 0,
      profit: y.profit || 0,
    }));

    // Dynamic Business Health Engine (0-100 Score with 5 Deterministic Pillars)
    const isSupplierDuesExceedStock = finalSupplierOutstanding > currentStockVal;

    // Pillar 1: Profit Margin (0-20 pts)
    let pillarProfit = 15;
    if (totalSalesVal > 0) {
      if (profitPctVal >= 20) pillarProfit = 20;
      else if (profitPctVal >= 15) pillarProfit = 16;
      else if (profitPctVal >= 10) pillarProfit = 12;
      else if (profitPctVal >= 5) pillarProfit = 8;
      else if (profitPctVal > 0) pillarProfit = 4;
      else pillarProfit = 0;
    }

    // Pillar 2: Sales Activity & Growth (0-20 pts)
    let pillarSales = 15;
    if (salesGrowthPct >= 15) pillarSales = 20;
    else if (salesGrowthPct >= 0) pillarSales = 16;
    else if (salesGrowthPct >= -10) pillarSales = 12;
    else if (salesGrowthPct >= -25) pillarSales = 8;
    else pillarSales = 4;

    // Pillar 3: Supplier Coverage / Working Capital (0-20 pts)
    let pillarSupplier = 20;
    if (finalSupplierOutstanding > 0) {
      if (currentStockVal >= finalSupplierOutstanding * 2) pillarSupplier = 20;
      else if (currentStockVal >= finalSupplierOutstanding) pillarSupplier = 15;
      else if (currentStockVal >= finalSupplierOutstanding * 0.5) pillarSupplier = 10;
      else pillarSupplier = 4;
    }

    // Pillar 4: Customer Receivables Exposure (0-20 pts)
    let pillarReceivables = 20;
    if (totalCustomerDues > 0) {
      if (totalSalesVal > 0) {
        const dueRatio = totalCustomerDues / totalSalesVal;
        if (dueRatio <= 0.2) pillarReceivables = 20;
        else if (dueRatio <= 0.4) pillarReceivables = 16;
        else if (dueRatio <= 0.7) pillarReceivables = 12;
        else if (dueRatio <= 1.0) pillarReceivables = 8;
        else pillarReceivables = 4;
      } else {
        pillarReceivables = 12;
      }
    }

    // Pillar 5: Inventory & Out-of-Stock Health (0-20 pts)
    let pillarInventory = 20;
    if (totalProductsCount > 0) {
      if (outOfStockCount === 0 && lowStockCount === 0) pillarInventory = 20;
      else if (outOfStockCount === 0 && lowStockCount <= 2) pillarInventory = 16;
      else {
        const penalty = outOfStockCount * 4 + lowStockCount * 1;
        pillarInventory = Math.max(5, 20 - penalty);
      }
    }

    const businessHealthScore = Math.min(100, Math.max(0, pillarProfit + pillarSales + pillarSupplier + pillarReceivables + pillarInventory));

    let businessHealthStatus = 'Good';
    if (businessHealthScore >= 90) businessHealthStatus = 'Excellent';
    else if (businessHealthScore >= 75) businessHealthStatus = 'Good';
    else if (businessHealthScore >= 50) businessHealthStatus = 'Fair';
    else if (businessHealthScore >= 25) businessHealthStatus = 'Needs Attention';
    else businessHealthStatus = 'Critical';

    const businessInsights = [
      {
        id: 1,
        type: isSupplierDuesExceedStock ? 'WARNING' : 'HEALTHY',
        title: isSupplierDuesExceedStock ? 'Supplier Dues Exceed Inventory Value' : 'Inventory Comfortably Covers Supplier Dues',
        description: isSupplierDuesExceedStock
          ? `Supplier outstanding (₹${finalSupplierOutstanding.toLocaleString('en-IN')}) is higher than current inventory value (₹${currentStockVal.toLocaleString('en-IN')}).`
          : `Current physical stock value (₹${currentStockVal.toLocaleString('en-IN')}) fully covers supplier dues (₹${finalSupplierOutstanding.toLocaleString('en-IN')}).`,
      },
      {
        id: 2,
        type: salesGrowthPct >= 0 ? 'SUCCESS' : 'WARNING',
        title: salesGrowthPct >= 0 ? `Sales Grew by ${salesGrowthPct}% This Month` : `Sales Declined by ${Math.abs(salesGrowthPct)}%`,
        description: `Monthly sales reached ₹${monthlySales.toLocaleString('en-IN')} compared to ₹${prevMonthlySales.toLocaleString('en-IN')} in the previous period.`,
      },
      {
        id: 3,
        type: profitPctVal >= 15 ? 'SUCCESS' : profitPctVal > 0 ? 'INFO' : 'WARNING',
        title: `Profit Margin Holds at ${profitPctVal}%`,
        description: `Gross profit of ₹${totalGrossProfit.toLocaleString('en-IN')} generated on ₹${totalSalesVal.toLocaleString('en-IN')} total sales.`,
      },
      {
        id: 4,
        type: outOfStockCount > 0 ? 'WARNING' : lowStockCount > 0 ? 'INFO' : 'SUCCESS',
        title: outOfStockCount > 0 ? `${outOfStockCount} Products Out of Stock` : lowStockCount > 0 ? `${lowStockCount} Products Near Low Stock Threshold` : 'Inventory Reorder Level Healthy',
        description: `${lowStockCount} items require reorder replenishment while ${outOfStockCount} items are completely out of stock.`,
      },
    ];

    return {
      sales: {
        todaySales,
        weeklySales,
        monthlySales,
        yearlySales,
        totalSales: totalSalesVal,
        totalCollection,
        outstandingCollection: totalCustomerDues,
        salesGrowth: salesGrowthPct,
        avgBillValue,
        charts: {
          dailySalesTrend,
          monthlySalesTrend,
          yearlySalesTrend,
        },
        tables: {
          topCustomers: totalInvoicesCount > 0 ? (salesDataObj.topCustomers || []) : [],
          topSellingProducts: totalInvoicesCount > 0 ? (salesDataObj.topProducts || []) : [],
          recentSales: totalInvoicesCount > 0 ? (salesDataObj.recentSales || []) : [],
          outstandingCustomers: (customerReceivablesList || []).map((c) => ({
            id: c.id,
            name: c.name,
            mobile: c.mobile,
            dues: c.totalDue,
            customerType: c.customerType,
          })),
        },
      },
      purchases: {
        todayPurchase,
        weeklyPurchase,
        monthlyPurchase,
        yearlyPurchase,
        totalPurchase: totalPurchaseVal,
        amountPaid: totalPurchasePaid,
        outstandingPayables: finalSupplierOutstanding,
        purchaseGrowth: purchaseGrowthPct,
        charts: {
          purchaseTrend: [],
          monthlyPurchase: monthlySalesTrend,
          supplierPurchaseTrend: (purchaseDataObj.topSuppliers || []).map((s) => ({ name: s.supplierName, amount: s.totalPurchased })),
        },
        tables: {
          topSuppliers: purchaseDataObj.topSuppliers || [],
          recentPurchases: purchaseDataObj.recentPurchases || [],
          outstandingSuppliers: (purchaseDataObj.topSuppliers || []).filter((s) => s.balance > 0),
          mostPurchasedProducts: mostPurchasedProducts || [],
        },
      },
      overallBusiness: {
        totalSales: totalSalesVal,
        totalPurchase: totalPurchaseVal,
        openingStockValue: totalOpeningStockVal,
        grossProfit: totalGrossProfit,
        profitPct: profitPctVal,
        inventoryValue: currentStockVal,
        currentStockValue: currentStockVal,
        cashCollection: totalCollection,
        customerOutstanding: totalCustomerDues,
        customerDues: totalCustomerDues,
        customerReceivables: totalCustomerDues,
        totalCustomerDues,
        customerReceivablesList,
        supplierOutstanding: finalSupplierOutstanding,
        supplierDues: finalSupplierOutstanding,
        advanceCollections: totalAdvanceCollections,
        businessHealth: {
          status: businessHealthStatus,
          score: businessHealthScore,
          supplierDuesExceedStock: isSupplierDuesExceedStock,
        },
        insights: businessInsights,
        charts: {
          salesVsPurchase: monthlySalesTrend,
          profitTrend: monthlySalesTrend.map((m) => ({ month: m.month, profit: m.profit })),
          inventoryTrend: monthlySalesTrend.map((m) => ({ month: m.month, value: Math.round(currentStockVal) })),
          cashFlow: monthlySalesTrend.map((m) => ({ month: m.month, cashFlow: m.cashFlow })),
          businessGrowth: yearlySalesTrend,
        },
        tables: {
          topProfitableProducts: totalInvoicesCount > 0 ? (salesDataObj.topProducts || []) : [],
          fastMovingProducts: totalInvoicesCount > 0 ? (salesDataObj.topProducts || []) : [],
          slowMovingProducts: [],
          deadStock: [],
        },
      },
    };
  },
};
