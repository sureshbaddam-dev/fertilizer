import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, Zap, Ticket, CheckCircle2, ArrowRight, Star, Sparkles } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import BrandLogo from '../../components/common/BrandLogo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Subscription Plans API
  const { data: plansRes, isLoading: isPlansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionService.getPlans,
  });

  // Fetch Current User Subscription API
  const { data: subRes, isLoading: isSubLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const plans = plansRes?.data?.plans || plansRes?.plans || [];
  const currentSub = subRes?.data?.subscription || subRes?.subscription || null;
  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  // Guards for double-click & single Razorpay instance lifecycle
  const isInitializingPaymentRef = useRef(false);
  const rzpInstanceRef = useRef(null);

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

  // Razorpay Order Creation & Verification Mutations
  const createOrderMutation = useMutation({
    mutationFn: ({ planCode, couponCode }) => subscriptionService.createRazorpayOrder(planCode, couponCode),
    onSuccess: (res) => {
      const orderData = res?.data || res;
      const couponCodeToUse = appliedCoupon?.coupon?.code || couponCode;

      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          if (rzpInstanceRef.current) {
            try { rzpInstanceRef.current.close(); } catch (_e) {}
            rzpInstanceRef.current = null;
          }

          const options = {
            key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'VEDIXA ERP',
            description: `${orderData.planCode || selectedPlanCode} Plan Subscription`,
            order_id: orderData.orderId,
            handler: async function (response) {
              isInitializingPaymentRef.current = false;
              verifyMutation.mutate({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planCode: selectedPlanCode,
                couponCode: couponCodeToUse,
              });
            },
            theme: {
              color: '#047857',
            },
            modal: {
              ondismiss: function () {
                isInitializingPaymentRef.current = false;
                setErrorMessage('Payment process was cancelled.');
              },
            },
          };

          const rzp = new window.Razorpay(options);
          rzpInstanceRef.current = rzp;
          rzp.open();
        } catch (_err) {
          isInitializingPaymentRef.current = false;
          setErrorMessage('Could not open Razorpay checkout modal. Please try again.');
        }
      } else {
        isInitializingPaymentRef.current = false;
        setErrorMessage('Razorpay SDK is loading. Please try again in a moment.');
      }
    },
    onError: (err) => {
      isInitializingPaymentRef.current = false;
      setErrorMessage(err?.message || 'Failed to initialize Razorpay checkout order.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (payload) => subscriptionService.verifyPayment(payload),
    onSuccess: () => {
      isInitializingPaymentRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['shop-settings-global'] });
      window.location.href = '/dashboard';
    },
    onError: (err) => {
      isInitializingPaymentRef.current = false;
      setErrorMessage(err?.message || 'Payment verification failed.');
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    couponMutation.mutate({ code: couponCode, price: 399 });
  };

  const handleSelectPlan = (code) => {
    if (createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current) return;
    isInitializingPaymentRef.current = true;
    setSelectedPlanCode(code);
    setErrorMessage('');
    createOrderMutation.mutate({
      planCode: code,
      couponCode: appliedCoupon?.coupon?.code || couponCode,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between p-4 md:p-8">
      {/* Header Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-200 mb-8">
        <BrandLogo />
        {hasActiveSub && (
          <Button
            onClick={() => navigate('/dashboard')}
            className="btn-agri-primary text-xs flex items-center gap-1.5"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto w-full flex-1 space-y-8">
        {/* Title & Subtitle */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Choose Your VEDIXA ERP Plan
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Empower Your Fertilizer & Agri Retail Business
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Select a SaaS plan tailored to your store's billing, FIFO stock management, and financial reporting needs.
          </p>
        </div>

        {/* ACTIVE SUBSCRIPTION NOTIFICATION CARD (If already active) */}
        {hasActiveSub && currentSub && (
          <div className="max-w-3xl mx-auto p-4 bg-emerald-900 text-white rounded-2xl shadow-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-300 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300">Active Subscription</span>
                <h3 className="text-base font-extrabold">{currentSub.planName} Plan</h3>
                <span className="text-xs text-emerald-200 block">
                  Valid until {new Date(currentSub.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-extrabold shrink-0"
            >
              Access Dashboard
            </Button>
          </div>
        )}

        {/* ERROR MSG BANNER */}
        {errorMessage && (
          <div className="max-w-xl mx-auto p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {/* OFFER CODE INPUT */}
        <div className="max-w-md mx-auto p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-emerald-700" /> Special Offer / Coupon Code
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="ENTER OFFER CODE (e.g. VEDIXA50)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="text-xs uppercase font-mono"
            />
            <Button onClick={handleApplyCoupon} className="btn-agri-primary text-xs shrink-0">
              Apply
            </Button>
          </div>
          {couponError && <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>}
          {appliedCoupon && (
            <p className="text-[11px] text-emerald-700 font-extrabold">
              ✓ Code Applied! ₹{appliedCoupon.discountAmount} discount applied.
            </p>
          )}
        </div>

        {/* 3 PLAN CARDS GRID */}
        {isPlansLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">Loading subscription plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
            {plans.map((p) => {
              const isPopular = p.isPopular || p.code === 'PROFESSIONAL';
              const isCurrent = currentSub?.planCode === p.code && hasActiveSub;
              const isSelected = (createOrderMutation.isPending || verifyMutation.isPending) && selectedPlanCode === p.code;

              return (
                <div
                  key={p.code}
                  className={`relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                    isPopular
                      ? 'bg-white border-2 border-[#047857] shadow-xl md:-translate-y-2'
                      : 'bg-white border border-slate-200 shadow-sm hover:border-emerald-300'
                  }`}
                >
                  {/* MOST POPULAR BADGE */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#047857] text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Plan Title & Subtitle */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{p.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {p.code === 'STARTER' && 'Suitable for small fertilizer & agri retail shops.'}
                        {p.code === 'PROFESSIONAL' && 'Suitable for growing fertilizer & agri businesses.'}
                        {p.code === 'PREMIUM' && 'Complete VEDIXA ERP with full advanced controls.'}
                      </p>
                    </div>

                    {/* Price Section */}
                    <div className="border-y border-slate-100 py-3.5 space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        {p.originalPrice && (
                          <span className="text-sm font-semibold text-slate-400 line-through">
                            ₹{p.originalPrice}
                          </span>
                        )}
                        <span className="text-3xl font-extrabold text-[#047857] font-mono">
                          ₹{p.price}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">/ month</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block">
                        Includes {p.discountTokens} Discount Tokens
                      </span>
                    </div>

                    {/* Feature List */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Included Features:
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        {p.features?.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-6">
                    <Button
                      onClick={() => handleSelectPlan(p.code)}
                      disabled={isSelected || isCurrent || createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current}
                      className={`w-full py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                          : isPopular
                          ? 'bg-[#047857] hover:bg-[#036046] text-white shadow-md'
                          : 'btn-agri-primary'
                      }`}
                    >
                      {isSelected
                        ? 'Activating Plan...'
                        : isCurrent
                        ? 'Current Active Plan'
                        : p.code === 'STARTER'
                        ? 'Select Starter'
                        : p.code === 'PROFESSIONAL'
                        ? 'Select Professional'
                        : 'Choose Premium'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 py-6 border-t border-slate-200 mt-12">
        VEDIXA Agri-Business ERP © {new Date().getFullYear()} – All Rights Reserved.
      </footer>
    </div>
  );
}
