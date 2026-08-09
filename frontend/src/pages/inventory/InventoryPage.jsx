import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Search,
  AlertTriangle,
  PackageX,
  Eye,
  ArrowUpDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  RotateCcw,
} from 'lucide-react';
import PageLayout from '../../components/ui/PageLayout';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import { productService } from '../../services/productService';
import ProductAvatar from '../../components/ui/ProductAvatar';
import InventoryDetailsDrawer from '../../components/inventory/InventoryDetailsDrawer';
import DamageStockModal from '../../components/inventory/DamageStockModal';
import SupplierReturnModal from '../../components/inventory/SupplierReturnModal';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [sortBy, setSortBy] = useState('STOCK_DESC'); // 'STOCK_DESC' | 'STOCK_ASC' | 'VALUE_DESC'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals for Stock Management
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Local state for stock adjustments (Damage & Returns)
  const [stockAdjustments, setStockAdjustments] = useState({});

  // Fetch Products for Live Stock Data
  const { data: productsApi, isLoading } = useQuery({
    queryKey: ['products-inventory'],
    queryFn: () => productService.getProducts({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const rawProducts = useMemo(() => {
    const fetched = productsApi?.data?.data?.products || productsApi?.data?.products || [];
    return fetched.map((p) => {
      const pId = p._id || p.id;
      const adj = stockAdjustments[pId] || 0;
      const baseStock = Number(p.totalStock ?? p.currentStock ?? 0);
      const adjustedStock = Math.max(0, baseStock - adj);
      return {
        ...p,
        totalStock: adjustedStock,
        currentStock: adjustedStock,
      };
    });
  }, [productsApi, stockAdjustments]);

  // Summary Metrics Calculations
  const metrics = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    rawProducts.forEach((p) => {
      const stock = Number(p.totalStock ?? p.currentStock ?? 0);
      const minAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);
      const purchaseRate = Number(p.defaultPurchaseRate ?? p.purchasePrice ?? 0);

      totalValue += stock * purchaseRate;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= minAlert) {
        lowStockCount++;
      }
    });

    return {
      totalProducts: rawProducts.length,
      totalInventoryValue: totalValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [rawProducts]);

  // Filtered & Sorted Stock Items
  const filteredProducts = useMemo(() => {
    return rawProducts
      .filter((p) => {
        const stock = Number(p.totalStock ?? p.currentStock ?? 0);
        const minAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);

        // Status Filter
        if (statusFilter === 'LOW_STOCK' && (stock === 0 || stock > minAlert)) return false;
        if (statusFilter === 'OUT_OF_STOCK' && stock > 0) return false;

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (p.name || '').toLowerCase().includes(q);
          const brandMatch = (p.brandId?.name || p.company || '').toLowerCase().includes(q);
          const catMatch = (p.categoryId?.name || p.category || '').toLowerCase().includes(q);
          return nameMatch || brandMatch || catMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const stockA = Number(a.totalStock ?? a.currentStock ?? 0);
        const stockB = Number(b.totalStock ?? b.currentStock ?? 0);

        const rateA = Number(a.defaultPurchaseRate ?? a.purchasePrice ?? 0);
        const rateB = Number(b.defaultPurchaseRate ?? b.purchasePrice ?? 0);

        const valA = stockA * rateA;
        const valB = stockB * rateB;

        if (sortBy === 'STOCK_DESC') return stockB - stockA;
        if (sortBy === 'STOCK_ASC') return stockA - stockB;
        if (sortBy === 'VALUE_DESC') return valB - valA;
        return 0;
      });
  }, [rawProducts, searchQuery, statusFilter, sortBy]);

  // Pagination Logic
  const totalCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const handleOpenDetails = (product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  // Handlers for Damaged Stock Write-off & Supplier Return
  const handleSaveDamage = (damageRecord) => {
    const pId = damageRecord.productId;
    setStockAdjustments((prev) => ({
      ...prev,
      [pId]: (prev[pId] || 0) + damageRecord.quantity,
    }));
    queryClient.invalidateQueries(['dashboard-summary']);
  };

  const handleSaveReturn = (returnRecord) => {
    const pId = returnRecord.productId;
    setStockAdjustments((prev) => ({
      ...prev,
      [pId]: (prev[pId] || 0) + returnRecord.quantity,
    }));
    queryClient.invalidateQueries(['dashboard-summary']);
    queryClient.invalidateQueries(['supplier-ledger']);
  };

  return (
    <PageLayout
      title="Inventory & Stock Monitoring"
      breadcrumb="Vedixa ERP > Inventory"
      icon={Layers}
      action={(
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            icon={AlertTriangle}
            onClick={() => setIsDamageModalOpen(true)}
            className="text-amber-800 border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex-1 sm:flex-initial justify-center"
          >
            Damage Stock
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={RotateCcw}
            onClick={() => setIsReturnModalOpen(true)}
            className="text-purple-800 border-purple-300 bg-purple-50/80 hover:bg-purple-100 text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex-1 sm:flex-initial justify-center"
          >
            Return to Supplier
          </Button>

          <span className="app-pill hidden sm:inline-flex">
            Live Stock Engine Active
          </span>
        </div>
      )}
    >
      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Active Items"
          value={metrics.totalProducts}
          subtitle="Product Master Catalog"
          icon={Layers}
        />

        <StatCard
          title="Total Stock Value (₹)"
          value={`₹ ${metrics.totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle="Valued at Landed Purchase Rate"
          icon={DollarSign}
        />

        <StatCard
          title="Low Stock Items"
          value={metrics.lowStockCount}
          subtitle="At or below reorder limit"
          icon={AlertTriangle}
          trendColor="amber"
        />

        <StatCard
          title="Out of Stock"
          value={metrics.outOfStockCount}
          subtitle="Requires immediate purchase"
          icon={PackageX}
          trendColor="rose"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search stock by product name, brand, category..."
            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Status Filter Tabs & Sorting */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100/80 p-0.5 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#047857] shadow-2xs border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Stock ({rawProducts.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter('LOW_STOCK');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                statusFilter === 'LOW_STOCK'
                  ? 'bg-white text-amber-700 shadow-2xs border border-amber-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Low Stock ({metrics.lowStockCount})
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter('OUT_OF_STOCK');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                statusFilter === 'OUT_OF_STOCK'
                  ? 'bg-white text-red-700 shadow-2xs border border-red-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Out of Stock ({metrics.outOfStockCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-2 bg-white border border-gray-200 hover:border-[#047857] rounded-xl text-[11px] font-semibold text-gray-700 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="STOCK_DESC">Stock: High to Low</option>
              <option value="STOCK_ASC">Stock: Low to High</option>
              <option value="VALUE_DESC">Stock Value: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs w-full">
        {isLoading ? (
          <div className="w-full overflow-x-auto p-4">
            <div className="space-y-3 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl w-full" />
              ))}
            </div>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <p className="font-bold text-sm text-gray-700">No Inventory Items Found</p>
            <p className="text-xs text-gray-400">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* DESKTOP INVENTORY TABLE (XL SCREENS >= 1280px) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-[11px] border-collapse table-auto">
                <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase tracking-tight">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center align-middle w-8">#</th>
                    <th className="py-2.5 px-3 text-left align-middle min-w-[140px]">Product</th>
                    <th className="py-2.5 px-2.5 text-center align-middle">Company / Brand</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Current Stock</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Stock Value (₹)</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Total Inward</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Total Outward</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Last Purchase</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Last Sale</th>
                    <th className="py-2.5 px-2.5 text-center align-middle w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                  {paginatedProducts.map((p, idx) => {
                    const rowIndex = startIndex + idx + 1;
                    const stock = Number(p.totalStock ?? p.currentStock ?? 0);
                    const minAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);
                    const purchaseRate = Number(p.defaultPurchaseRate ?? p.purchasePrice ?? 0);
                    const unitName = p.defaultUnitId?.shortName || p.unit || 'Bag';

                    const stockVal = stock * purchaseRate;

                    const companyName = p.brandId?.name || p.companyId?.name || p.company || 'N/A';
                    const categoryName = p.categoryId?.name || p.category || 'Uncategorized';

                    // Dynamic Stock Status Badge
                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200 inline-block whitespace-nowrap">
                        Active Stock
                      </span>
                    );

                    if (stock === 0) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-block whitespace-nowrap">
                          Out of Stock
                        </span>
                      );
                    } else if (stock <= minAlert) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-block whitespace-nowrap">
                          Low Stock ({stock})
                        </span>
                      );
                    }

                    const totalPurchased = p.totalPurchasedQty !== undefined ? p.totalPurchasedQty : 0;
                    const totalSold = p.totalSoldQty !== undefined ? p.totalSoldQty : 0;

                    return (
                      <tr
                        key={p._id || p.id || idx}
                        onClick={() => handleOpenDetails(p)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-2.5 text-center text-gray-500 font-medium text-[11px] align-middle">
                          {rowIndex}
                        </td>

                        {/* Product Avatar & Name */}
                        <td className="py-2.5 px-3 text-left align-middle">
                          <div className="flex items-center gap-2.5">
                            <ProductAvatar src={p.image} name={p.name} size={34} />
                            <div className="min-w-0">
                              <span className="font-medium text-gray-900 text-[11px] block leading-tight truncate max-w-[140px]" title={p.name}>
                                {p.name}
                              </span>
                              <span className="text-[10px] text-gray-400 block truncate leading-tight">
                                {categoryName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-2.5 px-2.5 text-center font-medium text-gray-700 text-[11px] align-middle truncate max-w-[90px]">
                          {companyName}
                        </td>

                        {/* Current Stock */}
                        <td className="py-2.5 px-2.5 text-center align-middle font-mono whitespace-nowrap">
                          <span className={`font-bold ${stock === 0 ? 'text-red-600' : stock <= minAlert ? 'text-amber-600' : 'text-[#047857]'}`}>
                            {stock} {unitName}
                          </span>
                        </td>

                        {/* Stock Value */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-900 text-[11px] align-middle whitespace-nowrap">
                          ₹ {stockVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Low Stock Status */}
                        <td className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">
                          {statusBadge}
                        </td>

                        {/* Total Purchased */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-700 align-middle whitespace-nowrap">
                          {totalPurchased} {unitName}
                        </td>

                        {/* Total Sold */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-700 align-middle whitespace-nowrap">
                          {totalSold} {unitName}
                        </td>

                        {/* Last Purchase */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-500 text-[10px] align-middle whitespace-nowrap">
                          {p.lastPurchaseDate ? new Date(p.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'}
                        </td>

                        {/* Last Sale */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-500 text-[10px] align-middle whitespace-nowrap">
                          {p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('en-IN') : 'N/A'}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(p)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                            title="View Inventory Details"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE & TABLET PRODUCT CARDS (SCREENS < 1280px) */}
            <div className="block xl:hidden space-y-3 p-3 sm:p-4">
              {paginatedProducts.map((p, idx) => {
                const rowIndex = startIndex + idx + 1;
                const stock = Number(p.totalStock ?? p.currentStock ?? 0);
                const minAlert = Number(p.minimumStockAlert ?? p.lowStockAlert ?? 10);
                const purchaseRate = Number(p.defaultPurchaseRate ?? p.purchasePrice ?? 0);
                const unitName = p.defaultUnitId?.shortName || p.unit || 'Bag';
                const stockVal = stock * purchaseRate;
                const companyName = p.brandId?.name || p.companyId?.name || p.company || 'N/A';
                const categoryName = p.categoryId?.name || p.category || 'Uncategorized';
                const totalPurchased = p.totalPurchasedQty !== undefined ? p.totalPurchasedQty : 0;
                const totalSold = p.totalSoldQty !== undefined ? p.totalSoldQty : 0;

                // Status Badge for Card
                let statusBadge = (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-[#047857] border border-emerald-200">
                    Active Stock
                  </span>
                );
                if (stock === 0) {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                      Out of Stock
                    </span>
                  );
                } else if (stock <= minAlert) {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      Low Stock ({stock})
                    </span>
                  );
                }

                return (
                  <div
                    key={p._id || p.id || idx}
                    onClick={() => handleOpenDetails(p)}
                    className="bg-white border border-gray-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all font-sans"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 font-mono shrink-0">#{rowIndex}</span>
                        <ProductAvatar src={p.image} name={p.name} size={38} />
                        <div className="min-w-0">
                          <span className="font-extrabold text-gray-900 text-xs sm:text-sm block leading-tight truncate">{p.name}</span>
                          <span className="text-[10px] sm:text-xs text-gray-500 font-medium block">{companyName} • {categoryName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {statusBadge}
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(p)}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-[#047857] hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>

                    {/* Stock Details Grid (2 cols on mobile, 3 cols on sm, 5 cols on tablet) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 text-xs font-mono bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Current Stock</span>
                        <span className={`font-extrabold block ${stock === 0 ? 'text-red-600' : stock <= minAlert ? 'text-amber-600' : 'text-[#047857]'}`}>
                          {stock} {unitName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Stock Value</span>
                        <span className="font-bold text-gray-900 block">₹ {stockVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Total Inward / Outward</span>
                        <span className="font-medium text-gray-700 block">{totalPurchased} in / {totalSold} out</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Last Purchase</span>
                        <span className="text-gray-600 block">{p.lastPurchaseDate ? new Date(p.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Last Sale</span>
                        <span className="text-gray-600 block">{p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Pagination */}
        <div className="px-3.5 py-2 bg-gray-50/80 border-t border-gray-200/80 flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
          <div className="flex items-center gap-1 leading-none">
            Showing <span className="font-medium text-gray-900">{paginatedProducts.length > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-medium text-gray-900">{Math.min(startIndex + pageSize, totalCount)}</span> of{' '}
            <span className="font-medium text-gray-900">{totalCount}</span> items
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer text-[10px]"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <span className="px-2 text-xs font-bold text-gray-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 cursor-pointer text-[10px]"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-6 px-1.5 bg-white border border-gray-200 hover:border-[#047857] rounded text-[11px] text-gray-700 font-semibold focus:outline-none focus:border-[#047857] cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Architecture Domain Notice */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-900">
        <Info className="w-4 h-4 text-[#047857] shrink-0" />
        <span className="leading-tight">
          <strong>Inventory Domain Scope:</strong> This module handles live physical stock monitoring, landed stock valuation (₹), damaged stock write-offs, and supplier returns. Product master attributes (HSN, GST, Categories, Prices) remain strictly inside the <strong>Products</strong> module.
        </span>
      </div>

      {/* Inventory Details Drawer */}
      <InventoryDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={selectedProduct}
      />

      {/* Damaged Stock Modal */}
      <DamageStockModal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        products={rawProducts}
        onSaveDamage={handleSaveDamage}
      />

      {/* Supplier Return Modal */}
      <SupplierReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        products={rawProducts}
        onSaveReturn={handleSaveReturn}
      />
    </PageLayout>
  );
}
