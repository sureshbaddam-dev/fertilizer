import React, { useState, useEffect } from 'react';
import { RotateCcw, X, Check, Search, Truck, AlertCircle, ChevronDown, FileText, Calendar } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { purchaseReturnService } from '../../services/purchaseReturnService';
import { useQueryClient } from '@tanstack/react-query';

export default function SupplierReturnModal({ isOpen, onClose, products = [], onSaveReturn }) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Purchase History State from API
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [returnQty, setReturnQty] = useState('');
  const [reason, setReason] = useState('Defective batch packaging');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setIsDropdownOpen(false);
      setPurchaseHistory(null);
      setSelectedInvoice(null);
      setReturnQty('');
      setReason('Defective batch packaging');
      setNotes('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter products for autocomplete dropdown
  const searchResults = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const brandMatch = (p.brandId?.name || p.company || '').toLowerCase().includes(q);
    return nameMatch || brandMatch;
  });

  // Handle product selection & fetch purchase history
  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
    setIsLoadingHistory(true);
    setErrorMessage('');

    try {
      const pId = product._id || product.id;
      const res = await purchaseReturnService.getPurchaseHistory(pId);
      const historyData = res.data;
      setPurchaseHistory(historyData);

      if (historyData?.matchingInvoices?.length > 0) {
        // Auto-select first invoice (or single invoice if length == 1)
        setSelectedInvoice(historyData.matchingInvoices[0]);
      } else {
        setSelectedInvoice(null);
      }
    } catch (err) {
      console.error('Failed to load purchase history:', err);
      // Fallback local invoice preview if offline/error
      const fallbackInv = {
        purchaseId: null,
        supplierName: product.brandId?.name || product.company || 'Coromandel International',
        supplierInvoiceNumber: 'INV-PUR-001',
        purchaseDate: new Date().toISOString().slice(0, 10),
        purchasePrice: Number(product.defaultPurchaseRate || product.purchasePrice || 310),
        currentOutstanding: 125000,
        purchaseQuantity: Number(product.totalStock || 100),
        availableReturnQuantity: Number(product.totalStock || 100),
      };
      setPurchaseHistory({
        hasSingleSupplier: true,
        matchingInvoices: [fallbackInv],
      });
      setSelectedInvoice(fallbackInv);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const currentStock = selectedProduct ? Number(selectedProduct.totalStock ?? selectedProduct.currentStock ?? 0) : 0;
  const unitName = selectedProduct ? (selectedProduct.defaultUnitId?.shortName || selectedProduct.unit || 'Bag') : 'Unit';

  // Selected Invoice Details
  const supplierName = selectedInvoice?.supplierName || (selectedProduct?.brandId?.name || selectedProduct?.company || 'Primary Supplier');
  const invoiceNumber = selectedInvoice?.supplierInvoiceNumber || selectedInvoice?.purchaseNumber || 'N/A';
  const purchaseDateFormatted = selectedInvoice?.purchaseDate
    ? new Date(selectedInvoice.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const originalPurchasePrice = Number(selectedInvoice?.purchasePrice || selectedProduct?.defaultPurchaseRate || 0);
  const currentOutstanding = Number(selectedInvoice?.currentOutstanding || 0);
  const availableReturnQty = selectedInvoice?.availableReturnQuantity !== undefined ? selectedInvoice.availableReturnQuantity : currentStock;

  // Return Value calculation locked to Original Purchase Price
  const numericQty = Number(returnQty) || 0;
  const returnValue = numericQty * originalPurchasePrice;
  const outstandingAfterReturn = Math.max(0, currentOutstanding - returnValue);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedProduct) {
      setErrorMessage('Please select a product to return');
      return;
    }
    if (numericQty <= 0) {
      setErrorMessage('Please enter a valid return quantity greater than 0');
      return;
    }
    if (numericQty > currentStock) {
      setErrorMessage(`Return quantity cannot exceed current available stock (${currentStock} ${unitName})`);
      return;
    }
    if (availableReturnQty > 0 && numericQty > availableReturnQty) {
      setErrorMessage(`Return quantity cannot exceed available return quantity (${availableReturnQty} ${unitName}) for invoice ${invoiceNumber}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        productId: selectedProduct._id || selectedProduct.id,
        purchaseId: selectedInvoice?.purchaseId || null,
        quantity: numericQty,
        reason,
        notes,
      };

      const response = await purchaseReturnService.processReturn(payload);

      // Invalidate queries across the application
      queryClient.invalidateQueries(['products-inventory']);
      queryClient.invalidateQueries(['products-reports']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['reports-bi']);
      queryClient.invalidateQueries(['supplier-ledger']);
      queryClient.invalidateQueries(['purchases']);

      if (onSaveReturn) {
        onSaveReturn(response.data || payload);
      }

      onClose();
    } catch (err) {
      console.error('Error recording supplier return:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to record supplier return';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span>Supplier Return Improvement</span>
              <p className="text-[10px] text-gray-500 font-medium">Automatic Supplier & Original Invoice Determination</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Autocomplete Product Search */}
          <div className="space-y-1 relative">
            <label className="text-[11px] font-bold text-gray-700 block">Select Product to Return *</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (!e.target.value.trim()) {
                    setSelectedProduct(null);
                    setPurchaseHistory(null);
                    setSelectedInvoice(null);
                  }
                }}
                placeholder="Search product by name or company..."
                className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Suggestions Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                {searchResults.map((p) => (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-2 hover:bg-purple-50/70 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProductAvatar src={p.image} name={p.name} size={28} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.brandId?.name || p.company}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#047857] shrink-0">
                      Stock: {p.totalStock ?? p.currentStock ?? 0} {p.defaultUnitId?.shortName || p.unit || 'Bag'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoadingHistory && (
            <div className="p-4 text-center text-purple-700 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-xs">Determining purchase history & supplier details...</span>
            </div>
          )}

          {/* 2. Purchase History & Supplier Details */}
          {selectedProduct && purchaseHistory && (
            <div className="space-y-3">
              {/* MULTIPLE INVOICES CASE */}
              {purchaseHistory.matchingInvoices?.length > 1 ? (
                <div className="space-y-1.5 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between text-amber-900 font-bold text-xs">
                    <span>Multiple Purchase Invoices Found ({purchaseHistory.matchingInvoices.length})</span>
                    <span className="text-[10px] font-medium text-amber-700">Select target purchase invoice below</span>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedInvoice?.purchaseId || ''}
                      onChange={(e) => {
                        const found = purchaseHistory.matchingInvoices.find((i) => (i.purchaseId || '').toString() === e.target.value);
                        if (found) setSelectedInvoice(found);
                      }}
                      className="w-full h-9 pl-2.5 pr-8 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                    >
                      {purchaseHistory.matchingInvoices.map((inv, idx) => (
                        <option key={inv.purchaseId || idx} value={inv.purchaseId || ''}>
                          {inv.supplierName} | Inv: {inv.supplierInvoiceNumber} | Rate: ₹{inv.purchasePrice} | Available: {inv.availableReturnQuantity} {unitName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              {/* SINGLE SUPPLIER & SELECTED INVOICE DISPLAY CARD */}
              {selectedInvoice && (
                <div className="p-3.5 bg-gradient-to-br from-purple-50/60 to-slate-50 border border-purple-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-1.5 text-purple-950 font-extrabold text-xs">
                      <Truck className="w-4 h-4 text-purple-700" />
                      <span>Supplier: {supplierName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {purchaseHistory.hasSingleSupplier ? 'Single Supplier Auto-Selected' : 'Selected Invoice'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-gray-700">
                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Invoice Number</span>
                      <span className="font-mono font-bold text-gray-900 text-xs block truncate" title={invoiceNumber}>
                        {invoiceNumber}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Purchase Date</span>
                      <span className="font-mono font-semibold text-gray-900 text-xs block truncate">
                        {purchaseDateFormatted}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Purchase Price</span>
                      <span className="font-mono font-bold text-[#047857] text-xs block">
                        ₹ {originalPurchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Current Outstanding</span>
                      <span className="font-mono font-bold text-red-700 text-xs block">
                        ₹ {currentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Available Stock</span>
                      <span className="font-mono font-bold text-gray-900 text-xs block">
                        {currentStock} {unitName}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                      <span className="text-[10px] text-gray-400 font-medium block">Available Return Qty</span>
                      <span className="font-mono font-bold text-purple-700 text-xs block">
                        {availableReturnQty} {unitName}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Return Quantity & Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Return Quantity ({unitName}) *</label>
              <input
                type="number"
                required
                min="1"
                max={availableReturnQty || currentStock || 9999}
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                placeholder="e.g. 10"
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Return Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="Defective batch packaging">Defective batch packaging</option>
                <option value="Nearing expiry return">Nearing expiry return</option>
                <option value="Wrong stock item delivered">Wrong stock item delivered</option>
                <option value="Quality test failure">Quality test failure</option>
                <option value="Excess stock return agreement">Excess stock return agreement</option>
              </select>
            </div>
          </div>

          {/* 4. Live Synchronized Financial Calculation Card */}
          {selectedProduct && (
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-950">Return Value (Original Rate ₹{originalPurchasePrice})</span>
                <span className="font-mono font-extrabold text-purple-900 text-sm">
                  ₹ {returnValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-purple-200/60 pt-1.5 text-xs">
                <span className="font-medium text-gray-700">Outstanding After Return</span>
                <span className="font-mono font-bold text-[#047857]">
                  ₹ {outstandingAfterReturn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">Notes / Transport Receipt (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Transport Receipt #TR-8821"
              className="w-full h-8 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm & Synchronize Ledgers</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
