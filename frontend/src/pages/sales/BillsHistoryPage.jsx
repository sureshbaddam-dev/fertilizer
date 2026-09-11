import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { useSettings } from '../../contexts/SettingsContext';
import { toast } from '../../contexts/ToastContext';
import { exportInvoiceHistoryToExcel } from '../../utils/excelExporter';
import Button from '../../components/ui/Button';

export default function BillsHistoryPage() {
  const navigate = useNavigate();

  // Top Status Filter Tab ('all', 'paid', 'partial', 'due', 'cancelled')
  const [activeTab, setActiveTab] = useState('all');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Drawer Open State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Left Filter Panel State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dueStatusFilter, setDueStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');

  // Applied Left Panel Filters (sent to API)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    paymentStatus: 'all',
    dueStatus: 'all',
    paymentMode: 'all',
  });

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v !== '' && v !== 'all').length;

  // Pagination State (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch Invoices & Stats from MongoDB API
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['invoices', activeTab, searchQuery, appliedFilters, page, limit],
    queryFn: () =>
      invoiceService.getInvoices({
        status: activeTab,
        search: searchQuery,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        customer: appliedFilters.customer,
        paymentStatus: appliedFilters.paymentStatus,
        dueStatus: appliedFilters.dueStatus,
        paymentMode: appliedFilters.paymentMode,
        page,
        limit,
      }),
  });

  const invoices = apiResponse?.data?.invoices || [];
  const totalRecords = apiResponse?.data?.total || 0;
  const totalPages = apiResponse?.data?.totalPages || 1;
  const backendSummary = apiResponse?.data?.summary || apiResponse?.data?.metrics || apiResponse?.summary || apiResponse?.metrics;
  const summary = backendSummary && backendSummary.totalBills !== undefined
    ? {
        totalBills: Number(backendSummary.totalBills || 0),
        totalAmount: Number(backendSummary.totalAmount || 0),
        totalPaid: Number(backendSummary.totalPaid || 0),
        totalDue: Number(backendSummary.totalDue || 0),
        duePercentage: backendSummary.totalAmount > 0
          ? Number(((Number(backendSummary.totalDue || 0) / Number(backendSummary.totalAmount)) * 100).toFixed(2))
          : 0,
      }
    : {
        totalBills: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || inv.grandTotal || 0), 0),
        totalPaid: invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || inv.amountPaid || 0), 0),
        totalDue: invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || inv.balanceDue || 0), 0),
        duePercentage: (() => {
          const tot = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || inv.grandTotal || 0), 0);
          const due = invoices.reduce((sum, inv) => sum + Number(inv.dueAmount || inv.balanceDue || 0), 0);
          return tot > 0 ? Number(((due / tot) * 100).toFixed(2)) : 0;
        })(),
      };
  const counters = apiResponse?.data?.counters || {
    all: 0,
    paid: 0,
    partial: 0,
    due: 0,
    cancelled: 0,
  };

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    setAppliedFilters({
      dateFrom,
      dateTo,
      customer: customerFilter,
      paymentStatus: paymentStatusFilter,
      dueStatus: dueStatusFilter,
      paymentMode: paymentModeFilter,
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCustomerFilter('');
    setPaymentStatusFilter('all');
    setDueStatusFilter('all');
    setPaymentModeFilter('all');
    setAppliedFilters({
      dateFrom: '',
      dateTo: '',
      customer: '',
      paymentStatus: 'all',
      dueStatus: 'all',
      paymentMode: 'all',
    });
    setSearchQuery('');
    setActiveTab('all');
    setPage(1);
  };

  // Consume Shop Profile Settings from Shared Context
  const { settings: shopSettings } = useSettings();

  const handleExportStatement = async () => {
    try {
      await exportInvoiceHistoryToExcel(invoices, shopSettings);
    } catch (err) {
      console.error('Failed to export invoice history to Excel:', err);
    }
  };

  const queryClient = useQueryClient();
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  // Delete Invoice Mutation (for General Customer invoices)
  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['products-inventory']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['reports-bi']);
      setDeletingInvoice(null);
      setDeleteConfirmText('');
      toast.success('Bill deleted successfully');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete invoice';
      toast.error(msg);
      setDeleteErrorMsg(msg);
    },
  });

  const handleOpenDeleteModal = (inv) => {
    setDeletingInvoice(inv);
    setDeleteConfirmText('');
    setDeleteErrorMsg('');
  };

  const handleCloseDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeletingInvoice(null);
    setDeleteConfirmText('');
    setDeleteErrorMsg('');
  };

  const handleConfirmDelete = () => {
    if (!deletingInvoice || deleteConfirmText !== 'DELETE' || deleteMutation.isPending) return;
    setDeleteErrorMsg('');
    deleteMutation.mutate(deletingInvoice._id || deletingInvoice.invoiceNumber);
  };

  // Helper to reliably check if invoice belongs to a registered customer (using customerId and customerType)
  const isRegisteredCustomer = (inv) => {
    if (!inv) return false;
    const type = String(inv.customerType || '').toUpperCase();
    if (type === 'GENERAL' || type === 'WALK_IN' || type === 'WALKIN') {
      return false;
    }
    const rawId = inv.customerId?._id || inv.customerId || inv.customer?._id || inv.customer;
    return Boolean(rawId);
  };

  return (
    <div className="app-page-stack w-full pb-6 space-y-5">
      {/* 1. Compact Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-sm sm:text-base font-bold text-emerald-700 tracking-wide block">Bills</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">Invoice History</h1>
        </div>
        <div className="shrink-0">
          <Button variant="outline" icon={Download} onClick={handleExportStatement}>
            Export Statement
          </Button>
        </div>
      </div>

      {/* 2. Top Status Tabs Bar with Dynamic Counters & Search */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-2 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All', count: counters.all },
            { id: 'paid', label: 'Paid', count: counters.paid },
            { id: 'partial', label: 'Partial', count: counters.partial },
            { id: 'due', label: 'Due', count: counters.due },
            { id: 'cancelled', label: 'Cancelled', count: counters.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  activeTab === tab.id ? 'bg-[#047857] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dynamic Search Bar & Filters Action Button */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice number, customer name, mobile..."
              className="w-full h-10 pl-10 pr-4 bg-gray-50/70 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C] leading-normal"
            />
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
              activeFilterCount > 0
                ? 'bg-emerald-50 text-[#047857] border-[#A7F3D0] shadow-2xs'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-[#047857]" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#047857] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Table Area (Expands to 100% Full Page Width) */}
      <div className="w-full">
        {/* DESKTOP INVOICES TABLE CONTAINER (hidden md:block) */}
        <div className="hidden md:block flex-1 min-w-0 w-full">
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-2.5 text-left whitespace-nowrap w-28">Invoice Number</th>
                    <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Date &amp; Time</th>
                    <th className="py-2.5 px-2.5 text-left">Customer</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-24">Mobile</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Total Amount (₹)</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Paid (₹)</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Due (₹)</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-20">Status</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-24">Payment Mode</th>
                    <th className="py-2.5 px-2.5 text-center whitespace-nowrap w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800 font-normal">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        <div className="w-5 h-5 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                        <span>Loading sales bills from database...</span>
                      </td>
                    </tr>
                  ) : invoices.length > 0 ? (
                    invoices.map((inv) => {
                      const dateStr = inv.date
                        ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      const timeStr = inv.date
                        ? new Date(inv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '';

                      const totalAmt = Number(inv.totalAmount || 0);
                      const paidAmt = Number(inv.paidAmount || 0);
                      const dueAmt = Number(inv.dueAmount || 0);

                      const isPaid = inv.status === 'Paid';
                      const isPartial = inv.status === 'Partial';
                      const isCancelled = inv.status === 'Cancelled';
                      const isRegistered = isRegisteredCustomer(inv);

                      return (
                        <tr
                          key={inv._id || inv.invoiceNumber}
                          onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-[#047857] text-[11px] whitespace-nowrap">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-gray-900 block">{dateStr}</span>
                            <span className="text-[10px] text-gray-400 font-mono block">{timeStr}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900 truncate max-w-[160px]" title={inv.customerName}>
                            {inv.customerId ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/customers/${inv.customerId}/ledger`);
                                }}
                                className="text-emerald-800 hover:text-emerald-950 hover:underline font-bold text-left cursor-pointer truncate max-w-full"
                                title={`Open Customer Ledger for ${inv.customerName}`}
                              >
                                {inv.customerName}
                              </button>
                            ) : (
                              <span>{inv.customerName}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-gray-600 text-xs whitespace-nowrap">
                            {inv.customerMobile || '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 text-xs whitespace-nowrap">
                            ₹ {Math.round(totalAmt).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#047857] text-xs whitespace-nowrap">
                            ₹ {Math.round(paidAmt).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-red-600 text-xs whitespace-nowrap">
                            {dueAmt > 0 ? `₹ ${Math.round(dueAmt).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₹ 0'}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                                  : isPartial
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : isCancelled
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {inv.status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-gray-700">
                            {inv.paymentMode || 'Cash'}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {!isRegistered && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}/edit`)}
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Invoice"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteModal(inv)}
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400 italic">
                        No sales bills found matching the selected filter criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MOBILE INVOICE CARDS CONTAINER (block md:hidden) */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-2xs">
              <div className="w-5 h-5 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold">Loading sales bills...</span>
            </div>
          ) : invoices.length > 0 ? (
            invoices.map((inv) => {
              const dateStr = inv.date
                ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              const timeStr = inv.date
                ? new Date(inv.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '';

              const totalAmt = Number(inv.totalAmount || 0);
              const paidAmt = Number(inv.paidAmount || 0);
              const dueAmt = Number(inv.dueAmount || 0);

              const isPaid = inv.status === 'Paid';
              const isPartial = inv.status === 'Partial';
              const isCancelled = inv.status === 'Cancelled';
              const isRegistered = isRegisteredCustomer(inv);

              return (
                <div
                  key={inv._id || inv.invoiceNumber}
                  onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                  className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 font-sans transition-all hover:border-emerald-300 cursor-pointer"
                >
                  {/* Card Top: Invoice Number & Status Badge */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Invoice #</span>
                      <span className="font-mono font-extrabold text-[#047857] text-sm">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                        isPaid
                          ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                          : isPartial
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isCancelled
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{inv.status || 'Paid'}</span>
                    </span>
                  </div>

                  {/* Card Body: Customer & Date Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block">Customer</span>
                      {inv.customerId ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${inv.customerId}/ledger`);
                          }}
                          className="font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline block truncate text-left cursor-pointer max-w-full"
                          title={`Open Customer Ledger for ${inv.customerName}`}
                        >
                          {inv.customerName}
                        </button>
                      ) : (
                        <span className="font-extrabold text-gray-900 block truncate" title={inv.customerName}>
                          {inv.customerName}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block">Mobile</span>
                      <span className="font-mono font-bold text-gray-700 block">
                        {inv.customerMobile || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block">Date &amp; Time</span>
                      <span className="font-bold text-gray-800 block">{dateStr}</span>
                      <span className="text-[10px] text-gray-400 font-mono block">{timeStr}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium block">Payment Mode</span>
                      <span className="font-mono font-bold text-gray-800 block">
                        {inv.paymentMode || 'Cash'}
                      </span>
                    </div>
                  </div>

                  {/* Amount Breakdown Row */}
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase">Amount</span>
                      <span className="text-xs font-black text-gray-900 block">
                        ₹ {totalAmt.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Paid</span>
                      <span className="text-xs font-black text-[#047857] block">
                        ₹ {paidAmt.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-red-500 font-semibold block uppercase">Due</span>
                      <span className={`text-xs font-black block ${dueAmt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        ₹ {dueAmt.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}`)}
                      className="flex-1 py-2 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.99]"
                      title="View Invoice Details"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Invoice</span>
                    </button>

                    {!isRegistered && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/${inv._id || inv.invoiceNumber}/edit`)}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                          title="Edit Invoice"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(inv)}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
              No sales bills found matching the selected filter criteria
            </div>
          )}
        </div>
      </div>

      {/* 4. PAGINATION (BELOW Table & ABOVE Bottom Summary Cards) */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Showing {invoices.length} of {totalRecords} records</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono font-medium px-2">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. BOTTOM SUMMARY CARDS (BELOW Pagination Bar) */}
      <div className="pt-1.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-3 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[11px] text-gray-500 font-medium block">Total Bills</span>
            <span className="text-base font-bold text-gray-900 font-mono block">{summary.totalBills}</span>
          </div>

          <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[11px] text-amber-800 font-medium block">Total Amount</span>
            <span className="text-base font-bold text-amber-900 font-mono block whitespace-nowrap">
              ₹ {Math.round(summary.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[11px] text-[#047857] font-medium block">Total Paid</span>
            <span className="text-base font-bold text-[#047857] font-mono block whitespace-nowrap">
              ₹ {Math.round(summary.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="p-3 bg-red-50/40 border border-red-100 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[11px] text-red-600 font-medium block">Total Due</span>
            <span className="text-base font-bold text-red-600 font-mono block whitespace-nowrap">
              ₹ {Math.round(summary.totalDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[11px] text-sky-800 font-medium block">Due %</span>
            <span className="text-base font-bold text-sky-900 font-mono block">{summary.duePercentage}%</span>
          </div>
        </div>
      </div>

      {/* 6. SLIDE-OVER FILTER DRAWER MODAL */}
      {isFilterDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsFilterDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-4 space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
                  <Filter className="w-4 h-4 text-[#047857]" />
                  <span>Filter Bills</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Exact Existing Filter Form */}
              <form
                onSubmit={(e) => {
                  handleApplyFilters(e);
                  setIsFilterDrawerOpen(false);
                }}
                className="space-y-3.5"
              >
                {/* Date Range */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">From</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">To</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Customer</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Customer name..."
                      className="w-full h-8 pl-8 pr-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                    />
                  </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Payment Status</label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="due">Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Due Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Due Status</label>
                  <select
                    value={dueStatusFilter}
                    onChange={(e) => setDueStatusFilter(e.target.value)}
                    className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                  >
                    <option value="all">All Due Statuses</option>
                    <option value="nodue">No Due</option>
                    <option value="duein30">Due In 30 Days</option>
                    <option value="overdue">Overdue (&gt; 30 Days)</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">Payment Mode</label>
                  <select
                    value={paymentModeFilter}
                    onChange={(e) => setPaymentModeFilter(e.target.value)}
                    className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#00783C]"
                  >
                    <option value="all">All Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 btn-agri-primary rounded-xl font-bold text-xs shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Apply Filters</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleResetFilters();
                      setIsFilterDrawerOpen(false);
                    }}
                    className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-medium text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal for General Customer Invoices */}
      {deletingInvoice && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-5 sm:p-6 space-y-4 text-left z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Trash Icon + Title + Warning */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-black text-gray-900 leading-tight">Delete Invoice?</h3>
                <p className="text-xs text-gray-600 font-medium">
                  ⚠️ Are you sure you want to delete invoice #{deletingInvoice.invoiceNumber}? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Confirmation Instruction & Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-gray-800 block">
                To confirm deletion, type <span className="font-mono text-red-600 font-black">DELETE</span> below.
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  if (deleteErrorMsg) setDeleteErrorMsg('');
                }}
                placeholder="Type DELETE"
                disabled={deleteMutation.isPending}
                className="w-full h-9 px-3 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-60"
                autoFocus
              />

              {deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE' && (
                <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Please type DELETE to confirm.</span>
                </p>
              )}
            </div>

            {deleteErrorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-medium flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
