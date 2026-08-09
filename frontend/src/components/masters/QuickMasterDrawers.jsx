import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormDrawer from '../ui/FormDrawer';
import { masterService } from '../../services/masterService';

const companySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  shortName: z.string().optional(),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
});

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  shortName: z.string().min(1, 'Short name is required'),
  allowDecimals: z.boolean().default(false),
});

/**
 * Quick Add Company Inline Drawer for Transactions
 */
export function QuickAddCompanyDrawer({ isOpen, initialName = '', onClose, onSuccess }) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: { name: initialName, shortName: '', contactPerson: '', mobile: '' },
  });

  const mutation = useMutation({
    mutationFn: masterService.createCompany,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      reset();
      onClose();
      if (onSuccess && res.data?.company) {
        onSuccess(res.data.company);
      }
    },
  });

  return (
    <FormDrawer
      isOpen={isOpen}
      title="➕ Quick Add Company / Brand"
      description="Create a new brand inline without leaving your current transaction"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-gray-700 block">Company Name *</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Coromandel, Bayer, IFFCO"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-gray-700 block">Short Code</label>
          <input
            type="text"
            {...register('shortName')}
            placeholder="e.g. CORO"
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
            {mutation.isPending ? 'Creating...' : 'Save & Select'}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}

/**
 * Quick Add Category Inline Drawer for Transactions
 */
export function QuickAddCategoryDrawer({ isOpen, initialName = '', onClose, onSuccess }) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: initialName, description: '' },
  });

  const mutation = useMutation({
    mutationFn: masterService.createCategory,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      reset();
      onClose();
      if (onSuccess && res.data?.category) {
        onSuccess(res.data.category);
      }
    },
  });

  return (
    <FormDrawer
      isOpen={isOpen}
      title="➕ Quick Add Category"
      description="Create a new category inline without leaving your current transaction"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-gray-700 block">Category Name *</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Fertilizers, Seeds, Pesticides"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
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
            {mutation.isPending ? 'Creating...' : 'Save & Select'}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}

/**
 * Quick Add Unit Inline Drawer for Transactions
 */
export function QuickAddUnitDrawer({ isOpen, initialName = '', onClose, onSuccess }) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: initialName, shortName: initialName.toLowerCase().slice(0, 3), allowDecimals: false },
  });

  const mutation = useMutation({
    mutationFn: masterService.createUnit,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      reset();
      onClose();
      if (onSuccess && res.data?.unit) {
        onSuccess(res.data.unit);
      }
    },
  });

  return (
    <FormDrawer
      isOpen={isOpen}
      title="➕ Quick Add Unit"
      description="Create a new unit inline without leaving your current transaction"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-gray-700 block">Unit Name *</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Bag, Bottle, Kg"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-gray-700 block">Short Code *</label>
          <input
            type="text"
            {...register('shortName')}
            placeholder="e.g. bag, btl, kg"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          {errors.shortName && <p className="text-[10px] text-red-500">{errors.shortName.message}</p>}
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
            {mutation.isPending ? 'Creating...' : 'Save & Select'}
          </button>
        </div>
      </form>
    </FormDrawer>
  );
}
