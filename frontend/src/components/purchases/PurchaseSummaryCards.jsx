import React from 'react';
import { Calculator, TrendingUp, Clock, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PurchaseSummaryCards({
  totalItemsCount = 0,
  totalQty = 0,
  totalInvoiceAmount = 0,
  totalDiscount = 0,
  paidAmount = 0,
  selectedSupplier,
  advanceAvailable = 0,
  advanceUsed = 0,
  payableAfterAdvance = 0,
  dueAmount = 0,
  finalSupplierBalance = 0,
  lowStockItemsCount = 0,
  recentPurchases = [],
  isLoadingRecent = false,
}) {
  const navigate = useNavigate();
  const paidVal = Number(paidAmount) || 0;
  const prevDue = Number(selectedSupplier?.outstandingBalance || 0);

  // Format date helper for recent purchases
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-3.5 font-sans">
      {/* 1. Purchase Summary Card */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#00783C] flex items-center justify-center shrink-0">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-bold text-gray-900">Purchase Summary</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Total Items</span>
            <span className="font-bold text-gray-900">{totalItemsCount}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Total Quantity</span>
            <span className="font-bold text-[#00783C]">{totalQty} Units</span>
          </div>

          <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-100">
            <span className="font-normal">Total Invoice Amount</span>
            <span className="font-bold text-gray-900">
              ₹ {Math.round(totalInvoiceAmount).toLocaleString('en-IN')}
            </span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span className="font-normal">Total Discount</span>
              <span className="font-bold text-gray-900">
                ₹ {Math.round(totalDiscount).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {advanceUsed > 0 && (
            <div className="flex justify-between items-center text-[#00783C] font-semibold">
              <span>Supplier Advance Used</span>
              <span>
                - ₹ {Math.round(advanceUsed).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {advanceUsed > 0 && (
            <div className="flex justify-between items-center text-gray-700 font-semibold">
              <span>Net Payable</span>
              <span className="text-gray-900 font-bold">
                ₹ {Math.round(payableAfterAdvance).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {prevDue > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span className="font-normal">Previous Supplier Due</span>
              <span className="font-bold text-purple-900">
                ₹ {Math.round(prevDue).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Paid Amount</span>
            <span className="font-bold text-[#00783C]">
              ₹ {Math.round(paidVal).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Highlighted Due Amount Banner */}
          <div className="pt-1">
            <div className={`p-2 rounded-xl flex justify-between items-center font-bold ${
              finalSupplierBalance <= 0
                ? 'bg-emerald-50 text-[#00783C]'
                : 'bg-[#FFF7ED] text-[#C2410C]'
            }`}>
              <span className="text-xs">
                {finalSupplierBalance < 0 ? 'Supplier Advance Balance' : 'Due Amount'}
              </span>
              <span className="text-xs sm:text-sm">
                {finalSupplierBalance < 0
                  ? `₹ ${Math.round(Math.abs(finalSupplierBalance)).toLocaleString('en-IN')}`
                  : `₹ ${Math.round(dueAmount).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stock Impact (After Saving) */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#00783C] flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-bold text-gray-900">Stock Impact (After Saving)</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Total Stock Increase</span>
            <span className="font-bold text-[#00783C]">+{totalQty} Units</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Products Added/Updated</span>
            <span className="font-bold text-gray-900">{totalItemsCount} Types</span>
          </div>
        </div>
      </div>

      {/* 3. Supplier Balance Impact */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[14px] font-bold text-gray-900">Supplier Ledger Impact</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Previous Balance</span>
            <span className={`font-bold ${prevDue < 0 ? 'text-[#00783C]' : 'text-gray-900'}`}>
              {prevDue < 0
                ? `-₹ ${Math.round(Math.abs(prevDue)).toLocaleString('en-IN')} (Advance)`
                : `₹ ${Math.round(prevDue).toLocaleString('en-IN')}`}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="font-normal">Purchase Bill Added</span>
            <span className="font-bold text-amber-600">
              + ₹ {Math.round(totalInvoiceAmount).toLocaleString('en-IN')}
            </span>
          </div>

          {paidVal > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span className="font-normal">Payment Deducted</span>
              <span className="font-bold text-[#00783C]">
                - ₹ {Math.round(paidVal).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-900 pt-1.5 border-t border-gray-100 font-bold">
            <span>Total Running Balance</span>
            <span className={finalSupplierBalance <= 0 ? 'text-[#00783C]' : 'text-red-600'}>
              {finalSupplierBalance === 0
                ? '₹ 0'
                : finalSupplierBalance < 0
                ? `-₹ ${Math.round(Math.abs(finalSupplierBalance)).toLocaleString('en-IN')} (Advance)`
                : `₹ ${Math.round(finalSupplierBalance).toLocaleString('en-IN')}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(selectedSupplier?._id ? `/suppliers/${selectedSupplier._id}/ledger` : '/suppliers')}
            className="text-xs font-bold text-[#00783C] flex items-center gap-1 hover:underline pt-1 cursor-pointer"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4. Recent Purchases */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[14px] font-bold text-gray-900">Recent Purchases</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="text-xs font-semibold text-[#00783C] hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        <div className="space-y-2">
          {isLoadingRecent ? (
            <div className="p-3 text-center text-gray-400 text-xs">Loading recent purchases...</div>
          ) : recentPurchases && recentPurchases.length > 0 ? (
            recentPurchases.slice(0, 3).map((pur) => {
              const purNo = pur.purchaseNumber || pur.supplierInvoiceNumber || 'INV';
              const sName = pur.supplierId?.name || pur.supplierId?.companyName || pur.supplierName || 'Supplier';
              const totAmt = Number(pur.totalAmount || pur.invoiceAmount || 0);
              const pStatus = pur.paymentStatus || (Number(pur.dueAmount || 0) <= 0 ? 'Paid' : Number(pur.paidAmount || 0) > 0 ? 'Partial' : 'Unpaid');
              const dateStr = formatDateDisplay(pur.purchaseDate || pur.createdAt);

              const isPaid = pStatus.toLowerCase() === 'paid';
              const isPartial = pStatus.toLowerCase() === 'partial' || pStatus.toLowerCase() === 'partially_paid';

              return (
                <div key={pur._id || pur.id} className="p-2.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 block truncate max-w-[130px] font-mono">{purNo}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isPaid
                        ? 'bg-[#ECFDF5] text-[#00783C] border border-[#A7F3D0]'
                        : isPartial
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      ₹{totAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate max-w-[130px]">{sName}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{dateStr}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-gray-400 text-xs">No recent purchases found</div>
          )}
        </div>
      </div>

      {/* 5. Tips Box */}
      <div className="p-4 bg-[#FAF5FF] border border-[#F3E8FF] rounded-2xl space-y-2 text-xs text-purple-900 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-purple-900">
          <Lightbulb className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="text-xs uppercase tracking-wide">Tips</span>
        </div>
        <ul className="text-[11px] text-purple-800/90 space-y-2 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
            <span>Search any product. Master values auto-fill into table rows.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
            <span>Advance payments automatically adjust against supplier balance.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
            <span>Every purchase and payment is logged as a separate ledger entry.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
