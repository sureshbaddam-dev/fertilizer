import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Mail, CheckCircle2, ArrowRight, Loader2, AlertCircle, ShieldCheck, User, Phone, MapPin, Building, Globe, Hash } from 'lucide-react';
import { authService } from '../../services/authService';
import { settingService } from '../../services/settingService';
import BrandLogo from '../../components/common/BrandLogo';

export default function ShopSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = authService.getCurrentUser() || {};
  const verifiedEmail = currentUser.email || '';
  const currentUserId = currentUser.id || currentUser._id;

  // React Query cached shop settings check
  const { data: settingsRes, isLoading: isCheckingExisting } = useQuery({
    queryKey: ['shop-settings-global', currentUserId],
    queryFn: () => settingService.getSettings(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!currentUserId,
  });

  const existingData = useMemo(() => {
    return settingsRes?.data || settingsRes || {};
  }, [settingsRes]);

  // Form State for Business Details
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Status & Validation States
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // If user already has complete profile details in MongoDB, redirect straight to dashboard
  useEffect(() => {
    if (isCheckingExisting || authService.isInitializing) return;

    if (existingData && Object.keys(existingData).length > 0) {
      if (
        currentUser.isProfileComplete ||
        (existingData.ownerName &&
          existingData.ownerName !== 'Pending Setup' &&
          existingData.mobile &&
          !existingData.mobile.startsWith('pending_'))
      ) {
        navigate('/dashboard', { replace: true });
        return;
      }

      if (existingData.shopName) setShopName(existingData.shopName);
      if (existingData.ownerName && existingData.ownerName !== 'Pending Setup') setOwnerName(existingData.ownerName);
      else if (currentUser.ownerName && currentUser.ownerName !== 'Pending Setup') setOwnerName(currentUser.ownerName);
      if (existingData.mobile && !existingData.mobile.startsWith('pending_')) setMobile(existingData.mobile);
      else if (currentUser.mobile && !currentUser.mobile.startsWith('pending_')) setMobile(currentUser.mobile);
      if (existingData.address) setAddress(existingData.address);
      if (existingData.district) setCity(existingData.district);
      if (existingData.state) setState(existingData.state);
      if (existingData.pincode) setPincode(existingData.pincode);
    } else if (currentUser) {
      if (currentUser.ownerName && currentUser.ownerName !== 'Pending Setup') setOwnerName(currentUser.ownerName);
      if (currentUser.mobile && !currentUser.mobile.startsWith('pending_')) setMobile(currentUser.mobile);
      if (currentUser.shopName) setShopName(currentUser.shopName);
    }
  }, [existingData, isCheckingExisting, navigate, currentUser]);

  const validateForm = () => {
    const errors = {};

    if (!ownerName || !ownerName.trim()) {
      errors.ownerName = 'Name is required.';
    }

    const cleanMobile = mobile.trim().replace(/[\s\-\(\)]/g, '');
    const tenDigit = cleanMobile.length === 12 && cleanMobile.startsWith('91') ? cleanMobile.slice(2) : cleanMobile.startsWith('+91') ? cleanMobile.slice(3) : cleanMobile;
    if (!cleanMobile) {
      errors.mobile = 'Phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(tenDigit)) {
      errors.mobile = 'Please enter a valid 10-digit Indian mobile number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      setServerError('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);
    try {
      // Complete Onboarding API call (saves to both User & ShopSettings)
      const res = await authService.completeOnboarding({
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        shopName: shopName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });

      if (res.success) {
        // Invalidate React Query caches
        const currentUserId = currentUser?.id || currentUser?._id;
        queryClient.setQueryData(['shop-settings-global', currentUserId, true], res.data);
        queryClient.invalidateQueries(['shop-settings-global']);
        queryClient.invalidateQueries(['shop-settings-profile']);
        queryClient.invalidateQueries(['user-profile']);

        // Continue to Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setServerError(res.message || 'Failed to save business details. Please try again.');
      }
    } catch (err) {
      setServerError(err.message || 'Failed to save business details. Please try again.');
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
    <div className="space-y-4 font-sans text-slate-800 py-1">
      {/* Header with VEDIXA Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-1 pb-1">
        <BrandLogo imgClassName="h-12 sm:h-14" />
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
          Complete Business Profile
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Enter your business information to access your ERP workspace.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Onboarding Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Read-Only Verified Email */}
        {verifiedEmail && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Verified Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <input
                type="email"
                value={verifiedEmail}
                readOnly
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed select-none"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

        {/* 1. Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Owner / Contact Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                if (fieldErrors.ownerName) setFieldErrors((prev) => ({ ...prev, ownerName: '' }));
              }}
              placeholder="Full name"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                fieldErrors.ownerName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
              required
            />
          </div>
          {fieldErrors.ownerName && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.ownerName}</p>}
        </div>

        {/* 2. Phone Number */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
              }}
              placeholder="10-digit Indian mobile number"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                fieldErrors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
              required
            />
          </div>
          {fieldErrors.mobile && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.mobile}</p>}
        </div>

        {/* 3. Shop Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Shop / Business Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="text"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                if (fieldErrors.shopName) setFieldErrors((prev) => ({ ...prev, shopName: '' }));
              }}
              placeholder="e.g. Sri Lakshmi Fertilizers"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                fieldErrors.shopName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
              required
            />
          </div>
          {fieldErrors.shopName && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.shopName}</p>}
        </div>

        {/* 4. Shop Address */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            Shop Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: '' }));
              }}
              placeholder="Door No, Street Name, Landmark"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                fieldErrors.address ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
              required
            />
          </div>
          {fieldErrors.address && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.address}</p>}
        </div>

        {/* 5. City & 6. State Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* City */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              City / Mandal <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: '' }));
                }}
                placeholder="City or Town"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                  fieldErrors.city ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
                required
              />
            </div>
            {fieldErrors.city && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.city}</p>}
          </div>

          {/* State */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              State <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <input
                type="text"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: '' }));
                }}
                placeholder="State"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                  fieldErrors.state ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
                required
              />
            </div>
            {fieldErrors.state && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.state}</p>}
          </div>
        </div>

        {/* 7. Pincode */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">
            PIN Code <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, ''));
                if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: '' }));
              }}
              placeholder="6-digit PIN code"
              className={`w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border ${
                fieldErrors.pincode ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all`}
              required
            />
          </div>
          {fieldErrors.pincode && <p className="text-[10px] font-bold text-rose-600">{fieldErrors.pincode}</p>}
        </div>

        {/* Primary Save & Continue Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-3 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Saving Business Details...</span>
            </>
          ) : (
            <>
              <span>Save & Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
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
