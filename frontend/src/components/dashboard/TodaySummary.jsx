import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';

export default function TodaySummary({ summaryData }) {
  const navigate = useNavigate();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardService.getDashboardOverview(),
    enabled: !summaryData,
    staleTime: 5 * 60 * 1000,
  });

  const summary = summaryData || apiResponse?.data?.todaySummary || apiResponse?.todaySummary;
  const isFetching = !summaryData && isLoading;

  const totalSales = summary?.totalSales || '₹ 0';
  const totalBills = summary?.totalBills !== undefined ? summary.totalBills : 0;
  const customersCount = summary?.customers !== undefined ? summary.customers : 0;
  const pendingPayments = summary?.pendingPayments || '₹ 0';
  const todayDate = summary?.todayDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const salesGrowth = summary?.salesGrowth !== undefined ? summary.salesGrowth : 0;
  const billsGrowth = summary?.billsGrowth !== undefined ? summary.billsGrowth : 0;
  const customerGrowth = summary?.customerGrowth !== undefined ? summary.customerGrowth : 0;
  const pendingGrowth = summary?.pendingGrowth !== undefined ? summary.pendingGrowth : 0;

  const renderTrend = (val) => {
    if (val > 0) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
          <TrendingUp className="w-3 h-3" />
          <span>+{val}%</span>
        </div>
      );
    }
    if (val < 0) {
      return (
        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
          <TrendingDown className="w-3 h-3" />
          <span>{val}%</span>
        </div>
      );
    }
    return (
      <div className="text-[10px] font-semibold text-gray-400">
        0%
      </div>
    );
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-[18px] border border-gray-100/90 shadow-md shadow-slate-200/40 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 space-y-2.5 flex flex-col min-w-0 h-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3 className="card-title text-base font-extrabold text-slate-900 shrink-0">Today's Summary</h3>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayDate}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      {isFetching ? (
        <div className="grid grid-cols-2 gap-2.5 min-w-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-2.5 bg-slate-200 rounded w-1/2" />
              <div className="h-2.5 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 min-w-0">
          {/* Total Sales */}
          <div className="p-2.5 bg-slate-50/80 rounded-xl space-y-0.5 border border-slate-100/80 min-w-0">
            <span className="text-base font-extrabold text-slate-900 block truncate">{totalSales}</span>
            <p className="text-[11px] text-slate-500 font-medium truncate">Total Sales</p>
            {renderTrend(salesGrowth)}
          </div>

          {/* Total Bills */}
          <div className="p-2.5 bg-slate-50/80 rounded-xl space-y-0.5 border border-slate-100/80 min-w-0">
            <span className="text-base font-extrabold text-slate-900 block truncate">{totalBills}</span>
            <p className="text-[11px] text-slate-500 font-medium truncate">Total Bills</p>
            {renderTrend(billsGrowth)}
          </div>

          {/* Customers */}
          <div className="p-2.5 bg-slate-50/80 rounded-xl space-y-0.5 border border-slate-100/80 min-w-0">
            <span className="text-base font-extrabold text-slate-900 block truncate">{customersCount}</span>
            <p className="text-[11px] text-slate-500 font-medium truncate">Active Customers</p>
            {renderTrend(customerGrowth)}
          </div>

          {/* Pending Payments */}
          <div className="p-2.5 bg-slate-50/80 rounded-xl space-y-0.5 border border-slate-100/80 min-w-0">
            <span className="text-base font-extrabold text-slate-900 block truncate">{pendingPayments}</span>
            <p className="text-[11px] text-slate-500 font-medium truncate">Pending Payments</p>
            {renderTrend(pendingGrowth)}
          </div>
        </div>
      )}

      {/* Action Link */}
      <button
        type="button"
        onClick={() => navigate('/reports')}
        className="w-full py-2 px-3 text-center text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <span>View Detailed Report</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
