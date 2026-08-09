import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from './ProductCard';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';

export default function MostSellingProducts({ onQuickAdd, showCategoryTabs = true }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch all Category Master items dynamically from MongoDB
  const { data: categoryData } = useQuery({
    queryKey: ['master-categories-tabs'],
    queryFn: () => masterService.getCategories({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
  });

  const categoryTabs = useMemo(() => {
    const rawList = categoryData?.data?.categories || categoryData?.categories || [];
    const names = rawList.map((c) => c.name).filter(Boolean);
    return ['All', ...names];
  }, [categoryData]);

  // Fetch all active products dynamically from MongoDB
  const { data: productData, isLoading } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => productService.getProducts({ isActive: 'true', inStock: 'true' }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allProducts = useMemo(
    () => productData?.data?.products || [],
    [productData?.data?.products]
  );

  // Filter by Category if tab selected
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return allProducts;
    return allProducts.filter((p) => {
      const catName = p.categoryId?.name || p.category || '';
      return catName.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
    });
  }, [allProducts, selectedCategory]);

  return (
    <div className="space-y-4 font-sans">
      {/* Header Bar (Fire Icon Removed) */}
      <div className="flex items-center justify-between">
        <h2 className="section-title text-[22px] font-bold text-slate-900">
          Top Selling &amp; Available Products
        </h2>
        <span className="helper-text text-[14px] text-slate-500 font-medium hidden sm:inline">
          Click any card to add to bill
        </span>
      </div>

      {/* Dynamic Category Filter Pills from Category Master */}
      {showCategoryTabs && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 sm:px-7 sm:py-2.5 text-[14px] sm:text-[15px] font-semibold rounded-full transition-all duration-200 shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#047857] text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Compact Product Cards Grid (Horizontal on mobile, vertical 175px on desktop) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(170px,180px))] gap-3 justify-items-stretch sm:justify-items-start">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] bg-slate-100 animate-pulse w-full h-[115px] sm:w-[175px] sm:h-[225px] p-3 flex flex-col justify-end space-y-2 border border-slate-200/60"
            >
              <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-2.5 bg-slate-200 rounded-md w-1/2" />
              <div className="h-4 bg-slate-200 rounded-md w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(170px,180px))] gap-3 justify-items-stretch sm:justify-items-start">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} onQuickAdd={onQuickAdd} />
          ))}
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-gray-200/80 text-center space-y-1 shadow-2xs">
          <p className="text-sm font-bold text-gray-700">No Products Found</p>
          <p className="text-xs text-gray-400 font-medium">No available products found matching category filter in database.</p>
        </div>
      )}
    </div>
  );
}

