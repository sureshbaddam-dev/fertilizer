import express from 'express';
import { requireAdminRole } from './middlewares/admin.middleware.js';
import { adminController } from './controllers/admin.controller.js';

import adminAuthRoutes from './adminAuth.routes.js';
import backupRoutes from './backup.routes.js';

const router = express.Router();

// Public Admin Auth Endpoints (/api/v1/admin/auth/send-otp, /verify-otp, etc.)
router.use('/auth', adminAuthRoutes);

// Require Admin role & token signed with ADMIN_JWT_SECRET for all protected admin routes
router.use(requireAdminRole());

// Dashboard & Stats
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/analytics', adminController.getDashboardAnalytics);
router.get('/dashboard/activity', adminController.getRecentActivity);

// User Management
router.get('/users', adminController.getUsersList);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.toggleUserStatus);

// Backups & Recovery Console
router.use('/backups', backupRoutes);



// Subscriptions & Demos
router.post('/subscriptions/grant-plan', adminController.grantAdminSubscription);
router.post('/subscriptions/grant-demo', adminController.grantCustomDemoSubscription);
router.post('/subscriptions/pause', adminController.pauseUserSubscription);
router.post('/subscriptions/resume', adminController.resumeUserSubscription);
router.post('/subscriptions/cancel', adminController.cancelUserSubscription);
router.post('/subscriptions/revoke-demo', adminController.revokeDemoSubscription);
router.get('/subscription-settings', adminController.getSubscriptionSettings);
router.put('/subscription-settings', adminController.updateSubscriptionSettings);
router.get('/subscriptions/history', adminController.getSubscriptionHistory);

// Visitor Analytics
router.get('/analytics/visitors', adminController.getVisitorAnalytics);

// Payments & Transactions
router.get('/payments', adminController.getPaymentsList);

// Admins & Roles
router.get('/admins', adminController.getAdminsList);
router.post('/admins', adminController.createAdminUser);

// Notifications
router.post('/notifications/user', adminController.sendSingleUserNotification);
router.post('/notifications/users', adminController.sendSingleUserNotification);
router.post('/notifications/send', adminController.sendAdminNotification);
router.get('/notifications/history', adminController.getNotificationsHistory);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// System Settings (Persisted)
router.get('/settings', adminController.getSystemSettings);
router.patch('/settings', adminController.updateSystemSetting);

export default router;
