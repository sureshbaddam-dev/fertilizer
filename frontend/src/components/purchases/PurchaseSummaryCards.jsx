import React from 'react';
import { FileText, TrendingUp, Wallet, Clock, HelpCircle, ArrowRight } from 'lucide-react';

export default function PurchaseSummaryCards({
  totalItemsCount = 0,
  totalQty = 0,
  totalInvoiceAmount = 0,
  paidAmount = 0,
  selectedSupplier,
}) {
  const paidVal = Number(paidAmount) || 0;
  const rawDueVal = totalInvoiceAmount - paidVal;
  const isAdvance = rawDueVal < 0;
  const prevDue = Number(selectedSupplier?.outstandingBalance || 0);
  const totalSupplierDue = prevDue + rawDueVal;
  const isSupplierAdvance = totalSupplierDue < 0;

  return (
    <div className="space-y-3">
      {/* 1. Purchase Summary Card */}
      <div className="p-3 bg-white border border-gray-200/80 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
          <FileText className="w-3.5 h-3.5 text-[#047857]" />
          <h3 className="text-[13px] font-medium text-gray-900">Purchase Summary</h3>
        </div>

        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between text-gray-600">
            <span>Total Items</span>
            <span className="font-medium text-gray-900">{totalItemsCount}</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Total Quantity</span>
            <span className="font-medium text-[#047857]">{totalQty} Units</span>
          </div>

          <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-50">
            <span>Total Invoice Amount</span>
            <span className="font-medium text-gray-900">
              ₹ {totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Paid Amount</span>
            <span className="font-medium text-[#047857]">
              ₹ {paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-50">
            <span className="font-normal text-gray-800">
              {isAdvance ? 'Advance Balance' : 'Due Amount'}
            </span>
            <span className={`font-medium ${isAdvance ? 'text-[#047857]' : 'text-amber-700'}`}>
              ₹ {Math.abs(rawDueVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Stock Impact (After Saving) */}
      <div className="p-3 bg-white border border-gray-200/80 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#047857]" />
          <h3 className="text-[13px] font-medium text-gray-900">Stock Impact (After Saving)</h3>
        </div>

        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between text-gray-600">
            <span>Total Stock Increase</span>
            <span className="font-medium text-[#047857]">{totalQty} Units</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Low Stock Items Added</span>
            <span className="font-normal text-amber-600">0 Items</span>
          </div>
        </div>
      </div>

      {/* 3. Supplier Ledger (After Entry) */}
      <div className="p-3 bg-white border border-gray-200/80 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
          <Wallet className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-[13px] font-medium text-gray-900">Supplier Ledger (After Entry)</h3>
        </div>

        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between text-gray-600">
            <span>Previous Due</span>
            <span className="font-medium text-gray-900">
              ₹ {prevDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Purchase Bill Added</span>
            <span className="font-medium text-amber-600">
              + ₹ {totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {paidVal > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Payment Deducted</span>
              <span className="font-medium text-[#047857]">
                - ₹ {paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between text-gray-800 pt-1 border-t border-gray-100 font-medium">
            <span>Total Running Balance</span>
            <span className={isSupplierAdvance ? 'text-[#047857]' : 'text-red-600'}>
              {isSupplierAdvance
                ? `-₹ ${Math.abs(totalSupplierDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Advance)`
                : `₹ ${totalSupplierDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </span>
          </div>

          <button className="text-[11px] font-medium text-[#047857] flex items-center gap-1 hover:underline pt-0.5 cursor-pointer">
            <span>View Full Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4. Recent Purchases */}
      <div className="p-3 bg-white border border-gray-200/80 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900">Recent Purchases</h3>
          </div>
          <button className="text-[10px] font-normal text-[#047857] hover:underline">View All</button>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between p-1.5 bg-gray-50/70 rounded">
            <div>
              <span className="font-medium text-gray-800 block">INV/24-25/1255</span>
              <span className="text-gray-400">Sri Lakshmi Traders</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              ₹28,750 Paid
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-gray-50/70 rounded">
            <div>
              <span className="font-medium text-gray-800 block">INV/24-25/1254</span>
              <span className="text-gray-400">Coromandel Ltd.</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100/70 text-amber-800">
              ₹45,200 Partial
            </span>
          </div>
        </div>
      </div>

      {/* 5. Tips Box */}
      <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-xl space-y-1 text-[12px] text-purple-900">
        <div className="flex items-center gap-1 font-medium text-purple-900">
          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Tips</span>
        </div>
        <ul className="text-[11px] text-purple-800/90 space-y-0.5 list-disc list-inside">
          <li>Search any product. Master values auto-fill into table rows.</li>
          <li>Advance payments automatically adjust against supplier balance.</li>
          <li>Every purchase and payment is logged as a separate ledger entry.</li>
        </ul>
      </div>
    </div>
  );
}
