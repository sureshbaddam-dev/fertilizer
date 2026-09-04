import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';

export default function RecentBills({ billsData }) {
  const navigate = useNavigate();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => dashboardService.getDashboardOverview(),
    enabled: !billsData,
    staleTime: 5 * 60 * 1000,
  });

  const bills = billsData || apiResponse?.data?.recentBills || apiResponse?.recentBills || [];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-[18px] border border-gray-100/90 shadow-md shadow-slate-200/40 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 space-y-2.5 flex flex-col min-w-0 h-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3 className="card-title text-base font-bold text-slate-900 shrink-0">Recent Bills</h3>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
        >
          View All
        </button>
      </div>

      {/* Rows */}
      {isLoading && !billsData ? (
        <div className="space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 animate-pulse border border-gray-100">
              <div className="space-y-1 w-1/2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="space-y-1 w-1/3 flex flex-col items-end">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : bills.length > 0 ? (
        <div className="space-y-1.5 text-xs">
          {bills.map((bill) => (
            <div
              key={bill.id || bill._id}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 cursor-pointer min-w-0 gap-2"
              onClick={() => navigate('/invoices')}
            >
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-gray-900 block text-xs truncate">{bill.name || bill.customerName || 'General Customer'}</span>
                <span className="text-[11px] text-gray-500 font-medium block truncate">{bill.id || bill.invoiceNumber}</span>
              </div>
              <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                <span className="font-extrabold text-gray-900 block text-xs truncate">{bill.amount}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${bill.color} shrink-0`}>
                  {bill.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-gray-400 bg-gray-50/50 rounded-xl border border-gray-100 font-medium">
          No recent bills
        </div>
      )}
    </div>
  );
}
