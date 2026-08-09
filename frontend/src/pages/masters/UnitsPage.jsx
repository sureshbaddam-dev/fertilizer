import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Scale, Edit2, Archive, RefreshCw } from 'lucide-react';
import { masterService } from '../../services/masterService';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name is required'),
  shortName: z.string().min(1, 'Short name is required'),
  allowDecimals: z.boolean().default(false),
});

export default function UnitsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drawer & Dialog state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, unit: null, type: 'archive' });

  // Fetch Units
  const { data, isLoading } = useQuery({
    queryKey: ['units', searchQuery, statusFilter, page],
    queryFn: () =>
      masterService.getUnits({
        search: searchQuery,
        isActive: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 10,
      }),
  });

  const units = data?.data?.units || [];
  const totalRecords = data?.data?.total || units.length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '', shortName: '', allowDecimals: false },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: masterService.createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setIsDrawerOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: masterService.updateUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setIsDrawerOpen(false);
      setEditingUnit(null);
      reset();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: masterService.deactivateUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setConfirmDialog({ isOpen: false, unit: null, type: 'archive' });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: masterService.restoreUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['masters-all'] });
      setConfirmDialog({ isOpen: false, unit: null, type: 'restore' });
    },
  });

  const handleOpenAdd = () => {
    setEditingUnit(null);
    reset({ name: '', shortName: '', allowDecimals: false });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    reset({
      name: unit.name || '',
      shortName: unit.shortName || '',
      allowDecimals: unit.allowDecimals || false,
    });
    setIsDrawerOpen(true);
  };

  const onSubmitForm = (formData) => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit._id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!confirmDialog.unit) return;
    if (confirmDialog.type === 'archive') {
      deactivateMutation.mutate(confirmDialog.unit._id);
    } else {
      restoreMutation.mutate(confirmDialog.unit._id);
    }
  };

  const columns = [
    {
      header: 'Unit Name',
      accessorKey: 'name',
      sortable: true,
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] font-extrabold flex items-center justify-center border border-emerald-100 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-gray-900 block leading-tight">{row.name}</span>
            <span className="text-[10px] text-gray-400 font-medium">({row.shortName})</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Short Code',
      accessorKey: 'shortName',
      align: 'center',
      render: (row) => <span className="font-mono text-xs font-bold text-gray-700">{row.shortName}</span>,
    },
    {
      header: 'Allow Decimals',
      accessorKey: 'allowDecimals',
      align: 'center',
      render: (row) => (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${row.allowDecimals ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-gray-100 text-gray-500'}`}>
          {row.allowDecimals ? 'Yes (e.g. 1.5 kg)' : 'No (Integers)'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      align: 'center',
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      className: 'text-center',
      cellClassName: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#047857] hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Edit Unit"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {row.isActive ? (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, unit: row, type: 'archive' })}
              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
              title="Archive / Deactivate"
            >
              <Archive className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, unit: row, type: 'restore' })}
              className="p-1.5 rounded-lg text-[#047857] hover:text-[#00783C] hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Restore / Activate"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter & Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search units..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00783C]/20 focus:border-[#00783C]"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'true', label: 'Active' },
              { id: 'false', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'btn-agri-primary shadow-2xs'
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
          className="w-full sm:w-auto px-4 py-2 text-xs font-extrabold btn-agri-primary rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Unit</span>
        </button>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={units}
        isLoading={isLoading}
        emptyMessage="No units found matching criteria"
        pagination={{
          page,
          totalPages: Math.ceil(totalRecords / 10),
          total: totalRecords,
        }}
        onPageChange={setPage}
      />

      {/* Add / Edit Form Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        title={editingUnit ? 'Edit Unit' : 'Add New Unit'}
        description={editingUnit ? 'Update unit details' : 'Register a new measurement unit in Master Data'}
        onClose={() => setIsDrawerOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Unit Name *</label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Bag, Bottle, Kilogram, Litre"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00783C]/20 focus:border-[#00783C]"
            />
            {errors.name && <p className="text-[10px] text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Short Code / Abbreviation *</label>
            <input
              type="text"
              {...register('shortName')}
              placeholder="e.g. bag, btl, kg, l, ml"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00783C]/20 focus:border-[#00783C]"
            />
            {errors.shortName && <p className="text-[10px] text-red-500 font-medium">{errors.shortName.message}</p>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allowDecimals"
              {...register('allowDecimals')}
              className="w-4 h-4 text-[#00783C] rounded focus:ring-[#00783C] border-gray-300"
            />
            <label htmlFor="allowDecimals" className="font-semibold text-gray-700 cursor-pointer">
              Allow Fractional Quantities (e.g. 1.5 kg, 0.5 Litres)
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-3.5 py-2 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 font-extrabold btn-agri-primary rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {editingUnit ? 'Save Changes' : 'Create Unit'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.type === 'archive' ? 'Archive Unit?' : 'Restore Unit?'}
        message={
          confirmDialog.type === 'archive'
            ? `Are you sure you want to archive unit '${confirmDialog.unit?.name}'? It will be hidden from new transaction dropdowns.`
            : `Are you sure you want to restore unit '${confirmDialog.unit?.name}'? It will become active again.`
        }
        confirmText={confirmDialog.type === 'archive' ? 'Archive Unit' : 'Restore Unit'}
        isLoading={deactivateMutation.isPending || restoreMutation.isPending}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmDialog({ isOpen: false, unit: null, type: 'archive' })}
      />
    </div>
  );
}
