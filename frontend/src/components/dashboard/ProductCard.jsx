import React, { useState } from 'react';
import { Plus, Sprout, ImageOff } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

export default function ProductCard({ product, onQuickAdd }) {
  const prodName = product.name || 'Product';
  const brandName = product.brandId?.name || product.companyId?.name || product.brand || product.company || 'Brand';
  const unitName = product.defaultUnitId?.shortName || product.defaultUnitId?.name || product.unitId?.name || product.unit || 'Bag';
  const priceVal = Number(product.defaultSellingPrice || product.sellingPrice || product.price || 0);
  const stockVal = Number(product.totalStock ?? product.currentStock ?? product.stock ?? 0);

  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const rawImage = product.image || product.imageUrl || product.thumbnail;
  const resolvedImageUrl = getImageUrl(rawImage);

  const handleClick = () => {
    if (onQuickAdd) {
      onQuickAdd(product);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-row sm:flex-col justify-between rounded-[20px] overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none w-full h-[115px] sm:w-[175px] sm:h-[225px] shrink-0"
    >
      {/* 1. IMAGE CONTAINER: Left on Mobile (w-[105px] h-full), Top on Desktop (w-full h-[120px]) */}
      <div className="relative w-[105px] h-full sm:w-full sm:h-[120px] flex items-center justify-center p-2 bg-[#f8fafc] border-r sm:border-r-0 sm:border-b border-slate-100 overflow-hidden shrink-0">
        {!isImageLoaded && !hasImageError && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin opacity-40" />
          </div>
        )}

        {hasImageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 text-emerald-800">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-0.5 sm:mb-1 shadow-2xs group-hover:scale-105 transition-transform">
              <Sprout className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-emerald-700" />
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">No Image</span>
          </div>
        ) : (
          <img
            src={resolvedImageUrl}
            alt={prodName}
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setHasImageError(true);
              setIsImageLoaded(true);
            }}
            className={`max-h-full max-w-full object-contain object-center transition-transform duration-300 group-hover:scale-105 p-0.5 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>

      {/* 2. PRODUCT DETAILS: Right on Mobile, Bottom on Desktop */}
      <div className="relative flex-1 h-full w-full bg-gradient-to-b from-slate-900 via-gray-950 to-black p-2.5 sm:p-2.5 text-white flex flex-col justify-between overflow-hidden min-w-0">
        <div className="min-w-0 space-y-0.5 pr-6 sm:pr-0">
          {/* Product Name (Max 2 lines) */}
          <h3
            className="text-[12px] sm:text-[13px] font-extrabold text-white leading-tight line-clamp-2 drop-shadow-sm group-hover:text-emerald-300 transition-colors"
            title={prodName}
          >
            {prodName}
          </h3>

          {/* Company Name (1 line, truncate) */}
          <p className="text-[10px] sm:text-[11px] text-gray-300 font-medium truncate drop-shadow-xs" title={brandName}>
            {brandName}
          </p>
        </div>

        {/* Selling Price & Current Stock + Floating '+' Action Button in Bottom-Right */}
        <div className="mt-auto pt-1 flex items-end justify-between gap-1 pr-7 min-w-0 border-t border-white/10">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] sm:text-[13px] font-black text-amber-300 truncate leading-none drop-shadow-xs">
              ₹ {priceVal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              <span className="text-[9px] sm:text-[10px] font-normal text-gray-300">/{unitName}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-300 truncate leading-tight mt-0.5">
              Stock: {stockVal} {unitName}
            </p>
          </div>

          {/* (+) Button inside bottom-right corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-[#047857] hover:bg-emerald-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 z-20"
            title="Add to Bill"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}

