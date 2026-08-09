import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';

const resetSchema = z
  .object({
    password: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || '';
  const otp = location.state?.otp || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        mobile: mobileNumber,
        otp,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });

      if (response.success) {
        navigate('/login', { state: { successMessage: 'Password updated successfully! Please login.' } });
      }
    } catch (error) {
      setServerError(error.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Lock Icon Badge */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reset Password</h3>
        <p className="text-xs text-gray-500 font-medium">Enter new password for your account</p>
      </div>

      {/* OTP Verified Indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-800 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>OTP Verified Successfully</span>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* New Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block">New Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter new password"
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-red-500 font-medium">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block">Confirm Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Confirm new password"
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[11px] text-red-500 font-medium">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Update Password Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
        </button>
      </form>

      {/* Back to Login Link */}
      <div className="text-center pt-1">
        <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
