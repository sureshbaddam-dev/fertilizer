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
    const notifications = [];

    // USER NOTIFICATION BELL SHOWS ONLY IMPORTANT ADMIN/SUPPORT COMMUNICATIONS
    const { AdminNotification } = await import('../../admin/models/adminNotification.model.js');
    const { SupportTicket } = await import('../../support/supportTicket.model.js');

    // 1. Fetch Admin Announcements & Messages targeted to this user
    const adminNotifs = await AdminNotification.find({
      $or: [
        { targetAudience: 'ALL_USERS' },
        { targetUserIds: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    adminNotifs.forEach((an) => {
      const isTicketMsg = an.title?.includes('Ticket') || an.message?.includes('TCK-');
      notifications.push({
        id: `admin-${an._id}`,
        type: 'admin_announcement',
        title: an.title || 'System Announcement',
        message: an.message,
        timestamp: new Date(an.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        createdAt: an.createdAt,
        read: false,
        category: isTicketMsg ? 'Support Tickets' : 'Admin Announcements',
        path: isTicketMsg ? '/support' : '/dashboard',
      });
    });

    // 2. Fetch Support Tickets for status change notifications
    const userTickets = await SupportTicket.find({ userId }).sort({ updatedAt: -1 }).limit(5).lean();
    userTickets.forEach((t) => {
      const st = (t.status || 'PENDING').toUpperCase();
      const statusLabel = st === 'COMPLETED' || st === 'RESOLVED' ? 'Resolved' : st === 'IN_PROGRESS' ? 'In Progress' : 'Pending';
      notifications.push({
        id: `ticket-${t._id}`,
        type: 'support_ticket',
        title: `Support Ticket ${statusLabel}`,
        message: `Ticket ${t.ticketId} (${t.subject}): Status is ${statusLabel}.`,
        timestamp: new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        createdAt: t.updatedAt || t.createdAt,
        read: false,
        category: 'Support Tickets',
        path: '/support',
      });
    });

    // Sort notifications by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
      unreadCount,
      notifications,
    };
  },
};
