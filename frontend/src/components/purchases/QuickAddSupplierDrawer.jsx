import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: initialName, companyName: '', gstin: '', mobile: '', email: '', address: '' },
  });

  const mutation = useMutation({
    mutationFn: supplierService.createSupplier,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      reset();
      onClose();
      if (onSuccess && res.data?.supplier) {
        onSuccess(res.data.supplier);
      }
    },
  });

  return (
    <FormDrawer
      isOpen={isOpen}
      title="➕ Quick Add Supplier"
      description="Register a new supplier inline without leaving your purchase entry"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3 text-xs">
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
            className="px-3.5 py-2 text-gray-700 bg-gray-100 rounded-xl font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl font-extrabold shadow-md shadow-emerald-700/20 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save & Select Supplier'}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}
