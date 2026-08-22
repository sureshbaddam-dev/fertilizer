import mongoose from 'mongoose';
import { User } from '../../auth/user.model.js';
import { UserSubscription } from '../../subscription/userSubscription.model.js';
import { SubscriptionPlan } from '../../subscription/subscriptionPlan.model.js';
import { AdminAuditLog } from '../models/adminAuditLog.model.js';
import { AdminBackup } from '../models/adminBackup.model.js';
import { VisitorAnalytics } from '../models/visitorAnalytics.model.js';
import {
  getTopPagesBreakdown,
  getRecentActivityTimeline,
  getHourlyAnalyticsToday,
  recordVisitorHit,
} from '../middlewares/visitorTracking.middleware.js';
import { AdminNotification } from '../models/adminNotification.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { SubscriptionSettings } from '../models/subscriptionSettings.model.js';
import { SystemSetting } from '../models/systemSetting.model.js';

import { Customer } from '../../customers/models/customer.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Product } from '../../products/models/product.model.js';
import { Purchase } from '../../purchases/models/purchase.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { ShopSettings } from '../../settings/models/shopSettings.model.js';
import { SupportTicket } from '../../support/supportTicket.model.js';

export const logAdminAuditAction = async ({
  adminId,
  adminName,
  adminRole = 'SUPER_ADMIN',
  action,
  targetType,
  targetId = null,
  targetName = null,
  details,
  oldValue = null,
  newValue = null,
  req = null,
}) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';

    await AdminAuditLog.create({
      adminId,
      adminName: adminName || 'System Admin',
      adminRole,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetName: targetName ? String(targetName) : null,
      details,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('Failed to log admin audit action:', err.message);
  }
};

export const getOrCreateSubscriptionSettings = async () => {
  let settings = await SubscriptionSettings.findOne();
  if (!settings) {
    settings = await SubscriptionSettings.create({
      planName: 'Fertilizer ERP',
      planCode: 'FERTILIZER_ERP',
      isSubscriptionSystemActive: true,
      durations: [
        { code: '1_MONTH', label: '1 Month', months: 1, amount: 201, offerPrice: 149, isEnabled: true },
        { code: '3_MONTHS', label: '3 Months', months: 3, amount: 499, offerPrice: 399, isEnabled: true },
        { code: '6_MONTHS', label: '6 Months', months: 6, amount: 899, offerPrice: 699, isEnabled: true },
        { code: '12_MONTHS', label: '12 Months', months: 12, amount: 1499, offerPrice: 1199, isEnabled: true },
      ],
      demoSettings: {
        isDemoAvailable: true,
        defaultDemoDays: 7,
      },
    });
  }
  return settings;
};

export const adminService = {
  // 1. DASHBOARD STATS & ANALYTICS
  getDashboardStats: async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().split('T')[0];

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      activeSubscriptions,
      demoSubscriptions,
      expiringSoon,
      expiredSubscriptions,
      revenueAgg,
      monthlyRevenueAgg,
      totalBusinesses,
      todayVisitor,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      UserSubscription.countDocuments({ status: 'ACTIVE', expiryDate: { $gte: now } }),
      UserSubscription.countDocuments({ activationType: 'ADMIN_MANUAL', couponCode: 'DEMO' }),
      UserSubscription.countDocuments({ status: 'ACTIVE', expiryDate: { $gte: now, $lte: next7Days } }),
      UserSubscription.countDocuments({ $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }] }),
      UserSubscription.aggregate([
        { $match: { paymentStatus: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      UserSubscription.aggregate([
        { $match: { paymentStatus: 'SUCCESS', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      ShopSettings.countDocuments(),
      VisitorAnalytics.findOne({ dateStr: todayStr }).lean(),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;
    const totalWebsiteVisitors = todayVisitor?.totalHits || 0;

    return {
      totalWebsiteVisitors,
      totalRegisteredUsers: totalUsers,
      activeUsers,
      newUsers: newUsersToday,
      activeSubscriptions,
      demoSubscriptions,
      expiringSoon,
      expiredSubscriptions,
      monthlyRevenue,
      totalRevenue,
      totalBusinesses,
    };
  },

  getDashboardAnalytics: async () => {
    const now = new Date();
    // Registrations over last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, role: { $ne: 'admin' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Monthly revenue over last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyRevenue = await UserSubscription.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            source: '$activationType',
          },
          revenue: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    return { registrations, monthlyRevenue };
  },

  getRecentActivity: async () => {
    const auditLogs = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(15);
    return auditLogs;
  },

  // 2. USER MANAGEMENT & 360 PROFILE
  getUsersList: async ({ filter = 'ALL', search = '', page = 1, limit = 20 }) => {
    const adminRoles = ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];
    const envAdminPhone = process.env.ADMIN_PHONE_NUMBER || '+919848081875';
    const cleanAdminPhone = envAdminPhone.replace(/\D/g, '');
    const last10AdminPhone = cleanAdminPhone.slice(-10);

    const query = {
      role: { $nin: adminRoles },
      mobile: { $nin: [envAdminPhone, cleanAdminPhone, last10AdminPhone, `+91${last10AdminPhone}`] },
    };
    const now = new Date();

    if (search) {
      const cleanSearch = String(search).trim();
      const escapedSearch = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      query.$or = [
        { ownerName: searchRegex },
        { mobile: searchRegex },
        { email: searchRegex },
      ];

      // Safe canonical User _id search
      if (mongoose.Types.ObjectId.isValid(cleanSearch)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(cleanSearch) });
      }

      // Shop/Business name search
      try {
        const matchingShops = await ShopSettings.find({ shopName: searchRegex }).select('userId').lean();
        if (matchingShops.length > 0) {
          const shopUserIds = matchingShops.map((s) => s.userId).filter(Boolean);
          if (shopUserIds.length > 0) {
            query.$or.push({ _id: { $in: shopUserIds } });
          }
        }
      } catch (_e) {
        // Ignore shop lookup error
      }
    }

    if (filter === 'ACTIVE') query.isActive = true;
    if (filter === 'INACTIVE') query.isActive = false;

    if (['DEMO', 'PAID', 'EXPIRED', 'EXPIRING_SOON'].includes(filter)) {
      let subQuery = {};
      if (filter === 'DEMO') subQuery = { couponCode: 'DEMO' };
      if (filter === 'PAID') subQuery = { activationType: 'ONLINE_PAYMENT' };
      if (filter === 'EXPIRED') subQuery = { $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }] };
      if (filter === 'EXPIRING_SOON') {
        const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        subQuery = { status: 'ACTIVE', expiryDate: { $gte: now, $lte: next7 } };
      }

      const matchingSubs = await UserSubscription.find(subQuery).select('userId').lean();
      const targetUserIds = matchingSubs.map((s) => s.userId).filter(Boolean);
      query._id = { $in: targetUserIds };
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);
    const [subscriptions, shops] = await Promise.all([
      UserSubscription.find({ userId: { $in: userIds } }).lean(),
      ShopSettings.find({ userId: { $in: userIds } }).select('userId shopName').lean(),
    ]);

    const subMap = new Map(subscriptions.map((s) => [String(s.userId), s]));
    const shopMap = new Map(shops.map((s) => [String(s.userId), s]));

    const result = users.map((u) => {
      const sub = subMap.get(String(u._id));
      const shop = shopMap.get(String(u._id));
      
      let subStatus = 'NO_PLAN';
      if (sub) {
        if (sub.expiryDate < now) subStatus = 'EXPIRED';
        else if (sub.couponCode === 'DEMO') subStatus = 'DEMO';
        else subStatus = 'ACTIVE';
      }

      return {
        ...u,
        businessName: shop?.shopName || 'N/A',
        subscription: sub || null,
        subscriptionStatus: subStatus,
        expiryDate: sub?.expiryDate || null,
        paymentStatus: sub?.paymentStatus || 'N/A',
        activationType: sub?.activationType || 'N/A',
      };
    });

    return {
      users: result,
      total: totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit) || 1,
    };
  },

  getUserDetails: async (userId) => {
    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) throw new Error('User not found');

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const [
      shop,
      subscription,
      subHistory,
      customersCount,
      suppliersCount,
      productsCount,
      purchasesCount,
      invoicesCount,
      paymentAgg,
      auditLogs,
      tickets,
    ] = await Promise.all([
      ShopSettings.findOne({ userId }).lean(),
      UserSubscription.findOne({ userId }).lean(),
      SubscriptionHistory.find({ userId }).sort({ createdAt: -1 }).lean(),
      Customer.countDocuments({ userId, isActive: { $ne: false } }),
      Supplier.countDocuments({ userId, isActive: { $ne: false } }),
      Product.countDocuments({ userId, isActive: { $ne: false } }),
      Purchase.countDocuments({ userId }),
      SalesInvoice.countDocuments({ userId }),
      SubscriptionHistory.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalAmountPaid: { $sum: { $ifNull: ['$amountPaid', 0] } },
            successfulPaymentCount: { $sum: 1 },
            lastPaymentDate: { $max: '$createdAt' },
          },
        },
      ]),
      AdminAuditLog.find({ targetId: String(userId) }).sort({ createdAt: -1 }).limit(10).lean(),
      SupportTicket.find({ userId }).sort({ createdAt: -1 }).lean(),
    ]);

    let totalAmountPaid = paymentAgg[0]?.totalAmountPaid || 0;
    let successfulPaymentCount = paymentAgg[0]?.successfulPaymentCount || 0;
    let lastPaymentDate = paymentAgg[0]?.lastPaymentDate || null;

    if (successfulPaymentCount === 0 && subscription && subscription.amountPaid) {
      totalAmountPaid = subscription.amountPaid;
      successfulPaymentCount = 1;
      lastPaymentDate = subscription.updatedAt || subscription.createdAt || null;
    }

    const paymentSummary = {
      totalAmountPaid: Math.round(totalAmountPaid),
      successfulPaymentCount,
      lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : null,
      currentSubscriptionAmount: subscription?.amountPaid !== undefined ? Math.round(subscription.amountPaid) : 0,
    };

    return {
      user,
      shop: shop || null,
      subscription: subscription || null,
      subHistory: subHistory || [],
      tickets: tickets || [],
      counts: {
        customers: customersCount,
        suppliers: suppliersCount,
        products: productsCount,
        purchases: purchasesCount,
        invoices: invoicesCount,
      },
      paymentSummary,
      activities: auditLogs,
    };
  },

  toggleUserStatus: async (userId, isActive, adminUser, req) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const oldVal = user.isActive;
    user.isActive = isActive;
    await user.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: isActive ? 'USER_UNBLOCKED' : 'USER_BLOCKED',
      targetType: 'USER',
      targetId: user._id,
      targetName: user.ownerName,
      details: `Admin ${adminUser.ownerName} set user ${user.ownerName} status to ${isActive ? 'Active' : 'Blocked'}.`,
      oldValue: oldVal,
      newValue: isActive,
      req,
    });

    return user;
  },

  // 4. ADMIN-GRANTED SUBSCRIPTION & DEMOS
  grantAdminSubscription: async ({ userId, durationMonths, amountPaid = 0, reason = 'Admin Granted', adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    let sub = await UserSubscription.findOne({ userId });

    // Accumulate duration on top of active expiryDate if plan is currently active
    const baseDate = (sub && sub.status === 'ACTIVE' && sub.expiryDate > now) ? new Date(sub.expiryDate) : now;
    const expiryDate = new Date(baseDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    let plan = await SubscriptionPlan.findOne({ code: 'FERTILIZER_ERP' });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        code: 'FERTILIZER_ERP',
        name: 'Fertilizer ERP',
        price: 199,
      });
    }

    const durationLabel = `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`;

    if (sub) {
      sub.planId = plan._id;
      sub.planCode = 'FERTILIZER_ERP';
      sub.planName = 'Fertilizer ERP';
      sub.status = 'ACTIVE';
      sub.startDate = sub.startDate || now;
      sub.expiryDate = expiryDate;
      sub.amountPaid = amountPaid;
      sub.paymentStatus = 'ADMIN_GRANTED';
      sub.activatedByAdmin = true;
      sub.activationType = 'ADMIN_MANUAL';
      sub.activatedBy = adminUser._id;
      sub.couponCode = null;
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId: user._id,
        planId: plan._id,
        planCode: 'FERTILIZER_ERP',
        planName: 'Fertilizer ERP',
        status: 'ACTIVE',
        startDate: now,
        expiryDate,
        amountPaid,
        paymentStatus: 'ADMIN_GRANTED',
        activatedByAdmin: true,
        activationType: 'ADMIN_MANUAL',
        activatedBy: adminUser._id,
      });
    }

    // Record immutable history
    await SubscriptionHistory.create({
      userId: user._id,
      userName: user.ownerName,
      userMobile: user.mobile,
      planCode: 'FERTILIZER_ERP',
      planName: 'Fertilizer ERP',
      durationLabel,
      durationMonths,
      startDate: now,
      expiryDate,
      amountPaid,
      source: 'ADMIN_GRANTED',
      paymentStatus: 'ADMIN_GRANTED',
      grantedByAdminId: adminUser._id,
      grantedByAdminName: adminUser.ownerName,
      reason,
    });

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'GRANT_ADMIN_SUBSCRIPTION',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Granted ${durationLabel} subscription extension to ${user.ownerName} (${user.mobile}) for ₹${amountPaid}. Reason: ${reason}`,
      req,
    });

    return sub;
  },

  grantCustomDemoSubscription: async ({ userId, demoDays = 7, reason = 'Customer Trial', adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    let sub = await UserSubscription.findOne({ userId });

    const baseDate = (sub && sub.status === 'ACTIVE' && sub.expiryDate > now) ? new Date(sub.expiryDate) : now;
    const expiryDate = new Date(baseDate.getTime() + demoDays * 24 * 60 * 60 * 1000);

    let plan = await SubscriptionPlan.findOne({ code: 'FERTILIZER_ERP' });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        code: 'FERTILIZER_ERP',
        name: 'Fertilizer ERP',
        price: 199,
      });
    }

    const durationLabel = `${demoDays} Days Demo`;

    if (sub) {
      sub.planId = plan._id;
      sub.planCode = 'FERTILIZER_ERP';
      sub.planName = 'Fertilizer ERP';
      sub.status = 'ACTIVE';
      sub.startDate = now;
      sub.expiryDate = expiryDate;
      sub.amountPaid = 0;
      sub.paymentStatus = 'DEMO';
      sub.activatedByAdmin = true;
      sub.activationType = 'ADMIN_MANUAL';
      sub.activatedBy = adminUser._id;
      sub.couponCode = 'DEMO';
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId: user._id,
        planId: plan._id,
        planCode: 'FERTILIZER_ERP',
        planName: 'Fertilizer ERP',
        status: 'ACTIVE',
        startDate: now,
        expiryDate,
        amountPaid: 0,
        paymentStatus: 'DEMO',
        activatedByAdmin: true,
        activationType: 'ADMIN_MANUAL',
        activatedBy: adminUser._id,
        couponCode: 'DEMO',
      });
    }

    await SubscriptionHistory.create({
      userId: user._id,
      userName: user.ownerName,
      userMobile: user.mobile,
      planCode: 'FERTILIZER_ERP',
      planName: 'Fertilizer ERP',
      durationLabel,
      durationDays: demoDays,
      startDate: now,
      expiryDate,
      amountPaid: 0,
      source: 'DEMO',
      paymentStatus: 'DEMO',
      grantedByAdminId: adminUser._id,
      grantedByAdminName: adminUser.ownerName,
      reason,
    });

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'GRANT_DEMO_SUBSCRIPTION',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Granted ${demoDays} Days Demo subscription to ${user.ownerName} (${user.mobile}). Reason: ${reason}`,
      req,
    });

    return sub;
  },

  pauseUserSubscription: async ({ userId, adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let sub = await UserSubscription.findOne({ userId });
    if (!sub) throw new Error('No active subscription found to pause');

    const oldStatus = sub.status;
    sub.status = 'PAUSED';
    await sub.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'PAUSE_SUBSCRIPTION',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Admin ${adminUser.ownerName} paused subscription for user ${user.ownerName}.`,
      oldValue: oldStatus,
      newValue: 'PAUSED',
      req,
    });

    return sub;
  },

  resumeUserSubscription: async ({ userId, adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let sub = await UserSubscription.findOne({ userId });
    if (!sub) throw new Error('No subscription record found');

    const oldStatus = sub.status;
    sub.status = 'ACTIVE';
    await sub.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'RESUME_SUBSCRIPTION',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Admin ${adminUser.ownerName} resumed subscription for user ${user.ownerName}.`,
      oldValue: oldStatus,
      newValue: 'ACTIVE',
      req,
    });

    return sub;
  },

  cancelUserSubscription: async ({ userId, reason = 'Cancelled by Admin', adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let sub = await UserSubscription.findOne({ userId });
    if (!sub) throw new Error('No subscription found to cancel');

    const oldStatus = sub.status;
    sub.status = 'CANCELLED';
    sub.expiryDate = new Date();
    await sub.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'CANCEL_SUBSCRIPTION',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Admin ${adminUser.ownerName} cancelled subscription for user ${user.ownerName}. Reason: ${reason}`,
      oldValue: oldStatus,
      newValue: 'CANCELLED',
      req,
    });

    return sub;
  },

  revokeDemoSubscription: async ({ userId, reason = 'Demo revoked by Admin', adminUser, req }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let sub = await UserSubscription.findOne({ userId });
    if (!sub) throw new Error('No demo subscription found to revoke');

    const oldStatus = sub.status;
    sub.status = 'REVOKED';
    sub.expiryDate = new Date();
    await sub.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'REVOKE_DEMO',
      targetType: 'SUBSCRIPTION',
      targetId: sub._id,
      targetName: user.ownerName,
      details: `Admin ${adminUser.ownerName} revoked demo access for user ${user.ownerName}. Reason: ${reason}`,
      oldValue: oldStatus,
      newValue: 'REVOKED',
      req,
    });

    return sub;
  },

  // 5. SUBSCRIPTION SETTINGS & PRICING
  getSubscriptionSettings: async () => {
    return await getOrCreateSubscriptionSettings();
  },

  updateSubscriptionSettings: async (updateData, adminUser, req) => {
    let settings = await getOrCreateSubscriptionSettings();
    const oldSettings = settings.toObject();

    if (updateData.durations) settings.durations = updateData.durations;
    if (updateData.demoSettings) settings.demoSettings = updateData.demoSettings;

    await settings.save();

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'UPDATE_SUBSCRIPTION_SETTINGS',
      targetType: 'SETTING',
      targetId: settings._id,
      targetName: 'Subscription Pricing',
      details: `Updated Fertilizer ERP plan duration pricing and demo settings.`,
      oldValue: oldSettings,
      newValue: settings.toObject(),
      req,
    });

    return settings;
  },

  getSubscriptionHistory: async () => {
    return await SubscriptionHistory.find().sort({ createdAt: -1 }).lean();
  },

  // 6. LEADS & VISITOR ANALYTICS
  getVisitorAnalytics: async ({ period = 'MONTH' } = {}) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayVisitor = await VisitorAnalytics.findOne({ dateStr: todayStr });
    const hourlyToday = getHourlyAnalyticsToday();

    const totalVisitorsAgg = await VisitorAnalytics.aggregate([
      {
        $group: {
          _id: null,
          totalHits: { $sum: '$totalHits' },
          uniqueVisitors: { $sum: '$uniqueVisitors' },
          returningVisitors: { $sum: '$returningVisitors' },
        },
      },
    ]);

    const totalRegistrations = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalPaidUsers = await UserSubscription.countDocuments({ status: 'ACTIVE', amountPaid: { $gt: 0 } });

    const totalHitsCount = totalVisitorsAgg[0]?.totalHits || todayVisitor?.totalHits || 0;
    const totalUniqueCount = totalVisitorsAgg[0]?.uniqueVisitors || todayVisitor?.uniqueVisitors || 0;
    const totalReturningCount = totalVisitorsAgg[0]?.returningVisitors || todayVisitor?.returningVisitors || 0;

    const regConversionRate = totalHitsCount > 0 ? ((totalRegistrations / Math.max(1, totalUniqueCount)) * 100).toFixed(1) : '0.0';
    const paidConversionRate = totalRegistrations > 0 ? ((totalPaidUsers / Math.max(1, totalRegistrations)) * 100).toFixed(1) : '0.0';

    // Period-based time series data
    let timeSeriesData = [];
    if (period === 'DAY') {
      timeSeriesData = hourlyToday.map((h) => ({
        label: h.hour,
        hits: h.hits,
        unique: h.unique,
      }));
    } else if (period === 'WEEK') {
      const last7 = await VisitorAnalytics.find().sort({ dateStr: -1 }).limit(7).lean();
      timeSeriesData = last7.reverse().map((v) => ({
        label: v.dateStr,
        hits: v.totalHits,
        unique: v.uniqueVisitors,
        returning: v.returningVisitors,
      }));
    } else if (period === 'YEAR') {
      const last12Months = await VisitorAnalytics.aggregate([
        {
          $group: {
            _id: { $substr: ['$dateStr', 0, 7] }, // YYYY-MM
            hits: { $sum: '$totalHits' },
            unique: { $sum: '$uniqueVisitors' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 12 },
      ]);
      timeSeriesData = last12Months.map((m) => ({
        label: m._id,
        hits: m.hits,
        unique: m.unique,
      }));
    } else {
      // MONTH (default)
      const last30 = await VisitorAnalytics.find().sort({ dateStr: -1 }).limit(30).lean();
      timeSeriesData = last30.reverse().map((v) => ({
        label: v.dateStr,
        hits: v.totalHits,
        unique: v.uniqueVisitors,
        returning: v.returningVisitors,
      }));
    }

    return {
      topPages: getTopPagesBreakdown(),
      recentActivity: getRecentActivityTimeline(),
      todayHits: todayVisitor?.totalHits || 0,
      todayUnique: todayVisitor?.uniqueVisitors || 0,
      todayReturning: todayVisitor?.returningVisitors || 0,
      totalHits: totalHitsCount,
      totalUnique: totalUniqueCount,
      totalReturning: totalReturningCount,
      totalRegistrations,
      totalPaidUsers,
      regConversionRate,
      paidConversionRate,
      period,
      timeSeriesData,
      hourlyToday,
    };
  },

  // 7. PAYMENTS & TRANSACTIONS
  getPaymentsList: async ({ page, limit } = {}) => {
    let query = UserSubscription.find()
      .populate('userId', 'ownerName mobile email')
      .sort({ createdAt: -1 });

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));
      query = query.skip((p - 1) * l).limit(l);
    }

    return await query.lean();
  },

  // 8. ADMINS & ROLES
  getAdminsList: async () => {
    return await User.find({ role: { $in: ['admin', 'super_admin', 'finance_admin', 'support_admin'] } })
      .select('-passwordHash')
      .lean();
  },

  createAdminUser: async (adminData, currentAdmin, req) => {
    const existing = await User.findOne({ mobile: adminData.mobile });
    if (existing) throw new Error('Mobile number already registered');

    const passwordHash = await User.schema.methods.comparePassword ? await (await import('bcryptjs')).default.hash(adminData.password, 10) : '';

    const newAdmin = await User.create({
      ownerName: adminData.ownerName,
      mobile: adminData.mobile,
      email: adminData.email || '',
      passwordHash,
      role: adminData.role || 'admin',
      isMobileVerified: true,
      isActive: true,
    });

    await logAdminAuditAction({
      adminId: currentAdmin._id,
      adminName: currentAdmin.ownerName,
      adminRole: currentAdmin.role,
      action: 'CREATE_ADMIN_USER',
      targetType: 'ADMIN',
      targetId: newAdmin._id,
      targetName: newAdmin.ownerName,
      details: `Created new admin user ${newAdmin.ownerName} with role ${newAdmin.role}.`,
      req,
    });

    return newAdmin;
  },

  // 9. NOTIFICATIONS
  sendSingleUserNotification: async (notifData, adminUser, req) => {
    const { userId, title, message } = notifData || {};
    const rawType = notifData?.notificationType || notifData?.type || 'GENERAL';
    const typeUpper = String(rawType).toUpperCase();

    const allowedTypes = [
      'SUBSCRIPTION_EXPIRY',
      'PAYMENT',
      'SYSTEM_ANNOUNCEMENT',
      'MAINTENANCE',
      'PROMOTIONAL',
      'GENERAL',
      'IMPORTANT',
      'SUBSCRIPTION',
      'ACCOUNT',
      'SYSTEM',
    ];

    const notificationType = allowedTypes.includes(typeUpper) ? typeUpper : 'GENERAL';
    const cleanType = notificationType.toLowerCase();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error('Valid userId is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!title || !title.trim()) {
      const err = new Error('Notification title is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!message || !message.trim()) {
      const err = new Error('Notification message is required.');
      err.statusCode = 400;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Target user not found.');
      err.statusCode = 404;
      throw err;
    }

    const notif = await AdminNotification.create({
      recipient: user._id,
      title: title.trim(),
      message: message.trim(),
      type: cleanType,
      notificationType,
      targetAudience: 'SPECIFIC_USER',
      targetUserIds: [user._id],
      sentByAdminId: adminUser._id,
      sentByAdminName: adminUser.ownerName || adminUser.username || 'Admin',
      deliveredCount: 1,
    });

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName || 'Admin',
      adminRole: adminUser.role,
      action: 'SEND_NOTIFICATION_SINGLE_USER',
      targetType: 'USER',
      targetId: user._id,
      targetName: user.ownerName || user.username || user.phoneNumber || 'User',
      details: `Sent single-user notification "${notif.title}" to user ${user._id}.`,
      req,
    });

    return notif;
  },

  sendAdminNotification: async (notifData, adminUser, req) => {
    let targetUsers = [];
    const now = new Date();

    if (notifData.targetAudience === 'ALL_USERS') {
      targetUsers = await User.find({ role: { $ne: 'admin' } }).select('_id');
    } else if (notifData.targetAudience === 'DEMO_USERS') {
      const demoSubs = await UserSubscription.find({ couponCode: 'DEMO' }).select('userId');
      targetUsers = demoSubs.map((s) => ({ _id: s.userId }));
    } else if (notifData.targetAudience === 'EXPIRING_SOON') {
      const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSubs = await UserSubscription.find({ status: 'ACTIVE', expiryDate: { $gte: now, $lte: next7 } }).select('userId');
      targetUsers = expiringSubs.map((s) => ({ _id: s.userId }));
    } else if (notifData.targetAudience === 'SPECIFIC_USER' && notifData.targetUserIds) {
      targetUsers = notifData.targetUserIds.map((id) => ({ _id: id }));
    }

    const notif = await AdminNotification.create({
      title: notifData.title,
      message: notifData.message,
      targetAudience: notifData.targetAudience,
      notificationType: notifData.notificationType,
      targetUserIds: targetUsers.map((u) => u._id),
      sentByAdminId: adminUser._id,
      sentByAdminName: adminUser.ownerName,
      deliveredCount: targetUsers.length,
    });

    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'SEND_NOTIFICATION',
      targetType: 'NOTIFICATION',
      targetId: notif._id,
      targetName: notif.title,
      details: `Broadcasted notification "${notif.title}" to ${targetUsers.length} users.`,
      req,
    });

    return notif;
  },

  getNotificationsHistory: async () => {
    return await AdminNotification.find().sort({ createdAt: -1 }).limit(100).lean();
  },

  // 10. AUDIT LOGS
  getAuditLogs: async () => {
    return await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  },

  // 11. SYSTEM SETTINGS (PERSISTENCE)
  getSystemSettings: async () => {
    const settingsList = await SystemSetting.find().lean();
    const settingsMap = { subscriptionSystemEnabled: true };
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return settingsMap;
  },

  updateSystemSetting: async (key, value, adminUser, req) => {
    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );

    // Sync subscriptionSystemEnabled with SubscriptionSettings document as well
    if (key === 'subscriptionSystemEnabled') {
      await SubscriptionSettings.findOneAndUpdate(
        {},
        { isSubscriptionSystemActive: !!value },
        { upsert: true }
      );
    }

    if (adminUser) {
      await logAdminAuditAction({
        adminId: adminUser._id,
        adminName: adminUser.ownerName,
        adminRole: adminUser.role,
        action: 'UPDATE_SYSTEM_SETTING',
        targetType: 'SYSTEM_SETTING',
        targetId: setting._id,
        targetName: key,
        details: `Updated system setting "${key}" to ${JSON.stringify(value)}.`,
        req,
      });
    }

    return setting;
  },
};
