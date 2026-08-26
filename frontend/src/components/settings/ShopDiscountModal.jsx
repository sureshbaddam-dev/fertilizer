import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, X, Check, AlertCircle } from 'lucide-react';
import { settingService } from '../../services/settingService';

export default function ShopDiscountModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    discountType: 'percentage',
    discountValue: 5,
    isEnabled: true,
    startDate: '',
    endDate: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Fetch live shop discount settings
  const { data: discountApi, isLoading } = useQuery({
    queryKey: ['shop-discount'],
    queryFn: () => settingService.getShopDiscount(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (discountApi?.data?.data) {
      const d = discountApi.data.data;
      setFormData({
        discountType: d.discountType || 'percentage',
        discountValue: d.discountValue !== undefined ? d.discountValue : 0,
        isEnabled: d.isEnabled !== undefined ? d.isEnabled : false,
        startDate: d.startDate ? d.startDate.split('T')[0] : '',
        endDate: d.endDate ? d.endDate.split('T')[0] : '',
        notes: d.notes || '',
      });
    }
  }, [discountApi]);

  const updateDiscountMutation = useMutation({
    mutationFn: (data) => settingService.updateShopDiscount(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-discount']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['dashboard-overview']);
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update shop discount settings');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (Number(formData.discountValue) < 0) {
      setErrorMsg('Discount value cannot be negative');
      return;
    }
    updateDiscountMutation.mutate(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-100">
              <Tag className="w-4 h-4" />
            </div>
            <span>Shop Discount Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin" />
            <span>Loading settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Enable / Disable Toggle */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block text-xs">Enable Shop Discount</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  Automatically apply this discount to every new bill created
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#047857]"></div>
              </label>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Fixed Amount (₹)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Discount Value ({formData.discountType === 'percentage' ? '%' : '₹'}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">Start Date (Optional)</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full h-9 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Notes / Terms (Optional)</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter offer description or note..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={updateDiscountMutation.isPending}
                className="px-5 py-2 btn-agri-primary rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {updateDiscountMutation.isPending ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
