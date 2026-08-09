import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Sprout, ShieldAlert, Sparkles, Leaf, Grid } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';

const ICON_MAP = {
  Fertilizers: Layers,
  Seeds: Sprout,
  Pesticides: ShieldAlert,
  'Plant Growth': Sparkles,
  Organic: Leaf,
};

export default function TopCategories({ categoriesData }) {
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardService.getDashboardSummary(),
    enabled: !categoriesData,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData || apiResponse?.data?.topCategories || apiResponse?.topCategories || [];
  const isFetching = !categoriesData && isLoading;

  return (
    <div className="space-y-3">
      <h2 className="card-title">Top Categories</h2>
      {isFetching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
              <div className="space-y-1 w-full">
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat, idx) => {
            const IconComponent = ICON_MAP[cat.title] || Layers;
            const colorClass = idx % 2 === 0
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700'
              : 'bg-purple-50/80 border-purple-100 text-purple-700';

            return (
              <div
                key={cat._id || cat.title}
                className={`p-3 rounded-[18px] border ${colorClass} flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-md shadow-slate-200/30 hover:shadow-lg`}
              >
                <div className="p-2.5 rounded-xl bg-white shadow-2xs shrink-0">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{cat.title}</h3>
                  <p className="text-xs text-gray-500 font-medium truncate">{cat.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 bg-white rounded-2xl border border-gray-100 text-center text-sm text-gray-400 font-medium">
          No Categories Found
        </div>
      )}
    </div>
  );
}
