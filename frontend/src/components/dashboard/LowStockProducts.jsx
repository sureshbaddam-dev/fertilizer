import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ProductAvatar from '../ui/ProductAvatar';
import { dashboardService } from '../../services/dashboardService';

export default function LowStockProducts({ productsData }) {
  const navigate = useNavigate();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getDashboardSummary(),
    enabled: !productsData,
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData || apiResponse?.data?.lowStockProducts || apiResponse?.lowStockProducts || [];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-[18px] border border-gray-100/90 shadow-md shadow-slate-200/40 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 space-y-2.5 flex flex-col min-w-0 h-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h3 className="card-title text-base font-bold text-slate-900 shrink-0">Low Stock Products</h3>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
        >
          View All
        </button>
      </div>

      {/* Items */}
      {isLoading && !productsData ? (
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl border border-gray-100 bg-gray-50 animate-pulse">
              <div className="flex items-center gap-2 w-2/3">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1 w-full">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 w-14 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-1.5 text-xs">
          {products.map((item) => (
            <div
              key={item._id || item.name}
              className="flex items-center justify-between p-2 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
              onClick={() => navigate('/products')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ProductAvatar src={item.image || item.imageUrl || item.productPicUrl} name={item.name} size={32} />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-gray-900 block leading-tight truncate text-xs">{item.name}</span>
                  <span className="text-[11px] text-gray-500 font-medium block truncate">{item.stock}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.tagColor}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center text-sm text-emerald-700 bg-emerald-50/50 rounded-xl font-medium">
          No Low Stock Products
        </div>
      )}
    </div>
  );
}
