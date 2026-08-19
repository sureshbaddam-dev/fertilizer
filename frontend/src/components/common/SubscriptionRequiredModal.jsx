import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, X } from 'lucide-react';

export default function SubscriptionRequiredModal({ isOpen, onClose, featureName = 'this feature' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full text-center space-y-4 relative overflow-hidden">
        {/* TOP-RIGHT SUBTLE CLOSE X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ELEGANT LOCK ICON BADGE — PRICING CARD THEME TINT */}
        <div className="mx-auto w-14 h-14 bg-gradient-to-b from-teal-50/80 to-emerald-50/50 border border-teal-200/60 rounded-2xl flex items-center justify-center shadow-2xs">
          <Lock className="w-7 h-7 text-teal-700 stroke-[2.2]" />
        </div>

        {/* TITLE & DYNAMIC CONCISE MESSAGE */}
        <div className="space-y-1.5 pt-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
            Subscription Required
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
            Subscribe to continue using <strong className="text-slate-900">{featureName}</strong>.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="pt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose?.();
              navigate('/subscription/plans');
            }}
            className="w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>VIEW SUBSCRIPTION PLANS</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
