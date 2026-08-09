import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit2, Archive, RefreshCw, Eye, AlertCircle, Award } from 'lucide-react';
import { masterService } from '../../services/masterService';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ImageUpload from '../../components/ui/ImageUpload';

const brandSchema = z.object({
  name: z.string().min(2, 'Brand name is required'),
  logo: z.string().optional(),
});

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drawer & Dialog State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [viewingBrand, setViewingBrand] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, brand: null, type: 'archive' });
  const [apiError, setApiError] = useState(null);

  // Fetch Brands via Master API
  const { data, isLoading } = useQuery({
    queryKey: ['brands', searchQuery, statusFilter, page],
    queryFn: () =>
      masterService.getBrands({
        search: searchQuery,
        isActive: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 10,
      }),
  });

  const brands = data?.data?.brands || [];
  const totalRecords = data?.data?.total || brands.length;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      logo: '',
    },
  });

  const handleApiError = (err) => {
    setApiError(err.message || 'An error occurred');
    if (Array.isArray(err.errors)) {
      err.errors.forEach((e) => {
        if (e.field) {
          setError(e.field, { type: 'server', message: e.message });
        }
      });
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: masterService.createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setIsDrawerOpen(false);
      setApiError(null);
      reset();
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: masterService.updateBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setIsDrawerOpen(false);
      setEditingBrand(null);
      setApiError(null);
      reset();
    },
    onError: handleApiError,
  });

  const deactivateMutation = useMutation({
    mutationFn: masterService.deactivateBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setConfirmDialog({ isOpen: false, brand: null, type: 'archive' });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: masterService.restoreBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setConfirmDialog({ isOpen: false, brand: null, type: 'restore' });
    },
  });

  // Handlers
  const handleOpenAdd = () => {
    setEditingBrand(null);
    setApiError(null);
    reset({ name: '', logo: '' });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBrand(b);
    setApiError(null);
    reset({
      name: b.name || '',
      logo: b.logo || '',
    });
    setIsDrawerOpen(true);
  };

  const onSubmitForm = (formData) => {
    setApiError(null);
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand._id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!confirmDialog.brand) return;
    if (confirmDialog.type === 'archive') {
      deactivateMutation.mutate(confirmDialog.brand._id);
    } else {
      restoreMutation.mutate(confirmDialog.brand._id);
    }
  };

  const renderBrandAvatar = (row) => {
    if (row.logo) {
      return (
        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          <img src={row.logo} alt={row.name} className="max-h-full max-w-full object-contain" />
        </div>
      );
    }

    const initial = (row.name || 'B').charAt(0).toUpperCase();
    return (
      <div className="w-8 h-8 rounded-full bg-[#047857] text-white font-extrabold flex items-center justify-center shrink-0 text-xs shadow-2xs border border-emerald-700">
        {initial}
      </div>
    );
  };

  // Columns (Brand Logo, Brand Name, Status, Actions)
  const columns = [
    {
      header: 'Logo',
      key: 'logo',
      render: (row) => renderBrandAvatar(row),
    },
    {
      header: 'Brand Name',
      accessorKey: 'name',
      sortable: true,
      render: (row) => <span className="font-extrabold text-gray-900">{row.name}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingBrand(row)}
            className="p-1 rounded text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Edit Brand"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {row.isActive ? (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, brand: row, type: 'archive' })}
              className="p-1 rounded text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
              title="Archive / Deactivate"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, brand: row, type: 'restore' })}
              className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Restore / Activate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3 text-[12px] font-sans">
      {/* Top Filter & Add Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product brands..."
              className="w-full h-8 pl-8 pr-2.5 text-[12px] bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'true', label: 'Active' },
              { id: 'false', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 sm:flex-none px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto h-8 px-3 text-[12px] font-bold text-white bg-[#047857] hover:bg-[#036448] rounded-lg shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Brand</span>
        </button>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={brands}
        isLoading={isLoading}
        emptyMessage="No product brands found matching criteria"
        pagination={{
          page,
          totalPages: Math.ceil(totalRecords / 10),
          total: totalRecords,
        }}
        onPageChange={setPage}
      />

      {/* Form Drawer (Brand Name & Logo) */}
      <FormDrawer
        isOpen={isDrawerOpen}
        title={editingBrand ? 'Edit Product Brand' : 'Add Product Brand'}
        description={editingBrand ? 'Update brand details' : 'Register a new product brand in Master Data'}
        onClose={() => setIsDrawerOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3.5 text-[12px]">
          {apiError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-1.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-gray-700 block">Brand Name *</label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Coragen, Confidor, Saaf, Gromor, Bayer, UPL"
              className="w-full h-8 px-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name.message}</p>}
          </div>

          <Controller
            name="logo"
            control={control}
            render={({ field }) => (
              <ImageUpload
                label="Brand Logo (Optional)"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="h-8 px-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-8 px-4 font-bold text-white bg-[#047857] hover:bg-[#036448] rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Details View Modal */}
      {viewingBrand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">Brand Details</h3>
              </div>
              <button
                onClick={() => setViewingBrand(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-2 space-y-2 text-xs flex flex-col items-center">
              {renderBrandAvatar(viewingBrand)}
              <span className="font-bold text-sm text-gray-900">{viewingBrand.name}</span>
              <StatusBadge isActive={viewingBrand.isActive} />
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewingBrand(null)}
                className="h-8 px-4 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive / Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.type === 'archive' ? 'Archive Brand?' : 'Restore Brand?'}
        message={
          confirmDialog.type === 'archive'
            ? `Are you sure you want to archive '${confirmDialog.brand?.name}'? It will be hidden from new transaction dropdowns but remains safe in historical records.`
            : `Are you sure you want to restore '${confirmDialog.brand?.name}'? It will become active and visible again.`
        }
        confirmText={confirmDialog.type === 'archive' ? 'Archive Brand' : 'Restore Brand'}
        isLoading={deactivateMutation.isPending || restoreMutation.isPending}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmDialog({ isOpen: false, brand: null, type: 'archive' })}
      />
    </div>
  );
}
