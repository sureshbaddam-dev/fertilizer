import React from 'react';
import { Filter, Search } from 'lucide-react';

export default function ProductsHeaderBar({
  activeTab = 'All Products',
  onTabChange,
  categories = [],
  filterCounts = {},
  searchQuery = '',
  onSearchChange,
  onOpenFilterModal,
}) {
  const categoryMap = new Map();

  // 1. Populate from authenticated user's master categories (preserves clean display name)
  if (Array.isArray(categories)) {
    categories.forEach((c) => {
      const name = typeof c === 'string' ? c : c?.name || c?.title;
      if (name && name.trim()) {
        const key = name.trim().toLowerCase();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, name.trim());
        }
      }
    });
  }

  // 2. Populate any extra categories present in filterCounts case-insensitively
  Object.keys(filterCounts).forEach((k) => {
    if (k && k !== 'all' && k.toLowerCase() !== 'all products') {
      const key = k.trim().toLowerCase();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, k.trim());
      }
    }
  });

  const uniqueCategoryNames = Array.from(categoryMap.values());
  const allCategoryKeys = ['All Products', ...uniqueCategoryNames];

  // Helper to sum count for a category case-insensitively
  const getCategoryCount = (displayName) => {
    if (displayName === 'All Products') {
      return filterCounts['all'] || filterCounts['All Products'] || 0;
    }
    const targetKey = displayName.trim().toLowerCase();
    let total = 0;
    Object.keys(filterCounts).forEach((k) => {
      if (k.trim().toLowerCase() === targetKey) {
        total += Number(filterCounts[k]) || 0;
      }
    });
    return total;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 mb-2 w-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar w-full sm:w-auto">
        {allCategoryKeys.map((catKey) => {
          const count = getCategoryCount(catKey);
          const isActive = activeTab.trim().toLowerCase() === catKey.trim().toLowerCase();
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onTabChange && onTabChange(catKey)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'btn-agri-primary shadow-2xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{catKey}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-[#005C3A] text-emerald-100' : 'bg-gray-100 text-gray-600'
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Button & Search Input */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <button
          type="button"
          onClick={onOpenFilterModal}
          className="h-10 px-3.5 btn-agri-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Filter className="w-4 h-4 text-[#047857]" />
          <span>Filter</span>
        </button>

        <div className="relative flex-1 sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00783C] placeholder:text-gray-400 leading-normal"
          />
        </div>
      </div>
    </div>
  );
}
