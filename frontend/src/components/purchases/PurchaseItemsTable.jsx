import React from 'react';
import { Trash2, Edit, Package } from 'lucide-react';
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
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchaseRate || 0)), 0);

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
      {/* DESKTOP PURCHASE ITEMS TABLE */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-[12px] border-collapse min-w-[700px]">
          <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-medium uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3 min-w-[220px] text-left align-middle">Product</th>
              <th className="py-2.5 px-2 w-20 text-center align-middle">Category</th>
              <th className="py-2.5 px-2 w-14 text-center align-middle">Unit</th>
              <th className="py-2.5 px-2 w-16 text-center align-middle">Qty</th>
              <th className="py-2.5 px-2 w-24 text-center align-middle">Purchase Rate</th>
              <th className="py-2.5 px-2 w-24 text-center align-middle">Selling Price</th>
              <th className="py-2.5 px-2 w-28 text-center align-middle">Discount</th>
              <th className="py-2.5 px-3 w-28 text-center align-middle">Amount</th>
              <th className="py-2.5 px-2 w-16 text-center align-middle">Action</th>
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
                  <tr key={item.tempId || idx} className="hover:bg-slate-50/60 transition-colors">
                    {/* 1. PRODUCT INFORMATION COLUMN */}
                    <td className="py-2 px-3 align-middle text-left">
                      <div className="flex items-center gap-3">
                        <ProductAvatar
                          src={productImage}
                          name={productName}
                          size={60}
                        />

                        <div className="flex flex-col justify-center min-w-0 space-y-0.5 min-h-[60px]">
                          <span className="font-semibold text-[13px] text-gray-900 leading-tight block truncate max-w-[190px]" title={productName}>
                            {productName}
                          </span>
                          <span className="text-[11px] font-normal text-gray-500 block truncate">
                            {brandName}
                          </span>
                          {hasBatch && (
                            <span className="text-[11px] font-normal text-gray-500 block truncate font-mono">
                              {rawBatch}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. CATEGORY */}
                    <td className="py-2 px-2 text-[12px] text-center text-gray-700 font-normal align-middle">
                      {categoryName}
                    </td>

                    {/* 3. UNIT */}
                    <td className="py-2 px-2 text-[12px] text-center text-gray-700 font-normal align-middle">
                      {unitName}
                    </td>

                    {/* 4. QTY */}
                    <td className="py-2 px-2 align-middle text-center">
                      <input
                        type="number"
                        min="1"
                        onFocus={(e) => e.target.select()}
                        value={item.quantity === 0 || item.quantity === '0' || !item.quantity ? '' : item.quantity}
                        onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                        placeholder="1"
                        className="w-14 h-7 px-1 bg-white border border-gray-300 rounded text-[11px] font-medium text-gray-900 focus:outline-none focus:border-[#00783C] text-center mx-auto block"
                      />
                    </td>

                    {/* 5. PURCHASE RATE */}
                    <td className="py-2 px-2 align-middle text-center">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={item.purchaseRate === 0 || item.purchaseRate === '0' || !item.purchaseRate ? '' : item.purchaseRate}
                        onChange={(e) => onItemChange(idx, 'purchaseRate', e.target.value)}
                        placeholder="0.00"
                        className="w-20 h-7 px-1 bg-white border border-gray-300 rounded text-[11px] font-medium text-gray-900 focus:outline-none focus:border-[#00783C] text-center mx-auto block font-mono"
                      />
                    </td>

                    {/* 6. SELLING PRICE */}
                    <td className="py-2 px-2 align-middle text-center">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={itemSellingPrice === 0 || itemSellingPrice === '0' || !itemSellingPrice ? '' : itemSellingPrice}
                        onChange={(e) => onItemChange(idx, 'sellingPrice', e.target.value)}
                        placeholder="0.00"
                        className="w-20 h-7 px-1 bg-emerald-50/50 border border-emerald-300 rounded text-[11px] font-bold text-[#047857] focus:outline-none focus:border-[#00783C] text-center mx-auto block font-mono"
                      />
                    </td>

                    {/* 7. DISCOUNT (% / ₹ TOGGLE) */}
                    <td className="py-2 px-2 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          onFocus={(e) => e.target.select()}
                          value={item.discount === 0 || item.discount === '0' || !item.discount ? '' : item.discount}
                          onChange={(e) => onItemChange(idx, 'discount', e.target.value)}
                          placeholder="0"
                          className="w-14 h-7 px-1 bg-white border border-gray-300 rounded text-[11px] font-medium text-gray-900 text-center focus:outline-none focus:border-[#00783C] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => onItemChange(idx, 'discountType', item.discountType === 'Amount' || item.discountType === '₹' ? 'Percentage' : 'Amount')}
                          className="h-7 px-1.5 bg-emerald-50 text-[#047857] border border-emerald-300 rounded text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Toggle Discount Type (% or ₹)"
                        >
                          {item.discountType === 'Amount' || item.discountType === '₹' ? '₹' : '%'}
                        </button>
                      </div>
                    </td>

                    {/* 8. AMOUNT */}
                    <td className="py-2 px-3 text-center font-medium text-gray-900 text-[12px] align-middle">
                      ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* 7. ACTION (CENTER ALIGNED) */}
                    <td className="py-2 px-2 text-center align-middle">
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
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400 space-y-1 align-middle">
                  <Package className="w-7 h-7 text-gray-300 mx-auto" />
                  <p className="text-[12px] font-normal text-gray-500">No products added to purchase list yet</p>
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
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchaseRate) || 0);
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
                className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 font-sans"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-2 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProductAvatar src={productImage} name={productName} size={40} />
                    <div>
                      <span className="font-extrabold text-gray-900 text-xs block leading-tight truncate">{productName}</span>
                      <span className="text-[10px] text-gray-500 font-medium block">{brandName} • {categoryName}</span>
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
                  <span className="text-xs font-black text-[#047857]">
                    ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
            No products added to purchase list yet
          </div>
        )}
      </div>

      {/* Table Footer Summary Row */}
      <div className="px-3 py-2 bg-gray-50/80 border-t border-gray-200/80 flex items-center justify-between text-[12px] font-normal text-gray-900">
        <div>
          Total Items: <span className="text-[#047857] font-medium">{totalItemsCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Total Amount:</span>
          <span className="text-xs font-medium text-[#047857]">
            ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
