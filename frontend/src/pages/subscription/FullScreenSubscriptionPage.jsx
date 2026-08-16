import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, Zap, Ticket, ArrowRight, Star, Sparkles, LogOut, HelpCircle, User, Info, ArrowLeft } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export default function FullScreenSubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for checkout modal & coupon
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('');
  const [appliedCheckoutCoupon, setAppliedCheckoutCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [featureModalPlan, setFeatureModalPlan] = useState(null);

  // Guards for double-click & single Razorpay instance lifecycle
  const isInitializingPaymentRef = useRef(false);
  const rzpInstanceRef = useRef(null);

  // Fetch Subscription Plans API
  const { data: plansRes, isLoading: isPlansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionService.getPlans,
  });

  // Fetch Current User Subscription API
  const { data: subRes } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const plans = plansRes?.data?.plans || plansRes?.plans || [];
  const currentSub = subRes?.data?.subscription || subRes?.subscription || null;
  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  // Sign Out Handler
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (_e) {
      // Continue cleanup
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  // Coupon Validation Mutation
  const couponMutation = useMutation({
    mutationFn: ({ code, price }) => subscriptionService.validateCoupon(code, price),
    onSuccess: (res) => {
      setAppliedCheckoutCoupon(res.data || res);
      setCouponError('');
    },
    onError: (err) => {
      setCouponError(err?.message || 'Invalid coupon code');
      setAppliedCheckoutCoupon(null);
    },
  });

  // Razorpay Order Creation & Payment Verification Mutations
  const createOrderMutation = useMutation({
    mutationFn: ({ planCode, couponCode }) => subscriptionService.createRazorpayOrder(planCode, couponCode),
    onSuccess: (res) => {
      const orderData = res?.data || res;
      const currentUser = authService.getCurrentUser() || {};
      const couponCodeToUse = appliedCheckoutCoupon?.coupon?.code || checkoutCouponCode;

      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          // Close any previous open Razorpay instance
          if (rzpInstanceRef.current) {
            try { rzpInstanceRef.current.close(); } catch (_e) {}
            rzpInstanceRef.current = null;
          }

          const options = {
            key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'VEDIXA ERP',
            description: `${orderData.planCode || checkoutPlan.name} Subscription`,
            order_id: orderData.orderId,
            handler: async function (response) {
              isInitializingPaymentRef.current = false;
              verifyMutation.mutate({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planCode: checkoutPlan.code,
                couponCode: couponCodeToUse,
              });
            },
            prefill: {
              name: currentUser.ownerName || currentUser.shopName || '',
              contact: currentUser.mobile || '',
              email: currentUser.email || '',
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
      setErrorMessage(err?.message || 'Payment verification failed. Subscription not activated.');
    },
  });

  const handleApplyCouponInCheckout = () => {
    if (!checkoutCouponCode.trim() || !checkoutPlan) return;
    couponMutation.mutate({ code: checkoutCouponCode, price: checkoutPlan.price });
  };

  const handleOpenCheckout = (plan) => {
    setCheckoutPlan(plan);
    setCheckoutCouponCode('');
    setAppliedCheckoutCoupon(null);
    setCouponError('');
    setErrorMessage('');
    isInitializingPaymentRef.current = false;
  };

  const handleConfirmPayment = () => {
    if (!checkoutPlan || createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current) {
      return;
    }
    isInitializingPaymentRef.current = true;
    setErrorMessage('');
    createOrderMutation.mutate({
      planCode: checkoutPlan.code,
      couponCode: appliedCheckoutCoupon?.coupon?.code || checkoutCouponCode,
    });
  };

  // Payable calculations for checkout
  const originalPrice = checkoutPlan?.price || 0;
  const discountAmount = appliedCheckoutCoupon?.discountAmount || 0;
  const finalPayableAmount = Math.max(0, originalPrice - discountAmount);

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col justify-between overflow-y-auto p-3 sm:p-5 lg:p-8">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP BRANDING ONLY (PROMINENT VEDIXA LOGO AT TOP-LEFT) */}
      {/* ------------------------------------------------------------- */}
      <div className="pt-2 px-3 sm:px-6 lg:px-10 shrink-0 flex items-center justify-between">
        <BrandLogo textScale="lg" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-3 flex-1 flex flex-col justify-between overflow-visible">
        
        {/* HERO SECTION (Z-Index Stacked) */}
        <div className="relative z-20 text-center space-y-1.5 shrink-0 pt-1 mb-6 lg:mb-8">
          <div className="relative z-30 inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-[#047857] text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#047857]" /> CHOOSE THE RIGHT PLAN FOR YOUR BUSINESS
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Power your Fertilizer &amp; Agri Retail Business with VEDIXA ERP.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Start with the plan that fits your store. Upgrade anytime as your business grows.
          </p>
        </div>

        {/* ERROR MSG BANNER */}
        {errorMessage && (
          <div className="shrink-0 max-w-xl mx-auto py-2 px-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold text-center mb-4">
            {errorMessage}
          </div>
        )}

        {/* 3 PRICING CARDS GRID (PREMIUM PROPORTIONS & SPACING) */}
        {isPlansLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">Loading SaaS pricing plans...</div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch flex-1 my-2">
            {plans.map((p) => {
              const isPopular = p.isPopular || p.code === 'PROFESSIONAL';
              const isCurrent = currentSub?.planCode === p.code && hasActiveSub;
              const isSelected = (createOrderMutation.isPending || verifyMutation.isPending) && checkoutPlan?.code === p.code;

              // Display top 5 features on card
              const topFeatures = p.features?.slice(0, 5) || [];
              const totalFeatureCount = p.features?.length || 0;

              return (
                <div
                  key={p.code}
                  className={`relative rounded-3xl p-6 lg:p-7 transition-all duration-300 flex flex-col justify-between h-full ${
                    isPopular
                      ? 'bg-white border-2 border-[#047857] shadow-xl ring-4 ring-emerald-500/10'
                      : 'bg-white border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  {/* ⭐ MOST POPULAR BADGE */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#047857] text-white text-[11px] font-extrabold uppercase px-4 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> ⭐ MOST POPULAR
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight uppercase">{p.name}</h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {p.code === 'STARTER' && 'Suitable for small fertilizer & agri retail stores.'}
                        {p.code === 'PROFESSIONAL' && 'Suitable for growing fertilizer & agri businesses.'}
                        {p.code === 'PREMIUM' && 'Complete VEDIXA ERP with advanced controls.'}
                      </p>
                    </div>

                    {/* Price Display */}
                    <div className="border-y border-slate-100 py-3 space-y-1 text-center sm:text-left">
                      <div className="flex items-baseline justify-center sm:justify-start gap-2">
                        {p.originalPrice && (
                          <span className="text-sm font-semibold text-slate-400 line-through">
                            ₹{p.originalPrice}
                          </span>
                        )}
                        <span className="text-3xl lg:text-4xl font-black text-[#047857] font-mono">
                          ₹{p.price}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">/ month</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 inline-block">
                        Includes {p.discountTokens} Discount Tokens
                      </span>
                    </div>

                    {/* Included Features List (Top 5) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                        Included Features:
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        {topFeatures.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-tight">
                            <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5 stroke-[2.5]" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {totalFeatureCount > 5 && (
                        <button
                          type="button"
                          onClick={() => setFeatureModalPlan(p)}
                          className="text-[11px] font-bold text-[#047857] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" /> View all {totalFeatureCount} features
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CTA Button (Aligned cleanly at bottom) */}
                  <div className="mt-auto pt-6">
                    <Button
                      onClick={() => handleOpenCheckout(p)}
                      disabled={isSelected || isCurrent}
                      className={`w-full py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                          : isPopular
                          ? 'bg-[#047857] hover:bg-[#036046] text-white shadow-lg active:scale-98'
                          : 'btn-agri-primary shadow-sm active:scale-98'
                      }`}
                    >
                      {isSelected
                        ? 'Activating Plan...'
                        : isCurrent
                        ? 'Current Active Plan'
                        : p.code === 'STARTER'
                        ? 'CHOOSE STARTER'
                        : p.code === 'PROFESSIONAL'
                        ? 'CHOOSE PROFESSIONAL'
                        : 'CHOOSE PREMIUM'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM FOOTER & SUBTLE HELP | LOGOUT BUTTONS */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 py-2 px-6 lg:px-10 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
        <span className="text-[10px] text-slate-400">
          VEDIXA Agri-Business ERP © {new Date().getFullYear()} – Secure 256-bit Encrypted SaaS Platform.
        </span>

        {/* BOTTOM-RIGHT HELP & LOGOUT */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#047857]" />
            <span>Help</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* CHECKOUT / PLAN CONFIRMATION STEP MODAL */}
      {/* ------------------------------------------------------------- */}
      {checkoutPlan && (
        <Modal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          title="PLAN CONFIRMATION & CHECKOUT"
        >
          <div className="space-y-5 pt-2 font-sans text-xs">
            {/* Selected Plan Summary Banner */}
            <div className="p-4 bg-gradient-to-r from-[#047857] to-emerald-800 text-white rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-200 tracking-wider">YOUR SELECTED PLAN</span>
                <span className="text-[10px] font-extrabold bg-emerald-400/20 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Includes {checkoutPlan.discountTokens} Discount Tokens
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-emerald-700/60 pt-2">
                <h3 className="text-lg font-black tracking-tight">{checkoutPlan.name} PLAN</h3>
                <div className="flex items-baseline gap-1.5 font-mono">
                  {checkoutPlan.originalPrice && (
                    <span className="text-xs text-emerald-300/70 line-through">₹{checkoutPlan.originalPrice}</span>
                  )}
                  <span className="text-xl font-extrabold text-white">₹{checkoutPlan.price}</span>
                  <span className="text-[10px] text-emerald-200">/ month</span>
                </div>
              </div>
            </div>

            {/* Feature Entitlement Checklist */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block">
                Plan Entitlements:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 font-medium">
                {checkoutPlan.features?.slice(0, 6).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-tight text-[11px]">
                    <Check className="w-3.5 h-3.5 text-[#047857] shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* OPTIONAL OFFER / COUPON INPUT */}
            <div className="space-y-2 p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-[#047857]" /> Have an offer code? <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="ENTER OFFER CODE"
                  value={checkoutCouponCode}
                  onChange={(e) => setCheckoutCouponCode(e.target.value.toUpperCase())}
                  className="text-xs uppercase font-mono flex-1"
                />
                <Button
                  onClick={handleApplyCouponInCheckout}
                  disabled={couponMutation.isPending || !checkoutCouponCode.trim()}
                  className="btn-agri-primary text-xs shrink-0 px-4"
                >
                  {couponMutation.isPending ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              {couponError && <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>}
              {appliedCheckoutCoupon && (
                <p className="text-[11px] text-emerald-700 font-extrabold">
                  ✓ Offer applied successfully! ₹{appliedCheckoutCoupon.discountAmount} discount calculated.
                </p>
              )}
            </div>

            {/* Payment Summary */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Original Plan Price:</span>
                <span className="font-mono">₹{originalPrice}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-extrabold">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-100">
                <span>Payable Amount:</span>
                <span className="font-mono text-[#047857] text-base">₹{finalPayableAmount}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Plans</span>
              </button>

              <Button
                onClick={handleConfirmPayment}
                disabled={createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current}
                className="btn-agri-primary text-xs font-black uppercase py-2.5 px-5 rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>
                  {createOrderMutation.isPending || isInitializingPaymentRef.current
                    ? 'Initializing Razorpay...'
                    : verifyMutation.isPending
                    ? 'Verifying Payment...'
                    : 'Continue to Payment'}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW ALL FEATURES MODAL */}
      {featureModalPlan && (
        <Modal
          isOpen={!!featureModalPlan}
          onClose={() => setFeatureModalPlan(null)}
          title={`${featureModalPlan.name} Plan - Full Feature List`}
        >
          <div className="space-y-4 pt-2 font-sans text-xs">
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div>
                <h4 className="font-black text-slate-900 text-sm">{featureModalPlan.name} Plan</h4>
                <p className="text-xs text-[#047857] font-extrabold font-mono">₹{featureModalPlan.price} / month</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {featureModalPlan.discountTokens} Discount Tokens
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Complete Feature Checklist:</span>
              <ul className="space-y-2 text-xs text-slate-800 font-medium max-h-64 overflow-y-auto pr-1">
                {featureModalPlan.features?.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50">
                    <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                onClick={() => {
                  const plan = featureModalPlan;
                  setFeatureModalPlan(null);
                  handleOpenCheckout(plan);
                }}
                className="btn-agri-primary text-xs"
              >
                Choose {featureModalPlan.name} Plan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
