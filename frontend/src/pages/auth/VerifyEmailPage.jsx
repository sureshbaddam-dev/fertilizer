import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail, ArrowRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setIsLoading(false);
        setErrorMessage('No verification token provided. Please check the link in your email.');
        return;
      }
      try {
        const res = await authService.verifyEmail(token);
        if (res.success) {
          setIsVerified(true);
          setUserEmail(res.data?.email || '');
        } else {
          setErrorMessage(res.message || 'Verification failed or token expired.');
        }
      } catch (err) {
        setErrorMessage(err.message || 'Verification link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };
    doVerify();
  }, [token]);

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.trim()) {
      setResendError('Please enter your registered email address.');
      return;
    }
    setIsResending(true);
    setResendError('');
    setResendSuccess('');
    try {
      const res = await authService.resendVerification(resendEmail.trim());
      if (res.success) {
        setResendSuccess('A new verification email has been sent. Please check your inbox.');
      } else {
        setResendError(res.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header with Large VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1.5 pb-1 border-b border-slate-100">
        <BrandLogo textScale="lg" />
        <p className="text-xs font-semibold text-slate-500">
          Enterprise Cloud ERP Email Verification
        </p>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="py-10 space-y-3 text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Verifying your email address...</p>
        </div>
      )}

      {/* SUCCESS STATE */}
      {!isLoading && isVerified && (
        <div className="space-y-5 text-center">
          {/* Green Circular Success Check Icon */}
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-md shadow-emerald-700/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[2.2]" />
          </div>

          {/* Heading & Verified Email Display */}
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Email Verified Successfully
            </h3>
            {userEmail && (
              <div className="inline-block bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <p className="text-xs font-bold text-emerald-800">{userEmail}</p>
              </div>
            )}
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto pt-1">
              Your email address has been successfully verified. You can now sign in to your VEDIXA ERP account.
            </p>
          </div>

          {/* Primary Green Continue to Login Button */}
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Continue to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Security Badge Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SSL Encrypted ERP Authentication</span>
          </div>
        </div>
      )}

      {/* ERROR STATE / EXPIRED TOKEN */}
      {!isLoading && !isVerified && (
        <div className="space-y-4 text-left">
          <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7 text-rose-600" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Verification Link Expired</h3>
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {errorMessage}
            </p>
          </div>

          <form onSubmit={handleResendVerification} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Enter Your Registered Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {resendError && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">{resendError}</p>
            )}

            {resendSuccess && (
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">{resendSuccess}</p>
            )}

            <button
              type="submit"
              disabled={isResending}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-800/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-100">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-emerald-700 hover:underline transition cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
