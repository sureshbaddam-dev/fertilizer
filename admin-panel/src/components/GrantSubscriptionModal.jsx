import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Calendar } from 'lucide-react';
import { adminApiService } from '../services/adminApiService';

export default function GrantSubscriptionModal({ isOpen, onClose, user, currentSubscription, mode = 'GRANT', onSuccess }) {
  const [subType, setSubType] = useState(mode === 'DEMO' ? 'DEMO' : 'ADMIN_GRANTED'); // 'ADMIN_GRANTED' or 'DEMO'
  const [durationMonths, setDurationMonths] = useState(1);
  const [demoDays, setDemoDays] = useState(7);
  const [amountPaid, setAmountPaid] = useState(mode === 'DEMO' ? 0 : 199);
  const [reason, setReason] = useState(mode === 'EXTEND' ? 'Subscription Extension' : 'Customer Access');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const currentExpiryDate = currentSubscription?.expiryDate ? new Date(currentSubscription.expiryDate) : new Date();
  const baseDate = (currentSubscription?.status === 'ACTIVE' || currentSubscription?.status === 'DEMO') && currentSubscription?.expiryDate
    ? new Date(currentSubscription.expiryDate)
    : new Date();

  let newExpiryDate = new Date(baseDate);
  if (subType === 'DEMO') {
    newExpiryDate.setDate(newExpiryDate.getDate() + Number(demoDays));
  } else {
    newExpiryDate.setMonth(newExpiryDate.getMonth() + Number(durationMonths));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (subType === 'DEMO') {
        await adminApiService.grantCustomDemoSubscription({
          userId: user._id,
          demoDays: Number(demoDays),
          reason,
        });
      } else {
        await adminApiService.grantAdminSubscription({
          userId: user._id,
          durationMonths: Number(durationMonths),
          amountPaid: Number(amountPaid),
          reason,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleText = mode === 'EXTEND' ? 'Extend Subscription' : mode === 'DEMO' ? 'Grant Demo Trial' : 'Grant Subscription';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans antialiased text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{titleText}</h3>
              <p className="text-xs text-slate-500 font-medium">{user.ownerName} ({user.mobile || 'N/A'})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sub Type Selection if applicable */}
          {mode === 'GRANT' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setSubType('ADMIN_GRANTED')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  subType === 'ADMIN_GRANTED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid Plan
              </button>
              <button
                type="button"
                onClick={() => setSubType('DEMO')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  subType === 'DEMO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Demo
              </button>
            </div>
          )}

          {subType === 'ADMIN_GRANTED' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Duration</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[1, 3, 6].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMonths(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        durationMonths === m
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {m} Month{m > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0 for complimentary"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Demo Duration (Days)</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDemoDays(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      demoDays === d
                        ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={demoDays}
                onChange={(e) => setDemoDays(Number(e.target.value))}
                placeholder="Enter custom days e.g. 14"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-600"
              />
            </div>
          )}

          {/* DYNAMIC EXPIRY PREVIEW */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Current Expiry:</span>
              <span className="font-mono font-bold text-slate-700">
                {currentSubscription?.expiryDate ? currentExpiryDate.toLocaleDateString('en-IN') : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between text-emerald-800 font-bold border-t border-slate-200/80 pt-1.5">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-600" />New Expiry:</span>
              <span className="font-mono text-sm">{newExpiryDate.toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason / Internal Note</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sales offer, complimentary extension"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : mode === 'EXTEND' ? 'Confirm Extension' : 'Confirm & Activate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
