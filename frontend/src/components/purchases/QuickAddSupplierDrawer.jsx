import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import FormDrawer from '../ui/FormDrawer';
import { supplierService } from '../../services/supplierService';

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  mobile: z.string().min(10, '10-digit mobile number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});

export default function QuickAddSupplierDrawer({ isOpen, initialName = '', onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [duplicateConfirm, setDuplicateConfirm] = useState({ isOpen: false, data: null });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: initialName, companyName: '', gstin: '', mobile: '', email: '', address: '' },
  });

  const mutation = useMutation({
    mutationFn: supplierService.createSupplier,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      reset();
      setDuplicateConfirm({ isOpen: false, data: null });
      onClose();
      const created = res.data?.supplier || res.data?.data || res.data;
      if (onSuccess && created) {
        onSuccess(created);
      }
    },
    onError: (err, variables) => {
      const status = err?.response?.status;
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (status === 409 || errMsg.toLowerCase().includes('mobile')) {
        setDuplicateConfirm({ isOpen: true, data: variables });
      } else {
        alert(errMsg || 'Failed to create supplier');
      }
    },
  });

  const handleFormSubmit = (data) => {
    // Local duplicate mobile check with normalized formatting
    const mobileTrim = (data.mobile || '').toString().replace(/\s+/g, '').trim();
    const existingSuppliers = queryClient.getQueryData(['suppliers'])?.data?.suppliers || [];
    const hasDuplicateMobile = mobileTrim && existingSuppliers.some(
      (s) => (s.mobile || '').toString().replace(/\s+/g, '').trim() === mobileTrim
    );

    if (hasDuplicateMobile && !data.allowDuplicateMobile) {
      setDuplicateConfirm({ isOpen: true, data });
      return;
    }

    mutation.mutate(data);
  };

  const handleConfirmAddAnyway = () => {
    if (!duplicateConfirm.data) return;
    const payload = { ...duplicateConfirm.data, allowDuplicateMobile: true };
    setDuplicateConfirm({ isOpen: false, data: null });
    mutation.mutate(payload);
  };

  return (
    <>
      <FormDrawer
        isOpen={isOpen}
        title="➕ Quick Add Supplier"
        description="Register a new supplier inline without leaving your purchase entry"
        onClose={onClose}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Supplier Name *</label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Coromandel International Ltd."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 font-bold"
            />
            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Company Name</label>
            <input
              type="text"
              {...register('companyName')}
              placeholder="e.g. Coromandel"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Mobile Number *</label>
              <input
                type="tel"
                {...register('mobile')}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
              />
              {errors.mobile && <p className="text-[10px] text-red-500">{errors.mobile.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">GSTIN</label>
              <input
                type="text"
                {...register('gstin')}
                placeholder="15-digit GSTIN"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 uppercase focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Market Yard / Office Address"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-gray-700 bg-gray-100 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl font-extrabold shadow-md shadow-emerald-700/20 disabled:opacity-50 cursor-pointer"
            >
              {mutation.isPending ? 'Saving...' : 'Save & Select Supplier'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Confirmation Modal for Duplicate Mobile Number */}
      {duplicateConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <h3 className="font-bold text-sm text-gray-900">Duplicate Mobile Number</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Supplier with this mobile number already exists.
              <br />
              Do you want to add this supplier anyway?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDuplicateConfirm({ isOpen: false, data: null })}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddAnyway}
                className="px-4 py-1.5 bg-[#047857] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
