import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Store, Mail, CheckCircle2, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { settingService } from '../../services/settingService';
import BrandLogo from '../../components/common/BrandLogo';

export default function ShopSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = authService.getCurrentUser() || {};
  const verifiedEmail = currentUser.email || '';

  const [shopName, setShopName] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);

  // If user already has a shopName saved in MongoDB, redirect straight to dashboard
  useEffect(() => {
    let isMounted = true;
    const checkExistingShop = async () => {
      try {
        const res = await settingService.getSettings();
        const existingData = res?.data || res || {};
        if (existingData.shopName && existingData.shopName.trim() && isMounted) {
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch (_err) {
        // Continue to setup screen if settings check fails
      } finally {
        if (isMounted) setIsCheckingExisting(false);
      }
    };
    checkExistingShop();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!shopName || !shopName.trim()) {
      setServerError('Shop or Business Name is mandatory.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Save Shop Name to MongoDB ShopSettings and User Profile via existing APIs
      const updatedRes = await settingService.updateSettings({ shopName: shopName.trim() });
      try {
        await authService.updateProfile({ shopName: shopName.trim() });
      } catch (_e) {}

      // 2. Synchronously update React Query cache with updated settings response
      const currentUserId = currentUser?.id || currentUser?._id;
      if (updatedRes) {
        queryClient.setQueryData(
          ['shop-settings-global', currentUserId, authService.isAuthenticated()],
          updatedRes
        );
      }

      // 3. Invalidate React Query caches for background syncing
      queryClient.invalidateQueries(['shop-settings-global']);
      queryClient.invalidateQueries(['shop-settings-profile']);
      queryClient.invalidateQueries(['user-profile']);

      // 4. Update local auth user state
      const updatedUser = { ...currentUser, shopName: shopName.trim() };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 5. Continue to Dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Failed to save Shop Name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingExisting) {
    return (
      <div className="py-10 text-center space-y-3 font-sans">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading business setup...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* Header with VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1.5 pb-1 border-b border-slate-100">
        <BrandLogo textScale="lg" />
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Set Up Your Business</h3>
        <p className="text-xs text-slate-500 font-medium">Tell us your shop or business name to get started.</p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Onboarding Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Read-Only Verified Email */}
        {verifiedEmail && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 block">Verified Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                type="email"
                value={verifiedEmail}
                readOnly
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl text-slate-600 font-semibold cursor-not-allowed select-none"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Shop / Business Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 block">Shop / Business Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Store className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter your shop or business name"
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-xl text-slate-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Primary Continue Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-800/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Business Setup...</span>
            </>
          ) : (
            <>
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Badge Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>SSL Encrypted ERP Authentication</span>
      </div>
    </div>
  );
}
