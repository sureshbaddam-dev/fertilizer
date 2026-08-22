import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import OtpInput from '../../components/common/OtpInput';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const mobileNumber = location.state?.mobile || location.state?.mobileNumber || '';
  const flow = location.state?.flow || 'signup';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return str || 'your email';
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
    return `${name.charAt(0)}${'*'.repeat(Math.min(name.length - 2, 4))}${name.slice(-1)}@${domain}`;
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;
    setServerError('');
    setSuccessMessage('');
    setIsResending(true);

    try {
      if (flow === 'reset') {
        await authService.forgotPassword({ mobile: mobileNumber });
        setSuccessMessage('Password reset OTP code resent to your mobile.');
      } else {
        await authService.resendSignupOtp(email);
        setSuccessMessage('A new verification code has been sent to your email.');
      }
      setTimer(60);
    } catch (error) {
      setServerError(error.message || 'Failed to resend verification OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 6 || isLoading) return;
    setServerError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (flow === 'reset') {
        const response = await authService.verifyForgotOtp({ mobile: mobileNumber, otp });
        if (response.success) {
          navigate('/reset-password', { state: { mobileNumber, otp } });
        }
      } else {
        const response = await authService.verifySignupOtp({ email, otp, mobile: mobileNumber });
        if (response.success) {
          // Account verified & created -> Redirect to Shop Setup
          navigate('/shop-setup', { replace: true });
        } else {
          setServerError(response.message || 'OTP verification failed. Please try again.');
        }
      }
    } catch (error) {
      setServerError(error.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Header with VEDIXA Brand Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1.5 pb-2 border-b border-slate-100">
        <BrandLogo textScale="md" />
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Verify Your Email</h3>
        <p className="text-xs text-slate-500 font-medium">
          Enter the 6-digit verification code sent to <br />
          <span className="font-extrabold text-emerald-800">{maskEmail(email)}</span>
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        {/* 6-Digit OTP Cells */}
        <OtpInput length={6} onChange={setOtp} />

        {/* Resend Timer Row */}
        <div className="text-center text-xs text-slate-500 font-medium">
          <span>Didn't receive the verification code? </span>
          {timer > 0 ? (
            <span className="font-bold text-emerald-700">Resend in {formatTimer(timer)}</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Resend OTP Code</span>
            </button>
          )}
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={otp.length < 6 || isLoading}
          className={`w-full py-3 px-4 font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            otp.length === 6 && !isLoading
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-700/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying OTP & Creating Account...</span>
            </>
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
      </form>

      {/* Back Link */}
      <div className="text-center pt-2 pb-1 border-t border-slate-100">
        <Link
          to={flow === 'reset' ? '/forgot-password' : '/signup'}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          ← Edit Details / Back to Sign Up
        </Link>
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>SSL Encrypted Verification</span>
      </div>
    </div>
  );
}
