import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function AddProductSearchRow({
  products = [],
  onSelectProduct,
  onOpenAddProduct,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = searchQuery.trim().toLowerCase();

  // Build searchable items list (Each Product or Product + Batch is an individual searchable item)
  const searchableItems = [];

  products.forEach((p) => {
    const brandName = p.brandId?.name || p.companyId?.name || p.brand || p.company || 'Brand';
    const categoryName = p.categoryId?.name || p.category || 'Category';

    // Extract all batches for product p
    const batchList = Array.isArray(p.batches)
      ? p.batches
      : p.batchCode || p.batchNumber
      ? [{ batchNumber: p.batchCode || p.batchNumber }]
      : [];

    const validBatches = [];
    const seenBatches = new Set();

    batchList.forEach((b) => {
      const bCode = (b.batchNumber || b.batchCode || '').toString().trim();
      const isAutoBatch = bCode.toUpperCase().startsWith('BATCH-') || bCode.toUpperCase().startsWith('AUTO');
      if (bCode && !isAutoBatch && !seenBatches.has(bCode.toLowerCase())) {
        seenBatches.add(bCode.toLowerCase());
        validBatches.push(bCode);
      }
    });

    if (validBatches.length > 0) {
      // Create separate searchable item for each Batch
      validBatches.forEach((bCode) => {
        searchableItems.push({
          id: `${p._id || p.id}-batch-${bCode}`,
          product: p,
          batchCode: bCode,
          productName: p.name,
          brandName,
          categoryName,
          hasBatch: true,
          searchStr: `${p.name} ${bCode} ${brandName} ${categoryName}`.toLowerCase(),
        });
      });
    } else {
      // Create item for Product WITHOUT batch
      searchableItems.push({
        id: `${p._id || p.id}-nobatch`,
        product: p,
        batchCode: '',
        productName: p.name,
        brandName,
        categoryName,
        hasBatch: false,
        searchStr: `${p.name} ${brandName} ${categoryName}`.toLowerCase(),
      });
    }
  });

  // Filter items matching the search query
  const filteredSuggestions = query
    ? searchableItems.filter((item) => item.searchStr.includes(query))
    : searchableItems;

  const showCreateOption =
    query.length > 0 &&
    !products.some((p) => p.name.toLowerCase() === query);

  const handleSelectOption = (option) => {
    onSelectProduct({
      ...option.product,
      batchCode: option.batchCode || '',
      batchNumber: option.batchCode || '',
    });
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-2">
        <span className="w-4 h-4 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[10px] font-medium">
          2
        </span>
        <h2 className="text-[15px] font-medium text-gray-900">Add Products</h2>
      </div>

      {/* Product Search & Create Product Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Search Product Input */}
        <div ref={dropdownRef} className="md:col-span-9 relative">
          <label className="text-[12px] font-medium text-gray-700 block mb-1">Search Product *</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search product by name, batch, brand, category..."
              className="w-full h-8 pl-8 pr-7 bg-gray-50/50 border border-gray-300 rounded-lg text-[12px] text-gray-900 font-normal focus:outline-none focus:ring-1 focus:ring-[#00783C]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Typeahead Suggestions Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1 space-y-0.5 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    className="p-2 hover:bg-emerald-50/70 rounded-md flex items-center justify-between cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProductAvatar src={opt.product.image} name={opt.productName} size={36} />
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[12px] font-semibold text-gray-900 block leading-tight">
                          {opt.productName}
                        </span>
                        <span className="text-[11px] font-normal text-gray-500 block truncate">
                          {opt.brandName} • {opt.categoryName}
                        </span>
                        {opt.hasBatch && (
                          <span className="text-[10px] font-normal text-gray-500 block truncate font-mono">
                            {opt.batchCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] rounded shrink-0 transition-colors">
                      + Add
                    </span>
                  </div>
                ))
              ) : !showCreateOption ? (
                <div className="p-2.5 text-center text-gray-400 text-[12px]">No matching products found</div>
              ) : null}

              {/* Inline Create Option */}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAddProduct(searchQuery.trim());
                  }}
                  className="w-full p-2 bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-md text-[#047857] font-medium text-[12px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#047857]" />
                  <span>Create new product "{searchQuery.trim()}"</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create New Product Button */}
        <div className="md:col-span-3 pt-5">
          <button
            type="button"
            onClick={() => onOpenAddProduct()}
            className="w-full h-8 px-2.5 text-[12px] font-semibold btn-agri-secondary rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Product</span>
          </button>
        </div>

      </div>
    </div>
  );
}
