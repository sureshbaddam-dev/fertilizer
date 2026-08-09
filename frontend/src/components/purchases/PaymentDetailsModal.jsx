import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, DollarSign, Calendar, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { supplierService } from '../../services/supplierService';

export default function PaymentDetailsModal({
  isOpen,
  payment = null,
  supplier = null,
  onClose,
}) {
  const queryClient = useQueryClient();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !payment) return null;

  const paymentDateStr = payment.date
    ? new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const amount = Number(payment.paidAmount || payment.amount || 0);
  const refNo = payment.referenceNumber || 'PAY-REF-001';
  const supplierName = supplier?.name || payment.supplierId?.name || 'Supplier';

  const handleConfirmDelete = async (e) => {
    if (e) e.stopPropagation();
    if (deleteInput !== 'DELETE') return;

    try {
      setIsDeleting(true);
      await supplierService.deletePayment(payment._id, 'DELETE');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
      ]);
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setDeleteInput('');
      onClose();
    } catch (err) {
      console.error('Failed to soft-delete payment:', err);
      setIsDeleting(false);
      alert(err.response?.data?.message || err.message || 'Failed to delete payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-[#ECFDF5]/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#047857]">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center font-bold">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">Payment Entry Details</h3>
              <p className="text-[10px] text-[#047857] font-mono">{refNo}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1 text-center">
            <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Payment Amount Paid</span>
            <span className="text-xl font-extrabold text-[#047857] font-mono block">
              ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold badge-agri-active">
              <CheckCircle2 className="w-3 h-3" />
              <span>Payment Successful</span>
            </span>
          </div>

          <div className="space-y-2 pt-1 border-t border-gray-100 text-gray-700">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-normal">Supplier Name</span>
              <span className="font-bold text-gray-900">{supplierName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-normal">Payment Date</span>
              <span className="font-medium text-gray-800 font-mono">{paymentDateStr}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-normal">Reference Number</span>
              <span className="font-mono font-bold text-gray-900">{refNo}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500 font-normal">Payment Remarks</span>
              <span className="font-medium text-gray-800 text-right max-w-[200px] truncate">{payment.notes || 'Direct Payment'}</span>
            </div>

            {payment.runningBalance !== undefined && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-normal">Supplier Running Balance After Payment</span>
                <span className="font-mono font-bold text-gray-900">₹ {Number(payment.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-gray-200 flex items-center justify-between bg-gray-50/60">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteConfirmOpen(true);
              setDeleteInput('');
            }}
            className="px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Payment</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

        {/* Delete Payment Confirmation Portal */}
        {isDeleteConfirmOpen && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Delete Payment?</h3>
                  <p className="text-[11px] text-gray-500">Payment will be soft-deleted/reversed and supplier balance updated.</p>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">⚠️ Security Confirmation Required</p>
                <p>Type <strong className="font-mono text-red-700 bg-red-100 px-1 py-0.5 rounded">DELETE</strong> below to confirm deletion of Payment <strong className="font-mono">₹{amount.toLocaleString('en-IN')}</strong> ({refNo}).</p>
              </div>

              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteConfirmOpen(false);
                    setDeleteInput('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Soft Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
