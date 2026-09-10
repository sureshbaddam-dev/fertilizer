import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ScanLine } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function AddProductSearchRow({
  products = [],
  onSelectProduct,
  onOpenAddProduct,
  onScanBarcode,
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
    <div className="space-y-3.5">
      {/* Section Header with Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-2xs">
            2
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 leading-tight">Add Products</h2>
            <p className="text-[12px] text-gray-500 font-normal mt-0.5">Search and add products to this purchase</p>
          </div>
        </div>

        {/* Action Buttons: Scan Barcode & + Create Product */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onScanBarcode || (() => dropdownRef.current?.querySelector('input')?.focus())}
            className="h-[34px] px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ScanLine className="w-3.5 h-3.5 text-gray-500" />
            <span>Scan Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAddProduct()}
            className="h-[34px] px-3.5 bg-[#00783C] hover:bg-[#006030] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Product</span>
          </button>
        </div>
      </div>

      {/* Full-Width Search Product Input */}
      <div ref={dropdownRef} className="relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search product by name, batch, brand, category..."
            className="w-full h-[38px] pl-9 pr-8 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 font-normal placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00783C] focus:border-[#00783C] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Typeahead Suggestions Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 max-h-64 overflow-y-auto animate-in fade-in duration-100">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(opt)}
                  className="p-2 hover:bg-emerald-50/70 rounded-lg flex items-center justify-between cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductAvatar src={opt.product.image} name={opt.productName} size={36} />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-xs font-bold text-gray-900 block leading-tight">
                        {opt.productName}
                      </span>
                      <span className="text-[11px] font-normal text-gray-500 block truncate">
                        {opt.brandName} • {opt.categoryName}
                      </span>
                      {opt.hasBatch && (
                        <span className="text-[10px] font-normal text-gray-500 block truncate font-mono">
                          Batch: {opt.batchCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold text-[#00783C] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] rounded-md shrink-0 transition-colors">
                    + Add
                  </span>
                </div>
              ))
            ) : !showCreateOption ? (
              <div className="p-3 text-center text-gray-400 text-xs">No matching products found</div>
            ) : null}

            {/* Inline Create Option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddProduct(searchQuery.trim());
                }}
                className="w-full p-2.5 bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg text-[#00783C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#00783C]" />
                <span>Create new product "{searchQuery.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
