import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import PageTracker from '../components/PageTracker';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [quickAddedProduct, setQuickAddedProduct] = useState(null);
  const [navToastVisible, setNavToastVisible] = useState(false);

  const toastTimeoutRef = useRef(null);
  const isDashboardRoute = location.pathname === '/' || location.pathname === '/dashboard';

  const showNavBlockToast = () => {
    setNavToastVisible(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setNavToastVisible(false);
    }, 3500);
  };

  // Open billing drawer + navigate to dashboard if triggered on another route
  const triggerGlobalBilling = () => {
    if (!isDashboardRoute) {
      navigate('/dashboard', { state: { openBillingDrawer: true } });
    }
    setIsBillingOpen(true);
  };

  // Consume navigation state to open drawer on dashboard mount
  useEffect(() => {
    if (isDashboardRoute && location.state?.openBillingDrawer) {
      setIsBillingOpen(true);
    }
  }, [isDashboardRoute, location.state]);

  // Block route changes while Billing Drawer is open (keep user on /dashboard + show toast)
  useEffect(() => {
    if (isBillingOpen && !isDashboardRoute) {
      navigate('/dashboard', { replace: true });
      showNavBlockToast();
    }
  }, [isBillingOpen, isDashboardRoute, navigate]);

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
    setNavToastVisible(false);
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
      onBlockNav={showNavBlockToast}
      navToastVisible={navToastVisible}
    >
      <PageTracker />
      <Outlet context={{ onOpenNewBill: handleOpenNewBill, onQuickAddProduct: handleQuickAddProduct, isBillingOpen }} />
    </PageLayout>
  );
}
