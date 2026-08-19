import React from 'react';
import { X, CreditCard, ExternalLink, Calendar, CheckCircle2, XCircle, User, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function PaymentDetailsModal({ isOpen, onClose, payment }) {
  const navigate = useNavigate();

  if (!isOpen || !payment) return null;

  const userName = payment.userName || payment.userId?.ownerName || 'Customer';
  const userMobile = payment.userMobile || payment.userId?.mobile || 'N/A';
  const userId = payment.userId?._id || payment.userId || payment.user;
  const status = (payment.paymentStatus || payment.status || 'SUCCESSFUL').toUpperCase();
  const isSuccess = ['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'ACTIVE', 'PAID'].includes(status);

  const handleViewUser = () => {
    onClose();
    if (userId) {
      navigate(`/admin/users/${userId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans antialiased text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${
              isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Payment Transaction Details</h3>
              <p className="text-xs text-slate-500 font-medium">Online Gateway Transaction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 text-xs">
          {/* User Block */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> {userName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Mobile Number:</span>
              <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {userMobile}
              </span>
            </div>
          </div>

          {/* Payment Info Block */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Subscription Plan:</span>
              <span className="font-bold text-emerald-700">{payment.planName || 'Fertilizer ERP'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Amount Paid:</span>
              <span className="font-extrabold text-slate-900 text-sm">₹{payment.amountPaid ?? payment.amount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Payment Gateway:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> {payment.gateway || 'Razorpay'}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500 font-medium">Payment ID:</span>
              <span className="font-bold text-slate-800 text-[11px]">{payment.razorpayPaymentId || payment.paymentId || 'N/A'}</span>
            </div>
            {payment.razorpayOrderId && (
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500 font-medium">Order ID:</span>
                <span className="font-bold text-slate-600 text-[11px]">{payment.razorpayOrderId}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Transaction Date:</span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN') : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
              <span className="text-slate-500 font-medium">Status:</span>
              <StatusBadge status={status} />
            </div>
            {payment.failureReason && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold text-[11px] mt-1">
                Failure Reason: {payment.failureReason}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Close
          </button>
          {userId && (
            <button
              type="button"
              onClick={handleViewUser}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>View User Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
