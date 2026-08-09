import React from 'react';
import { Filter, Search } from 'lucide-react';

export default function ProductsHeaderBar({
  activeTab = 'All Products',
  onTabChange,
  filterCounts = {},
  searchQuery = '',
  onSearchChange,
  onOpenFilterModal,
}) {
  const defaultCategories = ['All Products', 'Fertilizers', 'Seeds', 'Pesticides', 'Plant Growth', 'Others'];
  
  const allCategoryKeys = Array.from(
    new Set([...defaultCategories, ...Object.keys(filterCounts)])
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 w-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
        {allCategoryKeys.map((catKey) => {
          const count = filterCounts[catKey] || 0;
          const isActive = activeTab === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onTabChange && onTabChange(catKey)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'btn-agri-primary shadow-2xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{catKey}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenFilterModal}
          className="h-12 min-h-[48px] px-4 btn-agri-secondary rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Filter className="w-4 h-4 text-[#047857]" />
          <span>Filter</span>
        </button>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search in products..."
            className="w-48 sm:w-64 h-12 min-h-[48px] pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00783C] placeholder:text-gray-400 leading-normal"
          />
        </div>
      </div>
    </div>
  );
}
