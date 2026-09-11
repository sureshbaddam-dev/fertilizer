import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertCircle,
  Check,
  Building,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { toast } from '../../contexts/ToastContext';

export default function EditCustomerModal({ isOpen, onClose, customer, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: '',
    mandal: '',
    district: '',
    state: 'Andhra Pradesh',
    gstin: '',
    type: 'Regular',
    creditLimit: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        mobile: customer.mobile || '',
        village: customer.village || customer.address || '',
        mandal: customer.mandal || '',
        district: customer.district || '',
        state: customer.state || 'Andhra Pradesh',
        gstin: customer.gstin || '',
        type: customer.type || customer.customerType || 'Regular',
        creditLimit: customer.creditLimit !== undefined && customer.creditLimit !== null ? String(customer.creditLimit) : '50000',
      });
      setErrorMsg('');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await customerService.updateCustomer(customer._id || customer.id, {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 50000,
      });
      toast.success('Customer updated successfully');
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update customer';
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <Edit2 className="w-4 h-4 text-[#047857]" />
            <span>Edit Customer Details</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-1.5 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] font-semibold text-gray-700 block">Customer Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Customer Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
              >
                <option value="Regular">Regular</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Farmer">Farmer</option>
                <option value="Dealer">Dealer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Village / Address</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="Village name"
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Mandal</label>
              <input
                type="text"
                value={formData.mandal}
                onChange={(e) => setFormData({ ...formData, mandal: e.target.value })}
                placeholder="Mandal name"
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="District name"
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="Optional GSTIN"
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#047857]"
              />
            </div>
          </div>



          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
