import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Smartphone, ArrowRight, AlertCircle } from 'lucide-react';
import OtpInput from '../../components/common/OtpInput';
import { authService } from '../../services/authService';

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || '';
  const flow = location.state?.flow || 'signup';

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (timer > 0) return;
    setServerError('');
    try {
      if (flow === 'reset') {
        await authService.forgotPassword({ mobile: mobileNumber });
      } else {
        // Resend signup OTP logic can re-trigger signup or generate OTP
      }
      setTimer(30);
    } catch (error) {
      setServerError(error.message || 'Failed to resend OTP');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setServerError('');
    setIsLoading(true);

    try {
      if (flow === 'reset') {
        const response = await authService.verifyForgotOtp({ mobile: mobileNumber, otp });
        if (response.success) {
          navigate('/reset-password', { state: { mobileNumber, otp } });
        }
      } else {
        const response = await authService.verifySignupOtp({ mobile: mobileNumber, otp });
        if (response.success) {
          // Flow: Account Created -> Redirect to Login
          navigate('/login', { state: { successMessage: 'Registration successful! Please log in.' } });
        }
      }
    } catch (error) {
      setServerError(error.message || 'Invalid or expired OTP');
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
    <div className="space-y-5">
      {/* Top Device Icon Badge */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
          <Smartphone className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Verify OTP</h3>
        <p className="text-xs text-gray-500 font-medium">
          Enter the 6-digit code sent to <br />
          <span className="font-bold text-gray-800">+91 {mobileNumber || 'XXXXXXXXXX'}</span>
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        {/* 6 Digit Input */}
        <OtpInput length={6} onChange={setOtp} />

        {/* Resend Timer Row */}
        <div className="text-center text-xs text-gray-500 font-medium">
          <span>Didn't receive code? </span>
          {timer > 0 ? (
            <span className="font-semibold text-emerald-700">Resend OTP ({formatTimer(timer)})</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={otp.length < 6 || isLoading}
          className={`w-full py-2.5 px-4 font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            otp.length === 6 && !isLoading
              ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-800/20'
              : 'bg-emerald-800/60 text-white/80 cursor-not-allowed'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isLoading ? 'Verifying...' : flow === 'reset' ? 'Verify OTP' : 'Verify & Create Account'}</span>
        </button>
      </form>

      {/* Change Mobile Link */}
      <div className="text-center pt-2">
        <Link
          to={flow === 'reset' ? '/forgot-password' : '/signup'}
          className="text-xs font-semibold text-emerald-700 hover:underline"
        >
          Change Mobile Number
        </Link>
      </div>
    </div>
  );
}
