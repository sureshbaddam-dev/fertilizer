import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Edit2,
  Archive,
  RefreshCw,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  mobile: z.string().min(10, '10-digit mobile number is required'),
  gstin: z.string().optional(),
  address: z.string().optional(),
});

export default function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drawer & Dialog State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, supplier: null, type: 'archive' });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const isDeleteConfirmed = deleteConfirmInput.trim() === 'DELETE';
  const [apiError, setApiError] = useState(null);

  // Fetch Suppliers & Summary Stats from Database API
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', searchQuery, statusFilter, page],
    queryFn: () =>
      supplierService.getSuppliers({
        search: searchQuery,
        status: statusFilter,
        page,
        limit: 10,
      }),
  });

  const suppliers = data?.data?.suppliers || [];
  const totalRecords = data?.data?.total || suppliers.length;
  const summaryStats = data?.data?.summaryStats || {
    totalSuppliers: 0,
    activeSuppliers: 0,
    inactiveSuppliers: 0,
    totalOutstandingDue: 0,
    totalPurchasesAmount: 0,
    totalPaymentsAmount: 0,
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      mobile: '',
      gstin: '',
      address: '',
    },
  });

  const handleApiError = (err) => {
    console.error('API Error Received:', err);
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
    mutationFn: supplierService.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDrawerOpen(false);
      setApiError(null);
      reset();
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: supplierService.updateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDrawerOpen(false);
      setEditingSupplier(null);
      setApiError(null);
      reset();
    },
    onError: handleApiError,
  });

  const deactivateMutation = useMutation({
    mutationFn: supplierService.deactivateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setConfirmDialog({ isOpen: false, supplier: null, type: 'archive' });
      setDeleteConfirmInput('');
    },
    onError: (err) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete supplier.');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: supplierService.restoreSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setConfirmDialog({ isOpen: false, supplier: null, type: 'restore' });
    },
  });

  // Handlers
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setApiError(null);
    reset({ name: '', contactPerson: '', mobile: '', gstin: '', address: '' });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (sup, e) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    setApiError(null);
    reset({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      mobile: sup.mobile || '',
      gstin: sup.gstin || '',
      address: sup.address || '',
    });
    setIsDrawerOpen(true);
  };

  const onSubmitForm = (formData) => {
    setApiError(null);
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier._id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!confirmDialog.supplier) return;
    if (confirmDialog.type === 'archive') {
      deactivateMutation.mutate(confirmDialog.supplier._id);
    } else {
      restoreMutation.mutate(confirmDialog.supplier._id);
    }
  };

  // Columns for Suppliers Table
  const columns = [
    {
      header: 'Supplier Name',
      accessorKey: 'name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#047857] font-bold flex items-center justify-center border border-[#A7F3D0] shrink-0 text-xs shadow-2xs">
            {row.name.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-gray-900 block leading-tight">{row.name}</span>
            {row.companyName && <span className="text-[10px] text-gray-400">({row.companyName})</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile Number',
      accessorKey: 'mobile',
      render: (row) => (
        <span className="font-mono font-medium text-gray-800">{row.mobile || '—'}</span>
      ),
    },
    {
      header: 'Address',
      accessorKey: 'address',
      render: (row) => (
        <span className="truncate max-w-[140px] block text-gray-600" title={row.address}>
          {row.address || '—'}
        </span>
      ),
    },
    {
      header: 'Last Purchase Date',
      accessorKey: 'lastPurchaseDate',
      render: (row) => (
        <span className="text-gray-600 font-mono text-[11px]">
          {row.lastPurchaseDate ? new Date(row.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Last Payment Date',
      accessorKey: 'lastPaymentDate',
      render: (row) => (
        <span className="text-gray-600 font-mono text-[11px]">
          {row.lastPaymentDate ? new Date(row.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Last Payment Amount',
      accessorKey: 'lastPaymentAmount',
      render: (row) => (
        <span className="font-mono font-bold text-[#047857] whitespace-nowrap">
          {row.lastPaymentAmount > 0 ? `₹ ${Math.round(Number(row.lastPaymentAmount)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
        </span>
      ),
    },
    {
      header: 'Total Purchases',
      accessorKey: 'totalPurchases',
      render: (row) => (
        <span className="font-mono font-bold text-gray-900">
          ₹ {Math.round(Number(row.totalPurchases || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      header: 'Current Outstanding',
      accessorKey: 'outstandingBalance',
      render: (row) => {
        const due = Number(row.outstandingBalance || 0);
        const isAdv = due < 0;
        return (
          <span className={`font-mono font-bold ${isAdv ? 'text-[#047857]' : due > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {isAdv ? `-₹ ${Math.round(Math.abs(due)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (Adv)` : `₹ ${Math.round(due).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      render: (row) => <StatusBadge isActive={row.isActive !== false} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            className="p-1 rounded text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Edit Supplier"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {row.isActive ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDialog({ isOpen: true, supplier: row, type: 'archive' });
              }}
              className="p-1 rounded text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
              title="Archive Supplier"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDialog({ isOpen: true, supplier: row, type: 'restore' });
              }}
              className="p-1 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Restore Supplier"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 text-[12px] w-full max-w-full pb-10">
      {/* Title & Add Supplier Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Suppliers Directory</h1>
          <p className="text-xs text-gray-500 font-normal">Manage all agricultural vendors and supplier ledger balances</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 text-xs font-semibold btn-agri-primary rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* 6 Dynamic Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-gray-500 font-medium block">Total Suppliers</span>
          <span className="text-base font-bold text-gray-900 font-mono block">{summaryStats.totalSuppliers}</span>
        </div>

        <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-[#047857] font-medium block">Active Suppliers</span>
          <span className="text-base font-bold text-[#047857] font-mono block">{summaryStats.activeSuppliers}</span>
        </div>

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-gray-500 font-medium block">Inactive Suppliers</span>
          <span className="text-base font-bold text-gray-700 font-mono block">{summaryStats.inactiveSuppliers}</span>
        </div>

        <div className="p-3 bg-amber-50/40 border border-amber-100/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-amber-800 font-medium block">Total Purchases</span>
          <span className="text-base font-bold text-amber-900 font-mono block">
            ₹ {Math.round(summaryStats.totalPurchasesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-sky-800 font-medium block">Total Payments</span>
          <span className="text-base font-bold text-sky-900 font-mono block">
            ₹ {Math.round(summaryStats.totalPaymentsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="p-3 bg-red-50/40 border border-red-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] text-red-600 font-medium block">Total Outstanding</span>
          <span className="text-base font-bold text-red-600 font-mono block">
            ₹ {Math.round(summaryStats.totalOutstandingDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supplier name, mobile, gstin..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50/60 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-[#00783C]"
            />
          </div>

          {/* Category / Status Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'all', label: 'All Suppliers' },
              { id: 'active', label: 'Active' },
              { id: 'outstanding', label: 'Has Due' },
              { id: 'nodue', label: 'No Due' },
              { id: 'inactive', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#047857] shadow-2xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={suppliers}
          isLoading={isLoading}
          emptyMessage="No suppliers found matching criteria"
          onRowClick={(row) => navigate(`/suppliers/${row._id}/ledger`)}
          pagination={{
            page,
            totalPages: Math.ceil(totalRecords / 10),
            total: totalRecords,
          }}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Form Drawer */}
      <FormDrawer
        isOpen={isDrawerOpen}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        description={editingSupplier ? 'Update supplier details' : 'Register a new supplier in Master Data'}
        onClose={() => setIsDrawerOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-3 text-[12px]">
          {apiError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-1.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium text-gray-700 block">Supplier Name *</label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Sri Lakshmi Traders, Coromandel Ltd."
              className="w-full h-8 px-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C] font-medium"
            />
            {errors.name && <p className="text-[10px] text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-medium text-gray-700 block">Contact Person</label>
              <input
                type="text"
                {...register('contactPerson')}
                placeholder="Full name"
                className="w-full h-8 px-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700 block">Mobile Number *</label>
              <input
                type="tel"
                {...register('mobile')}
                placeholder="10-digit mobile"
                className="w-full h-8 px-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
              />
              {errors.mobile && <p className="text-[10px] text-red-500">{errors.mobile.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-gray-700 block">GSTIN Number</label>
            <input
              type="text"
              {...register('gstin')}
              placeholder="15-digit GSTIN"
              className="w-full h-8 px-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 uppercase font-mono focus:outline-none focus:border-[#00783C]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-gray-700 block">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Market Yard / Office Address"
              className="w-full p-2 bg-gray-50/50 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="h-8 px-3 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-8 px-4 font-semibold btn-agri-primary rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Delete Safety Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100 font-sans">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Delete Supplier?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to delete <strong className="text-gray-900">{confirmDialog.supplier?.name}</strong>? This action will remove it from active screens while preserving all historical ledgers, purchases, and payments.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-gray-700 block">
                To confirm deletion, type <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full h-9 px-3 text-xs font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isDeleteConfirmed && !deactivateMutation.isPending) {
                    handleConfirmStatusChange();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({ isOpen: false, supplier: null, type: 'archive' });
                  setDeleteConfirmInput('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={!isDeleteConfirmed || deactivateMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deactivateMutation.isPending ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
