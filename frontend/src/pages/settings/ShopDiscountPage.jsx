import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Save, CheckCircle2, Percent, IndianRupee } from 'lucide-react';
import { settingService } from '../../services/settingService';

export default function ShopDiscountPage() {
  const queryClient = useQueryClient();

  const { data: discountApi, isLoading } = useQuery({
    queryKey: ['shop-discount'],
    queryFn: () => settingService.getShopDiscount(),
  });

  const discountData = discountApi?.data?.data || discountApi?.data;

  const [isEnabled, setIsEnabled] = useState(false);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (discountData) {
      setIsEnabled(Boolean(discountData.isEnabled));
      setDiscountType(discountData.discountType === 'amount' ? 'amount' : 'percentage');
      setDiscountValue(Number(discountData.discountValue || 0));
      setNotes(discountData.notes || '');
    }
  }, [discountData]);

  const updateDiscountMutation = useMutation({
    mutationFn: (data) => settingService.updateShopDiscount(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-discount']);
      queryClient.invalidateQueries(['dashboard-summary']);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to update shop discount settings');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateDiscountMutation.mutate({
      isEnabled,
      discountType,
      discountValue: Number(discountValue || 0),
      notes: notes.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        <p className="mt-2 text-xs font-semibold text-slate-500">Loading Shop Discount Settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Shop Discount Configuration</h2>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateDiscountMutation.isPending}
          className="px-5 py-2.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{updateDiscountMutation.isPending ? 'Saving...' : 'Save Discount Settings'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Shop Discount settings saved successfully! All new bills will immediately use these settings.</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enable / Disable Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Enable Shop Discount</span>
              <span className="text-[11px] text-slate-500 font-medium font-semibold">Turn global bill discount ON or OFF.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-[#047857]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
              {isEnabled ? 'ACTIVE (Applied to all new bills)' : 'DISABLED (No discount applied)'}
            </span>
          </div>
        </div>

        {/* Discount Type */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="text-xs font-extrabold text-slate-900 block">Discount Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                discountType === 'percentage'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>Percentage (%)</span>
            </button>

            <button
              type="button"
              onClick={() => setDiscountType('amount')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                discountType === 'amount'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              <span>Fixed Amount (₹)</span>
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-extrabold text-slate-900 block">
            Discount Value ({discountType === 'percentage' ? '%' : '₹'}) *
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? 'e.g. 5 for 5%' : 'e.g. 50 for ₹50'}
              className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#047857]"
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {discountType === 'percentage'
              ? 'Example: Entering 5 will calculate a 5% discount on the subtotal (₹1000 subtotal → ₹50 discount).'
              : 'Example: Entering 50 will subtract a flat ₹50 discount from the subtotal.'}
          </p>
        </div>

        {/* Notes / Reason */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-extrabold text-slate-900 block">Discount Notes / Promotion Title</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Festival Offer / Flat 5% OFF"
            className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#047857]"
          />
        </div>
      </div>
    </form>
  );
}
