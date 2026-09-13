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
import AdminRouteErrorPage from '../pages/Error/AdminRouteErrorPage';
import AdminErrorBoundary from '../components/common/AdminErrorBoundary';

const wrapAdminRoute = (Component) => (
  <AdminErrorBoundary>
    <Component />
  </AdminErrorBoundary>
);

export const adminRouter = createBrowserRouter([
  {
    path: '/',
    element: wrapAdminRoute(AdminLoginPage),
    errorElement: <AdminRouteErrorPage />,
  },
  {
    path: '/login',
    element: wrapAdminRoute(AdminLoginPage),
    errorElement: <AdminRouteErrorPage />,
  },
  {
    path: '/admin/login',
    element: wrapAdminRoute(AdminLoginPage),
    errorElement: <AdminRouteErrorPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    errorElement: <AdminRouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: wrapAdminRoute(AdminDashboardPage) },
      { path: 'users', element: wrapAdminRoute(UsersListPage) },
      { path: 'users/:userId', element: wrapAdminRoute(UserDetailsPage) },
      { path: 'subscriptions', element: wrapAdminRoute(SubscriptionOverviewPage) },
      { path: 'subscriptions/settings', element: wrapAdminRoute(SubscriptionSettingsPage) },
      { path: 'subscriptions/history', element: wrapAdminRoute(SubscriptionHistoryPage) },
      { path: 'payments', element: wrapAdminRoute(TransactionsPage) },
      { path: 'revenue', element: wrapAdminRoute(RevenueAnalyticsPage) },
      { path: 'payments/revenue', element: wrapAdminRoute(RevenueAnalyticsPage) },
      { path: 'analytics/visitors', element: wrapAdminRoute(WebsiteAnalyticsPage) },
      { path: 'backups', element: wrapAdminRoute(BackupsPage) },
      { path: 'reports', element: wrapAdminRoute(AdminReportsPage) },
      { path: 'notifications', element: wrapAdminRoute(SendNotificationPage) },
      { path: 'support', element: wrapAdminRoute(AdminSupportTicketsPage) },
      { path: 'admins', element: wrapAdminRoute(AdminsManagementPage) },
      { path: 'audit-logs', element: wrapAdminRoute(AuditLogsPage) },
      { path: 'settings', element: wrapAdminRoute(SystemSettingsPage) },
    ],
  },
  {
    path: '*',
    element: <AdminRouteErrorPage />,
    errorElement: <AdminRouteErrorPage />,
  },
]);
