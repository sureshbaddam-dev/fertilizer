import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Edit, Trash2, Tag, Layers, ArrowUpRight, ArrowDownLeft, Clock, History, FileText, CheckCircle2, AlertCircle, Save, Check } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';

export default function ProductDetailsDrawer({
  isOpen,
  product = null,
  onClose,
  onEditProduct,
  onDeleteProduct,
  isEmbedded = false,
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [historySubTab, setHistorySubTab] = useState('movements');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, batch: null });
  const [editModal, setEditModal] = useState({ isOpen: false, mode: 'selling', batch: null });
  const [editPriceInput, setEditPriceInput] = useState('');

  const longPressTimerRef = React.useRef(null);
  const touchStartCoordsRef = React.useRef({ x: 0, y: 0 });

  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;
  const productId = product?._id || product?.id;

  // Fetch Full Product Details (including batches & pricing calculation)
  const { data: fullProductApi } = useQuery({
    queryKey: ['product-detail-drawer', currentUserId, productId],
    queryFn: () => productService.getProductById(productId),
    enabled: Boolean(isOpen && productId && currentUserId),
    staleTime: 2000,
  });

  // Fetch Full Product History (Stock Movements, Purchase History, Sales History)
  const { data: productHistoryApi } = useQuery({
    queryKey: ['product-history-drawer', currentUserId, productId],
    queryFn: () => productService.getProductHistory(productId),
    enabled: Boolean(isOpen && productId && currentUserId),
    staleTime: 2000,
  });

  // Batch Price Update Mutation
  const updateBatchMutation = useMutation({
    mutationFn: ({ batchId, sellingPrice, purchaseRate }) =>
      productService.updateBatch(batchId, { sellingPrice, purchaseRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-detail-drawer', currentUserId, productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-history-drawer', currentUserId, productId] });
      setEditModal({ isOpen: false, mode: 'selling', batch: null });
      setEditPriceInput('');
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to update batch price');
    },
  });

  if (!isOpen || !product) return null;

  const detailProduct = fullProductApi?.data?.product || fullProductApi?.product || product;
  const rawBatches = fullProductApi?.data?.batches || fullProductApi?.batches || detailProduct.batches || [];

  const historyData = productHistoryApi?.data || productHistoryApi || {};
  const stockHistoryList = historyData.stockHistory || [];
  const purchaseHistoryList = historyData.purchaseHistory || [];
  const salesHistoryList = historyData.salesHistory || [];

  const productName = detailProduct.name || product.name || 'Unnamed Product';
  const categoryName = detailProduct.categoryId?.name || detailProduct.category || product.category || '—';
  const companyName = detailProduct.brandId?.name || detailProduct.companyId?.name || detailProduct.company || product.company || '—';
  const unitName = detailProduct.defaultUnitId?.shortName || detailProduct.defaultUnitId?.name || detailProduct.unit || product.unit || 'Unit';

  const currentStock = Number(detailProduct.totalStock ?? detailProduct.currentStock ?? product.totalStock ?? 0);
  const lowStockAlert = Number(detailProduct.minimumStockAlert ?? detailProduct.lowStockAlert ?? 10);
  const currentSellingPrice = Number(detailProduct.currentSellingPrice ?? detailProduct.sellingPrice ?? detailProduct.defaultSellingPrice ?? 0);

  // Batches classification
  const sortedBatches = [...rawBatches].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const activeBatches = sortedBatches.filter((b) => (b.currentStock > 0 || b.quantityRemaining > 0) && b.isActive !== false);
  const currentActiveBatch = detailProduct.currentActiveBatch || activeBatches[0] || null;
  const upcomingBatch = detailProduct.upcomingBatch || activeBatches[1] || null;

  // Stock value computation
  let totalStockValue = Number(detailProduct.totalStockValue || detailProduct.stockValue || 0);
  if (!totalStockValue && sortedBatches.length > 0) {
    totalStockValue = sortedBatches.reduce((sum, b) => sum + (Math.max(0, Number(b.currentStock ?? b.quantityRemaining ?? 0)) * Number(b.purchaseRate || 0)), 0);
  }
  if (!totalStockValue) {
    totalStockValue = currentStock * Number(detailProduct.defaultPurchaseRate || detailProduct.purchasePrice || 0);
  }

  const latestPurchaseRate = purchaseHistoryList[0]?.purchaseRate ?? currentActiveBatch?.purchaseRate ?? Number(detailProduct.defaultPurchaseRate || 0);
  const latestPurchaseDate = purchaseHistoryList[0]?.date ?? (currentActiveBatch?.createdAt ? new Date(currentActiveBatch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  const hsnCode = detailProduct.hsnCode || product.hsnCode || null;
  const gstRate = detailProduct.gstRate !== undefined && detailProduct.gstRate !== null ? `${detailProduct.gstRate}%` : null;
  const descriptionText = detailProduct.description || product.description || null;
  const createdDateStr = detailProduct.createdAt ? new Date(detailProduct.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  const handleBatchContextMenu = (e, batch) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      batch,
    });
  };

  const handleBatchTouchStart = (e, batch) => {
    if (!e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartCoordsRef.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(40);
      }
      setContextMenu({
        visible: true,
        x: touchStartCoordsRef.current.x,
        y: touchStartCoordsRef.current.y,
        batch,
      });
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleBatchTouchMove = (e) => {
    if (!longPressTimerRef.current || !e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartCoordsRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartCoordsRef.current.y);

    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBatchTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openPriceEditModal = (batch, mode) => {
    setContextMenu({ visible: false, x: 0, y: 0, batch: null });
    const initialVal = mode === 'purchase' ? Number(batch.purchaseRate || 0) : Number(batch.sellingPrice || 0);
    setEditPriceInput(initialVal.toString());
    setEditModal({ isOpen: true, mode, batch });
  };

  const handleSaveModalPrice = () => {
    const val = parseFloat(editPriceInput);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }
    if (!editModal.batch) return;

    if (editModal.mode === 'purchase') {
      updateBatchMutation.mutate({ batchId: editModal.batch._id, purchaseRate: val });
    } else {
      updateBatchMutation.mutate({ batchId: editModal.batch._id, sellingPrice: val });
    }
  };

  const cardContent = (
    <div className="w-full bg-white max-h-[90vh] flex flex-col justify-between overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">Product Details</h2>
          <span className="text-[10px] text-gray-400 font-mono">({detailProduct.code || 'NO-CODE'})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEditProduct && onEditProduct(detailProduct)}
            className="px-2.5 py-1 btn-agri-primary rounded-md text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Edit className="w-3 h-3" />
            <span>Edit Product</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteProduct && onDeleteProduct(detailProduct)}
            className="p-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
            title="Delete Product"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs max-h-[75vh]">
        {/* Top Product Header Card */}
        <div className="flex items-start justify-between gap-2.5 pb-1 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ProductAvatar src={detailProduct.image} name={productName} size={52} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 leading-tight">{productName}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${detailProduct.isActive !== false ? 'badge-agri-active' : 'bg-gray-100 text-gray-600'}`}>
                  {detailProduct.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-2.5 flex-wrap pt-0.5">
                <span>
                  Category: <strong className="text-[#047857] font-semibold">{categoryName}</strong>
                </span>
                <span>•</span>
                <span>
                  Brand: <strong className="text-gray-700 font-semibold">{companyName}</strong>
                </span>
                <span>•</span>
                <span>
                  Unit: <strong className="text-gray-700 font-semibold">{unitName}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 gap-6 font-medium text-xs">
          {['Overview', 'Pricing', 'Stock History', 'Notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'border-[#00783C] text-[#00783C] font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'Overview' && (
          <div className="space-y-4 pt-1">
            {/* Primary Aggregated Metrics Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-semibold text-emerald-800 block uppercase tracking-wider">Current Stock</span>
                <span className="text-sm font-extrabold text-[#047857] block font-mono">
                  {currentStock} <span className="text-xs font-medium text-emerald-700">{unitName}</span>
                </span>
              </div>

              <div className="p-3 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-semibold text-gray-500 block uppercase tracking-wider">Stock Value</span>
                <span className="text-sm font-extrabold text-gray-900 block font-mono">
                  ₹ {totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-semibold text-gray-500 block uppercase tracking-wider">Selling Price</span>
                <span className="text-sm font-extrabold text-gray-900 block font-mono">
                  ₹ {currentSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-0.5">
                <span className="text-[10px] font-semibold text-gray-500 block uppercase tracking-wider">Active Batches</span>
                <span className="text-sm font-extrabold text-gray-900 block font-mono">
                  {activeBatches.length} <span className="text-xs font-normal text-gray-500">batch{activeBatches.length === 1 ? '' : 'es'}</span>
                </span>
              </div>
            </div>

            {/* Secondary Aggregated Information */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-gray-50/50 border border-gray-200/70 rounded-lg space-y-0.5">
                <span className="text-[10px] font-medium text-gray-500 block">Current Active Batch</span>
                <span className="text-xs font-bold text-gray-900 font-mono block">
                  {currentActiveBatch ? `${currentActiveBatch.batchNumber} (${currentActiveBatch.currentStock ?? currentActiveBatch.quantityRemaining ?? 0} ${unitName})` : 'No Active Batch'}
                </span>
              </div>

              <div className="p-2.5 bg-gray-50/50 border border-gray-200/70 rounded-lg space-y-0.5">
                <span className="text-[10px] font-medium text-gray-500 block">Latest Purchase Rate</span>
                <span className="text-xs font-bold text-gray-900 font-mono block">
                  ₹ {Number(latestPurchaseRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-gray-50/50 border border-gray-200/70 rounded-lg space-y-0.5">
                <span className="text-[10px] font-medium text-gray-500 block">Latest Purchase Date</span>
                <span className="text-xs font-bold text-gray-900 font-mono block">{latestPurchaseDate}</span>
              </div>
            </div>

            {/* Additional Product Meta Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-gray-50/50 border border-gray-200/60 rounded-lg">
                <span className="text-[9px] text-gray-400 block">Low Stock Alert</span>
                <span className="font-semibold text-gray-800 font-mono text-xs">{lowStockAlert} {unitName}</span>
              </div>
              <div className="p-2 bg-gray-50/50 border border-gray-200/60 rounded-lg">
                <span className="text-[9px] text-gray-400 block">HSN Code</span>
                <span className="font-semibold text-gray-800 font-mono text-xs">{hsnCode || '—'}</span>
              </div>
              <div className="p-2 bg-gray-50/50 border border-gray-200/60 rounded-lg">
                <span className="text-[9px] text-gray-400 block">GST Rate</span>
                <span className="font-semibold text-gray-800 font-mono text-xs">{gstRate || '18%'}</span>
              </div>
              <div className="p-2 bg-gray-50/50 border border-gray-200/60 rounded-lg">
                <span className="text-[9px] text-gray-400 block">Created Date</span>
                <span className="font-semibold text-gray-800 font-mono text-[11px]">{createdDateStr || '—'}</span>
              </div>
            </div>

            {/* Description */}
            {descriptionText && (
              <div className="space-y-1">
                <h4 className="font-semibold text-gray-900 text-xs">Description</h4>
                <p className="text-gray-600 leading-relaxed text-xs p-3 bg-gray-50/50 border border-gray-200/70 rounded-lg">
                  {descriptionText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= PRICING TAB ================= */}
        {activeTab === 'Pricing' && (
          <div className="space-y-4 pt-1">
            {/* Header Selling Price Banner */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-800 to-[#047857] rounded-xl text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider block">Effective Selling Price (Oldest FIFO Batch)</span>
                <div className="text-xl font-extrabold font-mono mt-0.5">
                  ₹ {currentSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right text-[11px] text-emerald-100">
                <span>Active Queue: <strong>{activeBatches.length} batch{activeBatches.length === 1 ? '' : 'es'}</strong></span>
              </div>
            </div>

            {/* Current Active Batch & Upcoming Batch Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* CURRENT ACTIVE BATCH */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-300/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#047857]" /> Current Active Batch
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold badge-agri-active">ACTIVE</span>
                </div>
                {currentActiveBatch ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between border-b border-emerald-200/50 pb-1">
                      <span className="text-gray-600">Batch Number:</span>
                      <strong className="font-mono text-gray-900">{currentActiveBatch.batchNumber}</strong>
                    </div>
                    <div className="flex justify-between border-b border-emerald-200/50 pb-1">
                      <span className="text-gray-600">Purchase Rate:</span>
                      <strong className="font-mono text-gray-900">₹ {Number(currentActiveBatch.purchaseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between border-b border-emerald-200/50 pb-1">
                      <span className="text-gray-600">Selling Price:</span>
                      <strong className="font-mono text-[#047857]">₹ {Number(currentActiveBatch.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Qty:</span>
                      <strong className="font-mono text-[#047857]">{currentActiveBatch.currentStock ?? currentActiveBatch.quantityRemaining ?? 0} {unitName}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-center text-gray-400 text-xs italic">No active batch in stock</div>
                )}
              </div>

              {/* NEXT BATCH / UPCOMING PRICE */}
              <div className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-600" /> Next Batch / Upcoming Price
                  </span>
                  {upcomingBatch && <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">UPCOMING</span>}
                </div>
                {upcomingBatch ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between border-b border-purple-200/40 pb-1">
                      <span className="text-gray-600">Batch Number:</span>
                      <strong className="font-mono text-gray-900">{upcomingBatch.batchNumber}</strong>
                    </div>
                    <div className="flex justify-between border-b border-purple-200/40 pb-1">
                      <span className="text-gray-600">Purchase Rate:</span>
                      <strong className="font-mono text-gray-900">₹ {Number(upcomingBatch.purchaseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between border-b border-purple-200/40 pb-1">
                      <span className="text-gray-600">Selling Price:</span>
                      <strong className="font-mono text-purple-700">₹ {Number(upcomingBatch.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Qty:</span>
                      <strong className="font-mono text-purple-700">{upcomingBatch.currentStock ?? upcomingBatch.quantityRemaining ?? 0} {unitName}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-gray-400 text-xs italic flex flex-col items-center justify-center h-[90px]">
                    <span>No upcoming batch in queue</span>
                    <span className="text-[10px] text-gray-400 font-normal">Next purchase will create new batch layer</span>
                  </div>
                )}
              </div>
            </div>

            {/* BATCH PRICING HISTORY TABLE */}
            <div className="space-y-1.5 pt-1">
              <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between">
                <span>Batch Pricing History</span>
                <span className="text-[10px] font-normal text-gray-500">Right-click (Desktop) or Long-press (Mobile) row to edit price</span>
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">Batch / Lot</th>
                      <th className="py-2 px-2.5 text-right">Purchase Rate</th>
                      <th className="py-2 px-2.5 text-right">Selling Price</th>
                      <th className="py-2 px-2.5 text-center">Purchased Qty</th>
                      <th className="py-2 px-2.5 text-center">Remaining Qty</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedBatches.length > 0 ? (
                      sortedBatches.map((b, idx) => {
                        const status = b.status || ((b.currentStock > 0 || b.quantityRemaining > 0) ? (currentActiveBatch?._id === b._id ? 'ACTIVE' : 'UPCOMING') : 'DEPLETED');
                        const isCurrentActive = status === 'ACTIVE';

                        return (
                          <tr
                            key={b._id || idx}
                            onContextMenu={(e) => handleBatchContextMenu(e, b)}
                            onTouchStart={(e) => handleBatchTouchStart(e, b)}
                            onTouchMove={handleBatchTouchMove}
                            onTouchEnd={handleBatchTouchEnd}
                            onTouchCancel={handleBatchTouchEnd}
                            className={`select-none cursor-pointer transition-colors ${isCurrentActive ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-gray-50/70'}`}
                            title="Right-click or Long-press to edit price"
                          >
                            <td className="py-2.5 px-2.5 font-mono font-bold text-gray-900">{b.batchNumber}</td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-gray-700">₹ {Number(b.purchaseRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-[#047857]">
                              ₹ {Number(b.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-mono text-gray-600">{b.initialQuantity ?? b.quantityPurchased ?? 0}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-900">{b.currentStock ?? b.quantityRemaining ?? 0}</td>
                            <td className="py-2.5 px-2.5 text-center">
                              {status === 'ACTIVE' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold badge-agri-active">ACTIVE</span>}
                              {status === 'UPCOMING' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">UPCOMING</span>}
                              {status === 'DEPLETED' && <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">DEPLETED</span>}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-400 italic text-xs">
                          No purchase batch history available for this product.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= STOCK HISTORY TAB ================= */}
        {activeTab === 'Stock History' && (
          <div className="space-y-3 pt-1">
            {/* Sub-tab selection bar */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setHistorySubTab('movements')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer text-center ${
                  historySubTab === 'movements' ? 'bg-white text-[#00783C] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Movements ({stockHistoryList.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('purchases')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer text-center ${
                  historySubTab === 'purchases' ? 'bg-white text-[#00783C] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Purchase History ({purchaseHistoryList.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('sales')}
                className={`flex-1 py-1 rounded-md transition-all cursor-pointer text-center ${
                  historySubTab === 'sales' ? 'bg-white text-[#00783C] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sales History ({salesHistoryList.length})
              </button>
            </div>

            {/* SUB-VIEW 1: ALL STOCK MOVEMENTS */}
            {historySubTab === 'movements' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[9px] sticky top-0 bg-gray-50">
                      <tr>
                        <th className="py-2 px-2">Date & Time</th>
                        <th className="py-2 px-2 text-center">Type</th>
                        <th className="py-2 px-2">Batch / Lot</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Purchase Rate</th>
                        <th className="py-2 px-2 text-right">Selling Price</th>
                        <th className="py-2 px-2 text-center">Stock After</th>
                        <th className="py-2 px-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {stockHistoryList.length > 0 ? (
                        stockHistoryList.map((m, idx) => {
                          const isPositive = Number(m.quantity) > 0;
                          return (
                            <tr key={m.id || idx} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2 px-2 text-gray-700 whitespace-nowrap font-sans">{m.date}</td>
                              <td className="py-2 px-2 text-center whitespace-nowrap font-sans">
                                {m.type === 'PURCHASE' && <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">PURCHASE</span>}
                                {m.type === 'SALE' && <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">SALE</span>}
                                {(m.type === 'SALE_RETURN' || m.type === 'RETURN') && <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">RETURN</span>}
                                {m.type === 'PURCHASE_RETURN' && <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800">PUR-RETURN</span>}
                                {m.type !== 'PURCHASE' && m.type !== 'SALE' && m.type !== 'SALE_RETURN' && m.type !== 'RETURN' && m.type !== 'PURCHASE_RETURN' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-100 text-gray-700">{m.type}</span>
                                )}
                              </td>
                              <td className="py-2 px-2 font-bold text-gray-900 whitespace-nowrap">{m.batchNumber || 'N/A'}</td>
                              <td className={`py-2 px-2 text-center font-bold whitespace-nowrap ${isPositive ? 'text-emerald-700' : 'text-blue-700'}`}>
                                {m.formattedQuantity || (isPositive ? `+${m.quantity}` : m.quantity)}
                              </td>
                              <td className="py-2 px-2 text-right text-gray-700 whitespace-nowrap">₹ {Number(m.purchaseRate || 0).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right text-gray-900 font-bold whitespace-nowrap">₹ {Number(m.sellingPrice || 0).toFixed(2)}</td>
                              <td className="py-2 px-2 text-center font-bold text-gray-900 whitespace-nowrap">{m.stockAfter}</td>
                              <td className="py-2 px-2 text-gray-600 font-sans whitespace-nowrap truncate max-w-[100px]">{m.reference}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-gray-400 italic text-xs font-sans">
                            No stock movement records found in database for this product.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: PURCHASE HISTORY */}
            {historySubTab === 'purchases' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[9px] sticky top-0 bg-gray-50">
                      <tr>
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Invoice / Reference</th>
                        <th className="py-2 px-2.5">Batch</th>
                        <th className="py-2 px-2.5 text-center">Qty</th>
                        <th className="py-2 px-2.5 text-right">Purchase Rate</th>
                        <th className="py-2 px-2.5 text-right">Selling Price</th>
                        <th className="py-2 px-2.5">Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {purchaseHistoryList.length > 0 ? (
                        purchaseHistoryList.map((p, idx) => (
                          <tr key={p.id || idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-2 px-2.5 font-sans text-gray-700 whitespace-nowrap">{p.date}</td>
                            <td className="py-2 px-2.5 font-sans font-medium text-gray-900 whitespace-nowrap">{p.invoiceNumber}</td>
                            <td className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap">{p.batchNumber}</td>
                            <td className="py-2 px-2.5 text-center font-bold text-emerald-700 whitespace-nowrap">+{p.quantity}</td>
                            <td className="py-2 px-2.5 text-right text-gray-800 whitespace-nowrap">₹ {Number(p.purchaseRate || p.rate || 0).toFixed(2)}</td>
                            <td className="py-2 px-2.5 text-right text-gray-900 font-bold whitespace-nowrap">₹ {Number(p.sellingPrice || 0).toFixed(2)}</td>
                            <td className="py-2 px-2.5 font-sans text-gray-600 whitespace-nowrap truncate max-w-[120px]">{p.supplierName}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-400 italic text-xs font-sans">
                            No purchase history found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: SALES HISTORY */}
            {historySubTab === 'sales' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[9px] sticky top-0 bg-gray-50">
                      <tr>
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Invoice #</th>
                        <th className="py-2 px-2.5">Batch</th>
                        <th className="py-2 px-2.5 text-center">Qty Sold</th>
                        <th className="py-2 px-2.5 text-right">Selling Price</th>
                        <th className="py-2 px-2.5 text-right">COGS</th>
                        <th className="py-2 px-2.5 text-right">Profit / Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {salesHistoryList.length > 0 ? (
                        salesHistoryList.map((s, idx) => {
                          const unitProfit = s.unitProfit !== undefined ? s.unitProfit : (s.sellingPrice - s.cogs);
                          return (
                            <tr key={s.id || idx} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2 px-2.5 font-sans text-gray-700 whitespace-nowrap">{s.date}</td>
                              <td className="py-2 px-2.5 font-sans font-medium text-gray-900 whitespace-nowrap">{s.invoiceNumber}</td>
                              <td className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap">{s.batchNumber}</td>
                              <td className="py-2 px-2.5 text-center font-bold text-blue-700 whitespace-nowrap">{s.quantity}</td>
                              <td className="py-2 px-2.5 text-right text-gray-900 font-bold whitespace-nowrap">₹ {Number(s.sellingPrice || s.price || 0).toFixed(2)}</td>
                              <td className="py-2 px-2.5 text-right text-gray-600 whitespace-nowrap">₹ {Number(s.cogs || 0).toFixed(2)}</td>
                              <td className="py-2 px-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                                ₹ {Number(unitProfit).toFixed(2)} / unit
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-400 italic text-xs font-sans">
                            No sales history found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= NOTES TAB ================= */}
        {activeTab === 'Notes' && (
          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-gray-900 text-xs">Product Notes</h4>
            <div className="p-3.5 bg-gray-50/60 border border-gray-200/80 rounded-xl space-y-2 text-xs">
              <p className="text-gray-700 leading-relaxed">
                {descriptionText || 'No custom notes recorded for this product.'}
              </p>
              <div className="text-[10px] text-gray-400 border-t border-gray-200/60 pt-2 flex justify-between">
                <span>Category: {categoryName}</span>
                <span>Brand: {companyName}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Bar */}
      <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="text-[10px] text-gray-500 font-mono">
          Product ID: <span className="font-semibold text-gray-700">{productId}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
        >
          Close
        </button>
      </div>

      {/* VEDIXA BATCH CONTEXT MENU */}
      {contextMenu.visible && contextMenu.batch && (
        <>
          <div
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setContextMenu({ visible: false, x: 0, y: 0, batch: null })}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ visible: false, x: 0, y: 0, batch: null });
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${Math.min(contextMenu.y, window.innerHeight - 130)}px`,
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
            }}
            className="z-50 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold font-mono text-gray-500 bg-gray-50/80">
              Batch {contextMenu.batch.batchNumber}
            </div>
            <button
              type="button"
              onClick={() => openPriceEditModal(contextMenu.batch, 'purchase')}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-[#047857] flex items-center gap-2 font-medium cursor-pointer transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-[#047857]" />
              <span>Edit Purchase Price</span>
            </button>
            <button
              type="button"
              onClick={() => openPriceEditModal(contextMenu.batch, 'selling')}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-[#047857] flex items-center gap-2 font-medium cursor-pointer transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-[#047857]" />
              <span>Edit Selling Price</span>
            </button>
          </div>
        </>
      )}

      {/* PRICE EDIT MODAL */}
      {editModal.isOpen && editModal.batch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-[#047857] to-emerald-700 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {editModal.mode === 'purchase' ? <Tag className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                <span>Edit {editModal.mode === 'purchase' ? 'Purchase Price' : 'Selling Price'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, mode: 'selling', batch: null })}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Product:</span>
                  <strong className="text-gray-900 font-semibold">{productName}</strong>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-gray-500 font-sans font-medium">Batch Number:</span>
                  <strong className="text-gray-900">{editModal.batch.batchNumber}</strong>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-gray-500 font-sans font-medium">
                    Current {editModal.mode === 'purchase' ? 'Purchase Rate' : 'Selling Price'}:
                  </span>
                  <strong className="text-[#047857]">
                    ₹ {Number(editModal.mode === 'purchase' ? editModal.batch.purchaseRate || 0 : editModal.batch.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-700">
                  New {editModal.mode === 'purchase' ? 'Purchase Price' : 'Selling Price'} (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#047857] focus:border-transparent bg-white shadow-2xs"
                    placeholder="0.00"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveModalPrice();
                      if (e.key === 'Escape') setEditModal({ isOpen: false, mode: 'selling', batch: null });
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 pt-0.5">
                  Monetary value will be rounded exactly to 2 decimal places. Quantity & FIFO layer stay unchanged.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, mode: 'selling', batch: null })}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalPrice}
                disabled={updateBatchMutation.isPending}
                className="px-4 py-1.5 btn-agri-primary rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {updateBatchMutation.isPending ? 'Saving...' : 'Save Price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return cardContent;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-[650px] bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {cardContent}
      </div>
    </div>
  );
}
