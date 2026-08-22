import { adminService } from '../services/admin.service.js';
import { sendSuccess, sendError } from '../../../common/apiResponse.js';

export const adminController = {
  // 1. DASHBOARD & STATS
  getDashboardStats: async (req, res, next) => {
    try {
      const stats = await adminService.getDashboardStats();
      return sendSuccess(res, 'Dashboard stats fetched successfully', stats);
    } catch (err) {
      next(err);
    }
  },

  getDashboardAnalytics: async (req, res, next) => {
    try {
      const analytics = await adminService.getDashboardAnalytics();
      return sendSuccess(res, 'Dashboard analytics fetched successfully', analytics);
    } catch (err) {
      next(err);
    }
  },

  getRecentActivity: async (req, res, next) => {
    try {
      const activities = await adminService.getRecentActivity();
      return sendSuccess(res, 'Recent activity fetched successfully', activities);
    } catch (err) {
      next(err);
    }
  },

  // 2. USERS MANAGEMENT
  getUsersList: async (req, res, next) => {
    try {
      const { filter = 'ALL', search = '', page = 1, limit = 20 } = req.query;
      const result = await adminService.getUsersList({
        filter,
        search,
        page: Number(page),
        limit: Number(limit),
      });
      return sendSuccess(res, 'Users list fetched successfully', result);
    } catch (err) {
      next(err);
    }
  },

  getUserDetails: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const details = await adminService.getUserDetails(userId);
      return sendSuccess(res, 'User details fetched successfully', details);
    } catch (err) {
      next(err);
    }
  },

  toggleUserStatus: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      const user = await adminService.toggleUserStatus(userId, isActive, req.adminUser, req);
      return sendSuccess(res, `User status updated to ${isActive ? 'Active' : 'Blocked'}`, user);
    } catch (err) {
      next(err);
    }
  },



  // 4. SUBSCRIPTIONS & DEMOS
  grantAdminSubscription: async (req, res, next) => {
    try {
      const { userId, durationMonths = 1, amountPaid = 0, reason = 'Admin Granted' } = req.body;
      const sub = await adminService.grantAdminSubscription({
        userId,
        durationMonths: Number(durationMonths),
        amountPaid: Number(amountPaid),
        reason,
        adminUser: req.adminUser,
        req,
      });
      return sendSuccess(res, 'Admin-granted subscription activated successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  grantCustomDemoSubscription: async (req, res, next) => {
    try {
      const { userId, demoDays = 7, reason = 'Customer Trial' } = req.body;
      const sub = await adminService.grantCustomDemoSubscription({
        userId,
        demoDays: Number(demoDays),
        reason,
        adminUser: req.adminUser,
        req,
      });
      return sendSuccess(res, 'Custom demo subscription granted successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  pauseUserSubscription: async (req, res, next) => {
    try {
      const { userId } = req.body;
      const sub = await adminService.pauseUserSubscription({ userId, adminUser: req.adminUser, req });
      return sendSuccess(res, 'Subscription paused successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  resumeUserSubscription: async (req, res, next) => {
    try {
      const { userId } = req.body;
      const sub = await adminService.resumeUserSubscription({ userId, adminUser: req.adminUser, req });
      return sendSuccess(res, 'Subscription resumed successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  cancelUserSubscription: async (req, res, next) => {
    try {
      const { userId, reason } = req.body;
      const sub = await adminService.cancelUserSubscription({ userId, reason, adminUser: req.adminUser, req });
      return sendSuccess(res, 'Subscription cancelled successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  revokeDemoSubscription: async (req, res, next) => {
    try {
      const { userId, reason } = req.body;
      const sub = await adminService.revokeDemoSubscription({ userId, reason, adminUser: req.adminUser, req });
      return sendSuccess(res, 'Demo subscription revoked successfully', sub);
    } catch (err) {
      next(err);
    }
  },

  getSubscriptionSettings: async (req, res, next) => {
    try {
      const settings = await adminService.getSubscriptionSettings();
      return sendSuccess(res, 'Subscription settings fetched successfully', settings);
    } catch (err) {
      next(err);
    }
  },

  updateSubscriptionSettings: async (req, res, next) => {
    try {
      const settings = await adminService.updateSubscriptionSettings(req.body, req.adminUser, req);
      return sendSuccess(res, 'Subscription settings updated successfully', settings);
    } catch (err) {
      next(err);
    }
  },

  getSubscriptionHistory: async (req, res, next) => {
    try {
      const history = await adminService.getSubscriptionHistory();
      return sendSuccess(res, 'Subscription history fetched successfully', history);
    } catch (err) {
      next(err);
    }
  },

  getVisitorAnalytics: async (req, res, next) => {
    try {
      const { period = 'MONTH' } = req.query;
      const analytics = await adminService.getVisitorAnalytics({ period });
      return sendSuccess(res, 'Visitor analytics fetched successfully', analytics);
    } catch (err) {
      next(err);
    }
  },

  // 6. PAYMENTS
  getPaymentsList: async (req, res, next) => {
    try {
      const payments = await adminService.getPaymentsList(req.query);
      return sendSuccess(res, 'Payments list fetched successfully', payments);
    } catch (err) {
      next(err);
    }
  },

  // 7. ADMIN USERS & ROLES
  getAdminsList: async (req, res, next) => {
    try {
      const admins = await adminService.getAdminsList();
      return sendSuccess(res, 'Admins list fetched successfully', admins);
    } catch (err) {
      next(err);
    }
  },

  createAdminUser: async (req, res, next) => {
    try {
      const newAdmin = await adminService.createAdminUser(req.body, req.adminUser, req);
      return sendSuccess(res, 'New admin user created successfully', newAdmin);
    } catch (err) {
      next(err);
    }
  },

  // 8. NOTIFICATIONS
  sendSingleUserNotification: async (req, res, next) => {
    try {
      const notif = await adminService.sendSingleUserNotification(req.body, req.adminUser, req);
      return sendSuccess(res, 'Notification sent successfully.', notif);
    } catch (err) {
      next(err);
    }
  },

  sendAdminNotification: async (req, res, next) => {
    try {
      const notif = await adminService.sendAdminNotification(req.body, req.adminUser, req);
      return sendSuccess(res, 'Admin notification broadcasted successfully', notif);
    } catch (err) {
      next(err);
    }
  },

  getNotificationsHistory: async (req, res, next) => {
    try {
      const history = await adminService.getNotificationsHistory();
      return sendSuccess(res, 'Notifications history fetched successfully', history);
    } catch (err) {
      next(err);
    }
  },

  // 9. AUDIT LOGS
  getAuditLogs: async (req, res, next) => {
    try {
      const logs = await adminService.getAuditLogs();
      return sendSuccess(res, 'Audit logs fetched successfully', logs);
    } catch (err) {
      next(err);
    }
  },

  // 10. SYSTEM SETTINGS
  getSystemSettings: async (req, res, next) => {
    try {
      const settings = await adminService.getSystemSettings();
      return sendSuccess(res, 'System settings fetched successfully', settings);
    } catch (err) {
      next(err);
    }
  },

  updateSystemSetting: async (req, res, next) => {
    try {
      const { key, value } = req.body;
      const setting = await adminService.updateSystemSetting(key, value, req.adminUser, req);
      return sendSuccess(res, 'System setting updated successfully', setting);
    } catch (err) {
      next(err);
    }
  },
};
