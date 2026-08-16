import React from 'react';
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
  return (
    <div className="app-shell min-h-screen">
      <TopNavbar
        onToggleSidebar={onToggleSidebar}
        onOpenNewBill={onOpenNewBill}
        onQuickAddProduct={onQuickAddProduct}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseSidebarMobile}
          className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onCloseMobile={onCloseSidebarMobile} />

      <div className="app-main-column pt-[var(--topbar-height)]">
        <main
          className={`min-w-0 transition-[padding] duration-200 ease-in-out ${
            isBillingOpen ? 'lg:pr-[33.75rem]' : ''
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
        isOpen={isBillingOpen}
        onClose={onCloseNewBill}
        quickAddedProduct={quickAddedProduct}
      />
    </div>
  );
}
