import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';
import OtpVerificationPage from '../pages/auth/OtpVerificationPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import HomePage from '../pages/dashboard/HomePage';
import SettingsHubLayout from '../pages/settings/SettingsHubLayout';
import ShopDiscountPage from '../pages/settings/ShopDiscountPage';
import ShopProfilePage from '../pages/settings/ShopProfilePage';
import UserProfilePage from '../pages/settings/UserProfilePage';
import MasterDataHubPage from '../pages/settings/MasterDataHubPage';
import UsersRolesPage from '../pages/settings/UsersRolesPage';
import TaxesGstPage from '../pages/settings/TaxesGstPage';
import PrintersPage from '../pages/settings/PrintersPage';
import NotificationsPage from '../pages/settings/NotificationsPage';
import BackupRestorePage from '../pages/settings/BackupRestorePage';
import SecurityPage from '../pages/settings/SecurityPage';
import PreferencesPage from '../pages/settings/PreferencesPage';
import SuppliersPage from '../pages/masters/SuppliersPage';
import NewPurchasePage from '../pages/purchases/NewPurchasePage';
import ProductsPage from '../pages/products/ProductsPage';
import SupplierLedgerPage from '../pages/purchases/SupplierLedgerPage';
import BillsHistoryPage from '../pages/sales/BillsHistoryPage';
import InvoiceDetailsPage from '../pages/sales/InvoiceDetailsPage';
import EditInvoicePage from '../pages/sales/EditInvoicePage';
import CustomerListPage from '../pages/customers/CustomerListPage';
import CustomerLedgerPage from '../pages/customers/CustomerLedgerPage';
import GeneralCustomersPage from '../pages/customers/GeneralCustomersPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import ReportsPage from '../pages/reports/ReportsPage';
import ArchivedPurchasesPage from '../pages/settings/ArchivedPurchasesPage';
import SupportPage from '../pages/support/SupportPage';
import AdminTicketsPage from '../pages/admin/AdminTicketsPage';
import FullScreenSubscriptionPage from '../pages/subscription/FullScreenSubscriptionPage';

export const appRouter = createBrowserRouter([
  {
    path: '/subscription/plans',
    element: (
      <ProtectedRoute>
        <FullScreenSubscriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscription',
    element: (
      <ProtectedRoute>
        <FullScreenSubscriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicOnlyRoute>
            <SignUpPage />
          </PublicOnlyRoute>
        ),
      },
      { path: 'verify-otp', element: <OtpVerificationPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <HomePage /> },
      
      { path: 'billing', element: <Navigate to="/dashboard" replace /> },
      { path: 'products', element: <ProductsPage /> },
      
      // Customers Module Routes
      { path: 'customers', element: <CustomerListPage /> },
      { path: 'general-customers', element: <GeneralCustomersPage /> },
      { path: 'customers/general', element: <GeneralCustomersPage /> },
      { path: 'customers/ledger', element: <CustomerLedgerPage /> },
      { path: 'customers/:customerId/ledger', element: <CustomerLedgerPage /> },

      { path: 'inventory', element: <InventoryPage /> },
      { path: 'stock-entry', element: <NewPurchasePage /> },
      
      // Suppliers & Supplier Ledger Module Routes
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'suppliers/:supplierId/ledger', element: <SupplierLedgerPage /> },

      // Purchases Module
      { path: 'purchases', element: <NewPurchasePage /> },
      { path: 'purchases/new', element: <NewPurchasePage /> },
      { path: 'purchases/ledger', element: <SupplierLedgerPage /> },
      { path: 'purchases/ledger/:supplierId', element: <SupplierLedgerPage /> },

      { path: 'invoices', element: <BillsHistoryPage /> },
      { path: 'invoices/:invoiceId', element: <InvoiceDetailsPage /> },
      { path: 'invoices/:invoiceId/edit', element: <EditInvoicePage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'subscription', element: <FullScreenSubscriptionPage /> },

      // Redirect legacy /masters to unified /settings/master-data
      { path: 'masters/*', element: <Navigate to="/settings/master-data" replace /> },

      // Unified Settings Hub Routes
      {
        path: 'settings',
        element: <SettingsHubLayout />,
        children: [
          { path: 'user-profile', element: <UserProfilePage /> },
          { path: 'shop-discount', element: <ShopDiscountPage /> },
          { path: 'shop', element: <ShopProfilePage /> },
          { path: 'shop-profile', element: <Navigate to="/settings/shop" replace /> },
          { path: 'master-data', element: <MasterDataHubPage /> },
          { path: 'users', element: <Navigate to="/settings" replace /> },
          { path: 'taxes', element: <TaxesGstPage /> },
          { path: 'printers', element: <Navigate to="/settings" replace /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'backup', element: <Navigate to="/settings" replace /> },
          { path: 'security', element: <SecurityPage /> },
          { path: 'preferences', element: <PreferencesPage /> },
        ],
      },
    ],
  },
]);
