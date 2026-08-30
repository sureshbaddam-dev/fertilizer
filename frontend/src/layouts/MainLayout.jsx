import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import PageTracker from '../components/PageTracker';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import VedixaWorkspaceLoader from '../components/common/VedixaWorkspaceLoader';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthReady } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [quickAddedProduct, setQuickAddedProduct] = useState(null);

  const isDashboardRoute = location.pathname === '/' || location.pathname === '/dashboard';

  // Open billing drawer + navigate to dashboard if triggered on another route
  const triggerGlobalBilling = () => {
    if (!isDashboardRoute) {
      navigate('/dashboard', { state: { openBillingDrawer: true } });
    }
    setIsBillingOpen(true);
  };

  // 1. Consume navigation state to open drawer on dashboard mount (UNCONDITIONAL HOOK)
  useEffect(() => {
    if (isDashboardRoute && location.state?.openBillingDrawer) {
      setIsBillingOpen(true);
    }
  }, [isDashboardRoute, location.state]);

  // 2. Automatically close Billing Drawer whenever user navigates away from Dashboard (UNCONDITIONAL HOOK)
  useEffect(() => {
    if (!isDashboardRoute && isBillingOpen) {
      setIsBillingOpen(false);
    }
  }, [isDashboardRoute, isBillingOpen]);

  // 3. Global F2 Key Listener (UNCONDITIONAL HOOK)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        triggerGlobalBilling();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, isDashboardRoute]);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebarMobile = () => {
    setSidebarOpen(false);
  };

  const handleOpenNewBill = () => {
    triggerGlobalBilling();
  };

  const handleCloseNewBill = () => {
    setIsBillingOpen(false);
  };

  const handleQuickAddProduct = (product) => {
    setQuickAddedProduct(product);
    triggerGlobalBilling();
  };

  // --- RENDER LOGIC (AFTER ALL HOOKS HAVE BEEN EXECUTED UNCONDITIONALLY) ---

  // A. While auth or initial business profile is resolving, show branded workspace loader
  if (!isAuthReady) {
    return (
      <VedixaWorkspaceLoader
        message="Preparing your workspace..."
        subtext="Verifying secure access session"
      />
    );
  }

  const hasSettingsData = settings && Object.keys(settings).length > 0;
  if (isSettingsLoading && !hasSettingsData) {
    return (
      <VedixaWorkspaceLoader
        message="Preparing your workspace..."
        subtext="Loading business profile"
      />
    );
  }

  // B. Once settings and auth resolved: check if user profile onboarding is complete
  const currentUser = user || authService.getCurrentUser();
  const isProfileComplete = Boolean(
    currentUser?.isProfileComplete ||
      (currentUser?.ownerName &&
        currentUser?.ownerName !== 'Pending Setup' &&
        currentUser?.mobile &&
        !String(currentUser.mobile).startsWith('pending_'))
  );

  // Only redirect to /shop-setup if initialization is complete and profile is NOT complete
  if (!isSettingsLoading && isAuthReady && !isProfileComplete) {
    return <Navigate to="/shop-setup" replace />;
  }

  return (
    <PageLayout
      sidebarOpen={sidebarOpen}
      isBillingOpen={isBillingOpen}
      onToggleSidebar={handleToggleSidebar}
      onCloseSidebarMobile={handleCloseSidebarMobile}
      onOpenNewBill={handleOpenNewBill}
      onCloseNewBill={handleCloseNewBill}
      onQuickAddProduct={handleQuickAddProduct}
      quickAddedProduct={quickAddedProduct}
    >
      <PageTracker />
      <Outlet context={{ onOpenNewBill: handleOpenNewBill, onQuickAddProduct: handleQuickAddProduct, isBillingOpen }} />
    </PageLayout>
  );
}
