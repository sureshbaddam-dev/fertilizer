import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Tag, Sparkles } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import MostSellingProducts from '../../components/dashboard/MostSellingProducts';
import TodaySummary from '../../components/dashboard/TodaySummary';
import RecentBills from '../../components/dashboard/RecentBills';
import LowStockProducts from '../../components/dashboard/LowStockProducts';
import ShopDiscountModal from '../../components/settings/ShopDiscountModal';
import StockAlertsModal from '../../components/dashboard/StockAlertsModal';
import { dashboardService } from '../../services/dashboardService';
import { subscriptionService } from '../../services/subscriptionService';

export default function HomePage() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const onQuickAddProduct = outletContext?.onQuickAddProduct;
  const isBillingOpen = outletContext?.isBillingOpen;

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Fetch Live Dashboard Overview Data from API
  const { data: dashboardApi } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardService.getDashboardOverview(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch Current Subscription Status (Shared cache with TopNavbar)
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  const dashboardData = dashboardApi?.data || dashboardApi;
  const stockAlerts = dashboardData?.stockAlerts || { totalAlerts: 0, lowStock: 0, outOfStock: 0, expiryAlerts: 0, expiredProducts: 0 };
  const shopDiscount = dashboardData?.shopDiscount;

  const discountLabel = shopDiscount?.isEnabled
    ? shopDiscount.discountType === 'percentage'
      ? `Flat ${shopDiscount.discountValue}% OFF Active`
      : `Flat ₹${shopDiscount.discountValue} OFF Active`
    : 'Discount Disabled';

  return (
    <div className="space-y-6 font-sans w-full max-w-full">
      
      {/* 1. Available Products Section */}
      <MostSellingProducts
        onQuickAdd={onQuickAddProduct}
        hasActiveSub={hasActiveSub}
      />

      {/* 2. Bottom Dashboard Summary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Today's Summary Card */}
        <div className="lg:col-span-5 flex flex-col">
          <TodaySummary summaryData={dashboardData?.todaySummary} />
        </div>

        {/* Recent Bills Card */}
        <div className="lg:col-span-4 flex flex-col">
          <RecentBills billsData={dashboardData?.recentBills} />
        </div>

        {/* Low Stock Products & Stock Alerts Cards */}
        <div className="lg:col-span-3 flex flex-col space-y-4 sm:space-y-4">
          <LowStockProducts productsData={dashboardData?.lowStockProducts} />

          {/* Stock Alerts Card */}
          <Card
            title="Stock Alerts"
            icon={Bell}
            action={
              <Badge variant={stockAlerts.totalAlerts > 0 ? 'warning' : 'success'}>
                {stockAlerts.totalAlerts} Alert{stockAlerts.totalAlerts === 1 ? '' : 's'}
              </Badge>
            }
          >
            <div className="space-y-3">
              {stockAlerts.totalAlerts > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-center bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <span className="helper-text text-[11px] block truncate">Low Stock</span>
                    <span className="font-bold text-slate-900 text-sm block truncate">{stockAlerts.lowStock}</span>
                  </div>
                  <div className="border-x border-slate-200 min-w-0 px-0.5">
                    <span className="helper-text text-[11px] block truncate">Expiry (30d)</span>
                    <span className="font-bold text-slate-900 text-sm block truncate">{stockAlerts.expiryAlerts}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="helper-text text-[11px] block truncate">Out of Stock</span>
                    <span className="font-bold text-slate-900 text-sm block truncate">{stockAlerts.outOfStock}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 text-center text-xs text-emerald-700 bg-emerald-50/60 rounded-xl font-medium truncate">
                  No stock alerts.
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAlertsModalOpen(true)}
              >
                View All Alerts
              </Button>
            </div>
          </Card>

          {/* Shop Discount Card */}
          <Card className="bg-emerald-50/40 border-emerald-100 min-w-0 p-3.5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 rounded-xl bg-white text-emerald-600 border border-emerald-100 shrink-0">
                  <Tag className="w-4 h-4 fill-emerald-600/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="helper-text text-[10px] uppercase font-bold block text-slate-400">Shop Discount</span>
                  <span className="font-extrabold text-slate-900 text-xs block truncate">{discountLabel}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 text-xs shrink-0 px-2"
                onClick={() => setIsDiscountModalOpen(true)}
              >
                Manage
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ShopDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        initialData={shopDiscount}
      />
      <StockAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
      />
    </div>
  );
}
