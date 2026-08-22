import mongoose from 'mongoose';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { Purchase } from '../../purchases/models/purchase.model.js';
import { Product } from '../../products/models/product.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { CustomerPayment } from '../../customers/models/customerPayment.model.js';
import { ProductBatch } from '../../products/models/productBatch.model.js';
import { SupplierLedger } from '../../suppliers/models/supplierLedger.model.js';

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

    // Build base SalesInvoice match query excluding cancelled/void invoices
    const salesMatch = {
      userId: userObjId,
      status: { $ne: 'Cancelled' },
    };

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
      productFacetResult,
      customerBalanceResult,
      supplierBalanceResult,
      validPaymentResult,
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
          $facet: {
            totalProfit: [
              {
                $group: {
                  _id: null,
                  totalGrossProfit: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.lineProfit', 0] } }, 0] },
                        { $toDouble: '$items.lineProfit' },
                        {
                          $multiply: [
                            { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                            { $subtract: [{ $toDouble: { $ifNull: ['$items.unitPrice', 0] } }, { $toDouble: { $ifNull: ['$items.purchaseCostRate', 0] } }] },
                          ],
                        },
                      ],
                    },
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
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.taxableAmount', 0] } }, 0] },
                        { $toDouble: '$items.taxableAmount' },
                        { $multiply: [{ $toDouble: { $ifNull: ['$items.quantity', 0] } }, { $toDouble: { $ifNull: ['$items.unitPrice', 0] } }] },
                      ],
                    },
                  },
                  profit: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.lineProfit', 0] } }, 0] },
                        { $toDouble: '$items.lineProfit' },
                        {
                          $multiply: [
                            { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                            { $subtract: [{ $toDouble: { $ifNull: ['$items.unitPrice', 0] } }, { $toDouble: { $ifNull: ['$items.purchaseCostRate', 0] } }] },
                          ],
                        },
                      ],
                    },
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
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.taxableAmount', 0] } }, 0] },
                        { $toDouble: '$items.taxableAmount' },
                        { $multiply: [{ $toDouble: { $ifNull: ['$items.quantity', 0] } }, { $toDouble: { $ifNull: ['$items.unitPrice', 0] } }] },
                      ],
                    },
                  },
                  profit: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.lineProfit', 0] } }, 0] },
                        { $toDouble: '$items.lineProfit' },
                        {
                          $multiply: [
                            { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                            { $subtract: [{ $toDouble: { $ifNull: ['$items.unitPrice', 0] } }, { $toDouble: { $ifNull: ['$items.purchaseCostRate', 0] } }] },
                          ],
                        },
                      ],
                    },
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
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.taxableAmount', 0] } }, 0] },
                        { $toDouble: '$items.taxableAmount' },
                        { $multiply: [{ $toDouble: { $ifNull: ['$items.quantity', 0] } }, { $toDouble: { $ifNull: ['$items.unitPrice', 0] } }] },
                      ],
                    },
                  },
                  profit: {
                    $sum: {
                      $cond: [
                        { $gt: [{ $toDouble: { $ifNull: ['$items.lineProfit', 0] } }, 0] },
                        { $toDouble: '$items.lineProfit' },
                        {
                          $multiply: [
                            { $toDouble: { $ifNull: ['$items.quantity', 0] } },
                            { $subtract: [{ $toDouble: { $ifNull: ['$items.unitPrice', 0] } }, { $toDouble: { $ifNull: ['$items.purchaseCostRate', 0] } }] },
                          ],
                        },
                      ],
                    },
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

      // 3. Product Inventory MongoDB Aggregation Pipeline
      Product.aggregate([
        { $match: { userId: userObjId, isActive: true } },
        {
          $facet: {
            inventorySummary: [
              {
                $lookup: {
                  from: 'productbatches',
                  let: { prodId: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$productId', '$$prodId'] },
                            { $eq: ['$userId', userObjId] }
                          ]
                        }
                      }
                    }
                  ],
                  as: 'batchDocs',
                },
              },
              {
                $project: {
                  totalStock: 1,
                  defaultPurchaseRate: 1,
                  batchVal: {
                    $reduce: {
                      input: {
                        $filter: {
                          input: '$batchDocs',
                          as: 'b',
                          cond: { $and: [{ $eq: ['$$b.isActive', true] }, { $gt: [{ $toDouble: '$$b.currentStock' }, 0] }] },
                        },
                      },
                      initialValue: 0,
                      in: {
                        $add: [
                          '$$value',
                          { $multiply: [{ $toDouble: { $ifNull: ['$$this.currentStock', 0] } }, { $toDouble: { $ifNull: ['$$this.purchaseRate', 0] } }] },
                        ],
                      },
                    },
                  },
                  batchStock: {
                    $reduce: {
                      input: {
                        $filter: {
                          input: '$batchDocs',
                          as: 'b',
                          cond: { $and: [{ $eq: ['$$b.isActive', true] }, { $gt: [{ $toDouble: '$$b.currentStock' }, 0] }] },
                        },
                      },
                      initialValue: 0,
                      in: { $add: ['$$value', { $toDouble: { $ifNull: ['$$this.currentStock', 0] } }] },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalInventoryValue: {
                    $sum: {
                      $add: [
                        '$batchVal',
                        {
                          $multiply: [
                            { $max: [0, { $subtract: [{ $toDouble: { $ifNull: ['$totalStock', 0] } }, '$batchStock'] }] },
                            { $toDouble: { $ifNull: ['$defaultPurchaseRate', 0] } },
                          ],
                        },
                      ],
                    },
                  },
                  totalProducts: { $sum: 1 },
                },
              },
            ],
            lowStockCount: [
              {
                $match: {
                  $expr: {
                    $lte: [
                      { $toDouble: { $ifNull: ['$totalStock', 0] } },
                      { $toDouble: { $ifNull: ['$minimumStockAlert', 10] } },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            outOfStockCount: [{ $match: { totalStock: 0 } }, { $count: 'count' }],
            mostPurchasedProducts: [
              {
                $project: {
                  name: 1,
                  stock: '$totalStock',
                  value: { $multiply: [{ $toDouble: { $ifNull: ['$totalStock', 0] } }, { $toDouble: { $ifNull: ['$defaultPurchaseRate', 0] } }] },
                },
              },
              { $sort: { value: -1 } },
              { $limit: 10 },
            ],
          },
        },
      ]),

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
    ]);

    const salesDataObj = { ...(salesHeaderFacetResult[0] || {}), ...(salesItemFacetResult[0] || {}) };
    const purchaseDataObj = purchaseFacetResult[0] || {};
    const productDataObj = productFacetResult[0] || {};

    const totalInvoicesCount = salesDataObj.totalSales?.[0]?.totalInvoices || 0;

    const todaySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.todaySales?.[0]?.total || 0) : 0);
    const weeklySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.weeklySales?.[0]?.total || 0) : 0);
    const monthlySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.monthlySales?.[0]?.total || 0) : 0);
    const prevMonthlySales = Math.round(salesDataObj.prevMonthlySales?.[0]?.total || 0);
    const yearlySales = Math.round(totalInvoicesCount > 0 ? (salesDataObj.yearlySales?.[0]?.total || 0) : 0);
    const totalSalesVal = Math.round(totalInvoicesCount > 0 ? (salesDataObj.totalSales?.[0]?.totalSalesVal || 0) : 0);
    const totalSalesPaid = Math.round(totalInvoicesCount > 0 ? (salesDataObj.totalSales?.[0]?.totalPaid || 0) : 0);
    const totalSalesDue = Math.round(totalInvoicesCount > 0 ? (salesDataObj.totalSales?.[0]?.totalDue || 0) : 0);

    const todayPurchase = Math.round(purchaseDataObj.todayPurchase?.[0]?.total || 0);
    const weeklyPurchase = Math.round(purchaseDataObj.weeklyPurchase?.[0]?.total || 0);
    const monthlyPurchase = Math.round(purchaseDataObj.monthlyPurchase?.[0]?.total || 0);
    const prevMonthlyPurchase = Math.round(purchaseDataObj.prevMonthlyPurchase?.[0]?.total || 0);
    const yearlyPurchase = Math.round(purchaseDataObj.yearlyPurchase?.[0]?.total || 0);
    const totalPurchaseVal = Math.round(purchaseDataObj.totalPurchase?.[0]?.totalPurchaseVal || 0);
    const totalPurchasePaid = Math.round(purchaseDataObj.totalPurchase?.[0]?.totalPaid || 0);

    const currentStockVal = Math.round(productDataObj.inventorySummary?.[0]?.totalInventoryValue || 0);
    const lowStockCount = productDataObj.lowStockCount?.[0]?.count || 0;
    const outOfStockCount = productDataObj.outOfStockCount?.[0]?.count || 0;

    const finalCustomerOutstanding = Math.round(totalInvoicesCount > 0 ? (customerBalanceResult[0]?.totalOutstanding || totalSalesDue) : 0);
    const totalAdvanceCollections = Math.round(customerBalanceResult[0]?.totalAdvance || 0);
    const finalSupplierOutstanding = Math.round(supplierBalanceResult[0]?.totalOutstanding || 0);

    // Total Collections is calculated dynamically from valid CustomerPayment records or valid bill payments
    const validPaymentsCollection = Math.round(validPaymentResult[0]?.totalCollection || 0);
    const totalCollection = Math.round(totalInvoicesCount > 0 ? Math.max(totalSalesPaid, validPaymentsCollection) : validPaymentsCollection);

    const totalGrossProfit = totalInvoicesCount > 0 ? Math.round(salesDataObj.totalProfit?.[0]?.totalGrossProfit || 0) : 0;

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

    const isSupplierDuesExceedStock = finalSupplierOutstanding > currentStockVal;
    let businessHealthStatus = 'Excellent';
    let businessHealthScore = 100;

    if (isSupplierDuesExceedStock && currentStockVal > 0) {
      businessHealthStatus = 'Warning';
      businessHealthScore = Math.max(40, Math.round(100 - (finalSupplierOutstanding / currentStockVal) * 50));
    } else if (finalCustomerOutstanding > totalSalesVal * 0.4 && totalSalesVal > 0) {
      businessHealthStatus = 'Good';
      businessHealthScore = 75;
    }

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
        type: 'INFO',
        title: `Profit Margin Holds at ${profitPctVal}%`,
        description: `Gross profit of ₹${totalGrossProfit.toLocaleString('en-IN')} generated on ₹${totalSalesVal.toLocaleString('en-IN')} total sales.`,
      },
      {
        id: 4,
        type: lowStockCount > 0 ? 'WARNING' : 'SUCCESS',
        title: lowStockCount > 0 ? `${lowStockCount} Products Near Low Stock Threshold` : 'Inventory Reorder Level Healthy',
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
        outstandingCollection: finalCustomerOutstanding,
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
          outstandingCustomers: totalInvoicesCount > 0 ? (salesDataObj.topCustomers || []).filter((c) => c.dues > 0) : [],
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
          mostPurchasedProducts: productDataObj.mostPurchasedProducts || [],
        },
      },
      overallBusiness: {
        totalSales: totalSalesVal,
        totalPurchase: totalPurchaseVal,
        grossProfit: totalGrossProfit,
        profitPct: profitPctVal,
        inventoryValue: currentStockVal,
        cashCollection: totalCollection,
        customerOutstanding: finalCustomerOutstanding,
        supplierOutstanding: finalSupplierOutstanding,
        currentStockValue: currentStockVal,
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
