import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, FileText, CheckCircle2, Clock, Calendar, Building, Package, CreditCard, Tag, Trash2, AlertTriangle, RotateCcw, Eye } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';

export default function TransactionDetailsModal({
  isOpen,
  transaction = null,
  supplier = null,
  onClose,
}) {
  const queryClient = useQueryClient();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Linked Payment States
  const [viewingPayment, setViewingPayment] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [deletePaymentInput, setDeletePaymentInput] = useState('');
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const isPurchase = transaction.transactionType === 'PURCHASE' || transaction.transactionType === 'Purchase';

  const handleConfirmDelete = async (e) => {
    if (e) e.stopPropagation();
    console.log('Confirming purchase deletion', { deleteInput });
    if (deleteInput !== 'DELETE') return;

    const pObj = transaction.purchaseId || {};
    const targetId = pObj._id || (typeof transaction.purchaseId === 'string' ? transaction.purchaseId : null) || transaction.referenceId || transaction._id;
    
    console.log('API REQUEST STARTED', { targetId, transaction });
    if (!targetId) {
      alert('Purchase ID could not be identified for this record.');
      return;
    }

    try {
      setIsDeleting(true);
      const res = await purchaseService.deletePurchase(targetId, 'DELETE');
      console.log('API REQUEST SUCCESSFUL', res);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setDeleteInput('');
      onClose();
    } catch (err) {
      console.error('Failed to soft-delete purchase invoice:', err);
      setIsDeleting(false);
      alert(err.response?.data?.message || err.message || 'Failed to soft-delete purchase invoice');
    }
  };
  const handleConfirmDeletePayment = async (e) => {
    if (e) e.stopPropagation();
    if (deletePaymentInput !== 'DELETE' || !paymentToDelete) return;

    try {
      setIsDeletingPayment(true);
      await supplierService.deletePayment(paymentToDelete._id, 'DELETE');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      setIsDeletingPayment(false);
      setPaymentToDelete(null);
      setDeletePaymentInput('');
      onClose();
    } catch (err) {
      console.error('Failed to soft-delete payment:', err);
      setIsDeletingPayment(false);
      alert(err.response?.data?.message || err.message || 'Failed to delete payment');
    }
  };

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

  // Linked Payments List
  const linkedPaymentsList = purchaseObj.payments || transaction.payments || [];
  const calcTotalPaid = linkedPaymentsList.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
  const totalInvAmt = isPurchase ? Number(transaction.purchaseAmount || purchaseObj.totalInvoiceAmount || 0) : 0;
  const calcDue = Math.max(0, totalInvAmt - calcTotalPaid);

  // Payment / Ref fields
  const refNo = transaction.referenceNumber || purchaseNo || '—';

  // Financials
  const purchaseAmt = isPurchase ? Number(transaction.purchaseAmount || purchaseObj.totalInvoiceAmount || 0) : 0;
  const paidAmt = isPayment ? Number(transaction.paidAmount || 0) : Number(purchaseObj.paidAmount || 0);
  const runningBal = Number(transaction.runningBalance || 0);
  const dueAmt = Number(purchaseObj.dueAmount || 0);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Centered Modal Dialog Box */}
      <div
        className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center font-bold">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 leading-tight">Transaction Details</h2>
                <span className="text-xs text-gray-500 font-medium font-mono">({dateStr})</span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Complete record loaded dynamically from database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Type & Status Badges in Header */}
            {isPurchase && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3E8FF] text-[#7E22CE]">
                Purchase
              </span>
            )}
            {isPayment && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                Payment
              </span>
            )}
            {isAdjustment && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                Adjustment
              </span>
            )}

            {isPayment ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Success</span>
              </span>
            ) : runningBal === 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Paid</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                <Clock className="w-3 h-3" />
                <span>Partial</span>
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

          {/* Supplier Info & Reference Numbers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supplier Info Box */}
            <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Supplier Information</span>
              <span className="text-sm font-bold text-gray-900 block">{supplierName}</span>
              {supplierObj.mobile && (
                <span className="text-[11px] text-gray-600 font-mono block">Mobile: {supplierObj.mobile}</span>
              )}
            </div>

            {/* Reference Numbers Box */}
            <div className="p-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-200/60 pb-1">
                Reference Identifiers
              </span>

              {isPurchase && (
                <>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Supplier Invoice Number</span>
                    <span className="font-mono font-bold text-gray-900">{supplierInvoiceNo}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-500">Purchase Number</span>
                    <span className="font-mono font-semibold text-gray-800">{purchaseNo}</span>
                  </div>
                </>
              )}

              {isPayment && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500">Payment Reference Number</span>
                  <span className="font-mono font-bold text-gray-900">{refNo}</span>
                </div>
              )}

              {isAdjustment && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500">Reference Number</span>
                  <span className="font-mono font-bold text-gray-900">{refNo}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500">Transaction Date</span>
                <span className="font-medium text-gray-800">{dateStr}</span>
              </div>
            </div>
          </div>

          {/* Purchased Line Items List (For Purchases) */}
          {isPurchase && (
            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-xs">Purchased Items ({itemsList.length})</h4>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Purchase Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
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
                          <tr key={idx} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3 font-mono text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-900">{prodName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-emerald-800">{qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">₹ {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-400 italic">No line items in this purchase</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="block md:hidden space-y-2.5">
                {itemsList.length > 0 ? (
                  itemsList.map((item, idx) => {
                    const prodName = item.productId?.name || item.productName || 'Product Item';
                    const qty = Number(item.quantity || 1);
                    const rate = Number(item.purchaseRate || 0);
                    const total = Number(item.totalAmount || qty * rate);

                    return (
                      <div key={idx} className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2 font-sans text-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                          <span className="font-extrabold text-gray-900">{prodName}</span>
                          <span className="font-mono font-black text-[#047857]">₹ {total.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase font-sans">Quantity</span>
                            <span className="font-bold text-gray-800">{qty}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 block uppercase font-sans">Purchase Rate</span>
                            <span className="font-bold text-gray-800">₹ {rate.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200 text-xs">
                    No line items in this purchase
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAYMENT INFORMATION SECTION FOR LINKED PAYMENTS */}
          {isPurchase && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                <div>
                  <h4 className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#047857]" />
                    <span>Payment Information</span>
                  </h4>
                  <p className="text-[10px] text-gray-500">Payments recorded against this purchase invoice</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-gray-500 font-sans text-[10px] block">Total Paid:</span>
                  <span className="font-extrabold text-[#047857]">₹ {calcTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {linkedPaymentsList.length > 0 ? (
                <div className="space-y-2">
                  <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Payment Mode / Notes</th>
                          <th className="py-2 px-3">Reference Number</th>
                          <th className="py-2 px-3 text-right">Amount (₹)</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px] font-medium text-gray-800">
                        {linkedPaymentsList.map((p) => {
                          const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                          const pAmt = Number(p.paidAmount || 0);

                          return (
                            <tr key={p._id} className="hover:bg-gray-50/70">
                              <td className="py-2 px-3 whitespace-nowrap text-gray-600">{pDate}</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">{p.notes || 'Payment'}</td>
                              <td className="py-2 px-3 font-mono font-bold text-gray-700">{p.referenceNumber || '—'}</td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-[#047857]">
                                ₹ {pAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingPayment(p);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                    title="View Payment Details"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentToDelete(p);
                                      setDeletePaymentInput('');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                    title="Delete / Reverse this payment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS FOR PAYMENTS */}
                  <div className="block md:hidden space-y-2">
                    {linkedPaymentsList.map((p) => {
                      const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                      const pAmt = Number(p.paidAmount || 0);

                      return (
                        <div key={p._id} className="bg-emerald-50/30 border border-emerald-200/60 rounded-xl p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{p.notes || 'Payment'}</span>
                            <span className="font-mono font-extrabold text-[#047857]">₹ {pAmt.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                            <span>Ref: {p.referenceNumber || '—'}</span>
                            <span>{pDate}</span>
                          </div>
                          <div className="pt-1 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingPayment(p);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentToDelete(p);
                                setDeletePaymentInput('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-gray-400 italic bg-gray-50/50 border border-dashed border-gray-200 rounded-xl text-xs">
                  No payments recorded against this purchase invoice yet. Outstanding: ₹ {calcDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          )}

          {/* Financial Amounts Breakdown & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Notes / Payment Method */}
            <div className="p-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {isPayment ? 'Payment Method / Notes' : 'Notes / Remarks'}
              </span>
              <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                {transaction.notes || (isPayment ? 'Direct Payment' : 'No extra notes recorded.')}
              </p>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-medium">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Financial Summary</span>
              
              {isPurchase && (
                <div className="flex justify-between items-center text-gray-700">
                  <span>Total Purchase Amount</span>
                  <span className="font-mono font-bold text-gray-900 text-sm whitespace-nowrap">
                    ₹ {totalInvAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {(isPayment || calcTotalPaid > 0) && (
                <div className="flex justify-between items-center text-emerald-800 font-semibold">
                  <span>Paid Amount</span>
                  <span className="font-mono font-bold text-sm whitespace-nowrap">
                    ₹ {(isPayment ? Number(transaction.paidAmount || 0) : calcTotalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {calcDue > 0 && (
                <div className="flex justify-between items-center text-amber-800">
                  <span>Invoice Due Amount</span>
                  <span className="font-mono font-bold whitespace-nowrap">
                    ₹ {calcDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-gray-900">
                <span>Outstanding Balance</span>
                <span className="font-mono text-sm whitespace-nowrap">
                  ₹ {runningBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {isPurchase ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('DELETE PURCHASE CLICKED', { transaction, purchaseObj });
                console.log('Opening delete confirmation');
                setIsDeleteConfirmOpen(true);
              }}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Purchase Invoice</span>
            </button>
          ) : isPayment ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPaymentToDelete(transaction);
                setDeletePaymentInput('');
              }}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Payment</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL (Rendered via Portal outside clipping tree) */}
      {isDeleteConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
          }}
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
                <h3 className="text-sm font-bold text-gray-900">Delete Purchase Invoice?</h3>
                <p className="text-[11px] text-gray-500">Record will be soft-deleted and kept in 90-day retention.</p>
              </div>
            </div>

            {linkedPaymentsList.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  ⚠️ Linked Financial Records Warning
                </p>
                <p>This purchase has <strong>{linkedPaymentsList.length} payment(s)</strong> linked to it. Deleting the purchase will also update related financial ledgers.</p>
              </div>
            )}

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">⚠️ Security Confirmation Required</p>
              <p>Type <strong className="font-mono text-red-700 bg-red-100 px-1 py-0.5 rounded">DELETE</strong> below to confirm soft-deletion of Purchase Invoice <strong className="font-mono">{supplierInvoiceNo !== '—' ? supplierInvoiceNo : purchaseNo}</strong>.</p>
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

      {/* DELETE PAYMENT CONFIRMATION MODAL (Rendered via Portal) */}
      {paymentToDelete && createPortal(
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
              <p>Type <strong className="font-mono text-red-700 bg-red-100 px-1 py-0.5 rounded">DELETE</strong> below to confirm deletion of Payment <strong className="font-mono">₹{Number(paymentToDelete.paidAmount || 0).toLocaleString('en-IN')}</strong> ({paymentToDelete.referenceNumber || 'PAY'}).</p>
            </div>

            <input
              type="text"
              value={deletePaymentInput}
              onChange={(e) => setDeletePaymentInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPaymentToDelete(null);
                  setDeletePaymentInput('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePaymentInput !== 'DELETE' || isDeletingPayment}
                onClick={handleConfirmDeletePayment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                {isDeletingPayment ? 'Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW PAYMENT DETAILS MODAL (Rendered via Portal) */}
      {viewingPayment && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setViewingPayment(null);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 relative z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] border border-emerald-200 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Payment Details</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{viewingPayment.referenceNumber || 'PAY-REF'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Amount</span>
                <span className="font-mono font-extrabold text-[#047857] text-sm">
                  ₹ {Number(viewingPayment.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Date</span>
                <span className="font-medium text-gray-900">
                  {viewingPayment.date ? new Date(viewingPayment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Method / Notes</span>
                <span className="font-semibold text-gray-800">{viewingPayment.notes || 'Payment'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Reference Identifier</span>
                <span className="font-mono font-bold text-gray-900">{viewingPayment.referenceNumber || '—'}</span>
              </div>
              {supplierName && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-500 font-medium">Supplier</span>
                  <span className="font-bold text-gray-900">{supplierName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const p = viewingPayment;
                  setViewingPayment(null);
                  setPaymentToDelete(p);
                  setDeletePaymentInput('');
                }}
                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
