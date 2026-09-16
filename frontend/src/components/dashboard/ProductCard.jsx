import React from 'react';
import { Plus } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { resolveEffectiveDiscount } from '../../utils/pricing';

export default function ProductCard({ product, onQuickAdd }) {
  const prodName = product.name || 'Product';
  const brandName = product.brandId?.name || product.companyId?.name || product.brand || product.company || 'Brand';
  const unitName = product.defaultUnitId?.shortName || product.defaultUnitId?.name || product.unitId?.name || product.unit || 'Bag';
  const priceVal = Number(product.defaultSellingPrice || product.sellingPrice || product.price || 0);
  const stockVal = Number(product.totalStock ?? product.currentStock ?? product.stock ?? 0);

  // Discount resolution: Check active batch first, then product basic via centralized helper
  const activeBatch = Array.isArray(product.batches)
    ? product.batches.find((b) => Number(b.quantityRemaining ?? b.currentStock ?? 0) > 0) || product.batches[0]
    : null;

  const effDiscObj = resolveEffectiveDiscount(activeBatch, product);
  const discountVal = effDiscObj.discount;
  const discountType = effDiscObj.discountType;

  const hasDiscount = discountVal > 0;

  let discountedPrice = priceVal;
  let discountBadgeText = '';

  if (hasDiscount) {
    if (discountType === 'Percentage') {
      discountedPrice = priceVal - (priceVal * discountVal / 100);
      discountBadgeText = `${discountVal}% OFF`;
    } else {
      discountedPrice = Math.max(0, priceVal - discountVal);
      discountBadgeText = `₹${discountVal} OFF`;
    }
  }

  const rawImage = product.image || product.imageUrl || product.thumbnail;

  const handleClick = () => {
    if (onQuickAdd) {
      onQuickAdd({
        ...product,
        discountVal: hasDiscount ? discountVal : 0,
        discountType,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col justify-between rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none w-full sm:w-[150px] h-[185px] sm:h-[198px] shrink-0"
    >
      {/* Discount Badge on Top Left */}
      {hasDiscount && (
        <span className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 bg-[#047857] text-white font-extrabold text-[8.5px] rounded-full shadow-sm uppercase tracking-wider">
          {discountBadgeText}
        </span>
      )}

      {/* 1. PRODUCT IMAGE CONTAINER — EXPANDED VISUAL HERO AREA */}
      <div className="relative w-full h-[118px] sm:h-[128px] flex items-center justify-center p-1.5 bg-slate-50/80 border-b border-slate-100 overflow-hidden shrink-0">
        <ProductAvatar
          src={rawImage}
          name={prodName}
          className="w-full h-full rounded-2xl"
          textSize="text-3xl sm:text-4xl"
        />
      </div>

      {/* 2. PRODUCT DETAILS CONTAINER — COMPACT DARK NAVY BOTTOM PANEL */}
      <div className="relative flex-1 w-full bg-[#0f172a] p-2 text-white flex flex-col justify-between overflow-hidden min-w-0">
        {/* Product Name immediately above Brand Name */}
        <div className="min-w-0 pr-5 sm:pr-0">
          <h3
            className="text-[11.5px] sm:text-[12.5px] font-black text-white leading-tight truncate group-hover:text-emerald-300 transition-colors"
            title={prodName}
          >
            {prodName}
          </h3>

          <p className="text-[9px] sm:text-[9.5px] text-slate-300 font-medium truncate mt-0.5" title={brandName}>
            {brandName}
          </p>
        </div>

        {/* Price & Stock Section + Floating '+' Action Button */}
        <div className="mt-auto pt-0.5 flex items-center justify-between gap-1 pr-5 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] sm:text-[12px] font-black text-amber-300 truncate leading-none flex items-baseline gap-0.5">
              <span>₹{priceVal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
              <span className="text-[8.5px] font-normal text-slate-400">/{unitName}</span>
            </div>
            <div className="text-[8.5px] sm:text-[9px] font-bold text-emerald-400 truncate leading-none mt-0.5">
              Stock: {stockVal} {unitName}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="absolute right-1.5 bottom-1.5 w-6.5 h-6.5 rounded-full bg-[#047857] hover:bg-emerald-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 z-20"
            title="Add to Bill"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
