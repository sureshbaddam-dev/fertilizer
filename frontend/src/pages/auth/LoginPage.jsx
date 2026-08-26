import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Phone, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

import {
  getGoogleClientId,
  loadGoogleGisScript,
  initGoogleIdClientOnce,
} from '../../services/googleAuthService';

export default function LoginPage() {
  const navigate = useNavigate();

  // Form State
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // SINGLE-FLIGHT IN-FLIGHT GUARD & DUPLICATE CREDENTIAL PROTECTION
  const isGoogleAuthInProgressRef = useRef(false);
  const processedTokensRef = useRef(new Set());
  const gisInitializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const initGis = async () => {
      await loadGoogleGisScript();
      const clientId = getGoogleClientId();
      if (clientId && window.google?.accounts?.id && isMounted) {
        initGoogleIdClientOnce(clientId, handleGoogleCredentialResponse);
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
          navigate('/shop-setup', { replace: true });
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
    await loadGoogleGisScript();

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
          error_callback: (err) => {
            setIsLoading(false);
            isGoogleAuthInProgressRef.current = false;
            if (err?.error === 'popup_closed_by_user') {
              setServerError('Google Sign-In popup was closed.');
            } else {
              setServerError(err?.error ? `Google OAuth error (${err.error}). Check Authorized origins in Google Cloud Console.` : 'Google Sign-In was cancelled.');
            }
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setServerError('');

    if (!mobile || !mobile.trim()) {
      setServerError('Please enter your mobile number or email address.');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setServerError('Please enter your password.');
      setIsLoading(false);
      return;
    }

    try {
      const isEmailInput = mobile.includes('@');
      const payload = isEmailInput
        ? { email: mobile.trim(), password }
        : { mobile: mobile.trim(), password };

      const response = await authService.login(payload);
      if (response.success) {
        const isComplete = response.data?.isProfileComplete ?? (response.data?.user?.isProfileComplete && Boolean(response.data?.user?.shopName));
        if (!isComplete) {
          navigate('/shop-setup', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setServerError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setServerError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Enterprise Header with Large VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-2 pb-1 border-b border-slate-100">
        <BrandLogo textScale="lg" />
        <p className="text-xs font-semibold text-slate-500">
          Enterprise Cloud ERP Sign In
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Google Sign In Button */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={handleContinueWithGoogle}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          {isLoading && isGoogleAuthInProgressRef.current ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
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
      </div>

      {/* Separator */}
      <div className="relative flex items-center justify-center py-0.5">
        <div className="border-t border-slate-200 w-full"></div>
        <span className="bg-white px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">OR</span>
        <div className="border-t border-slate-200 w-full"></div>
      </div>

      {/* Form */}
      <form onSubmit={handleLoginSubmit} className="space-y-4">
        {/* Mobile Number / Email Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Mobile Number or Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter mobile number or email"
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-11 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
            />
            <span>Remember Me</span>
          </label>
          <Link to="/forgot-password" className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline">
            Forgot Password?
          </Link>
        </div>

        {/* Large Primary Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-extrabold text-base rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {isLoading && !isGoogleAuthInProgressRef.current ? (
            <span>Signing In...</span>
          ) : (
            <>
              <span>Sign In to VEDIXA</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </>
          )}
        </button>
      </form>

      {/* Enterprise Security Badge */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit SSL Encrypted ERP Session</span>
        </div>
        <Link to="/signup" className="font-extrabold text-slate-700 hover:text-emerald-700 hover:underline">
          Create Account
        </Link>
      </div>

      {/* Subtle Legal Links */}
      <div className="pt-1 text-center text-[10px] text-slate-400 font-medium space-x-1.5 leading-tight">
        <Link to="/terms-and-conditions" className="hover:text-slate-600 hover:underline">
          Terms &amp; Conditions
        </Link>
        <span>·</span>
        <Link to="/privacy-policy" className="hover:text-slate-600 hover:underline">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link to="/refund-cancellation-policy" className="hover:text-slate-600 hover:underline">
          Refund &amp; Cancellation Policy
        </Link>
      </div>
    </div>
  );
}
