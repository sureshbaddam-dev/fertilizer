import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Search,
  Package,
  Boxes,
  AlertCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { toast } from '../../contexts/ToastContext';

export default function OpeningStockListModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Edit Modal
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    batchNumber: '',
    quantity: '',
    purchaseRate: '',
    unit: 'Units',
  });

  // State for Delete Modal
  const [deletingItem, setDeletingItem] = useState(null);

  const { data: apiResponse, isLoading, isError } = useQuery({
    queryKey: ['opening-stock-list-modal'],
    queryFn: () => productService.getOpeningStocks(),
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  const openingStocksList = useMemo(() => {
    const raw = apiResponse?.data?.openingStocks || apiResponse?.openingStocks || [];
    return Array.isArray(raw) ? raw : [];
  }, [apiResponse]);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return openingStocksList;
    return openingStocksList.filter((item) => {
      const pName = (item.productName || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const batch = (item.batchNumber || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      return pName.includes(q) || brand.includes(q) || batch.includes(q) || cat.includes(q);
    });
  }, [openingStocksList, searchTerm]);

  // Reconciled totals
  const totalQty = useMemo(() => {
    return openingStocksList.reduce((sum, item) => sum + Number(item.initialQuantity || item.currentStock || 0), 0);
  }, [openingStocksList]);

  const totalValue = useMemo(() => {
    return openingStocksList.reduce((sum, item) => {
      const qty = Number(item.initialQuantity || item.currentStock || 0);
      const rate = Number(item.purchaseRate || 0);
      return sum + (qty * rate);
    }, 0);
  }, [openingStocksList]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.updateOpeningStock(id, data),
    onSuccess: () => {
      toast.success('Opening stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['opening-stock-list-modal'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bi-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['product-history'] });
      setEditingItem(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update opening stock';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.deleteOpeningStock(id),
    onSuccess: () => {
      toast.success('Opening stock batch deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['opening-stock-list-modal'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bi-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['product-history'] });
      setDeletingItem(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete opening stock';
      toast.error(msg);
    },
  });

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      batchNumber: item.batchNumber || '',
      quantity: item.initialQuantity || item.currentStock || '',
      purchaseRate: item.purchaseRate || '',
      unit: item.unit || 'Units',
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const batchId = editingItem._id || editingItem.id;
    const qty = Number(editForm.quantity);
    const rate = Number(editForm.purchaseRate);

    if (isNaN(qty) || qty < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid opening rate');
      return;
    }

    updateMutation.mutate({
      id: batchId,
      data: {
        batchNumber: editForm.batchNumber.trim(),
        quantity: qty,
        purchaseRate: rate,
        unit: editForm.unit,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const batchId = deletingItem._id || deletingItem.id;
    deleteMutation.mutate(batchId);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">Opening Stock Details</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  Batch Level
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Detailed list of all recorded opening stock batches with live Edit and Delete management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200/80">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Batches Recorded</span>
            <span className="text-base font-black font-mono text-slate-900">
              {openingStocksList.length} Batches
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Opening Quantity</span>
            <span className="text-base font-black font-mono text-slate-900">
              {totalQty.toLocaleString('en-IN')} Units
            </span>
          </div>

          <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-black uppercase text-indigo-900 block">Total Opening Stock Value</span>
            <span className="text-base sm:text-lg font-black font-mono text-indigo-700">
              ₹ {Math.round(totalValue).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Search Control */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name, brand, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap hidden sm:inline">
            Showing {filteredList.length} of {openingStocksList.length} batches
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Loading opening stock records...</p>
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-red-600 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-xs font-bold">Failed to load opening stock records.</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">No Opening Stock Recorded</p>
              <p className="text-xs text-slate-400">
                {searchTerm ? 'No opening stock matches your search filter.' : 'No initial stock batches have been entered.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Opening Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total Value (₹)</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                  {filteredList.map((item, idx) => {
                    const qty = Number(item.initialQuantity || item.currentStock || 0);
                    const rate = Number(item.purchaseRate || 0);
                    const itemValue = Math.round(Number(item.initialValue || (qty * rate)));

                    return (
                      <tr key={item._id || item.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900">{item.productName || 'Item'}</div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.brand ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {item.brand}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {item.batchNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {qty.toLocaleString('en-IN')} <span className="text-[10px] text-slate-500 font-medium">{item.unit || 'Units'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                          ₹ {rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900 text-sm">
                          ₹ {itemValue.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Edit Batch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Delete Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Formula: Total Value = SUM(Opening Quantity × Opening Rate) across all batches</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Edit Opening Stock</h4>
                  <p className="text-[11px] text-slate-500">{editingItem.productName} {editingItem.brand ? `(${editingItem.brand})` : ''}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  value={editForm.batchNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Opening Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Opening Rate (₹ per unit)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={editForm.purchaseRate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, purchaseRate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              {/* Dynamic Value Calculation Card */}
              <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-900 uppercase block">Calculated Total Value</span>
                  <span className="text-xs text-indigo-700">
                    {Number(editForm.quantity || 0)} {editForm.unit} × ₹{Number(editForm.purchaseRate || 0)}
                  </span>
                </div>
                <span className="text-base font-black font-mono text-indigo-900">
                  ₹ {Math.round(Number(editForm.quantity || 0) * Number(editForm.purchaseRate || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Delete this opening stock entry?</h4>
                <p className="text-[11px] text-slate-500">
                  This action will permanently delete this specific batch from Opening Stock and adjust physical inventory stock accordingly.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="text-slate-900 font-bold">{deletingItem.productName}</span>
              </div>
              {deletingItem.brand && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Brand:</span>
                  <span className="text-slate-700">{deletingItem.brand}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Batch Number:</span>
                <span className="font-mono text-slate-800">{deletingItem.batchNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity:</span>
                <span className="font-mono text-slate-900">
                  {Number(deletingItem.initialQuantity || deletingItem.currentStock || 0)} {deletingItem.unit || 'Units'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Opening Stock Value:</span>
                <span className="font-mono font-black text-rose-700">
                  ₹ {Math.round(Number(deletingItem.initialValue || ((deletingItem.initialQuantity || deletingItem.currentStock || 0) * (deletingItem.purchaseRate || 0)))).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
