import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  AlertTriangle,
  Layers,
  Search,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
} from 'lucide-react';
import PageLayout from '../../components/ui/PageHeaderContainer';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import ProductAvatar from '../../components/ui/ProductAvatar';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import StockAdjustmentDetailsModal from '../../components/inventory/StockAdjustmentDetailsModal';
import DamageStockModal from '../../components/inventory/DamageStockModal';
import SupplierReturnModal from '../../components/inventory/SupplierReturnModal';

export default function StockAdjustmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [activeTab, setActiveTab] = useState('DAMAGE'); // 'DAMAGE' | 'SUPPLIER_RETURN'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Modals for actions
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Fetch adjustments
  const { data: adjustmentsApi, isLoading } = useQuery({
    queryKey: ['stock-adjustments', currentUserId],
    queryFn: () => productService.getStockAdjustments(),
    staleTime: 30 * 1000,
    enabled: !!currentUserId,
  });

  // Fetch products for modal dropdowns
  const { data: productsApi } = useQuery({
    queryKey: ['products-inventory', currentUserId],
    queryFn: () => productService.getProducts({ limit: 200 }),
    staleTime: 30 * 1000,
    enabled: !!currentUserId,
  });

  const rawProducts = useMemo(() => {
    return productsApi?.data?.data?.products || productsApi?.data?.products || [];
  }, [productsApi]);

  const { adjustments, summary } = useMemo(() => {
    const fetched = adjustmentsApi?.data?.data?.adjustments || adjustmentsApi?.data?.adjustments || [];
    const sum = adjustmentsApi?.data?.data?.summary || adjustmentsApi?.data?.summary || {
      totalDamagedQty: 0,
      totalDamagedValue: 0,
      damagedCount: 0,
      totalReturnedQty: 0,
      totalReturnValue: 0,
      returnCount: 0,
      totalAdjustedQty: 0,
      totalAdjustedValue: 0,
      totalCount: 0,
    };
    return { adjustments: fetched, summary: sum };
  }, [adjustmentsApi]);

  // Filter records by Active Tab (DAMAGE vs SUPPLIER_RETURN) and Search
  const filteredList = useMemo(() => {
    return adjustments.filter((adj) => {
      // Tab filter
      if (activeTab === 'DAMAGE') {
        if (adj.type !== 'DAMAGE') return false;
      } else if (activeTab === 'SUPPLIER_RETURN') {
        if (adj.type !== 'PURCHASE_RETURN' && adj.type !== 'RETURN') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prodMatch = (adj.productName || '').toLowerCase().includes(q);
        const suppMatch = (adj.supplierName || '').toLowerCase().includes(q);
        const batchMatch = (adj.batchNumber || '').toLowerCase().includes(q);
        const refMatch = (adj.referenceNumber || '').toLowerCase().includes(q);
        const reasonMatch = (adj.reason || '').toLowerCase().includes(q);
        return prodMatch || suppMatch || batchMatch || refMatch || reasonMatch;
      }

      return true;
    });
  }, [adjustments, activeTab, searchQuery]);

  // Pagination
  const totalCount = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  const handleOpenDetails = (item) => {
    setSelectedAdjustment(item);
    setIsDetailsModalOpen(true);
  };

  const handleSaveDamage = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleSaveReturn = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
  };

  return (
    <PageLayout
      title="Stock Adjustments & Returns"
      breadcrumb="Vedixa ERP > Inventory > Stock Adjustments"
      icon={RotateCcw}
      action={(
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            icon={ArrowLeft}
            onClick={() => navigate('/inventory')}
            className="text-gray-700 border-gray-300 bg-white hover:bg-gray-50 text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex-1 sm:flex-initial justify-center"
          >
            Back to Inventory
          </Button>

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
        </div>
      )}
    >
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Damaged Stock Card */}
        <StatCard
          title="Damaged Stock"
          value={`${summary.totalDamagedQty || 0} Units`}
          subtitle={`₹ ${Math.round(summary.totalDamagedValue || 0).toLocaleString('en-IN')} Total Loss`}
          icon={AlertTriangle}
          trendColor="amber"
          onClick={() => {
            setActiveTab('DAMAGE');
            setCurrentPage(1);
          }}
          className={`cursor-pointer transition-all ${
            activeTab === 'DAMAGE'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/30'
              : 'hover:border-amber-300'
          }`}
        />

        {/* Supplier Returns Card */}
        <StatCard
          title="Supplier Returns"
          value={`${summary.totalReturnedQty || 0} Units`}
          subtitle={`₹ ${Math.round(summary.totalReturnValue || 0).toLocaleString('en-IN')} Payable Reduced`}
          icon={RotateCcw}
          trendColor="purple"
          onClick={() => {
            setActiveTab('SUPPLIER_RETURN');
            setCurrentPage(1);
          }}
          className={`cursor-pointer transition-all ${
            activeTab === 'SUPPLIER_RETURN'
              ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50/30'
              : 'hover:border-purple-300'
          }`}
        />

        {/* Combined Total Card */}
        <StatCard
          title="Total Adjustments"
          value={`${summary.totalAdjustedQty || 0} Units`}
          subtitle={`₹ ${Math.round(summary.totalAdjustedValue || 0).toLocaleString('en-IN')} Overall Impact`}
          icon={Layers}
          trendColor="emerald"
        />
      </div>

      {/* 2. Navigation Tabs & Search Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center bg-gray-100/80 p-0.5 rounded-xl border border-gray-200 w-fit">
          <button
            type="button"
            onClick={() => {
              setActiveTab('DAMAGE');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'DAMAGE'
                ? 'bg-white text-amber-800 shadow-2xs border border-amber-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Damaged Stock</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold ml-1">
              {summary.damagedCount || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SUPPLIER_RETURN');
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'SUPPLIER_RETURN'
                ? 'bg-white text-purple-800 shadow-2xs border border-purple-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            <span>Supplier Returns</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold ml-1">
              {summary.returnCount || 0}
            </span>
          </button>
        </div>

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
            placeholder={`Search ${activeTab === 'DAMAGE' ? 'damaged records' : 'supplier returns'}...`}
            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs w-full">
        {isLoading ? (
          <div className="w-full overflow-x-auto p-4">
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl w-full" />
              ))}
            </div>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <p className="font-bold text-sm text-gray-700">
              No {activeTab === 'DAMAGE' ? 'Damaged Stock' : 'Supplier Return'} Records Found
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery ? 'Try clearing your search query.' : 'New records will appear here when recorded.'}
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table (XL Screens >= 1280px) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-[11px] border-collapse table-auto">
                <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase tracking-tight">
                  <tr>
                    <th className="py-2.5 px-2 text-center align-middle w-8">#</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 text-center align-middle min-w-[140px]">Product Name</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Supplier Name</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Quantity</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Batch Number</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Purchase Rate (₹)</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Total Value (₹)</th>
                    <th className="py-2.5 px-3 text-center align-middle min-w-[130px]">Reason</th>
                    <th className="py-2.5 px-2.5 text-center align-middle whitespace-nowrap">Reference Number</th>
                    <th className="py-2.5 px-2.5 text-center align-middle w-24">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                  {paginatedList.map((item, idx) => {
                    const rowIndex = startIndex + idx + 1;
                    const isDamage = item.type === 'DAMAGE';
                    const formattedDate = item.date
                      ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A';

                    return (
                      <tr
                        key={item._id || idx}
                        onClick={() => handleOpenDetails(item)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer text-center"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-2 text-center text-gray-500 font-medium text-[11px] align-middle">
                          {rowIndex}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-600 text-[10px] align-middle whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Product Name */}
                        <td className="py-2.5 px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <ProductAvatar src={item.image} name={item.productName} size={30} />
                            <div className="min-w-0 text-left">
                              <span className="font-bold text-gray-900 text-[11px] block truncate max-w-[130px]" title={item.productName}>
                                {item.productName}
                              </span>
                              <span className="text-[10px] text-gray-400 block truncate">
                                {item.brand || item.category || 'General'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Supplier Name */}
                        <td className="py-2.5 px-2.5 text-center font-medium text-gray-700 text-[11px] align-middle truncate max-w-[120px]">
                          {item.supplierName || (isDamage ? 'Internal Loss' : 'N/A')}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-2.5 text-center align-middle font-mono whitespace-nowrap">
                          <span className={`font-bold ${isDamage ? 'text-amber-700' : 'text-purple-700'}`}>
                            -{item.quantity} {item.unit || 'Bag'}
                          </span>
                        </td>

                        {/* Batch Number */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-600 text-[10px] align-middle whitespace-nowrap">
                          {item.batchNumber || 'N/A'}
                        </td>

                        {/* Purchase Rate */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-700 text-[11px] align-middle whitespace-nowrap">
                          ₹ {Number(item.purchaseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>

                        {/* Total Value */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-900 text-[11px] align-middle whitespace-nowrap">
                          ₹ {Number(item.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3 text-center font-medium text-gray-600 text-[10px] align-middle max-w-[140px] truncate" title={item.reason}>
                          {item.reason || 'N/A'}
                        </td>

                        {/* Reference Number */}
                        <td className="py-2.5 px-2.5 text-center font-mono text-gray-500 text-[10px] align-middle whitespace-nowrap">
                          {item.referenceNumber || 'N/A'}
                        </td>

                        {/* Details */}
                        <td className="py-2.5 px-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center justify-center gap-1"
                            title="View Details"
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

            {/* Mobile & Tablet Card Layout (Screens < 1280px) */}
            <div className="block xl:hidden space-y-3 p-3 sm:p-4">
              {paginatedList.map((item, idx) => {
                const rowIndex = startIndex + idx + 1;
                const isDamage = item.type === 'DAMAGE';
                const formattedDate = item.date
                  ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A';

                return (
                  <div
                    key={item._id || idx}
                    onClick={() => handleOpenDetails(item)}
                    className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5 cursor-pointer hover:border-gray-300 transition-all font-sans"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-gray-400 font-mono">#{rowIndex}</span>
                        <ProductAvatar src={item.image} name={item.productName} size={34} />
                        <div className="min-w-0">
                          <span className="font-extrabold text-gray-900 text-xs truncate block">{item.productName}</span>
                          <span className="text-[10px] text-gray-500 font-medium block">{item.brand || item.category || 'General'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(item);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Quantity</span>
                        <span className={`font-black block ${isDamage ? 'text-amber-700' : 'text-purple-700'}`}>
                          -{item.quantity} {item.unit || 'Bag'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Total Value</span>
                        <span className="font-bold text-gray-900 block">
                          ₹ {Number(item.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Supplier</span>
                        <span className="text-gray-700 block truncate">
                          {item.supplierName || (isDamage ? 'Internal Loss' : 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block uppercase font-sans">Date</span>
                        <span className="text-gray-600 block">{formattedDate}</span>
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
            Showing <span className="font-medium text-gray-900">{paginatedList.length > 0 ? startIndex + 1 : 0}</span> to{' '}
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

      {/* Info Banner */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-900">
        <Info className="w-4 h-4 text-[#047857] shrink-0" />
        <span className="leading-tight">
          <strong>Accounting Invariant:</strong> Damaged stock reduces physical stock as an internal loss without affecting supplier payable. Supplier Returns reduce both physical stock and supplier payable.
        </span>
      </div>

      {/* Details Modal */}
      <StockAdjustmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        adjustment={selectedAdjustment}
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
