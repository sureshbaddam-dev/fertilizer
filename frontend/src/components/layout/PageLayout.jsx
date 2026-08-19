import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import BillingDrawer from '../billing/BillingDrawer';

export default function PageLayout({
  sidebarOpen,
  isBillingOpen,
  onToggleSidebar,
  onCloseSidebarMobile,
  onOpenNewBill,
  onCloseNewBill,
  onQuickAddProduct,
  quickAddedProduct,
  children,
}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const isDashboardRoute = currentPath === '/' || currentPath === '/dashboard' || currentPath === '/dashboard/';
  const showDrawer = isBillingOpen && isDashboardRoute;

  const showMobileSearch =
    isDashboardRoute ||
    currentPath.startsWith('/products');

  return (
    <div className="app-shell min-h-screen relative">
      <TopNavbar
        onToggleSidebar={onToggleSidebar}
        onOpenNewBill={onOpenNewBill}
        onQuickAddProduct={onQuickAddProduct}
        isBillingOpen={isBillingOpen}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseSidebarMobile}
          className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={onCloseSidebarMobile}
        isBillingOpen={isBillingOpen}
      />

      <div className={`app-main-column ${showMobileSearch ? 'pt-[134px] lg:pt-[var(--topbar-height)]' : 'pt-[var(--topbar-height)]'}`}>
        <main
          className={`min-w-0 transition-[padding] duration-200 ease-in-out ${
            showDrawer ? 'lg:pr-[33.75rem]' : ''
          }`}
        >
          <div className="app-page-frame">
            <div className="app-page-stack">
              {children}
            </div>
          </div>
        </main>
      </div>

      <BillingDrawer
        isOpen={showDrawer}
        onClose={onCloseNewBill}
        quickAddedProduct={quickAddedProduct}
      />
    </div>
  );
}
