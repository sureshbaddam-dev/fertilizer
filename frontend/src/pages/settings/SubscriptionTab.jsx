import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, ShieldCheck, Tag, Ticket, ArrowUpRight, Zap, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SubscriptionTab() {
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState(null);
  const [msg, setMsg] = useState('');

  // Fetch Current User Subscription
  const { data: subRes, isLoading: isSubLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  // Fetch All Subscription Plans
  const { data: plansRes } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionService.getPlans,
  });

  const subData = subRes?.data || subRes || {};
  const currentSub = subData.subscription;
  const plans = plansRes?.data?.plans || plansRes?.plans || [];

  // Coupon Validation Mutation
  const couponMutation = useMutation({
    mutationFn: ({ code, price }) => subscriptionService.validateCoupon(code, price),
    onSuccess: (res) => {
      setAppliedCoupon(res.data || res);
      setCouponError('');
    },
    onError: (err) => {
      setCouponError(err?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    },
  });

  // Subscribe Mutation
  const subscribeMutation = useMutation({
    mutationFn: ({ planCode, couponCode }) => subscriptionService.subscribe(planCode, couponCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      setMsg('Subscription updated successfully!');
      setSelectedPlanCode(null);
    },
    onError: (err) => {
      setCouponError(err?.message || 'Subscription failed');
    },
  });

  const handleApplyCoupon = (planPrice) => {
    if (!couponCode.trim()) return;
    couponMutation.mutate({ code: couponCode, price: planPrice });
  };

  const handleSelectPlan = (code) => {
    setSelectedPlanCode(code);
    subscribeMutation.mutate({ planCode: code, couponCode: appliedCoupon?.coupon?.code || couponCode });
  };

  if (isSubLoading) {
    return <div className="p-8 text-center text-gray-400 text-xs italic">Loading subscription status...</div>;
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* CURRENT SUBSCRIPTION CARD */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl text-white space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Current Plan</span>
              <h3 className="text-xl font-extrabold">{currentSub?.planName || 'Free Tier / Pending Plan'}</h3>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
            currentSub?.status === 'ACTIVE'
              ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40'
              : 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
          }`}>
            {currentSub?.status || 'INACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-emerald-700/60 pt-3">
          <div>
            <span className="text-emerald-300 block text-[10px]">Start Date:</span>
            <strong className="font-mono">
              {currentSub?.startDate ? new Date(currentSub.startDate).toLocaleDateString('en-IN') : 'N/A'}
            </strong>
          </div>
          <div>
            <span className="text-emerald-300 block text-[10px]">Expiry / Renewal:</span>
            <strong className="font-mono">
              {currentSub?.expiryDate ? new Date(currentSub.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
            </strong>
          </div>
          <div>
            <span className="text-emerald-300 block text-[10px]">Discount Tokens:</span>
            <strong className="font-mono text-emerald-200 text-sm">
              {currentSub?.discountTokensRemaining ?? 0} Remaining
            </strong>
          </div>
          <div>
            <span className="text-emerald-300 block text-[10px]">Activation:</span>
            <strong className="font-mono">
              {currentSub?.activatedByAdmin ? 'Free Admin Activation' : 'Standard'}
            </strong>
          </div>
        </div>
      </div>

      {/* COUPON CODE APPLIER */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-2xs">
        <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-emerald-700" /> Have an Offer / Coupon Code?
        </h4>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter offer code (e.g. VEDIXA50)..."
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="text-xs uppercase font-mono w-64"
          />
          <Button
            onClick={() => handleApplyCoupon(1999)}
            className="btn-agri-primary text-xs"
          >
            Apply Code
          </Button>
        </div>
        {couponError && <p className="text-xs text-red-600 font-semibold">{couponError}</p>}
        {appliedCoupon && (
          <p className="text-xs text-emerald-700 font-bold">
            Coupon Applied! Discount: ₹{appliedCoupon.discountAmount}
          </p>
        )}
      </div>

      {/* AVAILABLE PLANS GRID */}
      <div>
        <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" /> Available Subscription Plans
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = currentSub?.planCode === p.code && currentSub?.status === 'ACTIVE';
            return (
              <div
                key={p.code}
                className={`p-5 rounded-2xl border space-y-4 transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h5 className="font-extrabold text-gray-900 text-sm">{p.name}</h5>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-700 text-white">
                        ACTIVE PLAN
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-800">
                    ₹ {p.price} <span className="text-xs font-normal text-gray-500">/ month</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-block">
                    Includes {p.discountTokens} Discount Tokens
                  </span>
                  <ul className="space-y-1.5 pt-2 text-xs text-gray-600">
                    {p.features?.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleSelectPlan(p.code)}
                  disabled={subscribeMutation.isPending && selectedPlanCode === p.code}
                  className={`w-full text-xs font-bold py-2 ${
                    isCurrent ? 'bg-emerald-700 text-white cursor-default' : 'btn-agri-primary'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Subscribe (${p.name})`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
