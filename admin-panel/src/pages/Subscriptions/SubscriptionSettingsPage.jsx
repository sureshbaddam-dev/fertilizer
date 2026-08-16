import React, { useState, useEffect } from 'react';
import { Sparkles, Save, CheckCircle2, Clock, Power } from 'lucide-react';
import SubscriptionsTabs from '../../components/SubscriptionsTabs';
import { adminApiService } from '../../services/adminApiService';

export default function SubscriptionSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [subscriptionSystemEnabled, setSubscriptionSystemEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiService.getSubscriptionSettings();
      setSettings(data);

      const sysSettings = await adminApiService.getSystemSettings();
      if (sysSettings && typeof sysSettings.subscriptionSystemEnabled === 'boolean') {
        setSubscriptionSystemEnabled(sysSettings.subscriptionSystemEnabled);
      }
    } catch (err) {
      console.error('Failed to load subscription settings:', err);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await adminApiService.updateSubscriptionSettings(settings);
      await adminApiService.updateSystemSetting('subscriptionSystemEnabled', subscriptionSystemEnabled);
      setSuccessMsg('Subscription plans & system settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-slate-400 font-medium">Loading subscription plan settings...</div>;
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
            Configure dynamic pricing for the SINGLE "Fertilizer ERP" plan and control global subscription availability.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
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
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
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
          When turned <strong>OFF</strong>, subscription purchasing and self-serve plans are disabled across the platform. State is saved directly in the MongoDB database.
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

        {/* 3. DEMO SETTINGS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Default Demo Trial Settings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Demo Days</label>
              <input
                type="number"
                value={settings.demoSettings?.defaultDemoDays || 7}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    demoSettings: { ...settings.demoSettings, defaultDemoDays: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.demoSettings?.isDemoAvailable ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      demoSettings: { ...settings.demoSettings, isDemoAvailable: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span>Allow Custom Admin Demo Grants</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
