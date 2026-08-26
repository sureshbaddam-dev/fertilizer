import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { Product } from '../../products/models/product.model.js';
import { Category } from '../../masters/models/category.model.js';
import { Brand } from '../../masters/models/brand.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { shopDiscountService } from '../../settings/services/shopDiscount.service.js';
import { reportsService } from '../../reports/services/reports.service.js';

export const dashboardService = {
  async getDashboardSummary(userId) {
    if (!userId) throw new Error('userId is required');
    const now = new Date();

    // 1. Calculate IST Today's Date Boundaries (00:00:00.000 IST to 23:59:59.999 IST)
    const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const [yearStr, monthStr, dayStr] = istDateStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const startOfTodayIST = new Date(Date.UTC(year, monthIdx, day, 0, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
    const endOfTodayIST = new Date(Date.UTC(year, monthIdx, day, 23, 59, 59, 999) - (5.5 * 60 * 60 * 1000));

    // Query invoices created TODAY ONLY (between startOfTodayIST and endOfTodayIST)
    const todayInvoices = await SalesInvoice.find({
      userId,
      $or: [
        { createdAt: { $gte: startOfTodayIST, $lte: endOfTodayIST } },
        { date: { $gte: startOfTodayIST, $lte: endOfTodayIST } },
      ],
    }).lean().exec();

    // Today's Total Sales (Sum of valid sales created today)
    const rawTodaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    // Today's Total Bills Count
    const totalBillsCount = todayInvoices.length;

    // Today's Active Customers (Unique customers with transactions/bills today)
    const activeCustomersSet = new Set(
      todayInvoices
        .map((inv) => (inv.customerId ? inv.customerId.toString() : inv.customerName ? inv.customerName.trim() : null))
        .filter(Boolean)
    );
    const activeCustomersCount = activeCustomersSet.size;

    // Today's Pending Payments (Due amount associated with today's invoices)
    const rawPendingPayments = todayInvoices.reduce((sum, inv) => {
      const total = Number(inv.totalAmount || 0);
      const paid = Number(inv.paidAmount || 0);
      const due = total - paid;
      return sum + (due > 0 ? due : 0);
    }, 0);

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

    const lowStockDocs = await Product.find({
      userId,
      isActive: true,
      $expr: {
        $and: [
          { $gt: ['$totalStock', 0] },
          {
            $lte: [
              '$totalStock',
              { $ifNull: ['$minimumStockAlert', { $ifNull: ['$lowStockAlert', 10] }] },
            ],
          },
        ],
      },
    })
      .populate('brandId', 'name')
      .sort({ totalStock: 1 })
      .limit(5)
      .lean()
      .exec();

    const lowStockProducts = lowStockDocs.map((p) => {
      const minAlert = p.minimumStockAlert ?? p.lowStockAlert ?? 10;
      const isCritical = (p.totalStock || 0) <= minAlert / 2;
      return {
        _id: p._id,
        name: p.name,
        brand: p.brandId?.name || p.brand || 'General',
        stock: `${p.totalStock || 0} Units left`,
        stockVal: p.totalStock || 0,
        status: isCritical ? 'Critical' : 'Low Stock',
        tagColor: isCritical
          ? 'text-red-700 bg-red-50 border-red-200'
          : 'text-amber-700 bg-amber-50 border-amber-200',
        image: p.image,
      };
    });

    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { ProductBatch } = await import('../../products/models/productBatch.model.js');

    const [totalLowStock, totalOutOfStock, expiryAlerts, expiredProducts, dbCategories, categoryCountsAgg] = await Promise.all([
      Product.countDocuments({
        userId,
        isActive: true,
        $expr: {
          $and: [
            { $gt: ['$totalStock', 0] },
            {
              $lte: [
                '$totalStock',
                { $ifNull: ['$minimumStockAlert', { $ifNull: ['$lowStockAlert', 10] }] },
              ],
            },
          ],
        },
      }),
      Product.countDocuments({ userId, totalStock: { $lte: 0 }, isActive: true }),
      ProductBatch.countDocuments({ userId, currentStock: { $gt: 0 }, expiryDate: { $gte: now, $lte: in30Days } }),
      ProductBatch.countDocuments({ userId, currentStock: { $gt: 0 }, expiryDate: { $lt: now } }),
      Category.find({ userId }).lean().exec(),
      Product.aggregate([
        { $match: { userId, isActive: true } },
        { $group: { _id: '$categoryId', prodCount: { $sum: 1 } } },
      ]),
    ]);

    const stockAlerts = {
      totalAlerts: totalLowStock + totalOutOfStock + expiryAlerts + expiredProducts,
      lowStock: totalLowStock,
      outOfStock: totalOutOfStock,
      expiryAlerts,
      expiredProducts,
    };

    const categoryCountMap = new Map(categoryCountsAgg.map((c) => [c._id ? c._id.toString() : 'null', c.prodCount]));
    const categoriesWithCount = dbCategories.map((cat) => {
      const prodCount = categoryCountMap.get(cat._id.toString()) || 0;
      return {
        _id: cat._id,
        title: cat.name,
        count: `${prodCount} Products`,
        prodCount,
      };
    });

    categoriesWithCount.sort((a, b) => b.prodCount - a.prodCount);

    // Calculate Yesterday's IST Date Boundaries for growth comparison
    const startOfYesterdayIST = new Date(startOfTodayIST.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterdayIST = new Date(startOfTodayIST.getTime() - 1);

    const yesterdayInvoices = await SalesInvoice.find({
      userId,
      $or: [
        { createdAt: { $gte: startOfYesterdayIST, $lte: endOfYesterdayIST } },
        { date: { $gte: startOfYesterdayIST, $lte: endOfYesterdayIST } },
      ],
    }).lean().exec();

    const rawYesterdaySales = yesterdayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const salesGrowth = rawYesterdaySales > 0
      ? Math.round(((rawTodaySales - rawYesterdaySales) / rawYesterdaySales) * 100)
      : rawTodaySales > 0 ? 100 : 0;

    const shopDiscount = await shopDiscountService.getShopDiscount(userId);

    return {
      todaySummary: {
        totalSales: `₹ ${rawTodaySales.toLocaleString('en-IN')}`,
        rawTotalSales: rawTodaySales,
        totalBills: totalBillsCount,
        customers: activeCustomersCount,
        pendingPayments: `₹ ${rawPendingPayments.toLocaleString('en-IN')}`,
        rawPendingPayments,
        salesGrowth,
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
        { recipient: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    adminNotifs.forEach((an) => {
      const isTicketMsg = an.title?.includes('Ticket') || an.message?.includes('TCK-');
      notifications.push({
        id: `admin-${an._id}`,
        type: an.type || 'admin_announcement',
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
      const statusLabel =
        st === 'COMPLETED' || st === 'RESOLVED'
          ? 'Resolved'
          : st === 'IN_PROGRESS'
          ? 'In Progress'
          : st === 'WAITING_FOR_USER'
          ? 'Waiting for You'
          : st === 'CLOSED'
          ? 'Closed'
          : 'Pending';
      notifications.push({
        id: `ticket-${t._id}`,
        type: 'support_ticket',
        title: `Help Request ${statusLabel}`,
        message: `Request ${t.ticketId} (${t.subject}): Status is ${statusLabel}.`,
        timestamp: new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        createdAt: t.updatedAt || t.createdAt,
        read: false,
        category: 'Help Requests',
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

  async getDashboardOverview(userId) {
    if (!userId) throw new Error('userId is required');

    const [summary, notifData] = await Promise.all([
      this.getDashboardSummary(userId),
      this.getNotifications(userId),
    ]);

    return {
      ...summary,
      unreadNotificationCount: notifData.unreadCount || 0,
    };
  },
};
