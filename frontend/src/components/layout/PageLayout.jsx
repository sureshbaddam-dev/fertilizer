import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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
  onBlockNav,
  navToastVisible,
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
      {/* Professional Floating Toast Alert when user attempts navigation while Billing Drawer is open */}
      {navToastVisible && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] max-w-md w-auto px-4 py-3 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-extrabold text-slate-100 leading-snug">
            Please close the Billing Cart before leaving the Dashboard.
          </span>
        </div>
      )}

      <TopNavbar
        onToggleSidebar={onToggleSidebar}
        onOpenNewBill={onOpenNewBill}
        onQuickAddProduct={onQuickAddProduct}
        isBillingOpen={isBillingOpen}
        onBlockNav={onBlockNav}
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
        onBlockNav={onBlockNav}
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
