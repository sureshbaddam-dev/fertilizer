import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Loader2,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  User,
  Phone,
  Store,
  MapPin,
  FileText,
  Check,
} from 'lucide-react';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

export default function SignUpPage() {
  const navigate = useNavigate();

  // Wizard Step State:
  // 1 = Email & Password
  // 2 = OTP Verification
  // 3 = Personal Details (Step 2 of 3)
  // 4 = Business Details (Step 3 of 3)
  const [step, setStep] = useState(1);

  // Form Field States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Timer & Loading states
  const [resendTimer, setResendTimer] = useState(0);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAccountFound, setExistingAccountFound] = useState(false);

  // Real-time Email Availability states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState(null); // null | true | false
  const [emailCheckError, setEmailCheckError] = useState('');
  const [emailCheckSuccess, setEmailCheckSuccess] = useState('');

  // Countdown timer effect for Resend OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Real-time debounced email availability check (600ms)
  useEffect(() => {
    if (step !== 1) return;

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Reset if email is empty or format is invalid
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setIsCheckingEmail(false);
      setIsEmailAvailable(null);
      setEmailCheckError('');
      setEmailCheckSuccess('');
      return;
    }

    setIsCheckingEmail(true);
    setEmailCheckError('');
    setEmailCheckSuccess('');
    setIsEmailAvailable(null);

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkEmailAvailability(cleanEmail, { signal: controller.signal });
        const data = res?.data || res;

        if (data?.exists || data?.available === false) {
          setIsEmailAvailable(false);
          setEmailCheckError('This email is already registered.');
          setEmailCheckSuccess('');
          setExistingAccountFound(true);
        } else {
          setIsEmailAvailable(true);
          setEmailCheckError('');
          setEmailCheckSuccess('Email is available');
          setExistingAccountFound(false);
        }
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
          return;
        }
        const msg = err?.message || '';
        if (msg.includes('already exists') || err?.statusCode === 409) {
          setIsEmailAvailable(false);
          setEmailCheckError('This email is already registered.');
          setEmailCheckSuccess('');
          setExistingAccountFound(true);
        } else {
          setIsEmailAvailable(null);
          setEmailCheckError('');
          setEmailCheckSuccess('');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingEmail(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [email, step]);

  // STEP 1: Handle Email & Password Submit -> Initiate OTP
  const handleInitiateOtp = async (e) => {
    if (e) e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    setExistingAccountFound(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setServerError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setServerError('Please enter a valid email address.');
      return;
    }

    if (isCheckingEmail) {
      setServerError('Please wait while email availability is checked.');
      return;
    }

    if (isEmailAvailable === false) {
      setServerError('This email is already registered.');
      setExistingAccountFound(true);
      return;
    }

    if (!password || password.length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setServerError('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.initiateSignupOtp({
        email: cleanEmail,
        password,
        confirmPassword,
      });

      if (response.success) {
        setSuccessMessage('Verification OTP code sent to your email address.');
        setResendTimer(60);
        setStep(2);
      } else {
        setServerError(response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      const msg = error.message || 'Failed to send OTP.';
      if (msg.includes('already exists') || error.status === 409) {
        setExistingAccountFound(true);
        setServerError('An account with this email address already exists. Please log in instead.');
      } else {
        setServerError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!otp || otp.trim().length !== 6) {
      setServerError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.verifySignupOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (response.success) {
        setSuccessMessage('Email verified! Please complete your personal details.');
        setStep(3);
      } else {
        setServerError(response.message || 'Invalid or expired OTP. Please try again.');
      }
    } catch (error) {
      setServerError(error.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: Handle Personal Details Submit (Name & Phone REQUIRED)
  const validatePersonalDetails = () => {
    if (!ownerName || !ownerName.trim()) return false;
    const cleanMob = mobile.trim().replace(/[\s\-\(\)]/g, '');
    const tenDigit = cleanMob.startsWith('+91')
      ? cleanMob.slice(3)
      : cleanMob.startsWith('91') && cleanMob.length === 12
      ? cleanMob.slice(2)
      : cleanMob;
    return /^[6-9]\d{9}$/.test(tenDigit);
  };

  const handlePersonalDetailsSubmit = (e) => {
    e.preventDefault();
    setServerError('');

    if (!ownerName || !ownerName.trim()) {
      setServerError('Name is required.');
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

    // Advance to Step 4 (Business Details)
    setStep(4);
  };

  // STEP 4: Handle Business Details Submit (All Business Details OPTIONAL)
  const validateGstNumber = (gst) => {
    if (!gst || !gst.trim()) return true; // Optional
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gst.trim());
  };

  const handleFinalSignup = async (e) => {
    if (e) e.preventDefault();
    setServerError('');

    const cleanGst = gstNumber ? gstNumber.trim().toUpperCase() : '';
    if (cleanGst && !validateGstNumber(cleanGst)) {
      setServerError('Please enter a valid 15-character GSTIN number (e.g. 36AAAAA0000A1Z5).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.completeOnboarding({
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        shopName: shopName ? shopName.trim() : '',
        address: address ? address.trim() : '',
        gstNumber: cleanGst,
      });

      if (response.success) {
        // Successfully completed onboarding -> Go directly to Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setServerError(response.message || 'Failed to complete account registration. Please try again.');
      }
    } catch (error) {
      setServerError(error.message || 'Failed to complete registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4 font-sans pt-0 sm:pt-1">
      {/* Header with Centered Brand Logo */}
      <div className="flex flex-col items-center justify-center text-center -mt-1">
        <BrandLogo imgClassName="h-16 sm:h-20 object-contain" />
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-2 text-center">
          {step === 1 && 'Create Your Business Account'}
          {step === 2 && 'Verify Email Address'}
          {step === 3 && 'Personal Details'}
          {step === 4 && 'Business Details'}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5 text-center">
          {step === 1 && 'Step 1 of 3: Create credentials'}
          {step === 2 && 'Step 1 of 3: Enter 6-digit OTP code'}
          {step === 3 && 'Tell us about yourself to complete your account.'}
          {step === 4 && 'Add your business information.'}
        </p>
      </div>

      {/* Progress Steps Indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step <= 2 ? 'w-8 bg-emerald-600' : 'w-4 bg-emerald-400'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 3 ? 'w-8 bg-emerald-600' : step > 3 ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-200'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 4 ? 'w-8 bg-emerald-600' : 'w-4 bg-slate-200'}`} />
      </div>

      {step >= 3 && (
        <div className="text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            {step === 3 ? 'Step 2 of 3' : 'Step 3 of 3'}
          </span>
        </div>
      )}

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex flex-col gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
          {existingAccountFound && (
            <Link
              to="/login"
              className="mt-1 w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-center rounded-lg shadow-xs transition-all flex items-center justify-center gap-1 text-xs"
            >
              <span>Log in to your account instead &rarr;</span>
            </Link>
          )}
        </div>
      )}

      {/* Success Notification Alert */}
      {successMessage && !serverError && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STEP 1: EMAIL & PASSWORD ENTRY */}
      {step === 1 && (
        <form onSubmit={handleInitiateOtp} className="space-y-3.5 animate-in fade-in duration-200">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className={`w-4 h-4 ${isEmailAvailable === false ? 'text-rose-500' : isEmailAvailable === true ? 'text-emerald-600' : 'text-emerald-600'}`} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                placeholder="name@company.com"
                className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl font-semibold transition-all shadow-2xs focus:outline-none focus:ring-2 ${
                  isEmailAvailable === false
                    ? 'bg-rose-50/30 border-2 border-rose-500 text-slate-900 focus:ring-rose-500/20 focus:border-rose-600'
                    : isEmailAvailable === true
                    ? 'bg-emerald-50/20 border-2 border-emerald-500 text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-600'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white'
                }`}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {isCheckingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : isEmailAvailable === false ? (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                ) : isEmailAvailable === true ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : null}
              </div>
            </div>

            {/* Email Availability Feedback */}
            {isCheckingEmail && (
              <div className="flex items-center gap-1.5 pt-0.5 text-xs font-semibold text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                <span>Checking email...</span>
              </div>
            )}

            {emailCheckError && !isCheckingEmail && (
              <div className="pt-0.5 animate-in fade-in duration-200">
                <p className="text-xs font-bold text-rose-600 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{emailCheckError}</span>
                </p>
              </div>
            )}

            {emailCheckSuccess && !isCheckingEmail && !emailCheckError && (
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 pt-0.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{emailCheckSuccess}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isCheckingEmail || isEmailAvailable === false}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Sending OTP...</span>
              </>
            ) : isCheckingEmail ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Checking Email...</span>
              </>
            ) : (
              <>
                <span>Send OTP</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-3.5 animate-in fade-in duration-200">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
            OTP sent to: <span className="font-bold text-slate-900">{email}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 block">
                Enter 6-Digit OTP <span className="text-rose-500">*</span>
              </label>
              {resendTimer > 0 ? (
                <span className="text-[10px] text-slate-500 font-semibold">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiateOtp}
                  disabled={isSubmitting}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend OTP</span>
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-emerald-50/50 border border-emerald-300 rounded-xl text-slate-900 font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <>
                <span>Verify OTP & Continue</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 3: PERSONAL DETAILS PAGE (Step 2 of 3 - Name & Phone REQUIRED) */}
      {step === 3 && (
        <form onSubmit={handlePersonalDetailsSubmit} className="space-y-3.5 animate-in fade-in duration-200">
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

          <button
            type="submit"
            disabled={!validatePersonalDetails()}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      )}

      {/* STEP 4: BUSINESS DETAILS PAGE (Step 3 of 3 - Shop Name, Address, GST OPTIONAL) */}
      {step === 4 && (
        <form onSubmit={handleFinalSignup} className="space-y-3.5 animate-in fade-in duration-200">
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
                setStep(3);
              }}
              disabled={isSubmitting}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
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

      {/* Navigation to Login at Bottom */}
      <div className="pt-3 mt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-600 font-medium">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
          >
            Login here &rarr;
          </Link>
        </p>
      </div>

      {/* Security Badge */}
      <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>SSL Encrypted ERP Registration</span>
      </div>
    </div>
  );
}
