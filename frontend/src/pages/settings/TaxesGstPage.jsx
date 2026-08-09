import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Save, CheckCircle2, ShieldCheck } from 'lucide-react';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';

export default function TaxesGstPage() {
  const queryClient = useQueryClient();

  const { settings: shopSettings, isLoading } = useSettings();

  const [isGstEnabled, setIsGstEnabled] = useState(true);
  const [gstType, setGstType] = useState('CGST_SGST');
  const [defaultGst, setDefaultGst] = useState(18);
  const [gstNumber, setGstNumber] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (shopSettings) {
      setIsGstEnabled(shopSettings.isGstEnabled !== false);
      setGstType(shopSettings.gstType || 'CGST_SGST');
      setDefaultGst(shopSettings.defaultGst !== undefined ? Number(shopSettings.defaultGst) : 18);
      setGstNumber(shopSettings.gstNumber || '');
      setTaxInclusive(shopSettings.taxInclusive !== false);
    }
  }, [shopSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => settingService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings']);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to update GST settings');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      isGstEnabled,
      gstType,
      defaultGst: Number(defaultGst || 0),
      gstNumber: gstNumber.trim().toUpperCase(),
      taxInclusive,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        <p className="mt-2 text-xs font-semibold text-slate-500">Loading GST Settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">GST &amp; Tax Configuration</h2>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateSettingsMutation.isPending}
          className="px-5 py-2.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save GST Settings'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>GST &amp; Tax settings saved successfully! All new bills will automatically use these settings.</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enable / Disable GST */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Enable GST Calculation</span>
              <span className="text-[11px] text-slate-500 font-semibold">Turn automated GST calculation on bills ON or OFF.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGstEnabled(!isGstEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isGstEnabled ? 'bg-[#047857]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isGstEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${isGstEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {isGstEnabled ? 'ACTIVE (GST row enabled on bills)' : 'DISABLED (No GST calculated or shown on bills)'}
            </span>
          </div>
        </div>

        {/* GST Type */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="text-xs font-extrabold text-slate-900 block">GST Tax Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGstType('CGST_SGST')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                gstType === 'CGST_SGST'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>CGST + SGST (In-State)</span>
            </button>

            <button
              type="button"
              onClick={() => setGstType('IGST')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                gstType === 'IGST'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>IGST (Inter-State)</span>
            </button>
          </div>
        </div>

        {/* Default GST Percentage */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-extrabold text-slate-900 block">Default GST Percentage (%) *</label>
          <select
            value={defaultGst}
            onChange={(e) => setDefaultGst(Number(e.target.value))}
            className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#047857]"
          >
            <option value={18}>18% Standard GST Rate</option>
            <option value={12}>12% Fertilizer / Pesticide Rate</option>
            <option value={5}>5% Special Rate</option>
            <option value={0}>0% Exempted Rate</option>
            <option value={28}>28% High GST Rate</option>
          </select>
          <p className="text-[11px] text-slate-500 font-medium">
            Example: Subtotal ₹1000 with 18% GST calculates ₹180 GST amount (Grand Total: ₹1180).
          </p>
        </div>

        {/* GSTIN Number */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-extrabold text-slate-900 block">GSTIN / Tax Registration Number</label>
          <input
            type="text"
            maxLength={15}
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            placeholder="e.g. 37ABCDE1234F1Z5"
            className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#047857]"
          />
        </div>
      </div>
    </form>
  );
}
