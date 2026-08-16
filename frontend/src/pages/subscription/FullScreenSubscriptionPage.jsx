import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Sparkles, LogOut, HelpCircle, Info, ArrowLeft, Zap, Ticket, Clock, CheckCircle2 } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [featureModalPlan, setFeatureModalPlan] = useState(null);

  // Guards for payment lifecycle
  const isInitializingPaymentRef = useRef(false);
  const rzpInstanceRef = useRef(null);

  // Fetch Current User Subscription API
  const { data: subRes, isLoading: isSubLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const currentSub = subRes?.data?.subscription || subRes?.subscription || null;
  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  // Sign Out Handler
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (_e) {
      // Continue cleanup
    } fontally: {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  // Demo Request Mutation
  const demoRequestMutation = useMutation({
    mutationFn: (requestedPlan) => subscriptionService.requestFreeDemo(requestedPlan),
    onSuccess: (res) => {
      setSuccessMessage('Your Free Demo Request has been submitted! Our admin team will approve it shortly.');
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to submit demo request.');
    },
  });

  // Unified 3 Subscription Duration Options (Same Features)
  const durationPlans = [
    {
      code: '1_MONTH',
      planCode: 'STARTER',
      durationLabel: '1 Month',
      price: 199,
      originalPrice: 299,
      discountTokens: 5,
      isPopular: false,
      badgeText: 'STANDARD TRIAL',
    },
    {
      code: '3_MONTHS',
      planCode: 'PROFESSIONAL',
      durationLabel: '3 Months',
      price: 499,
      originalPrice: 699,
      discountTokens: 15,
      isPopular: true,
      badgeText: 'MOST POPULAR (SAVE 16%)',
    },
    {
      code: '6_MONTHS',
      planCode: 'PREMIUM',
      durationLabel: '6 Months',
      price: 899,
      originalPrice: 1299,
      discountTokens: 30,
      isPopular: false,
      badgeText: 'BEST VALUE (SAVE 25%)',
    },
  ];

  // Shared VEDIXA ERP Feature List across all plan durations
  const sharedFeatures = [
    'Complete Fertilizer & Agri ERP Dashboard',
    'Product Management (Urea, DAP, Pesticides, Seeds)',
    'Batch-wise Stock & Multi-batch Billing',
    'GST & Tax Compliance Reports (GSTR-1, GSTR-3B)',
    'Supplier & Customer Financial Ledgers',
    'Customer Billing & Invoice PDF Generation',
    'WhatsApp Invoice Sharing & Print Support',
    'Automated Stock Reorder Alerts',
    'Admin & User Backup Isolation',
    '24/7 Priority Support & Free Updates',
  ];

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

  // Razorpay Order Creation & Verification Mutations
  const createOrderMutation = useMutation({
    mutationFn: ({ planCode, couponCode }) => subscriptionService.createRazorpayOrder(planCode, couponCode),
    onSuccess: (res) => {
      const orderData = res?.data || res;
      const currentUser = authService.getCurrentUser() || {};
      const couponCodeToUse = appliedCheckoutCoupon?.coupon?.code || checkoutCouponCode;

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
            description: `${checkoutPlan.durationLabel} Subscription`,
            order_id: orderData.orderId,
            handler: async function (response) {
              isInitializingPaymentRef.current = false;
              verifyMutation.mutate({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planCode: checkoutPlan.planCode,
                couponCode: couponCodeToUse,
              });
            },
            prefill: {
              name: currentUser.ownerName || currentUser.shopName || '',
              contact: currentUser.mobile || '',
              email: currentUser.email || '',
            },
            theme: { color: '#047857' },
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
          setErrorMessage('Could not open Razorpay checkout. Please try again.');
        }
      } else {
        isInitializingPaymentRef.current = false;
        setErrorMessage('Razorpay SDK is loading. Please try again.');
      }
    },
    onError: (err) => {
      isInitializingPaymentRef.current = false;
      setErrorMessage(err?.message || 'Failed to initialize checkout.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (payload) => subscriptionService.verifyPayment(payload),
    onSuccess: () => {
      isInitializingPaymentRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      window.location.href = '/dashboard';
    },
    onError: (err) => {
      isInitializingPaymentRef.current = false;
      setErrorMessage(err?.message || 'Payment verification failed.');
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
    setSuccessMessage('');
    isInitializingPaymentRef.current = false;
  };

  const handleConfirmPayment = () => {
    if (!checkoutPlan || createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current) {
      return;
    }
    isInitializingPaymentRef.current = true;
    setErrorMessage('');
    createOrderMutation.mutate({
      planCode: checkoutPlan.planCode,
      couponCode: appliedCheckoutCoupon?.coupon?.code || checkoutCouponCode,
    });
  };

  // Payable calculations for checkout
  const originalPrice = checkoutPlan?.price || 0;
  const discountAmount = appliedCheckoutCoupon?.discountAmount || 0;
  const finalPayableAmount = Math.max(0, originalPrice - discountAmount);

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col justify-between overflow-y-auto p-4 sm:p-6 lg:p-8 text-slate-800">
      
      {/* HEADER LOGO */}
      <div className="pt-2 px-3 sm:px-6 lg:px-10 shrink-0 flex items-center justify-between">
        <BrandLogo textScale="lg" />
        {hasActiveSub && (
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5"
          >
            <span>Open ERP Dashboard →</span>
          </button>
        )}
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-between">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-2 shrink-0 pt-2 mb-6 lg:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> SELECT SUBSCRIPTION DURATION OR REQUEST A FREE DEMO
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Power your Fertilizer &amp; Agri Retail Business with VEDIXA ERP
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Choose 1 Month, 3 Months, or 6 Months access. All plans include 100% full features.
          </p>

          {/* ACTIVE DEMO / SUBSCRIPTION BANNER */}
          {hasActiveSub && (
            <div className="max-w-xl mx-auto mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Active Access Granted! Expires on:{' '}
                  <strong>
                    {currentSub?.expiryDate ? new Date(currentSub.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition"
              >
                Go to ERP
              </button>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS & ERRORS */}
        {successMessage && (
          <div className="max-w-xl mx-auto py-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold text-center mb-4 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="max-w-xl mx-auto py-3 px-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold text-center mb-4">
            {errorMessage}
          </div>
        )}

        {/* 3 SUBSCRIPTION DURATION CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch flex-1 my-2">
          {durationPlans.map((plan) => {
            const isPopular = plan.isPopular;

            return (
              <div
                key={plan.code}
                className={`relative rounded-3xl p-6 lg:p-7 transition-all duration-300 flex flex-col justify-between h-full bg-white border ${
                  isPopular
                    ? 'border-emerald-600 shadow-xl ring-4 ring-emerald-500/10'
                    : 'border-slate-200 shadow-sm hover:border-emerald-300'
                }`}
              >
                {/* BADGE */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-4 py-0.5 rounded-full shadow-xs tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> {plan.badgeText}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Header */}
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">{plan.durationLabel} Plan</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Complete VEDIXA ERP feature access for {plan.durationLabel}.
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className="border-y border-slate-100 py-3 space-y-1 text-center sm:text-left">
                    <div className="flex items-baseline justify-center sm:justify-start gap-2">
                      {plan.originalPrice && (
                        <span className="text-sm font-semibold text-slate-400 line-through">
                          ₹{plan.originalPrice}
                        </span>
                      )}
                      <span className="text-3xl lg:text-4xl font-black text-emerald-700 font-mono">
                        ₹{plan.price}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">/ {plan.durationLabel}</span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 inline-block">
                      Includes {plan.discountTokens} Discount Tokens
                    </span>
                  </div>

                  {/* Included Features List (Shared Across All 3 Durations) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Included Features (All Plans):
                    </span>
                    <ul className="space-y-2 text-xs text-slate-700 font-medium">
                      {sharedFeatures.slice(0, 5).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-tight">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setFeatureModalPlan(plan)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" /> View all {sharedFeatures.length} features
                    </button>
                  </div>
                </div>

                {/* DUAL CTA BUTTONS: FREE DEMO REQUEST & SUBSCRIBE */}
                <div className="mt-auto pt-6 space-y-2.5">
                  <button
                    onClick={() => demoRequestMutation.mutate(plan.code)}
                    disabled={demoRequestMutation.isPending || hasActiveSub}
                    className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-2xl border border-amber-200 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>{demoRequestMutation.isPending ? 'Submitting...' : 'Free Demo Request'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenCheckout(plan)}
                    disabled={hasActiveSub}
                    className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer ${
                      isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                    } disabled:opacity-50`}
                  >
                    Subscribe & Pay Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 lg:px-10 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
        <span className="text-[10px] text-slate-400">
          VEDIXA Agri-Business ERP © {new Date().getFullYear()} – Secure 256-bit Encrypted SaaS Platform.
        </span>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Help</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors cursor-pointer font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </footer>

      {/* CHECKOUT MODAL */}
      {checkoutPlan && (
        <Modal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          title="PLAN CONFIRMATION & CHECKOUT"
        >
          <div className="space-y-5 pt-2 font-sans text-xs">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-100 tracking-wider">YOUR SELECTED DURATION</span>
                <span className="text-[10px] font-bold bg-emerald-700 text-emerald-100 px-2.5 py-0.5 rounded-full">
                  Includes {checkoutPlan.discountTokens} Discount Tokens
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-emerald-500/60 pt-2">
                <h3 className="text-lg font-bold tracking-tight">{checkoutPlan.durationLabel} Plan</h3>
                <div className="flex items-baseline gap-1.5 font-mono">
                  {checkoutPlan.originalPrice && (
                    <span className="text-xs text-emerald-200 line-through">₹{checkoutPlan.originalPrice}</span>
                  )}
                  <span className="text-xl font-extrabold text-white">₹{checkoutPlan.price}</span>
                </div>
              </div>
            </div>

            {/* COUPON INPUT */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-600" /> Have an offer code? <span className="text-slate-400 font-normal">(Optional)</span>
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
              {couponError && <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>}
              {appliedCheckoutCoupon && (
                <p className="text-[11px] text-emerald-700 font-bold">
                  ✓ Offer applied successfully! ₹{appliedCheckoutCoupon.discountAmount} discount calculated.
                </p>
              )}
            </div>

            {/* PAYMENT SUMMARY */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Original Plan Price:</span>
                <span className="font-mono">₹{originalPrice}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-100">
                <span>Payable Amount:</span>
                <span className="font-mono text-emerald-700 text-base">₹{finalPayableAmount}</span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <Button
                onClick={handleConfirmPayment}
                disabled={createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current}
                className="btn-agri-primary text-xs font-bold uppercase py-2.5 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
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
          title={`${featureModalPlan.durationLabel} Plan - Full Feature Checklist`}
        >
          <div className="space-y-4 pt-2 font-sans text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{featureModalPlan.durationLabel} Plan</h4>
                <p className="text-xs text-emerald-700 font-bold font-mono">₹{featureModalPlan.price} / {featureModalPlan.durationLabel}</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {featureModalPlan.discountTokens} Discount Tokens
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">All Features (Identical Across All Durations):</span>
              <ul className="space-y-2 text-xs text-slate-800 font-medium max-h-64 overflow-y-auto pr-1">
                {sharedFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
