import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import vedixaLogo from '../../assets/vedixa_logo.png';

const maskMobileNumber = (mob) => {
  if (!mob || mob.length < 10) return mob;
  return `${mob.charAt(0)}******${mob.slice(-4)}`;
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Mobile Input, 2: OTP Verification
  const [mobile, setMobile] = useState('9848081875');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');

    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApiService.sendAdminOtp(cleanMobile);
      setStep(2);
      setCountdown(res?.cooldownSeconds || 60);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 403) {
        setError(serverMsg || 'This mobile number is not authorized for Admin access.');
      } else if (err.response?.status === 429) {
        setError(serverMsg || 'Please wait before requesting another OTP.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the server. Please check your backend connection.');
      } else {
        setError(serverMsg || 'Unable to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminApiService.verifyAdminOtp(mobile.trim(), otp.trim());
      if (data?.user) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
      }
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
      }, 300);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the server. Please try again.');
      } else {
        setError(serverMsg || 'Invalid or expired OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans antialiased text-slate-800">
      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        
        {/* VEDIXA Logo & Title */}
        <div className="text-center mb-8">
          <img
            src={vedixaLogo}
            alt="VEDIXA"
            className="h-12 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            VEDIXA Admin
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Admin Control Center
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: MOBILE NUMBER INPUT */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Mobile Number
              </label>
              <input
                type="text"
                value={maskMobileNumber(mobile)}
                readOnly
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-mono font-bold tracking-wider cursor-default focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !mobile}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-base font-bold text-slate-800 mb-1">Verify OTP</h2>
              <p className="text-xs text-slate-500">
                Enter the 6-digit OTP sent to your registered mobile
              </p>
              <span className="inline-block mt-2 font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                {maskMobileNumber(mobile)}
              </span>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center text-slate-900 font-mono tracking-widest text-xl font-bold focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Login</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-700 underline font-medium"
              >
                Change Number
              </button>

              {countdown > 0 ? (
                <span className="text-slate-400 font-mono">
                  Resend OTP in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
