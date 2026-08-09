import React from 'react';
import { X, FileText, CheckCircle2, Clock, Calendar, Building, Package, CreditCard, Tag } from 'lucide-react';

export default function TransactionDetailsDrawer({
  isOpen,
  transaction = null,
  supplier = null,
  onClose,
}) {
  if (!isOpen || !transaction) return null;

  const isPurchase = transaction.transactionType === 'PURCHASE';
  const isPayment = transaction.transactionType === 'PAYMENT';
  const isAdjustment = transaction.transactionType === 'ADJUSTMENT' || transaction.notes?.includes('Opening');

  const dateStr = transaction.date
    ? new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const supplierObj = supplier || transaction.supplierId || {};
  const supplierName = supplierObj.name || 'Supplier';

  // Purchase specific fields
  const purchaseObj = transaction.purchaseId || {};
  const supplierInvoiceNo = purchaseObj.supplierInvoiceNumber || '—';
  const purchaseNo = purchaseObj.purchaseNumber || '—';
  const itemsList = purchaseObj.items || [];

  // Payment / Ref fields
  const refNo = transaction.referenceNumber || purchaseNo || '—';

  // Financials
  const purchaseAmt = isPurchase ? Number(transaction.purchaseAmount || purchaseObj.totalInvoiceAmount || 0) : 0;
  const paidAmt = isPayment ? Number(transaction.paidAmount || 0) : Number(purchaseObj.paidAmount || 0);
  const runningBal = Number(transaction.runningBalance || 0);
  const dueAmt = Number(purchaseObj.dueAmount || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-50 transform transition-transform ease-in-out duration-250 animate-in slide-in-from-right">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center font-bold">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">Transaction Details</h2>
              <p className="text-[11px] text-gray-500 font-medium">{dateStr}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

          {/* Top Status & Type Banner */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200/80 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Transaction Type</span>
              {isPurchase && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7E22CE]">
                  Purchase
                </span>
              )}
              {isPayment && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                  Payment
                </span>
              )}
              {isAdjustment && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFEDD5] text-[#C2410C]">
                  Adjustment
                </span>
              )}
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</span>
              {isPayment ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Success</span>
                </span>
              ) : runningBal === 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Paid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FFEDD5] text-[#C2410C]">
                  <Clock className="w-3 h-3" />
                  <span>Partial</span>
                </span>
              )}
            </div>
          </div>

          {/* Supplier Info */}
          <div className="p-3 bg-emerald-50/40 border border-emerald-100/80 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Supplier Name</span>
            <span className="text-sm font-bold text-gray-900 block">{supplierName}</span>
          </div>

          {/* Invoice & Reference Identifiers */}
          <div className="space-y-2 p-3 bg-white border border-gray-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1">
              Reference Numbers
            </span>

            {isPurchase && (
              <>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500">Supplier Invoice Number</span>
                  <span className="font-mono font-bold text-gray-900">{supplierInvoiceNo}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-500">Purchase Number</span>
                  <span className="font-mono font-semibold text-gray-800">{purchaseNo}</span>
                </div>
              </>
            )}

            {isPayment && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Payment Reference Number</span>
                <span className="font-mono font-bold text-gray-900">{refNo}</span>
              </div>
            )}

            {isAdjustment && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500">Reference Number</span>
                <span className="font-mono font-bold text-gray-900">{refNo}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-500">Transaction Date</span>
              <span className="font-medium text-gray-800">{dateStr}</span>
            </div>
          </div>

          {/* Purchased Line Items List (Only for Purchases) */}
          {isPurchase && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs">Purchased Items ({itemsList.length})</span>
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5 text-center">Qty</th>
                      <th className="py-2 px-2.5 text-right">Rate (₹)</th>
                      <th className="py-2 px-2.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-normal text-gray-800 text-[11px]">
                    {itemsList.length > 0 ? (
                      itemsList.map((item, idx) => {
                        const prodName = item.productId?.name || item.productName || 'Product Item';
                        const qty = Number(item.quantity || 1);
                        const rate = Number(item.purchaseRate || 0);
                        const total = Number(item.totalAmount || qty * rate);

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-2.5 font-semibold text-gray-900 max-w-[120px] truncate">{prodName}</td>
                            <td className="py-2 px-2.5 text-center font-mono">{qty}</td>
                            <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">₹ {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-gray-400 italic">No line items in this purchase</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="block md:hidden space-y-2">
                {itemsList.length > 0 ? (
                  itemsList.map((item, idx) => {
                    const prodName = item.productId?.name || item.productName || 'Product Item';
                    const qty = Number(item.quantity || 1);
                    const rate = Number(item.purchaseRate || 0);
                    const total = Number(item.totalAmount || qty * rate);

                    return (
                      <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5 text-xs font-sans">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                          <span className="font-bold text-gray-900 truncate max-w-[160px]">{prodName}</span>
                          <span className="font-mono font-bold text-[#047857]">₹ {total.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                          <span>Qty: {qty}</span>
                          <span>Rate: ₹ {rate.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-xs text-gray-400 py-2 italic">No line items in this purchase</p>
                )}
              </div>
            </div>
          )}

          {/* Financial Amounts Breakdown */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Financial Summary</span>
            
            {isPurchase && (
              <div className="flex justify-between items-center text-gray-700">
                <span>Total Purchase Amount</span>
                <span className="font-mono font-bold text-gray-900 text-sm whitespace-nowrap">
                  ₹ {purchaseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {(isPayment || paidAmt > 0) && (
              <div className="flex justify-between items-center text-emerald-800 font-semibold">
                <span>Paid Amount</span>
                <span className="font-mono font-bold text-sm whitespace-nowrap">
                  ₹ {(isPayment ? Number(transaction.paidAmount || 0) : paidAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {dueAmt > 0 && (
              <div className="flex justify-between items-center text-amber-800">
                <span>Invoice Due Amount</span>
                <span className="font-mono font-bold whitespace-nowrap">
                  ₹ {dueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-gray-900">
              <span>Running Outstanding Balance</span>
              <span className="font-mono text-sm whitespace-nowrap">
                ₹ {runningBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Notes / Payment Method */}
          <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              {isPayment ? 'Payment Method / Notes' : 'Notes / Remarks'}
            </span>
            <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
              {transaction.notes || (isPayment ? 'Direct Payment' : 'No extra notes recorded.')}
            </p>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
