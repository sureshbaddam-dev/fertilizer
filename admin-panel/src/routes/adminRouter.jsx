import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AdminLoginPage from '../pages/Auth/AdminLoginPage';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminDashboardPage from '../pages/Dashboard/AdminDashboardPage';
import UsersListPage from '../pages/Users/UsersListPage';
import UserDetailsPage from '../pages/Users/UserDetailsPage';
import SubscriptionOverviewPage from '../pages/Subscriptions/SubscriptionOverviewPage';
import SubscriptionSettingsPage from '../pages/Subscriptions/SubscriptionSettingsPage';
import SubscriptionHistoryPage from '../pages/Subscriptions/SubscriptionHistoryPage';
import TransactionsPage from '../pages/Payments/TransactionsPage';
import RevenueAnalyticsPage from '../pages/Payments/RevenueAnalyticsPage';
import WebsiteAnalyticsPage from '../pages/Analytics/WebsiteAnalyticsPage';
import BackupsPage from '../pages/Backups/BackupsPage';
import AdminReportsPage from '../pages/Reports/ReportsPage';
import SendNotificationPage from '../pages/Notifications/SendNotificationPage';
import AdminSupportTicketsPage from '../pages/Support/AdminSupportTicketsPage';
import AdminsManagementPage from '../pages/Admins/AdminsManagementPage';
import AuditLogsPage from '../pages/AuditLogs/AuditLogsPage';
import SystemSettingsPage from '../pages/Settings/SystemSettingsPage';

export const adminRouter = createBrowserRouter([
  {
    path: '/',
    element: <AdminLoginPage />,
  },
  {
    path: '/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'users', element: <UsersListPage /> },
      { path: 'users/:userId', element: <UserDetailsPage /> },
      { path: 'subscriptions', element: <SubscriptionOverviewPage /> },
      { path: 'subscriptions/settings', element: <SubscriptionSettingsPage /> },
      { path: 'subscriptions/history', element: <SubscriptionHistoryPage /> },
      { path: 'payments', element: <TransactionsPage /> },
      { path: 'revenue', element: <RevenueAnalyticsPage /> },
      { path: 'payments/revenue', element: <RevenueAnalyticsPage /> },
      { path: 'analytics/visitors', element: <WebsiteAnalyticsPage /> },
      { path: 'backups', element: <BackupsPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'notifications', element: <SendNotificationPage /> },
      { path: 'support', element: <AdminSupportTicketsPage /> },
      { path: 'admins', element: <AdminsManagementPage /> },
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'settings', element: <SystemSettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
