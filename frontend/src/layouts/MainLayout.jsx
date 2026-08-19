import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import PageTracker from '../components/PageTracker';

import { useSettings } from '../contexts/SettingsContext';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // A. While resolving ShopSettings / profile onboarding state, show VEDIXA loading UI — DO NOT mount Dashboard
  if (isSettingsLoading || settings === undefined) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wide text-emerald-400">Loading Business Profile...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying shop setup state</p>
      </div>
    );
  }

  // B. Once settings resolved: if shopName is missing/empty, redirect to /shop-setup WITHOUT mounting Dashboard
  const currentShopName = settings?.shopName || settings?.shopSettings?.shopName || '';
  if (!currentShopName || !currentShopName.trim()) {
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
