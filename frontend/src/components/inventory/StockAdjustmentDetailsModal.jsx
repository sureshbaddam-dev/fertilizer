import React from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Package,
  Building2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  CheckCircle2,
  Hash,
} from 'lucide-react';
import ProductAvatar from '../ui/ProductAvatar';

export default function StockAdjustmentDetailsModal({ isOpen, onClose, adjustment }) {
  if (!isOpen || !adjustment) return null;

  const isDamage = adjustment.type === 'DAMAGE';
  const isReturn = adjustment.type === 'PURCHASE_RETURN' || adjustment.type === 'RETURN';

  const typeLabel = isDamage ? 'Damaged Stock Write-Off' : 'Supplier Stock Return';
  const typeBadgeClass = isDamage
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-purple-100 text-purple-900 border-purple-300';

  const formattedDate = adjustment.date
    ? new Date(adjustment.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const unitName = adjustment.unit || 'Bag';
  const qty = Number(adjustment.quantity || 0);
  const rate = Number(adjustment.purchaseRate || 0);
  const totalVal = Number(adjustment.totalValue || qty * rate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
                isDamage
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {isDamage ? <AlertTriangle className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900 leading-tight">
                  Stock Adjustment Details
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${typeBadgeClass}`}>
                  {isDamage ? 'DAMAGE' : 'SUPPLIER RETURN'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-500 block leading-tight mt-0.5">
                Ref #{adjustment.referenceNumber || 'N/A'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tight">
                Quantity Deducted
              </span>
              <span className="text-sm font-black text-red-600 font-mono block mt-0.5">
                -{qty} {unitName}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tight">
                Unit Purchase Rate
              </span>
              <span className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                ₹ {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-tight">
                Total Valuation
              </span>
              <span className="text-sm font-black text-emerald-800 font-mono block mt-0.5">
                ₹ {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Product & Batch Details */}
          <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-500 text-[11px] uppercase tracking-tight flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Product Information
              </span>
              <span className="text-[11px] font-medium text-gray-500">
                {adjustment.category || 'General'} • {adjustment.brand || 'Generic'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ProductAvatar src={adjustment.image} name={adjustment.productName} size={40} />
              <div className="min-w-0 flex-1">
                <span className="font-black text-gray-900 text-xs block truncate leading-tight">
                  {adjustment.productName}
                </span>
                <span className="text-[11px] text-gray-500 font-mono block mt-0.5">
                  Batch: <strong className="text-gray-800">{adjustment.batchNumber || 'Assigned Stock'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Stock Invariant Movement */}
          {(adjustment.previousStock !== null || adjustment.currentStock !== null) && (
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Previous Stock</span>
                <span className="text-xs font-black text-gray-700 font-mono">
                  {adjustment.previousStock ?? 'N/A'} {unitName}
                </span>
              </div>
              <span className="text-gray-400 font-black">→</span>
              <div>
                <span className="text-[10px] text-red-500 font-bold uppercase block">Deduction</span>
                <span className="text-xs font-black text-red-600 font-mono">
                  -{qty} {unitName}
                </span>
              </div>
              <span className="text-gray-400 font-black">→</span>
              <div>
                <span className="text-[10px] text-emerald-600 font-bold uppercase block">New Stock</span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  {adjustment.currentStock ?? 'N/A'} {unitName}
                </span>
              </div>
            </div>
          )}

          {/* Supplier & Audit Details */}
          <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Supplier Name:
              </span>
              <span className="font-bold text-gray-900 font-mono">
                {adjustment.supplierName || (isDamage ? 'Internal Write-Off' : 'N/A')}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Recorded Date:
              </span>
              <span className="font-medium text-gray-800">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                Audited By:
              </span>
              <span className="font-medium text-gray-800">{adjustment.createdBy || 'System'}</span>
            </div>
          </div>

          {/* Reason & Notes */}
          <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-500" />
              Reason / Justification
            </span>
            <p className="text-xs text-gray-800 font-medium bg-white p-2.5 rounded-lg border border-gray-200">
              {adjustment.reason || 'No specific reason recorded'}
            </p>
            {adjustment.notes && (
              <p className="text-[11px] text-gray-600 italic bg-white/70 p-2 rounded border border-gray-100">
                Notes: {adjustment.notes}
              </p>
            )}
          </div>

          {/* Accounting Rules Impact Pill */}
          <div
            className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
              isDamage
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Accounting Rule:</strong>{' '}
              {isDamage
                ? 'Damage is classified as an internal stock loss. Inventory totalStock was reduced, while Supplier Accounts Payable remains intact.'
                : `Supplier Return reduces available stock and automatically reduced Supplier Payable / Due Amount by ₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
