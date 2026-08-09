import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  Building,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { purchaseService } from '../../services/purchaseService';

export default function ArchivedPurchasesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  // Fetch Soft-Deleted Purchase Invoices
  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ['deleted-purchases', searchQuery],
    queryFn: () => purchaseService.getDeletedPurchases({ search: searchQuery }),
  });

  const purchases = apiData?.data?.purchases || [];

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id) => purchaseService.restorePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setRestoringId(null);
    },
    onError: (err) => {
      console.error('Failed to restore purchase:', err);
      alert(err.response?.data?.message || 'Failed to restore purchase invoice');
      setRestoringId(null);
    },
  });

  const handleRestore = (id) => {
    if (window.confirm('Are you sure you want to restore this soft-deleted purchase invoice? Related supplier ledgers and inventory stock will be restored.')) {
      setRestoringId(id);
      restoreMutation.mutate(id);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-5 font-sans text-xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-gray-900">Archived Purchase Invoices</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Admin Panel Only
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Manage soft-deleted purchase transactions. Records are recoverable for 90 days before automatic purge.
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice no or supplier..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Loading archived purchases...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
          <p className="font-bold text-gray-700 text-xs">No Deleted Purchases Found</p>
          <p className="text-[11px] text-gray-400">All purchase invoices are active and non-archived.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">Supplier</th>
                <th className="py-3 px-3.5">Invoice Number</th>
                <th className="py-3 px-3.5">Purchase Date</th>
                <th className="py-3 px-3.5 text-right">Purchase Amount</th>
                <th className="py-3 px-3.5">Deleted At</th>
                <th className="py-3 px-3.5">Deleted By</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {purchases.map((p) => {
                const supplierName = p.supplierId?.name || p.supplierId?.companyName || 'Supplier';
                const invNo = p.supplierInvoiceNumber || p.purchaseNumber || '—';
                const pDate = p.purchaseDate
                  ? new Date(p.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                const delDate = p.deletedAt
                  ? new Date(p.deletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';

                return (
                  <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-gray-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{supplierName}</span>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-emerald-800">{invNo}</td>
                    <td className="py-3 px-3.5 text-gray-600">{pDate}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-gray-900">
                      ₹ {(p.totalInvoiceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3.5 text-gray-500 font-mono text-[11px]">{delDate}</td>
                    <td className="py-3 px-3.5 text-gray-700 font-medium">{p.deletedBy || 'Admin'}</td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        disabled={restoringId === p._id}
                        onClick={() => handleRestore(p._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Restore Purchase Invoice"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{restoringId === p._id ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
