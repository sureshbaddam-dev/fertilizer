import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';

export default function MostSellingProducts({ onQuickAdd, showCategoryTabs = true, hasActiveSub = false }) {
  const navigate = useNavigate();
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
    <div className="space-y-4 font-sans w-full max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h2 className="section-title text-[22px] font-bold text-slate-900">
          Available Products
        </h2>
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

      {/* Product Cards Grid / Subtle Welcome Watermark Container */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,150px))] gap-2.5 sm:gap-3 justify-items-stretch sm:justify-items-start">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl bg-slate-100 animate-pulse w-full sm:w-[150px] h-[185px] sm:h-[198px] p-2 flex flex-col justify-end space-y-2 border border-slate-200/60"
            >
              <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-2.5 bg-slate-200 rounded-md w-1/2" />
              <div className="h-4 bg-slate-200 rounded-md w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,150px))] gap-2.5 sm:gap-3 justify-items-stretch sm:justify-items-start">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} onQuickAdd={onQuickAdd} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-h-[240px] sm:min-h-[300px] w-full relative flex items-center justify-center p-8 overflow-hidden">
          {/* Centered Large Bold Dark Navy Welcome Watermark Text */}
          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#0f172a] tracking-tight select-none opacity-25 text-center leading-tight">
            Welcome to VEDIXA
          </span>

          {/* Bottom-Right Subscription Button inside Available Products card */}
          {!hasActiveSub && (
            <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5">
              <button
                type="button"
                onClick={() => navigate('/subscription/plans')}
                className="px-4 py-2 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs opacity-80 hover:opacity-100 flex items-center gap-1.5"
              >
                <span>Explore Subscription Plans</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
