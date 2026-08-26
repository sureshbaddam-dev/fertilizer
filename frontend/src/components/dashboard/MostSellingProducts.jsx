import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw } from 'lucide-react';
import ProductCard from './ProductCard';
import { productService } from '../../services/productService';
import { masterService } from '../../services/masterService';

export default function MostSellingProducts({ onQuickAdd, hasActiveSub = false }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Category Master items dynamically from API
  const { data: categoryData } = useQuery({
    queryKey: ['master-categories-filter'],
    queryFn: () => masterService.getCategories({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
  });

  const categoryList = useMemo(() => {
    const rawList = categoryData?.data?.categories || categoryData?.categories || [];
    return Array.isArray(rawList) ? rawList : [];
  }, [categoryData]);

  // Fetch Brand Master items dynamically from API
  const { data: brandData } = useQuery({
    queryKey: ['master-brands-filter'],
    queryFn: () => masterService.getBrands({ isActive: 'true' }),
    staleTime: 5 * 60 * 1000,
  });

  const brandList = useMemo(() => {
    const rawList = brandData?.data?.brands || brandData?.brands || brandData?.data?.companies || brandData?.companies || [];
    return Array.isArray(rawList) ? rawList : [];
  }, [brandData]);

  // Fetch complete active available inventory dynamically from backend API (untruncated)
  const { data: productData, isLoading } = useQuery({
    queryKey: ['dashboard-products', selectedCategory, selectedBrand, searchQuery],
    queryFn: () =>
      productService.getProducts({
        isActive: 'true',
        inStock: 'true',
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        brand: selectedBrand !== 'ALL' ? selectedBrand : undefined,
        search: searchQuery.trim() || undefined,
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const allProducts = useMemo(
    () => productData?.data?.products || productData?.products || [],
    [productData]
  );

  // Multi-Filter (Category + Brand + Search Query)
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL') {
        const catName = p.categoryId?.name || p.category || '';
        const catId = p.categoryId?._id || p.categoryId || '';
        const isCatMatch =
          catName.toLowerCase().trim() === selectedCategory.toLowerCase().trim() ||
          catId === selectedCategory;
        if (!isCatMatch) return false;
      }

      // 2. Brand Filter
      if (selectedBrand !== 'ALL') {
        const brandName = p.brandId?.name || p.companyId?.name || p.brand || p.company || '';
        const brandId = p.brandId?._id || p.companyId?._id || p.brandId || '';
        const isBrandMatch =
          brandName.toLowerCase().trim() === selectedBrand.toLowerCase().trim() ||
          brandId === selectedBrand;
        if (!isBrandMatch) return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (p.name || '').toLowerCase();
        const pCode = (p.code || '').toLowerCase();
        const pBarcode = (p.barcode || '').toLowerCase();
        const pBrand = (p.brandId?.name || p.companyId?.name || p.brand || p.company || '').toLowerCase();
        const pCat = (p.categoryId?.name || p.category || '').toLowerCase();

        const isSearchMatch =
          pName.includes(q) ||
          pCode.includes(q) ||
          pBarcode.includes(q) ||
          pBrand.includes(q) ||
          pCat.includes(q);

        if (!isSearchMatch) return false;
      }

      return true;
    });
  }, [allProducts, selectedCategory, selectedBrand, searchQuery]);

  const hasActiveFilters = selectedCategory !== 'ALL' || selectedBrand !== 'ALL' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 font-sans w-full max-w-full">
      {/* Header & Filter Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="section-title text-[20px] sm:text-[22px] font-bold text-slate-900 shrink-0">
          Available Products
        </h2>

        {/* Clean Compact Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="relative flex-1 sm:w-44 md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs transition cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categoryList.map((cat) => (
                <option key={cat._id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Brand Dropdown */}
          <div className="relative flex-1 sm:w-44 md:w-48">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs transition cursor-pointer"
            >
              <option value="ALL">All Brands</option>
              {brandList.map((brand) => (
                <option key={brand._id || brand.name} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Search Products Bar */}
          <div className="relative flex-1 sm:w-52 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-8 pr-7 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset Filters Button (Visible when filters applied) */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              title="Reset all filters"
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Cards Grid / Empty State Container */}
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
        <div className="max-h-[560px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,150px))] gap-2.5 sm:gap-3 justify-items-stretch sm:justify-items-start">
            {filteredProducts.map((product) => (
              <ProductCard key={product._id} product={product} onQuickAdd={onQuickAdd} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-h-[240px] sm:min-h-[280px] w-full relative flex flex-col items-center justify-center p-8 overflow-hidden">
          {hasActiveFilters ? (
            <div className="text-center space-y-3 z-10">
              <p className="text-slate-500 font-bold text-sm">No products found matching your filter criteria.</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#0f172a] tracking-tight select-none opacity-25 text-center leading-tight">
              Welcome to VEDIXA
            </span>
          )}

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
