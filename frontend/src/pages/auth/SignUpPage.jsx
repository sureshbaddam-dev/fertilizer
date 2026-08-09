import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';

const signUpSchema = z
  .object({
    ownerName: z.string().min(2, 'Owner name is required'),
    mobile: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function SignUpPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      ownerName: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const response = await authService.signup(data);
      if (response.success) {
        if (import.meta.env.DEV && response.data?.otp) {
          console.log(`🔐 Development OTP\nMobile : ${data.mobile}\nOTP : ${response.data.otp}`);
        }
        navigate('/verify-otp', { state: { mobileNumber: data.mobile, flow: 'signup' } });
      }
    } catch (error) {
      setServerError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top User Icon Badge */}
      <div className="flex justify-center">
        <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
          <User className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-0.5">
        <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create Account</h3>
        <p className="text-xs text-gray-500 font-medium">Sign up to get started</p>
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
        {/* Owner Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 block">Owner Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              {...register('ownerName')}
              placeholder="Enter your full name"
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          {errors.ownerName && <p className="text-[10px] text-red-500 font-medium">{errors.ownerName.message}</p>}
        </div>

        {/* Mobile Number */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 block">Mobile Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <input
              type="tel"
              {...register('mobile')}
              placeholder="Enter 10-digit mobile number"
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          {errors.mobile && <p className="text-[10px] text-red-500 font-medium">{errors.mobile.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 block">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Create password"
              className="w-full pl-9 pr-9 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && <p className="text-[10px] text-red-500 font-medium">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 block">Confirm Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Confirm new password"
              className="w-full pl-9 pr-9 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
            <p className="text-[10px] text-red-500 font-medium">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Send OTP Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50"
        >
          <ArrowRight className="w-4 h-4" />
          <span>{isLoading ? 'Sending OTP...' : 'Send OTP'}</span>
        </button>
      </form>

      {/* Footer Link */}
      <div className="text-center pt-1">
        <p className="text-xs text-gray-600 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-700 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
