import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import PageTracker from '../components/PageTracker';

import { subscriptionService } from '../services/subscriptionService';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [quickAddedProduct, setQuickAddedProduct] = useState(null);

  // Check Subscription Status for non-admin users
  useEffect(() => {
    const checkSub = async () => {
      const allowedExemptPaths = ['/subscription', '/support', '/admin/tickets', '/admin/subscriptions'];
      if (allowedExemptPaths.some((p) => location.pathname.startsWith(p))) {
        return;
      }
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'admin') return;
        }
        const res = await subscriptionService.getMySubscription();
        const hasActive = res?.data?.hasActiveSubscription || res?.hasActiveSubscription;
        if (!hasActive) {
          navigate('/subscription/plans');
        }
      } catch (_err) {
        // Continue normally if error
      }
    };
    checkSub();
  }, [location.pathname]);

  // Helper to trigger opening billing drawer + navigate to dashboard if on another route
  const triggerGlobalBilling = () => {
    if (location.pathname !== '/' && location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
    setIsBillingOpen(true);
  };

  // Global F2 Key Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        triggerGlobalBilling();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

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
