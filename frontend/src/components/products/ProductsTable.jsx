import React from 'react';
import { Edit, MoreVertical, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function ProductsTable({
  products = [],
  totalCount = 156,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onViewProduct,
  onEditProduct,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  // STANDARDIZED CATEGORY BADGE COLOR PALETTE
  const getCategoryBadgeClass = (categoryName = '') => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('fertilizer')) {
      return 'badge-agri-active';
    }
    if (cat.includes('seed')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    if (cat.includes('pesticide')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    if (cat.includes('plant') || cat.includes('growth')) {
      return 'bg-emerald-50 text-[#047857] border-emerald-200/80';
    }
    if (cat.includes('animal') || cat.includes('feed')) {
      return 'bg-gray-100 text-gray-700 border-gray-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getStatusBadge = (status = 'Active', rawStock = 0, lowStockAlert = 10) => {
    const currentStock = Math.max(0, Number(rawStock) || 0);
    let text = status;
    if (currentStock === 0) text = 'Out of Stock';
    else if (currentStock <= lowStockAlert / 2) text = 'Critical';
    else if (currentStock <= lowStockAlert) text = 'Low Stock';

    if (text === 'Out of Stock') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-block shrink-0 bg-red-50 text-red-600 border border-red-200">
          Out of Stock
        </span>
      );
    }
    if (text === 'Active') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap inline-block shrink-0 badge-agri-active">
          Active
        </span>
      );
    }
    if (text === 'Low Stock') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap inline-block shrink-0 badge-agri-lowstock">
          Low Stock
        </span>
      );
    }
    if (text === 'Critical') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap inline-block shrink-0 badge-agri-critical">
          Critical
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap inline-block shrink-0 bg-gray-100 text-gray-600 border border-gray-200">
        {text}
      </span>
    );
  };

  const getStockTextColor = (rawStock = 0, lowStockAlert = 10) => {
    const currentStock = Math.max(0, Number(rawStock) || 0);
    if (currentStock === 0) return 'text-red-600 font-extrabold';
    if (currentStock <= lowStockAlert / 2) return 'text-red-600 font-bold';
    if (currentStock <= lowStockAlert) return 'text-amber-600 font-bold';
    return 'text-[#047857] font-bold';
  };
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-3 w-full">
      {/* Table / Cards Container */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs w-full">
        {/* DESKTOP PRODUCTS TABLE */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse table-auto">
            <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-tight">
              <tr>
                <th className="py-3 px-2 text-center align-middle w-10">#</th>
                <th className="py-3 px-3 text-left align-middle min-w-[150px]">Product Name</th>
                <th className="py-3 px-2.5 text-center align-middle">Category</th>
                <th className="py-3 px-2.5 text-center align-middle">Brand</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">Purchase Price (₹)</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">Selling Price (₹)</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">MRP (₹)</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">Current Stock</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">Low Stock Alert</th>
                <th className="py-3 px-2.5 text-center align-middle whitespace-nowrap">Status</th>
                <th className="py-3 px-2.5 text-center align-middle w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
              {products.map((p, idx) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                const categoryName = p.categoryId?.name || p.category || 'Fertilizers';
                const brandName = p.brandId?.name || '—';
                const unitName = p.defaultUnitId?.shortName || p.unit || 'Bag';
                const currentStock = Math.max(0, Number(p.totalStock ?? p.currentStock ?? 0));
                const lowStockAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);
                const purchasePrice = Number(p.currentActiveBatch?.purchaseRate ?? p.defaultPurchaseRate ?? p.purchasePrice ?? 0);
                const sellingPrice = Number(p.currentSellingPrice ?? p.sellingPrice ?? p.defaultSellingPrice ?? 0);
                const mrpVal = Number(p.defaultMrp ?? p.mrp ?? 0);
                const packageSize = p.packageSize || p.packaging || `${unitName}`;

                return (
                  <tr
                    key={p._id || p.id || idx}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2 px-2 text-center text-gray-500 font-medium text-[11px] align-middle">
                      {rowIndex}
                    </td>
                    <td className="py-2 px-2.5 text-left align-middle">
                      <div className="flex items-center gap-2.5">
                        <ProductAvatar src={p.image} name={p.name} size={34} />
                        <div>
                          <span className="font-medium text-gray-900 text-[11px] block">{p.name}</span>
                          <span className="text-[10px] text-gray-400 block">{packageSize}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center align-middle">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border inline-block whitespace-nowrap ${getCategoryBadgeClass(categoryName)}`}>
                        {categoryName}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-gray-700 text-[11px] align-middle truncate max-w-[110px]" title={brandName}>
                      {brandName}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-medium text-gray-800 text-[11px] align-middle whitespace-nowrap">
                      ₹ {purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-gray-900 text-[11px] align-middle whitespace-nowrap">
                      ₹ {sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-gray-500 text-[11px] align-middle whitespace-nowrap">
                      ₹ {mrpVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-gray-900 text-[11px] align-middle whitespace-nowrap">
                      {currentStock} {unitName}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-gray-500 text-[11px] align-middle whitespace-nowrap">
                      {lowStockAlert} {unitName}
                    </td>
                    <td className="py-2 px-2.5 text-center align-middle whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewProduct && onViewProduct(p)}
                          className="p-1 rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer flex items-center justify-center"
                          title="View Product Details"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        <div className="px-3.5 py-2 bg-gray-50/80 border-t border-gray-200/80 flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
          <div className="flex items-center gap-1 leading-none">
            Showing <span className="font-medium text-gray-900">{products.length > 0 ? startIndex : 0}</span> to{' '}
            <span className="font-medium text-gray-900">{endIndex}</span> of{' '}
            <span className="font-medium text-gray-900">{totalCount}</span> products
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dynamic Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer text-[10px]"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              {pageNumbers.map((pg, pageIdx) => {
                if (pg === '...') {
                  return (
                    <span key={`dots-${pageIdx}`} className="px-0.5 text-gray-400 text-[10px]">
                      ...
                    </span>
                  );
                }
                const isCurrent = pg === currentPage;
                return (
                  <button
                    key={pg}
                    onClick={() => onPageChange && onPageChange(pg)}
                    className={`w-6 h-6 flex items-center justify-center rounded text-[10px] cursor-pointer transition-colors ${
                      isCurrent
                        ? 'font-semibold btn-agri-primary shadow-2xs'
                        : 'font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer text-[10px]"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Dynamic Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
              className="h-6 px-1.5 bg-white border border-gray-200 hover:border-[#047857] rounded text-[11px] text-gray-700 font-semibold focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-colors"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Tip Banner */}
      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] text-emerald-900">
        <Info className="w-3.5 h-3.5 text-[#047857] shrink-0" />
        <span className="leading-tight">
          <strong>Tip:</strong> You can add, edit or delete products. Batch & expiry details are optional and can be managed in Stock Entry.
        </span>
      </div>
    </div>
  );
}
