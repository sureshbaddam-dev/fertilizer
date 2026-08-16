import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { Product } from '../../products/models/product.model.js';
import { Category } from '../../masters/models/category.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { shopDiscountService } from '../../settings/services/shopDiscount.service.js';
import { reportsService } from '../../reports/services/reports.service.js';

export const dashboardService = {
  async getDashboardSummary(userId) {
    if (!userId) throw new Error('userId is required');
    const now = new Date();

    const biData = await reportsService.getBIAnalytics({}, userId);

    const salesInfo = biData?.sales || {};
    const overallInfo = biData?.overallBusiness || {};

    const rawTodaySales = salesInfo.todaySales > 0 ? salesInfo.todaySales : (salesInfo.totalSales || 0);
    const totalBillsCount = await SalesInvoice.countDocuments({ userId });
    const activeCustomersCount = await Customer.countDocuments({ userId, isActive: true });
    const rawPendingPayments = overallInfo.customerOutstanding !== undefined
      ? overallInfo.customerOutstanding
      : (salesInfo.outstandingCollection || 0);

    const formattedTodayDate = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const recentInvoices = await SalesInvoice.find({ userId })
      .sort({ createdAt: -1, date: -1 })
      .limit(5)
      .lean()
      .exec();

    const recentBills = recentInvoices.map((bill) => {
      let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (bill.status === 'Partial') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
      if (bill.status === 'Due') statusColor = 'text-red-700 bg-red-50 border-red-200';

      const billDateStr = bill.date
        ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : 'Today';

      return {
        id: bill.invoiceNumber,
        invoiceNumber: bill.invoiceNumber,
        name: bill.customerName || 'General Customer',
        customerName: bill.customerName || 'General Customer',
        amount: `₹ ${(bill.totalAmount || 0).toLocaleString('en-IN')}`,
        rawAmount: bill.totalAmount || 0,
        status: bill.status || 'Paid',
        color: statusColor,
        date: billDateStr,
      };
    });

    const lowStockDocs = await Product.find({ userId, totalStock: { $lte: 20 }, isActive: true })
      .populate('brandId', 'name')
      .sort({ totalStock: 1 })
      .limit(5)
      .lean()
      .exec();

    const lowStockProducts = lowStockDocs.map((p) => {
      const isCritical = (p.totalStock || 0) <= 5;
      return {
        _id: p._id,
        name: p.name,
        brand: p.brandId?.name || p.brand || 'General',
        stock: `${p.totalStock || 0} Units left`,
        stockVal: p.totalStock || 0,
        status: isCritical ? 'Out of Stock' : 'Low Stock',
        tagColor: isCritical
          ? 'text-red-700 bg-red-50 border-red-200'
          : 'text-amber-700 bg-amber-50 border-amber-200',
        image: p.image,
      };
    });

    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');

    const totalLowStock = await Product.countDocuments({ userId, totalStock: { $gt: 0, $lte: 10 }, isActive: true });
    const totalOutOfStock = await Product.countDocuments({ userId, totalStock: { $eq: 0 }, isActive: true });
    const expiryAlerts = await ProductBatch.countDocuments({ userId, currentStock: { $gt: 0 }, expiryDate: { $gte: now, $lte: in30Days } });
    const expiredProducts = await ProductBatch.countDocuments({ userId, currentStock: { $gt: 0 }, expiryDate: { $lt: now } });

    const stockAlerts = {
      totalAlerts: totalLowStock + totalOutOfStock + expiryAlerts + expiredProducts,
      lowStock: totalLowStock,
      outOfStock: totalOutOfStock,
      expiryAlerts,
      expiredProducts,
    };

    const dbCategories = await Category.find({ userId }).lean().exec();
    const categoriesWithCount = await Promise.all(
      dbCategories.map(async (cat) => {
        const prodCount = await Product.countDocuments({ userId, categoryId: cat._id, isActive: true });
        return {
          _id: cat._id,
          title: cat.name,
          count: `${prodCount} Products`,
          prodCount,
        };
      })
    );

    categoriesWithCount.sort((a, b) => b.prodCount - a.prodCount);

    const shopDiscount = await shopDiscountService.getShopDiscount(userId);

    return {
      todaySummary: {
        totalSales: `₹ ${rawTodaySales.toLocaleString('en-IN')}`,
        rawTotalSales: rawTodaySales,
        totalBills: totalBillsCount,
        customers: activeCustomersCount,
        pendingPayments: `₹ ${rawPendingPayments.toLocaleString('en-IN')}`,
        rawPendingPayments,
        salesGrowth: salesInfo.salesGrowth || 0,
        billsGrowth: 0,
        customerGrowth: 0,
        pendingGrowth: 0,
        todayDate: formattedTodayDate,
      },
      recentBills,
      lowStockProducts,
      stockAlerts,
      topCategories: categoriesWithCount,
      shopDiscount,
    };
  },

  async getNotifications(userId) {
    if (!userId) throw new Error('userId is required');
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const notifications = [];

    const lowStockProds = await Product.find({ userId, totalStock: { $lte: 10 }, isActive: true })
      .limit(5)
      .lean()
      .exec();

    lowStockProds.forEach((p) => {
      notifications.push({
        id: `lowstock-${p._id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${p.name} has only ${p.totalStock || 0} units remaining in inventory.`,
        timestamp: 'Just now',
        read: false,
        category: 'Low Stock',
        path: '/products',
      });
    });

    const { ProductBatch } = await import('../../products/models/productBatch.model.js');
    const expiringBatches = await ProductBatch.find({
      userId,
      currentStock: { $gt: 0 },
      expiryDate: { $lte: in30Days },
    })
      .populate('productId', 'name')
      .limit(5)
      .lean()
      .exec();

    expiringBatches.forEach((b) => {
      const pName = b.productId?.name || 'Product';
      const isExpired = new Date(b.expiryDate) < now;
      notifications.push({
        id: `expiry-${b._id}`,
        type: 'expiry',
        title: isExpired ? 'Product Expired' : 'Expiry Warning',
        message: `${pName} (Batch ${b.batchNumber}) ${isExpired ? 'has expired' : 'expires soon'} on ${new Date(b.expiryDate).toLocaleDateString('en-IN')}.`,
        timestamp: 'Today',
        read: false,
        category: 'Expiry Alerts',
        path: '/inventory',
      });
    });

    const dueCustomers = await Customer.find({ userId, outstandingBalance: { $gt: 0 }, isActive: true })
      .sort({ outstandingBalance: -1 })
      .limit(5)
      .lean()
      .exec();

    dueCustomers.forEach((c) => {
      notifications.push({
        id: `customer-${c._id}`,
        type: 'customer_due',
        title: 'Customer Outstanding Due',
        message: `₹ ${(c.outstandingBalance || 0).toLocaleString('en-IN')} pending from ${c.name}.`,
        timestamp: 'Today',
        read: false,
        category: 'Customer Outstanding',
        path: '/customers',
      });
    });

    const { Supplier } = await import('../../suppliers/models/supplier.model.js');
    const dueSuppliers = await Supplier.find({ userId, outstandingBalance: { $gt: 0 }, isActive: true })
      .sort({ outstandingBalance: -1 })
      .limit(5)
      .lean()
      .exec();

    dueSuppliers.forEach((s) => {
      notifications.push({
        id: `supplier-${s._id}`,
        type: 'supplier_due',
        title: 'Supplier Payment Due',
        message: `₹ ${(s.outstandingBalance || 0).toLocaleString('en-IN')} payable to ${s.name || s.companyName}.`,
        timestamp: 'Today',
        read: false,
        category: 'Supplier Due',
        path: '/suppliers',
      });
    });

    const latestInvoice = await SalesInvoice.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (latestInvoice) {
      notifications.push({
        id: `system-${latestInvoice._id}`,
        type: 'system',
        title: 'Recent System Alert',
        message: `Invoice #${latestInvoice.invoiceNumber} generated for ₹ ${(latestInvoice.totalAmount || 0).toLocaleString('en-IN')}.`,
        timestamp: 'Recently',
        read: true,
        category: 'System Alerts',
        path: '/invoices',
      });
    }

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
      unreadCount,
      notifications,
    };
  },
};
