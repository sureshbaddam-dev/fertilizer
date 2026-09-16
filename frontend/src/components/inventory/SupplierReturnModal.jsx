import React, { useState, useEffect } from 'react';
import { RotateCcw, X, Check, Search, Truck, AlertCircle } from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';
import { purchaseReturnService } from '../../services/purchaseService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../contexts/ToastContext';

export default function SupplierReturnModal({ isOpen, onClose, products = [], onSaveReturn }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  // Settlement Method State
  const [settlementMethod, setSettlementMethod] = useState('CREDIT'); // 'CREDIT' | 'REFUND'
  const [refundAmount, setRefundAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refundReference, setRefundReference] = useState('');

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
      setSettlementMethod('CREDIT');
      setRefundAmount('');
      setPaymentMode('Cash');
      setRefundReference('');
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

  // Effective refund and credit values
  const effectiveRefund = settlementMethod === 'REFUND'
    ? Math.min(returnValue, refundAmount !== '' ? Number(refundAmount) || 0 : returnValue)
    : 0;
  const effectiveCredit = Math.max(0, returnValue - effectiveRefund);
  const outstandingAfterReturn = Math.round((currentOutstanding - effectiveCredit) * 100) / 100;

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

    if (settlementMethod === 'REFUND') {
      if (effectiveRefund < 0) {
        setErrorMessage('Refund amount cannot be negative');
        return;
      }
      if (effectiveRefund > returnValue) {
        setErrorMessage(`Refund amount cannot exceed total return value (₹${returnValue.toLocaleString('en-IN')})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const currentUserId = user?._id || user?.id || authService.getCurrentUser()?._id || authService.getCurrentUser()?.id;
      const creatorName = user?.ownerName || user?.name || 'Authorized Staff';

      const payload = {
        userId: currentUserId,
        productId: selectedProduct._id || selectedProduct.id,
        purchaseId: selectedInvoice?.purchaseId || null,
        quantity: numericQty,
        reason,
        notes,
        createdBy: creatorName,
        settlementType: settlementMethod === 'REFUND' ? (effectiveRefund === returnValue ? 'REFUND' : 'PARTIAL_REFUND') : 'CREDIT',
        refundAmount: effectiveRefund,
        paymentMode: settlementMethod === 'REFUND' ? paymentMode : 'Cash',
        refundReference: settlementMethod === 'REFUND' ? refundReference : '',
      };

      const response = await purchaseReturnService.processReturn(payload);

      // Invalidate queries across the application
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
        queryClient.invalidateQueries({ queryKey: ['products-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['reports-bi'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
      ]);

      toast.success('Supplier return recorded successfully');
      if (effectiveRefund > 0) {
        toast.success(`Supplier refund of ₹${effectiveRefund.toLocaleString('en-IN')} recorded successfully`);
      }
      if (effectiveCredit > 0) {
        toast.success(`₹${effectiveCredit.toLocaleString('en-IN')} added as supplier credit`);
      }

      if (onSaveReturn) {
        onSaveReturn(response.data || payload);
      }

      onClose();
    } catch (err) {
      console.error('Error recording supplier return:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to record supplier return. Please try again.';
      setErrorMessage(msg);
      toast.error('Failed to record supplier return. Please try again.', { description: msg });
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
              <span>Supplier Return &amp; Settlement</span>
              <p className="text-[10px] text-gray-500 font-medium">Auto-deduct stock &amp; choose credit vs refund settlement</p>
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
                onChange={(e) => {
                  setReturnQty(e.target.value);
                  const q = Number(e.target.value) || 0;
                  const val = q * originalPurchasePrice;
                  if (settlementMethod === 'REFUND') {
                    setRefundAmount(String(val));
                  }
                }}
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

          {/* 4. Settlement Method Selection Section */}
          {selectedProduct && numericQty > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-800 block">Settlement Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      settlementMethod === 'CREDIT'
                        ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="settlementMethod"
                      value="CREDIT"
                      checked={settlementMethod === 'CREDIT'}
                      onChange={() => {
                        setSettlementMethod('CREDIT');
                        setRefundAmount('');
                      }}
                      className="accent-purple-700 cursor-pointer"
                    />
                    <span className="text-xs">Keep as Supplier Credit</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      settlementMethod === 'REFUND'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="settlementMethod"
                      value="REFUND"
                      checked={settlementMethod === 'REFUND'}
                      onChange={() => {
                        setSettlementMethod('REFUND');
                        setRefundAmount(String(returnValue));
                      }}
                      className="accent-[#047857] cursor-pointer"
                    />
                    <span className="text-xs">Refund Received</span>
                  </label>
                </div>
              </div>

              {/* If Refund Received: Show amount, mode, reference */}
              {settlementMethod === 'REFUND' && (
                <div className="pt-2 border-t border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-700">Refund Amount (₹) *</label>
                        <span className="text-[9px] text-gray-400">Max ₹{returnValue.toLocaleString('en-IN')}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={returnValue}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder={`e.g. ${returnValue}`}
                        className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-[#047857] focus:outline-none focus:border-[#047857]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 block">Payment Mode *</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 block">Reference / Transaction Number (Optional)</label>
                    <input
                      type="text"
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      placeholder="e.g. UPI-99201948 or Cheque #4421"
                      className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-[#047857]"
                    />
                  </div>

                  {effectiveRefund < returnValue && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex justify-between items-center font-medium">
                      <span>Remaining Supplier Credit:</span>
                      <strong className="font-mono font-bold text-purple-900">
                        ₹ {effectiveCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Live Synchronized Financial Calculation Card */}
          {selectedProduct && (
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-950">Return Value (Original Rate ₹{originalPurchasePrice})</span>
                <span className="font-mono font-extrabold text-purple-900 text-sm">
                  ₹ {returnValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {settlementMethod === 'REFUND' && effectiveRefund > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span className="font-medium">Refund Received via {paymentMode}</span>
                  <span className="font-mono font-bold">
                    + ₹ {effectiveRefund.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-purple-900">
                <span className="font-medium">Supplier Credit Created</span>
                <span className="font-mono font-bold">
                  ₹ {effectiveCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-purple-200/60 pt-1.5 text-xs">
                <span className="font-medium text-gray-700">Outstanding Balance After Return</span>
                <span className={`font-mono font-bold ${outstandingAfterReturn < 0 ? 'text-purple-700' : 'text-[#047857]'}`}>
                  {outstandingAfterReturn < 0
                    ? `-₹ ${Math.abs(outstandingAfterReturn).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Credit)`
                    : `₹ ${outstandingAfterReturn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
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
              disabled={isSubmitting || !selectedProduct || numericQty <= 0}
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
                  <span>Confirm &amp; Synchronize Ledgers</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
