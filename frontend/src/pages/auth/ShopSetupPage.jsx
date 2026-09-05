import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  FileText,
  Check,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { settingService } from '../../services/settingService';
import { useAuth } from '../../contexts/AuthContext';
import BrandLogo from '../../components/common/BrandLogo';
import { validateGstNumber } from '../../utils/validationUtils';
import { formatISTDate } from '../../utils/dateUtils';

export default function ShopSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser, isAuthReady, updateUser } = useAuth();

  const currentUser = authUser || authService.getCurrentUser() || {};
  const verifiedEmail = currentUser.email || '';
  const currentUserId = currentUser.id || currentUser._id;

  // Trial welcome modal state
  const [showTrialWelcomeModal, setShowTrialWelcomeModal] = useState(false);
  const [trialDetails, setTrialDetails] = useState(null);

  // React Query cached shop settings check
  const { data: settingsRes, isLoading: isCheckingExisting } = useQuery({
    queryKey: ['shop-settings-global', currentUserId],
    queryFn: async () => {
      try {
        return await settingService.getSettings();
      } catch (err) {
        console.warn('[ShopSetupPage] getSettings check failed silently:', err);
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!currentUserId,
  });

  const existingData = useMemo(() => {
    return settingsRes?.data || settingsRes || {};
  }, [settingsRes]);

  // Step state: 1 = Personal Details, 2 = Business Details
  const [step, setStep] = useState(1);

  // Form Fields
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Status & Validation States
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If user already has complete profile details in MongoDB, redirect straight to dashboard
  useEffect(() => {
    if (isCheckingExisting || !isAuthReady) return;

    const isComplete = Boolean(
      currentUser.isProfileComplete ||
        (existingData?.ownerName &&
          existingData.ownerName !== 'Pending Setup' &&
          existingData?.mobile &&
          !String(existingData.mobile).startsWith('pending_'))
    );

    if (isComplete) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Pre-fill existing data if present
    if (existingData && Object.keys(existingData).length > 0) {
      if (existingData.shopName) setShopName(existingData.shopName);
      if (existingData.ownerName && existingData.ownerName !== 'Pending Setup') setOwnerName(existingData.ownerName);
      else if (currentUser.ownerName && currentUser.ownerName !== 'Pending Setup') setOwnerName(currentUser.ownerName);
      if (existingData.mobile && !existingData.mobile.startsWith('pending_')) setMobile(existingData.mobile);
      else if (currentUser.mobile && !currentUser.mobile.startsWith('pending_')) setMobile(currentUser.mobile);
      if (existingData.address) setAddress(existingData.address);
      if (existingData.gstNumber) setGstNumber(existingData.gstNumber);
    } else if (currentUser) {
      if (currentUser.ownerName && currentUser.ownerName !== 'Pending Setup') setOwnerName(currentUser.ownerName);
      if (currentUser.mobile && !currentUser.mobile.startsWith('pending_')) setMobile(currentUser.mobile);
      if (currentUser.shopName) setShopName(currentUser.shopName);
    }
  }, [existingData, isCheckingExisting, navigate, currentUser]);

  // Validate Step 1: Personal Details (Owner Name *, Phone *, Terms & Conditions consent *)
  const validateStep1 = () => {
    if (!ownerName || !ownerName.trim()) return false;
    const cleanMob = mobile.trim().replace(/[\s\-\(\)]/g, '');
    const tenDigit = cleanMob.startsWith('+91')
      ? cleanMob.slice(3)
      : cleanMob.startsWith('91') && cleanMob.length === 12
      ? cleanMob.slice(2)
      : cleanMob;
    if (!/^[6-9]\d{9}$/.test(tenDigit)) return false;
    if (!termsAccepted) return false;
    return true;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setServerError('');

    if (!ownerName || !ownerName.trim()) {
      setServerError('Owner / Contact Name is required.');
      return;
    }

    const cleanMob = mobile.trim().replace(/[\s\-\(\)]/g, '');
    const tenDigit = cleanMob.startsWith('+91')
      ? cleanMob.slice(3)
      : cleanMob.startsWith('91') && cleanMob.length === 12
      ? cleanMob.slice(2)
      : cleanMob;

    if (!/^[6-9]\d{9}$/.test(tenDigit)) {
      setServerError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!termsAccepted) {
      setServerError('Please accept the Terms & Conditions and Privacy Policy to proceed.');
      return;
    }

    setStep(2);
  };

  // Final Submit Handler
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    setServerError('');

    const cleanGst = gstNumber ? gstNumber.trim().toUpperCase() : '';
    if (cleanGst && !validateGstNumber(cleanGst)) {
      setServerError('Please enter a valid 15-character GSTIN number (e.g. 36AAAAA0000A1Z5).');
      return;
    }

    setIsLoading(true);
    try {
      const activeToken = authService.getAccessToken();
      console.log(`[ShopSetupPage] Submitting completeOnboarding. Active token present: ${Boolean(activeToken)}, Len: ${activeToken ? activeToken.length : 0}`);

      const res = await authService.completeOnboarding({
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        shopName: shopName ? shopName.trim() : '',
        address: address ? address.trim() : '',
        gstNumber: cleanGst,
      });

      if (res.success) {
        if (res.data?.user) {
          updateUser(res.data.user);
        }
        const id = currentUser?.id || currentUser?._id;
        queryClient.setQueryData(['shop-settings-global', id, true], res.data);
        queryClient.invalidateQueries(['shop-settings-global']);
        queryClient.invalidateQueries(['shop-settings-profile']);
        queryClient.invalidateQueries(['user-profile']);
        queryClient.invalidateQueries(['my-subscription']);

        if (res.data?.subscription?.expiryDate || res.data?.trialStarted) {
          setTrialDetails(res.data?.subscription || null);
          setShowTrialWelcomeModal(true);
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setServerError(res.message || 'Failed to save onboarding details. Please try again.');
      }
    } catch (err) {
      setServerError(err.message || 'Failed to save onboarding details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingExisting) {
    return (
      <div className="py-10 text-center space-y-3 font-sans">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading business setup...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4 font-sans text-slate-800 py-1">
      {/* Header with VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1 pb-1">
        <BrandLogo imgClassName="h-14 sm:h-16 object-contain" />
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
          {step === 1 ? 'Personal Details' : 'Business Details'}
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          {step === 1
            ? 'Step 1 of 2: Tell us about yourself'
            : 'Step 2 of 2: Business information (Optional)'}
        </p>
      </div>

      {/* Progress Steps Indicator */}
      <div className="flex items-center justify-center gap-1.5 py-0.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-emerald-600' : 'w-4 bg-emerald-400'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-emerald-600' : 'w-4 bg-slate-200'}`} />
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* STEP 1: PERSONAL DETAILS */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-3.5 animate-in fade-in duration-200">
          {/* Read-Only Verified Email */}
          {verifiedEmail && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Verified Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="email"
                  value={verifiedEmail}
                  readOnly
                  className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-100/90 border border-slate-200 rounded-xl text-slate-600 font-semibold cursor-not-allowed select-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* 1. Owner Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Owner / Contact Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Full name"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit Indian mobile number"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                required
              />
            </div>
          </div>

          {/* 3. Terms & Conditions Consent Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="shopSetupTermsConsent"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="shopSetupTermsConsent" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
              I agree to the{' '}
              <a
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 hover:underline"
              >
                Terms & Conditions
              </a>
              ,{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 hover:underline"
              >
                Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="/refund-cancellation-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-700 hover:underline"
              >
                Refund Policy
              </a>
              .
            </label>
          </div>

          {/* Next Button */}
          <button
            type="submit"
            disabled={!validateStep1()}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      )}

      {/* STEP 2: BUSINESS DETAILS (OPTIONAL) */}
      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="space-y-3.5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Shop / Business Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Store className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Sri Lakshmi Fertilizers"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Shop Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street Name, Landmark"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              GST Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="text"
                maxLength={15}
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="Enter GST number"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setServerError('');
                setStep(1);
              }}
              disabled={isLoading}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Security Badge */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>SSL Encrypted ERP Authentication</span>
      </div>

      {/* FREE TRIAL WELCOME MODAL */}
      {showTrialWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              🎉
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Welcome to Vedixa!
              </h3>
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 py-1 px-3 rounded-full inline-block border border-emerald-200">
                Your 7-Day Free Trial has started
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You have full access to all features of Vedixa ERP until{' '}
              <strong className="text-slate-900 font-bold">
                {formatISTDate(trialDetails?.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
              </strong>.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowTrialWelcomeModal(false);
                navigate('/dashboard', { replace: true });
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Using Vedixa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
