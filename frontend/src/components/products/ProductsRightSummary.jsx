import React from 'react';
import { Package, PieChart, AlertTriangle, Zap, Plus, FileText, Layers } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { getAgriCategoryColor } from '../../theme/agriTheme';

export default function ProductsRightSummary({
  summaryStats = {
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  },
  categoryDistribution = [],
  lowStockItems = [],
  onOpenAddProduct,
  onNavigateStockEntry,
  onNavigateLowStockReport,
  onNavigateCategories,
}) {
  // DYNAMIC SVG DONUT SLICE & LEGEND SYNCHRONIZATION
  const distribution = Array.isArray(categoryDistribution) && categoryDistribution.length > 0
    ? categoryDistribution
    : [
        { name: 'Fertilizers', count: 0, percentage: '0%', numericPct: 0, color: '#00783C' },
      ];

  let cumulativePct = 0;
  const svgSlices = distribution.map((item) => {
    const rawName = item.name || item.label || 'Others';
    const count = Number(item.count) || 0;
    const numericPct = typeof item.numericPct === 'number'
      ? item.numericPct
      : parseFloat(item.percentage) || 0;
    const offset = cumulativePct;
    cumulativePct += numericPct;
    const color = item.color || getAgriCategoryColor(rawName);

    return {
      name: rawName,
      count,
      percentage: `${numericPct}%`,
      numericPct,
      offset: -offset,
      color,
    };
  });

  return (
    <div className="space-y-3 w-full">
      {/* 1. Product Summary Card */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs border-b border-gray-100 pb-2">
          <div className="w-4.5 h-4.5 rounded bg-emerald-50 text-[#047857] flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
          <span>Product Summary</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between py-0.5 text-gray-600">
            <span>Total Products</span>
            <span className="font-bold text-gray-900 text-xs font-mono">{summaryStats.totalProducts}</span>
          </div>

          <div className="flex items-center justify-between py-0.5 text-gray-600">
            <span>Active Products</span>
            <span className="font-bold text-[#047857] text-xs font-mono">{summaryStats.activeProducts}</span>
          </div>

          <div className="flex items-center justify-between py-0.5 text-gray-600">
            <span>Low Stock Products</span>
            <span className="font-bold text-amber-600 text-xs font-mono">{summaryStats.lowStockProducts}</span>
          </div>

          <div className="flex items-center justify-between py-0.5 text-gray-600">
            <span>Out of Stock Products</span>
            <span className="font-bold text-red-600 text-xs font-mono">{summaryStats.outOfStockProducts}</span>
          </div>
        </div>
      </div>

      {/* 2. Category Count / Distribution Card */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-sm space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-2">
          <div className="w-5 h-5 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <span>Category Count</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Donut Chart */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 36 36"
              className="w-full h-full -rotate-90"
            >
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F3F4F6"
                strokeWidth="3.8"
              />

              {svgSlices.map((slice, idx) => (
                <path
                  key={idx}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="4"
                  strokeDasharray={`${slice.numericPct}, 100`}
                  strokeDashoffset={slice.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-gray-900 leading-none">
                {summaryStats.totalProducts}
              </span>

              <span className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">
                Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {svgSlices.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  <span className="truncate text-[11px] font-medium text-gray-700">
                    {item.name}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-gray-900 font-mono shrink-0 ml-2">
                  {item.count} ({item.percentage})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Low Stock Products Card */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs">
            <div className="w-4.5 h-4.5 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span>Low Stock Products</span>
          </div>
          <button
            type="button"
            onClick={onNavigateLowStockReport}
            className="text-[10px] font-medium text-[#047857] hover:text-[#00783C] flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {lowStockItems.length > 0 ? (
            lowStockItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ProductAvatar src={item.image} name={item.name} size={26} />
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900 text-[10px] block truncate max-w-[100px]">{item.name}</span>
                    <span className="text-[8px] text-gray-400 block truncate">Alert Below: {item.alertBelow}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold font-mono shrink-0 ${item.color}`}>{item.qty}</span>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-gray-400 text-center py-1">No low stock items</div>
          )}
        </div>
      </div>

      {/* 4. Quick Actions Card */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs border-b border-gray-100 pb-2">
          <div className="w-4.5 h-4.5 rounded bg-emerald-50 text-[#047857] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span>Quick Actions</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="p-1.5 btn-agri-secondary rounded-lg flex items-center gap-1.5 transition-all text-left cursor-pointer"
          >
            <div className="w-4.5 h-4.5 rounded-full bg-agri-primary text-white flex items-center justify-center shrink-0">
              <Plus className="w-2.5 h-2.5" />
            </div>
            <span className="font-semibold text-[9px] leading-tight">Add Product</span>
          </button>

          <button
            type="button"
            onClick={onNavigateStockEntry}
            className="p-1.5 btn-agri-secondary rounded-lg flex items-center gap-1.5 transition-all text-left cursor-pointer"
          >
            <div className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-2.5 h-2.5" />
            </div>
            <span className="font-semibold text-[9px] leading-tight">Stock Entry</span>
          </button>

          <button
            type="button"
            onClick={onNavigateLowStockReport}
            className="p-1.5 btn-agri-secondary rounded-lg flex items-center gap-1.5 transition-all text-left cursor-pointer"
          >
            <div className="w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
            </div>
            <span className="font-semibold text-[9px] leading-tight">Low Stock Report</span>
          </button>

          <button
            type="button"
            onClick={onNavigateCategories}
            className="p-1.5 btn-agri-secondary rounded-lg flex items-center gap-1.5 transition-all text-left cursor-pointer"
          >
            <div className="w-4.5 h-4.5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Layers className="w-2.5 h-2.5" />
            </div>
            <span className="font-semibold text-[9px] leading-tight">Product Categories</span>
          </button>
        </div>
      </div>
    </div>
  );
}
