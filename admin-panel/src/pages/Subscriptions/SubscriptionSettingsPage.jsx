import React, { useState, useEffect } from 'react';
import { Sparkles, Save, CheckCircle2, Clock, Power, AlertCircle, RefreshCw } from 'lucide-react';
import SubscriptionsTabs from '../../components/SubscriptionsTabs';
import { adminApiService } from '../../services/adminApiService';

export default function SubscriptionSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [subscriptionSystemEnabled, setSubscriptionSystemEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [data, sysSettings] = await Promise.all([
        adminApiService.getSubscriptionSettings(),
        adminApiService.getSystemSettings().catch(() => null),
      ]);

      if (!data) {
        throw new Error('No data received from subscription settings API');
      }

      setSettings(data);

      if (sysSettings && typeof sysSettings.subscriptionSystemEnabled === 'boolean') {
        setSubscriptionSystemEnabled(sysSettings.subscriptionSystemEnabled);
      }
    } catch (err) {
      console.error('Failed to load subscription settings:', err);
      setLoadError('Unable to load subscription settings. Please check server connectivity and try again.');
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleSubscriptionSystem = async (newValue) => {
    setSubscriptionSystemEnabled(newValue);
    try {
      await adminApiService.updateSystemSetting('subscriptionSystemEnabled', newValue);
      setSuccessMsg(`Subscription System status updated to ${newValue ? 'ON (Active)' : 'OFF (Disabled)'}. Saved in database.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (_err) {
      setSuccessMsg('Failed to update subscription system status.');
    }
  };

  const handlePriceChange = (code, field, val) => {
    setSettings((prev) => ({
      ...prev,
      durations: prev.durations.map((d) => (d.code === code ? { ...d, [field]: val } : d)),
    }));
  };

  const validateDemoDays = (value) => {
    if (value === '' || value === null || value === undefined) {
      return 'Default Demo Days is required and cannot be empty.';
    }
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num)) {
      return 'Default Demo Days must be a positive whole integer (no decimals or non-numeric characters).';
    }
    if (num < 1) {
      return 'Default Demo Days must be at least 1 day (0 or negative values are not permitted).';
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!settings) return;

    setValidationError('');
    setSuccessMsg('');

    const demoDaysVal = settings.demoSettings?.defaultDemoDays;
    const demoErr = validateDemoDays(demoDaysVal);
    if (demoErr) {
      setValidationError(demoErr);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        isSubscriptionSystemActive: subscriptionSystemEnabled,
        demoSettings: {
          isDemoAvailable: settings.demoSettings?.isDemoAvailable !== false,
          defaultDemoDays: parseInt(demoDaysVal, 10),
          allowCustomAdminDemoGrants: settings.demoSettings?.allowCustomAdminDemoGrants !== false,
        },
      };

      await adminApiService.updateSubscriptionSettings(payload);
      await adminApiService.updateSystemSetting('subscriptionSystemEnabled', subscriptionSystemEnabled);

      setSuccessMsg('Subscription settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchSettings();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save settings.';
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans antialiased text-slate-800">
        <SubscriptionsTabs />
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-semibold">Loading subscription plan settings from database...</p>
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="space-y-6 font-sans antialiased text-slate-800">
        <SubscriptionsTabs />
        <div className="p-10 text-center bg-white border border-rose-200 rounded-2xl shadow-xs space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Unable to load subscription settings</h2>
            <p className="text-xs text-slate-500">{loadError || 'Failed to communicate with the server.'}</p>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800">
      <SubscriptionsTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Subscription Settings & System Control</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure dynamic pricing for the SINGLE "Fertilizer ERP" plan and control global subscription & free trial availability.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 1. SUBSCRIPTION SYSTEM ON/OFF CONTROL CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${subscriptionSystemEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Subscription System Availability</h2>
              <p className="text-xs text-slate-500 font-medium">Global master control switch for ERP subscriptions.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${subscriptionSystemEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {subscriptionSystemEnabled ? '● ON (Active)' : '○ OFF (Disabled)'}
            </span>
            <button
              type="button"
              onClick={() => handleToggleSubscriptionSystem(!subscriptionSystemEnabled)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                subscriptionSystemEnabled
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              Turn {subscriptionSystemEnabled ? 'OFF' : 'ON'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          When turned <strong>OFF</strong>, subscription purchasing and self-serve plans are disabled across the platform. State is saved directly in MongoDB.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. DURATION PRICING SETTINGS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Plan Durations & Pricing</h2>
              <p className="text-xs text-slate-500 font-medium">Unified ERP Plan with configurable duration amounts.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Single Plan System
            </span>
          </div>

          <div className="space-y-4">
            {settings.durations.map((dur) => (
              <div key={dur.code} className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 block">{dur.label}</span>
                  <span className="text-[11px] text-slate-500 font-semibold">{dur.months} Month Billing Period</span>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Standard Amount (₹)</label>
                  <input
                    type="number"
                    value={dur.amount}
                    onChange={(e) => handlePriceChange(dur.code, 'amount', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Offer Price (Optional ₹)</label>
                  <input
                    type="number"
                    value={dur.offerPrice || ''}
                    onChange={(e) => handlePriceChange(dur.code, 'offerPrice', e.target.value ? Number(e.target.value) : null)}
                    placeholder="None"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. FREE TRIAL SETTINGS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Free Trial Settings</h2>
              <p className="text-xs text-slate-500 font-medium">
                Admin-controlled configuration for automatic new user trials and manual demo grants.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Setting 1: Free Trial Availability */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block mb-1">Free Trial Availability</span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Allow automatic free trials for new user registrations. Turning OFF does not affect existing active trials.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  settings.demoSettings?.isDemoAvailable !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {settings.demoSettings?.isDemoAvailable !== false ? 'ON (Active)' : 'OFF (Disabled)'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      demoSettings: {
                        ...settings.demoSettings,
                        isDemoAvailable: !(settings.demoSettings?.isDemoAvailable !== false),
                      },
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    settings.demoSettings?.isDemoAvailable !== false
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Turn {settings.demoSettings?.isDemoAvailable !== false ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>

            {/* Setting 2: Default Demo Days */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1" htmlFor="defaultDemoDaysInput">
                  Default Demo Days
                </label>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Number of trial days automatically granted to new users upon registration.
                </p>
              </div>
              <div>
                <input
                  id="defaultDemoDaysInput"
                  type="number"
                  min="1"
                  step="1"
                  value={settings.demoSettings?.defaultDemoDays ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValidationError('');
                    setSettings({
                      ...settings,
                      demoSettings: {
                        ...settings.demoSettings,
                        defaultDemoDays: val === '' ? '' : val,
                      },
                    });
                  }}
                  placeholder="e.g. 7"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            {/* Setting 3: Allow Custom Admin Demo Grants */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block mb-1">Allow Custom Admin Demo Grants</span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Allow administrators to manually grant custom-duration demo subscriptions to specific users.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  settings.demoSettings?.allowCustomAdminDemoGrants !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {settings.demoSettings?.allowCustomAdminDemoGrants !== false ? 'ON (Active)' : 'OFF (Disabled)'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      demoSettings: {
                        ...settings.demoSettings,
                        allowCustomAdminDemoGrants: !(settings.demoSettings?.allowCustomAdminDemoGrants !== false),
                      },
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    settings.demoSettings?.allowCustomAdminDemoGrants !== false
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Turn {settings.demoSettings?.allowCustomAdminDemoGrants !== false ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
