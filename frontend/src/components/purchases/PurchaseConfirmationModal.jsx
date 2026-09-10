import React from 'react';
import { ShoppingBag, X, Calendar, User, Package, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function PurchaseConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  errorMessage = '',
  purchaseData = {},
}) {
  if (!isOpen) return null;

  const {
    supplier,
    purchaseNumber,
    purchaseDate,
    totalItemsCount = 0,
    totalQty = 0,
    totalInvoiceAmount = 0,
    advanceAvailable = 0,
    advanceUsed = 0,
    payableAfterAdvance = 0,
    paidAmount = 0,
    dueAmount = 0,
    finalSupplierBalance = 0,
    notes = '',
  } = purchaseData;

  const prevDue = Number(supplier?.outstandingBalance || 0);
  const paidVal = Number(paidAmount) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 font-sans animate-in zoom-in-95 duration-150 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00783C] text-white flex items-center justify-center shadow-2xs shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Purchase Confirmation</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">Please review the summary before confirming the purchase</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Purchase Header Metadata */}
        <div className="grid grid-cols-2 gap-2.5 p-3 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Supplier</span>
            <span className="font-bold text-gray-900 block truncate mt-0.5">{supplier?.name || supplier?.companyName || 'Selected Supplier'}</span>
            {supplier?.mobile && <span className="text-[11px] text-gray-500 block">{supplier.mobile}</span>}
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Purchase No. &amp; Date</span>
            <span className="font-bold font-mono text-[#00783C] block mt-0.5">{purchaseNumber}</span>
            <span className="text-[11px] text-gray-500 block">{purchaseDate}</span>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="border border-gray-200/90 rounded-xl overflow-hidden shadow-2xs text-xs">
          <div className="bg-[#F8FAFC] px-3.5 py-2 border-b border-gray-200 font-bold text-gray-700 flex justify-between">
            <span>Accounting Summary</span>
            <span className="text-gray-500 font-normal">{totalItemsCount} Items • {totalQty} Units</span>
          </div>

          <div className="p-3.5 space-y-2 bg-white">
            <div className="flex justify-between items-center text-gray-600">
              <span className="font-normal">Bill Total</span>
              <span className="font-bold text-gray-900">
                ₹ {totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {advanceUsed > 0 && (
              <div className="flex justify-between items-center text-[#00783C] font-semibold">
                <span>Supplier Advance Used</span>
                <span>
                  - ₹ {advanceUsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {advanceUsed > 0 && (
              <div className="flex justify-between items-center text-gray-700 font-semibold">
                <span>Amount Payable</span>
                <span className="font-bold text-gray-900">
                  ₹ {payableAfterAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {prevDue > 0 && (
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-normal">Supplier Previous Due</span>
                <span className="font-bold text-purple-900">
                  ₹ {prevDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-gray-600 pt-1.5 border-t border-gray-100">
              <span className="font-normal">Paid Amount</span>
              <span className="font-bold text-[#00783C]">
                ₹ {paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Highlighted Due Amount strip */}
            <div className={`p-2.5 rounded-xl flex justify-between items-center font-bold ${
              finalSupplierBalance <= 0
                ? 'bg-emerald-50 text-[#00783C] border border-emerald-200'
                : 'bg-[#FFF7ED] text-[#C2410C] border border-amber-200/80'
            }`}>
              <span className="text-xs">
                {finalSupplierBalance < 0 ? 'Supplier Advance Balance' : 'Due Amount'}
              </span>
              <span className="text-xs sm:text-sm font-bold">
                {finalSupplierBalance < 0
                  ? `₹ ${Math.abs(finalSupplierBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `₹ ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>

            {/* Total Supplier Running Balance */}
            <div className="flex justify-between items-center pt-1 text-gray-900 font-bold">
              <span>Final Supplier Balance</span>
              <span className={finalSupplierBalance <= 0 ? 'text-[#00783C]' : 'text-red-600'}>
                {finalSupplierBalance === 0
                  ? '₹ 0.00'
                  : finalSupplierBalance < 0
                  ? `-₹ ${Math.abs(finalSupplierBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Advance)`
                  : `₹ ${finalSupplierBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Impact Note */}
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-[#00783C] shrink-0" />
          <span>Inventory stock will increase by <strong className="text-[#00783C] font-bold">{totalQty} Units</strong> across {totalItemsCount} items upon saving.</span>
        </div>

        {/* Error Banner if API call failed */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Purchase could not be saved</span>
              <span className="text-[11px] text-red-600 font-normal">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-[38px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-[38px] px-5 bg-[#00783C] hover:bg-[#006030] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Purchase...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Save</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
