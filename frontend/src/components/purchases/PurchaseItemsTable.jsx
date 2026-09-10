import React from 'react';
import { Trash2, Edit, PackageOpen } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function PurchaseItemsTable({
  items = [],
  categories = [],
  units = [],
  onItemChange,
  onItemDelete,
  onEditProduct,
}) {
  const totalItemsCount = items.length;
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.purchaseRate || 0);
    const rawSub = qty * rate;
    const discVal = Number(item.discount !== undefined && item.discount !== '' && item.discount !== null ? item.discount : 0);
    const discType = item.discountType || 'Percentage';
    const discAmt = (discType === 'Percentage' || discType === '%')
      ? (rawSub * discVal) / 100
      : discVal;
    return sum + Math.max(0, rawSub - discAmt);
  }, 0);

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
      {/* DESKTOP PURCHASE ITEMS TABLE */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[760px]">
          <thead className="bg-[#F8FAFC] border-b border-gray-200/90 text-gray-700 font-bold text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center align-middle">#</th>
              <th className="py-2.5 px-3 min-w-[180px] text-center align-middle">Product</th>
              <th className="py-2.5 px-2 w-24 text-center align-middle">Category</th>
              <th className="py-2.5 px-2 w-16 text-center align-middle">Unit</th>
              <th className="py-2.5 px-2 w-16 text-center align-middle">Qty</th>
              <th className="py-2.5 px-2 w-28 text-center align-middle">Purchase Rate (₹)</th>
              <th className="py-2.5 px-2 w-28 text-center align-middle">Selling Price (₹)</th>
              <th className="py-2.5 px-2 w-24 text-center align-middle">Discount (%)</th>
              <th className="py-2.5 px-3 w-28 text-center align-middle">Amount (₹)</th>
              <th className="py-2.5 px-2 w-16 text-center align-middle">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const qtyVal = Number(item.quantity) || 0;
                const rateVal = Number(item.purchaseRate) || 0;
                const rawSub = qtyVal * rateVal;

                const discVal = Number(item.discount) || 0;
                const discType = item.discountType || 'Percentage';
                const discAmt = (discType === 'Percentage' || discType === '%')
                  ? (rawSub * discVal) / 100
                  : discVal;

                const lineTotal = Math.max(0, rawSub - discAmt);

                const brandName = item.product?.brandId?.name || item.product?.companyId?.name || 'Brand';
                const productName = item.product?.name || 'Product';
                const productImage = item.product?.image;

                const categoryObj = categories.find((c) => c._id === (item.categoryId || item.product?.categoryId?._id || item.product?.categoryId));
                const categoryName = categoryObj?.name || item.product?.categoryId?.name || 'Category';

                const unitObj = units.find((u) => u._id === (item.unitId || item.product?.defaultUnitId?._id || item.product?.defaultUnitId || item.product?.unitId?._id || item.product?.unitId));
                const unitName = unitObj?.shortName || unitObj?.name || item.product?.defaultUnitId?.shortName || item.product?.defaultUnitId?.name || item.product?.unitId?.name || 'Unit';

                const rawBatchStr = (item.batchNumber || item.product?.batchCode || '').toString().trim();
                const rawBatch = rawBatchStr;
                const hasBatch = Boolean(rawBatch);

                const itemSellingPrice = item.sellingPrice !== undefined
                  ? item.sellingPrice
                  : (item.product?.currentSellingPrice ?? item.product?.defaultSellingPrice ?? '');

                return (
                  <tr key={item.tempId || idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-gray-500 font-medium align-middle">
                      {idx + 1}
                    </td>

                    {/* Product */}
                    <td className="py-2.5 px-3 align-middle text-left">
                      <div className="flex items-center gap-2.5">
                        <ProductAvatar
                          src={productImage}
                          name={productName}
                          size={40}
                        />

                        <div className="flex flex-col justify-center min-w-0 space-y-0.5">
                          <span className="font-bold text-xs text-gray-900 leading-tight block truncate max-w-[180px]" title={productName}>
                            {productName}
                          </span>
                          <span className="text-[11px] font-normal text-gray-500 block truncate">
                            {brandName}
                          </span>
                          {hasBatch && (
                            <span className="text-[10px] font-normal text-gray-400 block truncate font-mono">
                              {rawBatch}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-2 text-xs text-center text-gray-700 font-normal align-middle">
                      {categoryName}
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 text-xs text-center text-gray-700 font-normal align-middle">
                      {unitName}
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-2 align-middle text-center">
                      <input
                        type="number"
                        min="1"
                        onFocus={(e) => e.target.select()}
                        value={item.quantity === 0 || item.quantity === '0' || !item.quantity ? '' : item.quantity}
                        onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                        placeholder="1"
                        className="w-14 h-7 px-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C] text-center mx-auto block"
                      />
                    </td>

                    {/* Purchase Rate (₹) */}
                    <td className="py-2.5 px-2 align-middle text-center">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={item.purchaseRate === 0 || item.purchaseRate === '0' || !item.purchaseRate ? '' : item.purchaseRate}
                        onChange={(e) => onItemChange(idx, 'purchaseRate', e.target.value)}
                        placeholder="0.00"
                        className="w-20 h-7 px-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C] text-center mx-auto block font-mono"
                      />
                    </td>

                    {/* Selling Price (₹) */}
                    <td className="py-2.5 px-2 align-middle text-center">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={itemSellingPrice === 0 || itemSellingPrice === '0' || !itemSellingPrice ? '' : itemSellingPrice}
                        onChange={(e) => onItemChange(idx, 'sellingPrice', e.target.value)}
                        placeholder="0.00"
                        className="w-20 h-7 px-1 bg-emerald-50/50 border border-emerald-300 rounded text-xs font-bold text-[#00783C] focus:outline-none focus:border-[#00783C] text-center mx-auto block font-mono"
                      />
                    </td>

                    {/* Discount (%) */}
                    <td className="py-2.5 px-2 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          onFocus={(e) => e.target.select()}
                          value={item.discount === 0 || item.discount === '0' || !item.discount ? '' : item.discount}
                          onChange={(e) => onItemChange(idx, 'discount', e.target.value)}
                          placeholder="0"
                          className="w-12 h-7 px-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-900 text-center focus:outline-none focus:border-[#00783C] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => onItemChange(idx, 'discountType', item.discountType === 'Amount' || item.discountType === '₹' ? 'Percentage' : 'Amount')}
                          className="h-7 px-1.5 bg-emerald-50 text-[#00783C] border border-emerald-200 rounded text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Toggle Discount Type (% or ₹)"
                        >
                          {item.discountType === 'Amount' || item.discountType === '₹' ? '₹' : '%'}
                        </button>
                      </div>
                    </td>

                    {/* Amount (₹) */}
                    <td className="py-2.5 px-3 text-center font-bold text-gray-900 text-xs align-middle">
                      ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {onEditProduct && item.product && (
                          <button
                            type="button"
                            onClick={() => onEditProduct(item.product)}
                            className="p-1 rounded text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors cursor-pointer"
                            title="Edit Product Master Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onItemDelete(idx)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                          title="Remove Item from Purchase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              /* EMPTY STATE MATCHING REFERENCE IMAGE */
              <tr>
                <td colSpan={10} className="py-12 text-center align-middle">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                      <PackageOpen className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">No products added yet</p>
                      <p className="text-xs text-gray-400 font-normal mt-0.5">Search and add products to create your purchase list</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE PURCHASE ITEM CARDS */}
      <div className="block md:hidden space-y-3 p-3">
        {items.length > 0 ? (
          items.map((item, idx) => {
            const qtyVal = Number(item.quantity) || 0;
            const rateVal = Number(item.purchaseRate) || 0;
            const rawSub = qtyVal * rateVal;
            const discVal = Number(item.discount) || 0;
            const discType = item.discountType || 'Percentage';
            const discAmt = (discType === 'Percentage' || discType === '%')
              ? (rawSub * discVal) / 100
              : discVal;
            const lineTotal = Math.max(0, rawSub - discAmt);

            const brandName = item.product?.brandId?.name || item.product?.companyId?.name || 'Brand';
            const productName = item.product?.name || 'Product';
            const productImage = item.product?.image;

            const categoryObj = categories.find((c) => c._id === (item.categoryId || item.product?.categoryId?._id || item.product?.categoryId));
            const categoryName = categoryObj?.name || item.product?.categoryId?.name || 'Category';

            const unitObj = units.find((u) => u._id === (item.unitId || item.product?.defaultUnitId?._id || item.product?.defaultUnitId || item.product?.unitId?._id || item.product?.unitId));
            const unitName = unitObj?.shortName || unitObj?.name || item.product?.defaultUnitId?.shortName || item.product?.defaultUnitId?.name || item.product?.unitId?.name || 'Unit';

            return (
              <div
                key={item.tempId || idx}
                className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-3 font-sans"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-2 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProductAvatar src={productImage} name={productName} size={36} />
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 text-xs block leading-tight truncate">{productName}</span>
                      <span className="text-[11px] text-gray-500 font-normal block">{brandName} • {categoryName}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onItemDelete(idx)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer shrink-0"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Editable Inputs Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-1">Qty ({unitName})</label>
                    <input
                      type="number"
                      min="1"
                      onFocus={(e) => e.target.select()}
                      value={item.quantity === 0 || item.quantity === '0' || !item.quantity ? '' : item.quantity}
                      onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                      placeholder="1"
                      className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#00783C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      onFocus={(e) => e.target.select()}
                      value={item.purchaseRate === 0 || item.purchaseRate === '0' || !item.purchaseRate ? '' : item.purchaseRate}
                      onChange={(e) => onItemChange(idx, 'purchaseRate', e.target.value)}
                      placeholder="0.00"
                      className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#00783C]"
                    />
                  </div>
                </div>

                {/* Item Line Total */}
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between font-mono">
                  <span className="text-[10px] text-gray-400 font-bold uppercase font-sans">Line Total</span>
                  <span className="text-xs font-bold text-[#00783C]">
                    ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
            No products added yet
          </div>
        )}
      </div>

      {/* Table Footer Summary Row */}
      <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-gray-200/80 flex items-center justify-between text-xs font-semibold text-gray-700">
        <div>
          Total Items: <span className="text-[#00783C] font-bold ml-1">{totalItemsCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Total Amount:</span>
          <span className="text-xs sm:text-sm font-bold text-[#00783C]">
            ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
