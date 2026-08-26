import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import SubscriptionGuard from '../components/common/SubscriptionGuard';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

// Eagerly loaded critical landing / auth pages
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';
import HomePage from '../pages/dashboard/HomePage';

// Lazy-loaded routes for code-splitting
const OtpVerificationPage = lazy(() => import('../pages/auth/OtpVerificationPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const ShopSetupPage = lazy(() => import('../pages/auth/ShopSetupPage'));

const SettingsHubLayout = lazy(() => import('../pages/settings/SettingsHubLayout'));
const ShopDiscountPage = lazy(() => import('../pages/settings/ShopDiscountPage'));
const ShopProfilePage = lazy(() => import('../pages/settings/ShopProfilePage'));
const UserProfilePage = lazy(() => import('../pages/settings/UserProfilePage'));
const MasterDataHubPage = lazy(() => import('../pages/settings/MasterDataHubPage'));
const TaxesGstPage = lazy(() => import('../pages/settings/TaxesGstPage'));
const NotificationsPage = lazy(() => import('../pages/settings/NotificationsPage'));
const SecurityPage = lazy(() => import('../pages/settings/SecurityPage'));
const PreferencesPage = lazy(() => import('../pages/settings/PreferencesPage'));
const LegalPoliciesPage = lazy(() => import('../pages/settings/LegalPoliciesPage'));

const TermsAndConditionsPage = lazy(() => import('../pages/legal/TermsAndConditionsPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/legal/PrivacyPolicyPage'));
const RefundCancellationPolicyPage = lazy(() => import('../pages/legal/RefundCancellationPolicyPage'));

const SuppliersPage = lazy(() => import('../pages/masters/SuppliersPage'));
const NewPurchasePage = lazy(() => import('../pages/purchases/NewPurchasePage'));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const SupplierLedgerPage = lazy(() => import('../pages/purchases/SupplierLedgerPage'));
const BillsHistoryPage = lazy(() => import('../pages/sales/BillsHistoryPage'));
const InvoiceDetailsPage = lazy(() => import('../pages/sales/InvoiceDetailsPage'));
const EditInvoicePage = lazy(() => import('../pages/sales/EditInvoicePage'));
const CustomerListPage = lazy(() => import('../pages/customers/CustomerListPage'));
const CustomerLedgerPage = lazy(() => import('../pages/customers/CustomerLedgerPage'));
const GeneralCustomersPage = lazy(() => import('../pages/customers/GeneralCustomersPage'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const SupportPage = lazy(() => import('../pages/support/SupportPage'));
const FullScreenSubscriptionPage = lazy(() => import('../pages/subscription/FullScreenSubscriptionPage'));

const PageLoader = () => (
  <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 border-3 border-[#00783C] border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-semibold text-gray-500">Loading module...</span>
  </div>
);

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export const appRouter = createBrowserRouter([
  {
    path: '/terms-and-conditions',
    element: withSuspense(TermsAndConditionsPage),
  },
  {
    path: '/privacy-policy',
    element: withSuspense(PrivacyPolicyPage),
  },
  {
    path: '/refund-cancellation-policy',
    element: withSuspense(RefundCancellationPolicyPage),
  },
  {
    path: '/subscription/plans',
    element: (
      <ProtectedRoute>
        {withSuspense(FullScreenSubscriptionPage)}
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscription',
    element: (
      <ProtectedRoute>
        {withSuspense(FullScreenSubscriptionPage)}
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
      { path: 'verify-otp', element: withSuspense(OtpVerificationPage) },
      { path: 'verify-email', element: withSuspense(VerifyEmailPage) },
      { path: 'forgot-password', element: withSuspense(ForgotPasswordPage) },
      { path: 'reset-password', element: withSuspense(ResetPasswordPage) },
      {
        path: 'shop-setup',
        element: withSuspense(ShopSetupPage),
      },
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
      // UNRESTRICTED ROUTES (Always accessible to logged-in users)
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <HomePage /> },
      { path: 'support', element: withSuspense(SupportPage) },
      { path: 'subscription', element: withSuspense(FullScreenSubscriptionPage) },

      // PROTECTED PAID ERP MODULE ROUTES (Wrapped with SubscriptionGuard)
      {
        path: 'billing',
        element: <Navigate to="/dashboard" replace />,
      },
      // UNRESTRICTED MASTER DATA & CORE FEATURES (Accessible without subscription)
      { path: 'products', element: withSuspense(ProductsPage) },
      { path: 'customers', element: withSuspense(CustomerListPage) },
      { path: 'general-customers', element: withSuspense(GeneralCustomersPage) },
      { path: 'customers/general', element: withSuspense(GeneralCustomersPage) },
      { path: 'customers/ledger', element: withSuspense(CustomerLedgerPage) },
      { path: 'customers/:customerId/ledger', element: withSuspense(CustomerLedgerPage) },
      { path: 'inventory', element: withSuspense(InventoryPage) },
      { path: 'suppliers', element: withSuspense(SuppliersPage) },
      { path: 'suppliers/:supplierId/ledger', element: withSuspense(SupplierLedgerPage) },

      // PROTECTED FINANCIAL TRANSACTION ERP MODULES (Require Subscription)
      {
        path: 'stock-entry',
        element: (
          <SubscriptionGuard featureName="Purchases">
            {withSuspense(NewPurchasePage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'purchases',
        element: (
          <SubscriptionGuard featureName="Purchases">
            {withSuspense(NewPurchasePage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'purchases/new',
        element: (
          <SubscriptionGuard featureName="Purchases">
            {withSuspense(NewPurchasePage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'purchases/ledger',
        element: (
          <SubscriptionGuard featureName="Purchases">
            {withSuspense(SupplierLedgerPage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'purchases/ledger/:supplierId',
        element: (
          <SubscriptionGuard featureName="Purchases">
            {withSuspense(SupplierLedgerPage)}
          </SubscriptionGuard>
        ),
      },

      // Billing & Invoices (Financial Transactions)
      {
        path: 'invoices',
        element: (
          <SubscriptionGuard featureName="Billing & Invoices">
            {withSuspense(BillsHistoryPage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'invoices/:invoiceId',
        element: (
          <SubscriptionGuard featureName="Billing & Invoices">
            {withSuspense(InvoiceDetailsPage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'invoices/:invoiceId/edit',
        element: (
          <SubscriptionGuard featureName="Billing & Invoices">
            {withSuspense(EditInvoicePage)}
          </SubscriptionGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <SubscriptionGuard featureName="Reports">
            {withSuspense(ReportsPage)}
          </SubscriptionGuard>
        ),
      },

      // Redirect legacy /masters to unified /settings/master-data
      { path: 'masters/*', element: <Navigate to="/settings/master-data" replace /> },

      // Unified Settings Hub Routes (Unlocked for account management)
      {
        path: 'settings',
        element: withSuspense(SettingsHubLayout),
        children: [
          { path: 'user-profile', element: withSuspense(UserProfilePage) },
          { path: 'shop-discount', element: withSuspense(ShopDiscountPage) },
          { path: 'shop', element: withSuspense(ShopProfilePage) },
          { path: 'shop-profile', element: <Navigate to="/settings/shop" replace /> },
          { path: 'master-data', element: withSuspense(MasterDataHubPage) },
          { path: 'users', element: <Navigate to="/settings" replace /> },
          { path: 'taxes', element: withSuspense(TaxesGstPage) },
          { path: 'printers', element: <Navigate to="/settings" replace /> },
          { path: 'notifications', element: withSuspense(NotificationsPage) },
          { path: 'backup', element: <Navigate to="/settings" replace /> },
          { path: 'security', element: withSuspense(SecurityPage) },
          { path: 'preferences', element: withSuspense(PreferencesPage) },
          { path: 'legal', element: withSuspense(LegalPoliciesPage) },
        ],
      },
    ],
  },
]);
