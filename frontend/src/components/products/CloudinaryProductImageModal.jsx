import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Image as ImageIcon, Check, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { productService } from '../../services/productService';
import useDebounce from '../../hooks/useDebounce';

export default function CloudinaryProductImageModal({
  isOpen,
  onClose,
  initialQuery = '',
  brand = '',
  category = '',
  onSelectImage,
}) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Sync initial query when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Fetch images from Cloudinary shared product images
  const {
    data: libraryData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cloudinary-product-images-search', debouncedSearch, brand, category],
    queryFn: () => productService.searchCloudinaryProductImages({ query: debouncedSearch, brand, category, limit: 24 }),
    enabled: Boolean(isOpen),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  if (!isOpen) return null;

  const images = libraryData?.data?.images || libraryData?.images || [];
  const totalResults = libraryData?.data?.total ?? libraryData?.total ?? images.length;

  const handleSelect = (img) => {
    onSelectImage({
      imageUrl: img.imageUrl || img.secureUrl,
      secureUrl: img.secureUrl || img.imageUrl,
      cloudinaryPublicId: img.cloudinaryPublicId || img.publicId,
      publicId: img.publicId || img.cloudinaryPublicId,
      displayName: img.displayName || img.searchableName || img.productName || '',
      searchableName: img.searchableName || img.displayName || img.productName || '',
      productName: img.productName || (img.displayName !== img.publicId ? img.displayName : ''),
      brand: img.brand || '',
      category: img.category || '',
      unit: img.unit || '',
      sha256: img.sha256 || '',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 p-5 space-y-4 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-gray-900 font-extrabold">Shared Product Images</span>
              <span className="block text-[10px] text-gray-500 font-normal">
                Browse and reuse product images directly from Cloudinary
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product image library by name, brand, or formula (e.g. Nano, Gromor, Urea, 20-20-0)..."
            className="w-full h-9 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C] focus:bg-white transition-all"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
          <span>
            {isLoading
              ? 'Searching library...'
              : isError
              ? 'Error loading images'
              : `Found ${totalResults} matching image${totalResults === 1 ? '' : 's'}`}
          </span>
          {isFetching && !isLoading && (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" /> Updating...
            </span>
          )}
        </div>

        {/* Results Grid */}
        <div className="min-h-[260px] max-h-[360px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#00783C]" />
              <span className="text-xs font-semibold">Loading shared images...</span>
            </div>
          ) : isError ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2.5 text-red-500">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-xs font-semibold text-gray-800">Failed to load shared images</p>
              <p className="text-[11px] text-gray-500 max-w-xs text-center">
                {error?.message || 'An unexpected API error occurred. Please try again.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Search</span>
              </button>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => {
                const displayName = img.displayName || img.searchableName || img.productName || 'Unnamed Product Image';
                return (
                  <div
                    key={img._id || img.cloudinaryPublicId}
                    onClick={() => handleSelect(img)}
                    className="group relative bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 hover:border-emerald-500 rounded-xl p-2 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="aspect-square w-full rounded-lg bg-white border border-gray-100 overflow-hidden flex items-center justify-center mb-1.5 p-1 relative">
                      <img
                        src={img.imageUrl}
                        alt={displayName}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-bold text-gray-900 text-[11px] truncate leading-tight group-hover:text-emerald-800" title={displayName}>
                        {displayName}
                      </h4>
                      {img.brand && (
                        <span className="inline-block px-1.5 py-0.5 bg-gray-200/70 text-gray-700 text-[9px] font-semibold rounded truncate max-w-full">
                          {img.brand}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full mt-2 py-1 bg-white group-hover:bg-[#00783C] text-gray-700 group-hover:text-white border border-gray-200 group-hover:border-[#00783C] rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Select Image</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImageIcon className="w-10 h-10 text-gray-300 stroke-1" />
              <p className="text-xs font-semibold text-gray-700">No shared images found</p>
              <p className="text-[11px] text-gray-400 text-center max-w-xs">
                No matching product images found in the shared library for "{debouncedSearch || 'your search'}". Upload a new image to add it to the library.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[11px]">
          <span>Selecting an existing image avoids duplicate Cloudinary uploads</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
