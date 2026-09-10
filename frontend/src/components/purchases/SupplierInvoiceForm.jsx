import React from 'react';
import { Plus, Phone, MapPin, Calendar, FileText, Pencil, Wallet, Clock, BarChart2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SmartMasterSelect from '../ui/SmartMasterSelect';

export default function SupplierInvoiceForm({
  suppliers = [],
  supplierId,
  setSupplierId,
  purchaseNumber = 'PUR-20260909-58216',
  purchaseDate,
  setPurchaseDate,
  paidAmount,
  setPaidAmount,
  onPaidAmountChange,
  totalInvoiceAmount = 0,
  advanceAvailable = 0,
  advanceUsed = 0,
  payableAfterAdvance = 0,
  dueAmount = 0,
  finalSupplierBalance = 0,
  hasItems = false,
  onOpenAddSupplier,
}) {
  const navigate = useNavigate();
  const selectedSupplier = suppliers.find((s) => s._id === supplierId || s.id === supplierId);
  const paidVal = Number(paidAmount) || 0;
  const prevOutstanding = Number(selectedSupplier?.outstandingBalance || 0);

  // Format purchase date for display if needed
  const formattedDate = purchaseDate || new Date().toISOString().split('T')[0];

  const handlePaidChange = (val) => {
    if (onPaidAmountChange) {
      onPaidAmountChange(val);
    } else {
      setPaidAmount(val);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 font-sans">
      {/* 1. Section Header */}
      <div className="flex items-start gap-2.5">
        <span className="w-5 h-5 rounded-full bg-[#00783C] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-2xs">
          1
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">Supplier &amp; Purchase Details</h2>
          <p className="text-[12px] text-gray-500 font-normal mt-0.5">Select supplier and enter purchase information</p>
        </div>
      </div>

      {/* Row 1: Supplier, Supplier Contact Number, Supplier Address */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* Supplier Dropdown with + New button */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[12px] font-semibold text-gray-700 block">Supplier *</label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SmartMasterSelect
                options={suppliers}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Select Supplier"
                showSearchInput={false}
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenAddSupplier()}
              className="h-[38px] px-3 bg-[#ECFDF5] text-[#00783C] border border-[#A7F3D0] rounded-xl hover:bg-[#D1FAE5] flex items-center gap-1 transition-colors text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
              title="Add New Supplier"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Supplier Contact Number */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[12px] font-semibold text-gray-700 block">Supplier Contact Number</label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              readOnly
              value={selectedSupplier?.mobile || ''}
              placeholder="Enter contact number"
              className="w-full h-[38px] pl-9 pr-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium placeholder-gray-400 cursor-not-allowed focus:outline-none"
            />
          </div>
        </div>

        {/* Supplier Address */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[12px] font-semibold text-gray-700 block">Supplier Address</label>
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              readOnly
              value={selectedSupplier?.address || ''}
              placeholder="Select or enter address"
              className="w-full h-[38px] pl-9 pr-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium placeholder-gray-400 cursor-not-allowed truncate focus:outline-none"
              title={selectedSupplier?.address || ''}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Purchase No. card & Purchase Date card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Left: Purchase No. */}
        <div className="bg-[#ECFDF5]/70 border border-[#A7F3D0]/80 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-gray-500 block leading-tight">Purchase No.</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs sm:text-sm font-bold font-mono text-[#00783C]">
                {purchaseNumber}
              </span>
              <Pencil className="w-3 h-3 text-[#00783C]/70" />
            </div>
          </div>
        </div>

        {/* Right: Purchase Date without underline */}
        <div className="bg-[#ECFDF5]/70 border border-[#A7F3D0]/80 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/90 border border-[#A7F3D0] flex items-center justify-center text-[#00783C] shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-gray-500 block leading-tight">Purchase Date</span>
              <input
                type="date"
                value={formattedDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-transparent font-bold text-xs sm:text-sm text-gray-800 focus:outline-none cursor-pointer py-0.5 border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: 4 Financial Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
        {/* 1. Invoice Total */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-100/90 rounded-xl flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#00783C] flex items-center justify-center text-sm font-bold shrink-0">
            ₹
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-medium block leading-tight">Invoice Total</span>
            <span className="text-xs sm:text-sm font-bold text-gray-900 block truncate mt-0.5">
              ₹ {totalInvoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {advanceUsed > 0 && (
              <span className="text-[10px] text-[#00783C] font-semibold block truncate">
                Less: ₹{advanceUsed.toLocaleString('en-IN')} Advance
              </span>
            )}
          </div>
        </div>

        {/* 2. Paid Amount without underline or number spinner arrows */}
        <div className="p-3 bg-blue-50/40 border border-blue-100/90 rounded-xl flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-gray-500 font-medium block leading-tight">Paid Amount</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs sm:text-sm font-bold text-gray-900 shrink-0">₹</span>
              <input
                type="number"
                step="0.01"
                onFocus={(e) => e.target.select()}
                value={paidAmount === 0 || paidAmount === '0' || !paidAmount ? '' : paidAmount}
                onChange={(e) => handlePaidChange(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs sm:text-sm font-bold text-gray-900 focus:outline-none bg-transparent border-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {prevOutstanding > 0 && (
              <span className="text-[10px] text-blue-700 font-semibold block truncate">
                Includes ₹{prevOutstanding.toLocaleString('en-IN')} Previous Due
              </span>
            )}
            {advanceUsed > 0 && payableAfterAdvance > 0 && prevOutstanding <= 0 && (
              <span className="text-[10px] text-gray-500 font-medium block truncate">
                Net Payable: ₹{payableAfterAdvance.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* 3. Due Amount */}
        <div className="p-3 bg-amber-50/40 border border-amber-100/90 rounded-xl flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-medium block leading-tight">
              {finalSupplierBalance < 0 ? 'Supplier Advance' : 'Due Amount'}
            </span>
            <span className={`text-xs sm:text-sm font-bold block truncate mt-0.5 ${
              dueAmount <= 0 ? 'text-[#00783C]' : 'text-amber-600'
            }`}>
              {finalSupplierBalance < 0
                ? `₹ ${Math.abs(finalSupplierBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Credit)`
                : `₹ ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            {dueAmount === 0 && totalInvoiceAmount > 0 && finalSupplierBalance >= 0 && (
              <span className="text-[10px] text-[#00783C] font-semibold block truncate">
                Fully Settled
              </span>
            )}
          </div>
        </div>

        {/* 4. Supplier Outstanding */}
        <div className="p-3 bg-purple-50/40 border border-purple-100/90 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-gray-500 font-medium block leading-tight">
                {!hasItems && prevOutstanding < 0 ? 'Supplier Outstanding' : 'Supplier Outstanding'}
              </span>
              <span className={`text-xs sm:text-sm font-bold block truncate mt-0.5 ${
                !hasItems
                  ? prevOutstanding < 0 ? 'text-[#00783C]' : 'text-purple-900'
                  : finalSupplierBalance <= 0 ? 'text-[#00783C]' : 'text-purple-900'
              }`}>
                {!hasItems ? (
                  prevOutstanding < 0
                    ? `₹ ${Math.abs(prevOutstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Advance Available`
                    : `₹ ${prevOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  finalSupplierBalance === 0
                    ? '₹ 0.00'
                    : finalSupplierBalance < 0
                    ? `-₹ ${Math.abs(finalSupplierBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Advance)`
                    : `₹ ${finalSupplierBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </span>
              <button
                type="button"
                onClick={() => navigate(supplierId ? `/suppliers/${supplierId}/ledger` : '/suppliers')}
                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 hover:underline cursor-pointer mt-0.5"
              >
                <span>View Ledger</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
