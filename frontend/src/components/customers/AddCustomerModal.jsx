import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, AlertCircle, Check } from 'lucide-react';
import { customerService } from '../../services/customerService';

export default function AddCustomerModal({ isOpen, onClose, onCustomerCreated }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: '',
    mandal: '',
    district: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Database-Backed Village & Mandal Suggestions
  const { data: suggestionsRes } = useQuery({
    queryKey: ['customer-suggestions'],
    queryFn: () => customerService.getSuggestions(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const villagesList = suggestionsRes?.data?.villages || suggestionsRes?.villages || [];
  const mandalsList = suggestionsRes?.data?.mandals || suggestionsRes?.mandals || [];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = (formData.name || '').trim();
    const trimmedMobile = (formData.mobile || '').trim();
    const trimmedVillage = (formData.village || '').trim();
    const trimmedMandal = (formData.mandal || '').trim();
    const trimmedDistrict = (formData.district || '').trim();

    if (!trimmedMobile) {
      setErrorMsg('Mobile Number is required');
      return;
    }

    if (!/^\d{10}$/.test(trimmedMobile)) {
      setErrorMsg('Mobile Number must be exactly 10 digits');
      return;
    }

    setSaving(true);

    try {
      const response = await customerService.createCustomer({
        name: trimmedName,
        mobile: trimmedMobile,
        village: trimmedVillage,
        mandal: trimmedMandal,
        district: trimmedDistrict,
        customerType: 'ADDED',
      });

      const newCustomer = response?.data?.customer || response?.data?.data?.customer;

      queryClient.invalidateQueries(['customers-list-page']);
      queryClient.invalidateQueries(['drawer-customers']);
      queryClient.invalidateQueries(['customer-suggestions']);
      queryClient.invalidateQueries(['customers']);

      if (onCustomerCreated && newCustomer) {
        onCustomerCreated(newCustomer);
      }

      setFormData({ name: '', mobile: '', village: '', mandal: '', district: '' });
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const commonInputClass =
    'w-full h-11 px-3.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#00783C] focus:bg-white focus:ring-2 focus:ring-[#00783C]/10 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-4 sm:p-5 space-y-4 z-50 text-xs font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-100">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>+ Add New Customer</span>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Customer Name (Optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">
              Customer Name <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter customer name (optional)"
              className={commonInputClass}
            />
          </div>

          {/* Mobile Number (Mandatory) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
              placeholder="Enter 10-digit mobile number"
              className={`${commonInputClass} font-mono`}
            />
          </div>

          {/* Village / Area with Database Autocomplete Suggestions */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 block">Village / Area</label>
            <input
              type="text"
              list="modal-village-suggestions"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              placeholder="Enter or select village"
              className={commonInputClass}
            />
            <datalist id="modal-village-suggestions">
              {villagesList.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          {/* Mandal & District with Database Autocomplete Suggestions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">Mandal</label>
              <input
                type="text"
                list="modal-mandal-suggestions"
                value={formData.mandal}
                onChange={(e) => setFormData({ ...formData, mandal: e.target.value })}
                placeholder="Enter or select mandal"
                className={commonInputClass}
              />
              <datalist id="modal-mandal-suggestions">
                {mandalsList.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 block">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Enter district"
                className={commonInputClass}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 btn-agri-primary rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Customer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
