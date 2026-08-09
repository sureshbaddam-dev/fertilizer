import React from 'react';
import { Plus, ExternalLink, Phone, MapPin, Calendar, FileText } from 'lucide-react';
import SmartMasterSelect from '../ui/SmartMasterSelect';

export default function SupplierInvoiceForm({
  suppliers = [],
  supplierId,
  setSupplierId,
  purchaseNumber = 'PUR-20260730-00025',
  purchaseDate,
  setPurchaseDate,
  paidAmount,
  setPaidAmount,
  totalInvoiceAmount,
  onOpenAddSupplier,
}) {
  const selectedSupplier = suppliers.find((s) => s._id === supplierId || s.id === supplierId);
  const paidVal = Number(paidAmount) || 0;
  const rawDueAmount = totalInvoiceAmount - paidVal;
  const isAdvance = rawDueAmount < 0;
  const dueAmount = Math.max(0, rawDueAmount);

  const prevOutstanding = Number(selectedSupplier?.outstandingBalance || 0);
  const supplierTotalDue = prevOutstanding + rawDueAmount;
  const isSupplierAdvance = supplierTotalDue < 0;

  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
      {/* Section Header with Top-Right Purchase No. & Purchase Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[10px] font-medium shrink-0">
            1
          </span>
          <h2 className="text-[15px] font-medium text-gray-900 leading-tight">Supplier & Purchase Details</h2>
        </div>

        {/* Top-Right Compact Auto Generated Purchase Number & Purchase Date */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-2 text-left sm:text-right space-y-1 shrink-0 flex flex-wrap sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1">
          <div className="flex items-center justify-end gap-1.5 text-gray-700">
            <FileText className="w-3 h-3 text-[#047857]" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Purchase No.</span>
            <span className="text-[12px] font-mono font-medium text-[#047857] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
              {purchaseNumber}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-500">Purchase Date:</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="bg-transparent font-medium text-gray-800 text-[11px] focus:outline-none cursor-pointer border-b border-dashed border-gray-300 hover:border-[#00783C]"
            />
          </div>
        </div>
      </div>

      {/* Supplier Selection & Auto-Filled Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Supplier Dropdown */}
        <div className="md:col-span-4 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-gray-700">Supplier *</label>
            <button
              type="button"
              onClick={() => onOpenAddSupplier()}
              className="text-[11px] font-medium text-[#047857] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Supplier</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <SmartMasterSelect
                options={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                onAddNew={async (typedName) => {
                  if (onOpenAddSupplier) onOpenAddSupplier(typedName);
                  return null;
                }}
                placeholder="Select Supplier..."
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenAddSupplier()}
              className="h-8 w-8 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-lg hover:bg-[#D1FAE5] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Add New Supplier Inline"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Auto-Filled Supplier Contact Number (Read-only from Supplier Master) */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[12px] font-medium text-gray-700 block">Supplier Contact Number</label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              readOnly
              value={selectedSupplier?.mobile || '—'}
              placeholder="Auto-filled from Master"
              className="w-full h-8 pl-8 pr-2.5 bg-gray-100/70 border border-gray-200 rounded-lg text-[12px] text-gray-800 font-medium cursor-not-allowed"
            />
          </div>
        </div>

        {/* Auto-Filled Supplier Address (Read-only from Supplier Master) */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[12px] font-medium text-gray-700 block">Supplier Address</label>
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              readOnly
              value={selectedSupplier?.address || '—'}
              placeholder="Auto-filled from Master"
              className="w-full h-8 pl-8 pr-2.5 bg-gray-100/70 border border-gray-200 rounded-lg text-[12px] text-gray-800 font-medium cursor-not-allowed truncate"
              title={selectedSupplier?.address || ''}
            />
          </div>
        </div>
      </div>

      {/* Amount & Payment Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Total Invoice Amount */}
        <div className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-lg space-y-0.5">
          <span className="text-[11px] text-gray-500 font-normal block">Invoice Total</span>
          <span className="text-xs sm:text-sm font-medium text-[#047857]">
            ₹ {totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Paid Amount (Defaults to 0.00, Editable) */}
        <div className="p-2 bg-white border border-gray-300 rounded-lg space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 font-normal block">Paid Amount</span>
            <span className="text-[10px] text-gray-400 font-normal">(Default ₹0.00)</span>
          </div>
          <input
            type="number"
            step="0.01"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-6 text-xs font-medium text-gray-900 border-b border-gray-200 focus:border-[#00783C] focus:outline-none bg-transparent"
          />
        </div>

        {/* Due Amount / Advance Amount */}
        <div className={`p-2.5 rounded-lg space-y-0.5 border ${isAdvance ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/40 border-amber-100'}`}>
          <span className="text-[11px] text-gray-500 font-normal block">
            {isAdvance ? 'Supplier Advance' : 'Due Amount'}
          </span>
          <span className={`text-xs sm:text-sm font-medium ${isAdvance ? 'text-[#047857]' : 'text-amber-700'}`}>
            ₹ {Math.abs(rawDueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Supplier Running Balance / Outstanding */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-normal block">Supplier Outstanding</span>
            <span className={`text-xs sm:text-sm font-medium ${isSupplierAdvance ? 'text-[#047857]' : 'text-red-600'}`}>
              {isSupplierAdvance ? `-₹ ${Math.abs(supplierTotalDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Advance)` : `₹ ${supplierTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <button type="button" className="text-[10px] font-medium text-[#047857] flex items-center gap-0.5 hover:underline cursor-pointer">
            <span>View Ledger</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
