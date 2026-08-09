import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Phone, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import BrandLogo from '../../components/common/BrandLogo';

const loginSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mobile: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setIsLoading(true);
    try {
      const response = await authService.login({ mobile: data.mobile, password: data.password });
      if (response.success) {
        navigate('/dashboard');
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Mobile Number Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Mobile Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="tel"
              {...register('mobile')}
              placeholder="Enter 10-digit mobile number"
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
            />
          </div>
          {errors.mobile && <p className="text-[11px] text-rose-600 font-semibold">{errors.mobile.message}</p>}
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
              {...register('password')}
              placeholder="Enter your password"
              className="w-full pl-10 pr-11 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-rose-600 font-semibold">{errors.password.message}</p>}
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('rememberMe')}
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
          {isLoading ? (
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
    </div>
  );
}
