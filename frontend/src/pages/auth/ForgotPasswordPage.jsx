import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';

const forgotSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
});

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      mobile: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ mobile: data.mobile });
      if (response.success) {
        if (import.meta.env.DEV && response.data?.otp) {
          console.log(`🔐 Development OTP\nMobile : ${data.mobile}\nOTP : ${response.data.otp}`);
        }
        navigate('/verify-otp', { state: { mobileNumber: data.mobile, flow: 'reset' } });
      }
    } catch (error) {
      setServerError(error.message || 'Mobile number not found.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Lock Icon Badge */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Forgot Password?</h3>
        <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
          Enter your registered mobile number to receive OTP
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Mobile Number Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block">Mobile Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              {...register('mobile')}
              placeholder="Enter 10-digit mobile number"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          {errors.mobile && <p className="text-[11px] text-red-500 font-medium">{errors.mobile.message}</p>}
        </div>

        {/* Send OTP Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isLoading ? 'Sending OTP...' : 'Send OTP'}</span>
        </button>
      </form>

      {/* Back to Login Link */}
      <div className="text-center pt-2">
        <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
