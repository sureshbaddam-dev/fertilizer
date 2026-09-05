import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Star, LogOut, Info, AlertTriangle, Clock, Ticket } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { loadRazorpaySDK } from '../../utils/loadExternalScript';
import BrandLogo from '../../components/common/BrandLogo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { formatISTDate, calculateRemainingDays } from '../../utils/dateUtils';

export default function FullScreenSubscriptionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout: authLogout } = useAuth();

  // State for checkout modal, coupon drawer, & messages
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('');
  const [appliedCheckoutCoupon, setAppliedCheckoutCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [featureModalPlan, setFeatureModalPlan] = useState(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [headerCouponCode, setHeaderCouponCode] = useState('');
  const [appliedHeaderCoupon, setAppliedHeaderCoupon] = useState(null);

  // Guards for payment lifecycle
  const isInitializingPaymentRef = useRef(false);
  const rzpInstanceRef = useRef(null);
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(false);
  const currentUser = authService.getCurrentUser() || {};

  // Check pending order status (e.g. after return from PhonePe / mobile UPI app)
  const checkPendingOrderStatus = async (orderId, isSilent = false) => {
    if (!orderId) return;
    if (!isSilent) setIsVerifyingStatus(true);
    try {
      const res = await subscriptionService.checkOrderStatus(orderId);
      const payload = res?.data || res;
      if (payload?.isPaid) {
        sessionStorage.removeItem('pending_razorpay_order_id');
        sessionStorage.removeItem('pending_razorpay_order_time');
        queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        setSuccessMessage('Payment verified & subscription activated successfully!');
        setErrorMessage('');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else if (!isSilent) {
        setErrorMessage('Payment status: ' + (payload?.status || 'PENDING') + '. If completed in your UPI app, please wait a moment for confirmation.');
      }
    } catch (_err) {
      if (!isSilent) setErrorMessage('Could not verify payment status. Please try again.');
    } finally {
      if (!isSilent) setIsVerifyingStatus(false);
    }
  };

  // Auto-check pending order on page mount or window focus (mobile app return)
  React.useEffect(() => {
    const handleFocusCheck = () => {
      const pendingOrderId = sessionStorage.getItem('pending_razorpay_order_id');
      const pendingTime = sessionStorage.getItem('pending_razorpay_order_time');
      if (pendingOrderId) {
        if (!pendingTime || Date.now() - Number(pendingTime) < 15 * 60 * 1000) {
          checkPendingOrderStatus(pendingOrderId, true);
        } else {
          sessionStorage.removeItem('pending_razorpay_order_id');
          sessionStorage.removeItem('pending_razorpay_order_time');
        }
      }
    };

    handleFocusCheck();

    window.addEventListener('focus', handleFocusCheck);
    document.addEventListener('visibilitychange', handleFocusCheck);
    return () => {
      window.removeEventListener('focus', handleFocusCheck);
      document.removeEventListener('visibilitychange', handleFocusCheck);
    };
  }, []);

  // Fetch Subscription Plans API (Single Source of Truth from MongoDB)
  const { data: plansRes, isLoading: isPlansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionService.getPlans,
  });

  const durationPlans = plansRes?.data?.plans || plansRes?.plans || [];
  const isSystemActive = plansRes?.data?.isSubscriptionSystemActive ?? plansRes?.isSubscriptionSystemActive ?? true;

  // Fetch Current User Subscription API
  const { data: subRes, isLoading: isSubLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const subData = subRes?.data || subRes || {};
  const currentSub = subData?.subscription || null;
  const hasActiveSub = subData?.hasActiveSubscription || false;
  const isTrial = hasActiveSub && currentSub && (currentSub.paymentStatus === 'DEMO' || currentSub.couponCode === 'DEMO');
  const isExpired = currentSub?.status === 'EXPIRED' || (currentSub?.expiryDate && new Date(currentSub.expiryDate) < new Date());
  const remainingDays = currentSub?.expiryDate ? calculateRemainingDays(currentSub.expiryDate) : 0;
  const planDisplayName = isTrial ? '7-Day Free Trial' : currentSub?.planName || currentSub?.planCode || 'Plan';

  // Sign Out Handler
  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (_e) {
      // Continue cleanup
    }
    navigate('/login', { replace: true });
  };

  // Shared VEDIXA ERP Feature List across all plan durations
  const defaultFeatures = [
    'Complete Fertilizer & Agri ERP Access',
    'FIFO & Batch-wise Inventory Management',
    'Barcode Scanning & Custom Print Layouts',
    'GST Tax Compliance Reports (GSTR-1, GSTR-3B)',
    'Supplier & Customer Financial Ledgers',
    'WhatsApp Invoice Sharing & Print Support',
    'Real-time Dashboard Analytics & Alerts',
    '24/7 Priority Support & Free Updates',
  ];

  // Coupon Validation Mutation
  const couponMutation = useMutation({
    mutationFn: ({ code, price }) => subscriptionService.validateCoupon(code, price),
    onSuccess: (res) => {
      if (checkoutPlan) {
        setAppliedCheckoutCoupon(res.data || res);
      } else {
        setAppliedHeaderCoupon(res.data || res);
      }
      setCouponError('');
    },
    onError: (err) => {
      setCouponError(err?.message || 'Invalid coupon code');
      if (checkoutPlan) setAppliedCheckoutCoupon(null);
      else setAppliedHeaderCoupon(null);
    },
  });

  // Razorpay Order Creation & Verification Mutations
  const createOrderMutation = useMutation({
    mutationFn: ({ planCode, couponCode }) => subscriptionService.createRazorpayOrder(planCode, couponCode),
    onSuccess: async (res) => {
      const orderData = res?.data || res;
      const couponCodeToUse = appliedCheckoutCoupon?.coupon?.code || appliedHeaderCoupon?.coupon?.code || checkoutCouponCode;

      if (orderData?.orderId) {
        sessionStorage.setItem('pending_razorpay_order_id', orderData.orderId);
        sessionStorage.setItem('pending_razorpay_order_time', String(Date.now()));
      }

      try {
        await loadRazorpaySDK();
      } catch (_err) {
        isInitializingPaymentRef.current = false;
        setErrorMessage('Failed to load payment gateway SDK. Please check your network connection.');
        return;
      }

      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          if (rzpInstanceRef.current) {
            try { rzpInstanceRef.current.close(); } catch (_e) {}
            rzpInstanceRef.current = null;
          }

          const targetPlanCode = orderData.planCode || checkoutPlan?.code;

          const options = {
            key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'VEDIXA ERP',
            description: `${orderData.planName || targetPlanCode} Plan Subscription`,
            order_id: orderData.orderId,
            prefill: {
              name: currentUser?.ownerName || '',
              contact: currentUser?.mobile || '',
              email: currentUser?.email || '',
            },
            handler: async function (response) {
              sessionStorage.removeItem('pending_razorpay_order_id');
              sessionStorage.removeItem('pending_razorpay_order_time');
              isInitializingPaymentRef.current = false;
              verifyMutation.mutate({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setCheckoutPlan(null);
            },
            theme: {
              color: '#047857',
            },
            modal: {
              ondismiss: function () {
                isInitializingPaymentRef.current = false;
                setTimeout(() => {
                  const pendingId = sessionStorage.getItem('pending_razorpay_order_id');
                  if (pendingId) {
                    checkPendingOrderStatus(pendingId, true);
                  }
                }, 1000);
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
        setErrorMessage('Razorpay SDK failed to load. Please check your internet connection.');
      }
    },
    onError: (err) => {
      isInitializingPaymentRef.current = false;
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to initiate Razorpay order.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (payload) => subscriptionService.verifyPayment(payload),
    onSuccess: () => {
      sessionStorage.removeItem('pending_razorpay_order_id');
      sessionStorage.removeItem('pending_razorpay_order_time');
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setSuccessMessage('Payment verified & subscription activated successfully!');
      setErrorMessage('');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Payment verification failed.');
    },
  });

  const handleApplyHeaderCoupon = () => {
    if (!headerCouponCode.trim()) return;
    const basePrice = durationPlans[0]?.price || 199;
    couponMutation.mutate({ code: headerCouponCode, price: basePrice });
  };

  const handleApplyCheckoutCoupon = () => {
    if (!checkoutCouponCode.trim() || !checkoutPlan) return;
    couponMutation.mutate({ code: checkoutCouponCode, price: checkoutPlan.price });
  };

  const handleOpenCheckout = (plan) => {
    if (!isSystemActive) return;
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
      planCode: checkoutPlan.code,
      couponCode: appliedCheckoutCoupon?.coupon?.code || appliedHeaderCoupon?.coupon?.code || checkoutCouponCode,
    });
  };

  // Payable calculations for checkout modal
  const originalPrice = checkoutPlan?.price || 0;
  const activeCoupon = appliedCheckoutCoupon || appliedHeaderCoupon;
  const discountAmount = activeCoupon?.discountAmount || 0;
  const finalPayableAmount = Math.max(0, originalPrice - discountAmount);

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-100/70 text-slate-800 flex flex-col justify-between overflow-y-auto lg:overflow-hidden font-sans antialiased p-3 sm:p-5 lg:p-6">
      
      {/* 1. MEDIUM/COMPACT TOP NAVBAR (70-80px HEIGHT, BALANCED PADDING) */}
      <header className="max-w-6xl mx-auto w-full shrink-0 space-y-1.5 mb-2">
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-2xs h-18">
          <BrandLogo textScale="md" />

          {/* ACTIVE / TRIAL / EXPIRED SUBSCRIPTION STATUS PILL */}
          {hasActiveSub && currentSub && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 border rounded-xl text-xs font-semibold ${
              isTrial
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {isTrial ? (
                <span className="text-sm">🎁</span>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>
                Active: <strong>{planDisplayName}</strong> (Expires:{' '}
                {formatISTDate(currentSub.expiryDate)})
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className={`ml-2 px-2.5 py-0.5 text-white font-bold text-[11px] rounded-lg transition ${
                  isTrial ? 'bg-amber-800 hover:bg-amber-900' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                ERP App →
              </button>
            </div>
          )}

          {isExpired && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
              <span>
                <strong>Subscription Expired</strong> ({formatISTDate(currentSub?.expiryDate)})
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2.5">
            {hasActiveSub && (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-200"
              >
                <span>← Back to Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setShowCouponInput(!showCouponInput)}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-700" />
              <span>{appliedHeaderCoupon ? `Coupon: ${appliedHeaderCoupon.coupon?.code}` : 'Have Coupon?'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* COMPACT COUPON CODE INPUT DRAWER */}
        {showCouponInput && (
          <div className="max-w-md mx-auto p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-2">
            <Input
              type="text"
              placeholder="ENTER OFFER CODE"
              value={headerCouponCode}
              onChange={(e) => setHeaderCouponCode(e.target.value.toUpperCase())}
              className="text-xs uppercase font-mono py-1.5"
            />
            <Button onClick={handleApplyHeaderCoupon} className="btn-agri-primary text-xs py-1.5 px-3.5 shrink-0">
              Apply
            </Button>
            {appliedHeaderCoupon && (
              <span className="text-[11px] font-extrabold text-emerald-700 shrink-0">
                -₹{appliedHeaderCoupon.discountAmount}
              </span>
            )}
          </div>
        )}
      </header>

      {/* MAIN VIEWPORT-FIT CONTENT */}
      <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-between space-y-3">
        
        {/* TITLE & HEADING SECTION */}
        <div className="text-center space-y-1.5 shrink-0 pt-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            VEDIXA ERP Subscription Plans
          </h1>

          {/* DYNAMIC TRIAL / EXPIRY NOTICES */}
          {isTrial && remainingDays <= 3 && remainingDays > 0 && (
            <div className="max-w-lg mx-auto mt-1 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-center gap-2">
              <span className="text-sm">⏳</span>
              <span>
                Your 7-Day Free Trial expires in <strong>{remainingDays} {remainingDays === 1 ? 'day' : 'days'}</strong> ({formatISTDate(currentSub.expiryDate)}). Choose a plan to continue without interruption.
              </span>
            </div>
          )}

          {isExpired && (
            <div className="max-w-lg mx-auto mt-1 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Your trial or subscription has expired. Please select a plan below to activate your account.
              </span>
            </div>
          )}

          {/* SYSTEM UNAVAILABLE BANNER */}
          {!isSystemActive && (
            <div className="max-w-lg mx-auto mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Subscriptions are temporarily unavailable for maintenance. Please check back later.</span>
            </div>
          )}

          {/* NOTIFICATION MESSAGES */}
          {successMessage && (
            <div className="max-w-lg mx-auto py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="max-w-lg mx-auto py-2 px-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* 3 EQUAL-HEIGHT PRICING CARDS GRID (COMPACT NATURAL HEIGHT, ZERO CLUMSY BLANK SPACE) */}
        {isPlansLoading ? (
          <div className="text-center py-10 text-slate-400 text-xs italic">Loading pricing options...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto w-full my-auto py-4 lg:py-5">
            {durationPlans.slice(0, 3).map((plan, index) => {
              const isPopular = plan.isPopular || index === 1;

              // Color Theme Palette per Card
              const cardThemes = [
                {
                  tabBg: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white',
                  glowBg: 'bg-gradient-to-b from-cyan-100/70 via-teal-50/40 to-transparent',
                  btnStyle: 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg',
                  accentColor: 'text-teal-700',
                  badgeTitle: '1 MONTH',
                },
                {
                  tabBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white',
                  glowBg: 'bg-gradient-to-b from-emerald-100/80 via-teal-50/50 to-transparent',
                  btnStyle: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl ring-2 ring-emerald-500/30',
                  accentColor: 'text-emerald-700',
                  badgeTitle: '3 MONTHS',
                },
                {
                  tabBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
                  glowBg: 'bg-gradient-to-b from-purple-100/70 via-indigo-50/40 to-transparent',
                  btnStyle: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg',
                  accentColor: 'text-indigo-700',
                  badgeTitle: '6 MONTHS',
                },
              ];

              const theme = cardThemes[index % cardThemes.length];
              const currentSubPlanCode = (currentSub?.planCode || '').toUpperCase();
              const isCurrentPlan = hasActiveSub && currentSubPlanCode === plan.code.toUpperCase();

              return (
                <div key={plan.code} className="flex flex-col h-full relative group">
                  
                  {/* FLOATING MOST POPULAR BADGE - POSITIONED CLEANLY ABOVE TAB LABEL */}
                  {isPopular && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-md tracking-wider flex items-center gap-1 z-30 whitespace-nowrap border border-amber-300">
                      <Star className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" /> MOST POPULAR
                    </div>
                  )}

                  {/* TOP HEADER TAB BADGE (EXACTLY SAME HEIGHT & Y-POSITION ACROSS ALL 3 CARDS) */}
                  <div className="w-44 mx-auto relative z-10 -mb-4 text-center">
                    <div className={`h-7 px-4 rounded-t-2xl font-black text-xs uppercase tracking-wider shadow-2xs flex items-center justify-center ${theme.tabBg}`}>
                      {plan.name || theme.badgeTitle}
                    </div>
                  </div>

                  {/* WHITE ROUNDED CARD CONTAINER (BALANCED NATURAL HEIGHT, NO CLUMSY BLANK AREA) */}
                  <div
                    className={`bg-white rounded-3xl pt-7 pb-5 px-6 shadow-xl border flex flex-col justify-between h-full relative z-0 transition-all duration-300 ${
                      isPopular
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xl'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* GLOWING HEADER & PROMINENT PRICE DISPLAY */}
                      <div className={`rounded-2xl p-4 text-center space-y-0.5 -mx-1 ${theme.glowBg}`}>
                        {plan.originalPrice && (
                          <div className="text-xs font-semibold text-slate-400 line-through">
                            ₹{plan.originalPrice}
                          </div>
                        )}
                        <div className="text-3xl lg:text-4xl font-black text-slate-900 font-mono tracking-tight">
                          ₹{plan.price}
                        </div>
                        <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                          {plan.billingPeriod || 'per duration'}
                        </div>
                        {plan.offerPrice && (
                          <span className="inline-block mt-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Offer Price
                          </span>
                        )}
                      </div>

                      {/* FEATURE LIST WITH CHECK ICONS */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <ul className="space-y-2 text-xs text-slate-700 font-medium">
                          {(plan.features || defaultFeatures).slice(0, 5).map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className={`w-4 h-4 shrink-0 stroke-[2.2] ${theme.accentColor}`} />
                              <span className="leading-tight text-xs">{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => setFeatureModalPlan(plan)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" /> View feature details
                        </button>
                      </div>
                    </div>

                    {/* BOTTOM ALIGNED CTA BUTTON & DEMO BUTTON */}
                    <div className="pt-4 mt-auto space-y-2">
                      <button
                        onClick={() => handleOpenCheckout(plan)}
                        disabled={!isSystemActive || isCurrentPlan}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme.btnStyle}`}
                      >
                        {!isSystemActive
                          ? 'System Disabled'
                          : isCurrentPlan
                          ? 'Current Plan'
                          : hasActiveSub
                          ? `Upgrade (₹${plan.price})`
                          : `Get Started (₹${plan.price})`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM FOOTER */}
        <footer className="text-center text-xs text-slate-400 font-medium shrink-0 pt-1 border-t border-slate-200/60">
          VEDIXA Agri-Business ERP © {new Date().getFullYear()} – All Rights Reserved. Support Call: 9848081875
        </footer>
      </main>

      {/* CHECKOUT MODAL */}
      {checkoutPlan && (
        <Modal
          isOpen={true}
          onClose={() => setCheckoutPlan(null)}
          title={`Subscribe to ${checkoutPlan.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>Plan Duration:</span>
                <span className="text-emerald-800">{checkoutPlan.billingPeriod || checkoutPlan.name}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>Base Price:</span>
                <span className="font-mono">₹{checkoutPlan.price}</span>
              </div>
              {activeCoupon && (
                <div className="flex justify-between text-xs font-bold text-emerald-700 border-t border-emerald-200/60 pt-1.5">
                  <span>Coupon Discount ({activeCoupon.coupon?.code}):</span>
                  <span className="font-mono">- ₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-emerald-200 pt-1.5">
                <span>Final Payable Amount:</span>
                <span className="font-mono text-emerald-800 text-base">₹{finalPayableAmount}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Have a Promo / Coupon Code?</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="ENTER CODE"
                  value={checkoutCouponCode}
                  onChange={(e) => setCheckoutCouponCode(e.target.value.toUpperCase())}
                  className="text-xs uppercase font-mono py-1.5"
                />
                <Button onClick={handleApplyCheckoutCoupon} className="btn-agri-primary text-xs py-1.5 shrink-0">
                  Apply
                </Button>
              </div>
              {couponError && <p className="text-[11px] text-red-600 font-semibold">{couponError}</p>}
              {activeCoupon && (
                <p className="text-[11px] text-emerald-700 font-extrabold">✓ Discount Applied!</p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                onClick={handleConfirmPayment}
                disabled={createOrderMutation.isPending || verifyMutation.isPending || isInitializingPaymentRef.current}
                className="btn-agri-primary text-xs font-bold px-4 py-2 shadow-md cursor-pointer"
              >
                {createOrderMutation.isPending ? 'Creating Order...' : `Proceed to Pay ₹${finalPayableAmount}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* FEATURE DETAILS MODAL */}
      {featureModalPlan && (
        <Modal
          isOpen={true}
          onClose={() => setFeatureModalPlan(null)}
          title={`${featureModalPlan.name} Included Features`}
          size="md"
        >
          <div className="space-y-3">
            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              {(featureModalPlan.features || defaultFeatures).map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.2]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setFeatureModalPlan(null)} className="btn-agri-secondary text-xs py-1.5">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
