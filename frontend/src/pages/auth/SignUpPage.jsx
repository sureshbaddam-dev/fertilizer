import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, Loader2, Store, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

// Google OAuth Client ID Sanitizer
const getGoogleClientId = () => {
  let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  if (typeof clientId === 'string') {
    clientId = clientId.replace(/^["']|["']$/g, '').trim();
  }
  return clientId;
};

const ensureGoogleGisScript = () => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
      resolve(true);
      return;
    }
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

export default function SignUpPage() {
  const navigate = useNavigate();

  // Screen Mode: 'signup' | 'verification_pending' | 'complete_profile'
  const [screenMode, setScreenMode] = useState('signup');

  // Form State
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Payload State
  const [googleSessionToken, setGoogleSessionToken] = useState('');
  const [googleData, setGoogleData] = useState({ name: '', email: '', picture: '' });

  // Status & Message States
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // SINGLE-FLIGHT IN-FLIGHT GUARD & DUPLICATE CREDENTIAL PROTECTION
  const isGoogleAuthInProgressRef = useRef(false);
  const processedTokensRef = useRef(new Set());

  useEffect(() => {
    let isMounted = true;
    const initGis = async () => {
      await ensureGoogleGisScript();
      const clientId = getGoogleClientId();
      if (clientId && window.google?.accounts?.id && isMounted) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });
        } catch (_e) {}
      }
    };
    initGis();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response || (!response.credential && !response.access_token)) return;
    const token = response.credential || response.access_token;

    if (isGoogleAuthInProgressRef.current) return;
    if (processedTokensRef.current.has(token)) return;

    isGoogleAuthInProgressRef.current = true;
    processedTokensRef.current.add(token);

    setIsLoading(true);
    setServerError('');
    try {
      const res = await authService.googleAuth(token);
      if (res.success) {
        if (res.data?.isProfileComplete) {
          navigate('/dashboard', { replace: true });
        } else {
          setGoogleSessionToken(res.data?.googleSessionToken || '');
          const gInfo = res.data?.googleData || { name: '', email: '' };
          setGoogleData(gInfo);
          setOwnerName(gInfo.name || '');
          setScreenMode('complete_profile');
        }
      } else {
        setServerError(res.message || 'Google authentication failed. Please try again.');
      }
    } catch (err) {
      setServerError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
      isGoogleAuthInProgressRef.current = false;
    }
  };

  const handleContinueWithGoogle = async () => {
    if (isGoogleAuthInProgressRef.current) return;
    setServerError('');
    const clientId = getGoogleClientId();

    if (!clientId) {
      setServerError('Google OAuth Web Client ID is not configured in frontend/.env as VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    isGoogleAuthInProgressRef.current = true;
    setIsLoading(true);
    await ensureGoogleGisScript();

    try {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              isGoogleAuthInProgressRef.current = false;
              handleGoogleCredentialResponse({ access_token: tokenResponse.access_token });
            } else {
              setIsLoading(false);
              isGoogleAuthInProgressRef.current = false;
            }
          },
          error_callback: () => {
            setIsLoading(false);
            isGoogleAuthInProgressRef.current = false;
            setServerError('Google Sign-In was cancelled.');
          },
        });
        client.requestAccessToken();
      } else if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsLoading(false);
            isGoogleAuthInProgressRef.current = false;
          }
        });
      } else {
        setIsLoading(false);
        isGoogleAuthInProgressRef.current = false;
        setServerError('Unable to load Google Identity Services SDK.');
      }
    } catch (err) {
      setIsLoading(false);
      isGoogleAuthInProgressRef.current = false;
      setServerError(err.message || 'Failed to initialize Google Sign-In.');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!email || !email.trim()) {
      setServerError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setServerError('Please enter a valid email address.');
      return;
    }
    if (!ownerName || !ownerName.trim()) {
      setServerError('Owner name is required.');
      return;
    }
    if (!mobile || !mobile.trim()) {
      setServerError('Mobile number is required.');
      return;
    }
    if (!password || password.length < 6) {
      setServerError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (typeof authService.signupEmail === 'function') {
        const response = await authService.signupEmail({
          email: email.trim(),
          ownerName: ownerName.trim(),
          mobile: mobile.trim(),
          password,
          confirmPassword,
        });
        if (response.success) {
          setScreenMode('verification_pending');
          setSuccessMessage(response.message || 'Verification email sent. Please check your inbox.');
        } else {
          setServerError(response.message || 'Signup failed. Please try again.');
        }
      } else {
        const response = await authService.signup({ ownerName, mobile, password });
        if (response.success) {
          navigate('/login');
        }
      }
    } catch (error) {
      setServerError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    setServerError('');
    try {
      if (typeof authService.resendVerification === 'function') {
        const res = await authService.resendVerification(email.trim());
        if (res.success) {
          setSuccessMessage('A new verification link has been sent to your email.');
        } else {
          setServerError(res.message || 'Failed to resend verification email.');
        }
      }
    } catch (err) {
      setServerError(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!mobile || !mobile.trim()) {
      setServerError('Mobile number is mandatory.');
      return;
    }
    if (!shopName || !shopName.trim()) {
      setServerError('Shop Name is mandatory.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.completeGoogleSignup({
        googleSessionToken,
        mobile: mobile.trim(),
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
      });

      if (res.success && res.data?.accessToken) {
        navigate('/subscription', { replace: true });
      } else {
        setServerError(res.message || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setServerError(err.message || 'Account creation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      {/* Header with VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1 pb-1 border-b border-slate-100">
        <BrandLogo textScale="md" />
        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Create Your Business Account</h3>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {screenMode === 'signup' && (
        <div className="space-y-2">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleContinueWithGoogle}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            {isLoading && isGoogleAuthInProgressRef.current ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Separator */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="border-t border-gray-200 w-full"></div>
            <span className="bg-white px-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">OR</span>
            <div className="border-t border-gray-200 w-full"></div>
          </div>

          {/* Form Fields: Email Address -> Owner Name -> Mobile Number -> Password -> Confirm Password */}
          <form onSubmit={handleSignupSubmit} className="space-y-2">
            {/* 1. Email Address (MUST appear BEFORE Owner Name) */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* 2. Owner Name */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Owner Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* 3. Mobile Number */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Mobile Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* 4. Password */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full pl-9 pr-9 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 5. Confirm Password */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-semibold text-gray-700 block">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-9 pr-9 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-1.5 disabled:opacity-50"
            >
              {isLoading && !isGoogleAuthInProgressRef.current ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link Directly Below Create Account Button */}
          <div className="text-center pt-1.5 pb-0.5">
            <p className="text-xs text-gray-700 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5">
                <span>Login here</span>
                <span className="text-xs leading-none">→</span>
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-medium pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SSL Encrypted ERP Authentication</span>
          </div>
        </div>
      )}

      {/* EMAIL VERIFICATION PENDING SCREEN */}
      {screenMode === 'verification_pending' && (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-gray-900">Check Your Inbox</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              We sent a verification link to <strong className="text-gray-900">{email}</strong>. Please check your inbox and click the verification link within <strong>15 minutes</strong> to activate your account.
            </p>
          </div>

          {successMessage && (
            <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              {successMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Resend Verification Email</span>
          </button>

          <div className="pt-2 border-t border-gray-100">
            <Link to="/login" className="text-xs font-bold text-emerald-700 hover:underline">
              Return to Login
            </Link>
          </div>
        </div>
      )}

      {/* GOOGLE COMPLETE YOUR PROFILE SCREEN */}
      {screenMode === 'complete_profile' && (
        <form onSubmit={handleCompleteProfileSubmit} className="space-y-3">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {googleData.picture ? (
                <img src={googleData.picture} alt="Google Profile" className="w-8 h-8 rounded-full border border-emerald-300" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {googleData.name?.charAt(0) || 'G'}
                </div>
              )}
              <div>
                <p className="text-xs font-extrabold text-gray-900">{googleData.name || 'Google User'}</p>
                <p className="text-[10px] font-semibold text-gray-600">{googleData.email}</p>
              </div>
            </div>
            <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Owner Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter store owner name"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Mobile Number (Mandatory)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Shop Name (Mandatory)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Store className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Enter your fertilizer shop name"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
