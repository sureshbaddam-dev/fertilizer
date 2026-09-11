import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, X } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';

export default function SubscriptionRequiredModal({ isOpen, onClose, featureName = 'this feature' }) {
  const navigate = useNavigate();
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const subData = subRes?.data || subRes || {};
  const currentSub = subData?.subscription || null;
  const isTrial = subData?.isTrial || (currentSub && (currentSub.paymentStatus === 'DEMO' || currentSub.couponCode === 'DEMO' || currentSub.planCode === 'FERTILIZER_ERP'));
  const isExpired = subData?.isExpired || !subData?.hasActiveSubscription;

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
            {isExpired && isTrial ? 'Free Trial Expired' : 'Subscription Required'}
          </h2>

          {isExpired && isTrial ? (
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
              Your 7-day free trial has expired. Please choose a subscription plan to continue using <strong className="text-slate-900">{featureName}</strong>.
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
              Access to <strong className="text-slate-900">{featureName}</strong> requires an active subscription plan.
            </p>
          )}
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
