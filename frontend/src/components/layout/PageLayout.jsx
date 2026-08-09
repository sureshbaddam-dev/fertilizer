import React from 'react';
import { MessageSquare } from 'lucide-react';
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

      <div className="fixed bottom-5 right-5 z-30 print:hidden">
        <button
          type="button"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-700 bg-emerald-700 text-white shadow-lg shadow-emerald-700/25 transition-transform duration-180 hover:scale-[1.03] hover:bg-emerald-800"
          title="WhatsApp Support"
        >
          <MessageSquare className="h-6 w-6 fill-white text-emerald-700" />
        </button>
      </div>
    </div>
  );
}
