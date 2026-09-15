import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Wallet,
  Phone,
  Mail,
  MapPin,
  Edit,
  Filter,
  Download,
  Calendar,
  Search,
  Plus,
  FileText,
  DollarSign,
  ArrowLeft,
  X,
  Check,
  Eye,
  ArrowUpDown,
  Printer,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import vedixaLogoImg from '../../assets/vedixa_logo.png';
import { supplierService } from '../../services/supplierService';
import { purchaseService } from '../../services/purchaseService';
import PurchaseInvoiceModal from '../../components/purchases/PurchaseInvoiceModal';
import PaymentDetailsModal from '../../components/purchases/PaymentDetailsModal';
import QuickAddSupplierDrawer from '../../components/purchases/QuickAddSupplierDrawer';
import TransactionDetailsModal from '../../components/purchases/TransactionDetailsModal';
import { toast } from '../../contexts/ToastContext';

export default function SupplierLedgerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { supplierId } = useParams();
  const { settings: shopSettingsContext } = useSettings();
  const shopSettings = shopSettingsContext || {};

  const [activeTab, setActiveTab] = useState('All Transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Latest First, 'asc' = Oldest First
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedTransactionDrawer, setSelectedTransactionDrawer] = useState(null);

  // Make Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState('');

  // Receive Refund Modal state
  const [refundModalReturn, setRefundModalReturn] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundPaymentMode, setRefundPaymentMode] = useState('Cash');
  const [refundRefNumber, setRefundRefNumber] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundDate, setRefundDate] = useState(new Date().toISOString().slice(0, 10));

  // Edit Return Modal state
  const [editModalReturn, setEditModalReturn] = useState(null);
  const [editReturnQty, setEditReturnQty] = useState('');
  const [editReturnPrice, setEditReturnPrice] = useState('');
  const [editReturnReason, setEditReturnReason] = useState('Defective batch packaging');
  const [editReturnNotes, setEditReturnNotes] = useState('');

  // Edit Supplier Drawer state
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);

  // Fetch Supplier Ledger Data directly using supplierId from URL
  const { data: ledgerApiData, isLoading, error } = useQuery({
    queryKey: ['supplier-ledger', supplierId, activeTab],
    queryFn: () =>
      supplierService.getSupplierLedger(supplierId, {
        transactionType: activeTab === 'Purchases' ? 'PURCHASE' : activeTab === 'Payments' ? 'PAYMENT' : activeTab === 'Returns' ? 'RETURNS' : 'ALL',
      }),
    enabled: Boolean(supplierId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const supplier = ledgerApiData?.data?.supplier || {};
  const ledgerEntries = ledgerApiData?.data?.ledgerEntries || [];
  const summary = ledgerApiData?.data?.summary || {
    grossPurchases: 0,
    totalPurchases: 0,
    purchaseReturns: 0,
    netPurchases: 0,
    totalPayments: 0,
    totalRefunds: 0,
    closingBalance: 0,
    overdueAmount: 0,
    dueIn30Days: 0,
    totalItemsPurchased: 0,
    avgPurchaseValue: 0,
  };
  const paymentsList = ledgerApiData?.data?.paymentsList || [];

  // Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: (data) => supplierService.recordPayment(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedPurchaseForPayment('');
      toast.success('Payment recorded successfully');
    },
    onError: (err) => {
      toast.error('Failed to record payment', { description: err?.response?.data?.message || err?.message });
    },
  });

  // Refund Mutation
  const refundMutation = useMutation({
    mutationFn: ({ returnId, data }) => purchaseService.recordSupplierRefund(returnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setRefundModalReturn(null);
      setRefundAmount('');
      setRefundRefNumber('');
      setRefundNotes('');
      toast.success('Supplier refund recorded successfully');
    },
    onError: (err) => {
      toast.error('Failed to record refund', { description: err?.response?.data?.message || err?.message });
    },
  });

  // Edit Return Mutation
  const editReturnMutation = useMutation({
    mutationFn: ({ returnId, data }) => purchaseService.updateSupplierReturn(returnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setEditModalReturn(null);
      toast.success('Supplier return updated successfully');
    },
    onError: (err) => {
      toast.error('Failed to update return', { description: err?.response?.data?.message || err?.message });
    },
  });

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    paymentMutation.mutate({
      amount: Number(paymentAmount),
      paymentMode,
      notes: paymentNotes,
      date: paymentDate,
      purchaseId: selectedPurchaseForPayment || undefined,
    });
  };

  const handleRefundSubmit = (e) => {
    e.preventDefault();
    if (!refundModalReturn) return;
    const rId = refundModalReturn.returnId?._id || refundModalReturn.returnId || refundModalReturn.referenceId || refundModalReturn._id;
    if (!refundAmount || Number(refundAmount) <= 0) return;
    refundMutation.mutate({
      returnId: rId,
      data: {
        amount: Number(refundAmount),
        paymentMode: refundPaymentMode,
        referenceNumber: refundRefNumber,
        notes: refundNotes,
        date: refundDate,
      },
    });
  };

  const handleEditReturnSubmit = (e) => {
    e.preventDefault();
    if (!editModalReturn) return;
    const rId = editModalReturn.returnId?._id || editModalReturn.returnId || editModalReturn.referenceId || editModalReturn._id;
    editReturnMutation.mutate({
      returnId: rId,
      data: {
        quantity: Number(editReturnQty),
        purchasePrice: Number(editReturnPrice),
        reason: editReturnReason,
        notes: editReturnNotes,
      },
    });
  };

  const openRefundModal = (row, e) => {
    if (e) e.stopPropagation();
    const retAmt = Number(row.returnAmount || row.returnValue || 0);
    const refAmt = Number(row.refundAmount || row.refundedAmount || 0);
    const unrefunded = Math.max(0, retAmt - refAmt);
    setRefundModalReturn(row);
    setRefundAmount(unrefunded > 0 ? unrefunded.toString() : '');
    setRefundPaymentMode(row.paymentMode || 'Cash');
    setRefundRefNumber('');
    setRefundNotes(`Refund for Return ${row.referenceNumber || ''}`);
    setRefundDate(new Date().toISOString().slice(0, 10));
  };

  const openEditReturnModal = (row, e) => {
    if (e) e.stopPropagation();
    const rObj = row.returnId || row;
    setEditModalReturn(row);
    setEditReturnQty(rObj.quantity !== undefined ? rObj.quantity.toString() : '1');
    setEditReturnPrice(rObj.purchasePrice !== undefined ? rObj.purchasePrice.toString() : (row.returnAmount || '0').toString());
    setEditReturnReason(rObj.reason || 'Defective batch packaging');
    setEditReturnNotes(rObj.notes || row.notes || '');
  };

  // Filter Transactions by Search
  const filteredEntries = ledgerEntries.filter((item) => {
    if (!searchQuery.trim()) return true;
    const ref = (item.referenceNumber || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return ref.includes(q) || notes.includes(q);
  });

  const displayEntries = sortOrder === 'desc' ? [...filteredEntries].reverse() : filteredEntries;

  const isAdvance = summary.closingBalance < 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium space-y-2">
        <div className="w-8 h-8 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading supplier ledger records...</p>
      </div>
    );
  }

  if (error || (!isLoading && !supplier._id)) {
    return (
      <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
        <p className="text-sm text-red-600 font-semibold">Supplier record not found or error loading ledger.</p>
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Suppliers Directory</span>
        </Link>
      </div>
    );
  }

  const formatSupplierAddress = (supp) => {
    if (!supp) return 'N/A';
    const parts = [supp.address, supp.city, supp.state, supp.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <>
      <div className="supplier-ledger-screen-ui print:hidden space-y-4 w-full max-w-full pb-10">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2.5">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          title="Back to Suppliers List"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Suppliers</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/purchases/new')}
            className="px-3 py-1.5 btn-agri-primary rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Supplier Profile Card Header */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-bold text-base shrink-0 shadow-2xs">
            {supplier.name?.slice(0, 2)?.toUpperCase() || 'SU'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 leading-none">{supplier.name || 'Supplier Name'}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${supplier.isActive !== false ? 'bg-emerald-50 text-[#047857] border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                {supplier.isActive !== false ? 'Active Supplier' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {supplier.mobile && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{supplier.mobile}</span>
                </span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{supplier.email}</span>
                </span>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{supplier.address}</span>
                </span>
              )}
              {supplier.gstin && (
                <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono font-bold text-gray-800">GST: {supplier.gstin}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditSupplierOpen(true)}
          className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
        >
          <Edit className="w-3.5 h-3.5 text-gray-500" />
          <span>Edit Supplier</span>
        </button>
      </div>

      {/* 5 Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Card 1: Gross Purchases */}
        <div className="bg-amber-50/40 border border-amber-100/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-amber-800 block">Gross Purchases</span>
          <span className="text-lg font-bold text-amber-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.grossPurchases ?? summary.totalPurchases ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Total Invoiced</span>
        </div>

        {/* Card 2: Purchase Returns */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-rose-800 block">Purchase Returns</span>
          <span className="text-lg font-bold text-rose-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.purchaseReturns || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Returns Value</span>
        </div>

        {/* Card 3: Net Purchases */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-[#047857] block">Net Purchases</span>
          <span className="text-lg font-bold text-[#047857] font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.netPurchases ?? ((summary.grossPurchases ?? summary.totalPurchases ?? 0) - (summary.purchaseReturns || 0))).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Gross - Returns</span>
        </div>

        {/* Card 4: Total Payments */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-sky-800 block">Total Payments</span>
          <span className="text-lg font-bold text-sky-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.totalPayments || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Paid to Supplier</span>
        </div>

        {/* Card 5: Current Outstanding */}
        <div className={`border rounded-2xl p-3.5 space-y-1 ${isAdvance ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/40 border-red-100'}`}>
          <span className="text-xs font-medium text-gray-500 block">
            {isAdvance ? 'Current Balance (Advance)' : 'Current Balance (Due)'}
          </span>
          <span className={`text-lg font-bold font-mono block whitespace-nowrap ${isAdvance ? 'text-[#047857]' : 'text-red-600'}`}>
            {isAdvance
              ? `-₹ ${Math.round(Math.abs(summary.closingBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : `₹ ${Math.round(summary.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Current Ledger Balance</span>
        </div>
      </div>

      {/* Main Container: Left Transactions Table & Right Outstanding Panel */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        
        {/* Left Column: Transactions Table Card */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          
          {/* Controls Bar: Search & Export & Sort */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice no, reference..."
                className="w-full h-8 pl-8 pr-3 bg-gray-50/70 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={sortOrder === 'desc' ? 'Showing Latest First (click for Oldest First)' : 'Showing Oldest First (click for Latest First)'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span>{sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Print Supplier Statement"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export Statement as PDF"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export Statement</span>
              </button>
            </div>
          </div>

          {/* Tabs: All Transactions, Purchases, Payments, Adjustments */}
          <div className="flex items-center gap-6 border-b border-gray-200 font-medium text-xs">
            {['All Transactions', 'Purchases', 'Payments', 'Returns', 'Adjustments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'border-[#00783C] text-[#00783C] font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-700 tracking-wide">
                  <tr>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Date</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Type</th>
                    <th className="py-3 px-3.5 text-left align-middle">Details</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Amount (₹)</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Payment / Credit (₹)</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Balance (₹)</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 font-normal text-xs">
                  {displayEntries.length > 0 ? (
                    displayEntries.map((row, idx) => {
                      const rawDate = row.date || row.createdAt;
                      const dateObj = rawDate ? new Date(rawDate) : null;
                      const dateStr = dateObj && !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';
                      const isMidnightUtc = dateObj && !isNaN(dateObj.getTime()) && dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0;
                      const timeStr = dateObj && !isNaN(dateObj.getTime())
                        ? (isMidnightUtc && row.createdAt
                            ? new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
                        : '';

                      const isPurchase = row.transactionType === 'PURCHASE';
                      const isPayment = row.transactionType === 'PAYMENT';
                      const isReturn = row.transactionType === 'RETURN';
                      const isRefund = row.transactionType === 'REFUND';
                      const isOpening = row.transactionType === 'ADJUSTMENT' || row.notes?.includes('Opening');

                      const purchaseAmt = isPurchase ? (row.purchaseAmount || row.purchaseId?.totalInvoiceAmount || 0) : 0;
                      const advanceUsed = isPurchase ? Number(row.advanceUsed || row.purchaseId?.advanceUsed || 0) : 0;
                      const returnAmt = isReturn ? (row.returnAmount || row.returnValue || 0) : 0;
                      const refundAmt = isRefund ? (row.refundAmount || 0) : 0;
                      const paymentAmt = isPayment ? (row.paidAmount || 0) : Number(row.purchaseId?.paidAmount || 0);
                      const dueAmt = isPurchase
                        ? Number(row.purchaseId?.dueAmount ?? Math.max(0, purchaseAmt - advanceUsed - paymentAmt - Number(row.purchaseId?.returnAmount || 0)))
                        : 0;
                      const runningBal = row.runningBalance || 0;

                      const count = row.itemCount || (isPurchase ? (row.purchaseId?.items?.length || 1) : (row.returnId?.quantity || 1));
                      const itemsLabel = `${count} ${count === 1 ? 'Item' : 'Items'}`;

                      return (
                        <tr
                          key={row._id || idx}
                          onClick={() => setSelectedTransactionDrawer(row)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                          title="Click row to view complete transaction details"
                        >
                          {/* Date & Time */}
                          <td className="py-3 px-3.5 text-center align-middle whitespace-nowrap">
                            <span className="font-semibold text-gray-900 block text-xs">{dateStr}</span>
                            {timeStr && (
                              <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{timeStr}</span>
                            )}
                          </td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-3.5 text-center align-middle whitespace-nowrap">
                            {isPurchase && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F3E8FF] text-[#7E22CE]">
                                Purchase
                              </span>
                            )}
                            {isReturn && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]">
                                Return
                              </span>
                            )}
                            {isRefund && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                                Refund
                              </span>
                            )}
                            {isPayment && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                                Payment
                              </span>
                            )}
                            {isOpening && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                                Adjustment
                              </span>
                            )}
                          </td>

                          {/* Clean Details Column: e.g. "2 Items", "4 Items" */}
                          <td className="py-3.5 px-3.5 text-left align-middle font-medium text-gray-900">
                            {isPurchase ? (
                              <span>{itemsLabel}</span>
                            ) : isReturn ? (
                              <span>{itemsLabel}</span>
                            ) : isRefund ? (
                              <span>1 Item</span>
                            ) : isPayment ? (
                              <span>Payment</span>
                            ) : (
                              <span>Adjustment</span>
                            )}
                          </td>

                          {/* Amount Column */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold text-gray-900 whitespace-nowrap">
                            {isPurchase && purchaseAmt > 0
                              ? `₹ ${Math.round(purchaseAmt).toLocaleString('en-IN')}`
                              : isReturn && returnAmt > 0
                              ? `₹ ${Math.round(returnAmt).toLocaleString('en-IN')}`
                              : isRefund && refundAmt > 0
                              ? `₹ ${Math.round(refundAmt).toLocaleString('en-IN')}`
                              : '—'}
                          </td>

                          {/* Payment / Credit Column */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold whitespace-nowrap">
                            {isPurchase ? (
                              advanceUsed > 0 && paymentAmt > 0 ? (
                                <span className="text-[#047857]">
                                  ₹ {Math.round(paymentAmt).toLocaleString('en-IN')} + ₹ {Math.round(advanceUsed).toLocaleString('en-IN')} Advance
                                </span>
                              ) : advanceUsed > 0 ? (
                                <span className="text-[#047857]">
                                  ₹ {Math.round(advanceUsed).toLocaleString('en-IN')} Advance
                                </span>
                              ) : paymentAmt > 0 ? (
                                <span className="text-[#047857]">
                                  ₹ {Math.round(paymentAmt).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-normal">—</span>
                              )
                            ) : isReturn ? (
                              Number(row.refundAmount || 0) >= returnAmt && returnAmt > 0 ? (
                                <span className="text-sky-700">
                                  ₹ {Math.round(returnAmt).toLocaleString('en-IN')} Refund
                                </span>
                              ) : Number(row.refundAmount || 0) > 0 ? (
                                <span className="text-purple-700">
                                  ₹ {Math.round(row.refundAmount).toLocaleString('en-IN')} Refund + ₹ {Math.round(returnAmt - Number(row.refundAmount)).toLocaleString('en-IN')} Credit
                                </span>
                              ) : (
                                <span className="text-purple-700">
                                  ₹ {Math.round(returnAmt).toLocaleString('en-IN')} Supplier Credit
                                </span>
                              )
                            ) : isRefund ? (
                              <span className="text-sky-700">
                                -₹ {Math.round(refundAmt).toLocaleString('en-IN')} Received
                              </span>
                            ) : paymentAmt > 0 ? (
                              <span className="text-[#047857]">
                                ₹ {Math.round(paymentAmt).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold text-gray-900 whitespace-nowrap">
                            {runningBal < 0
                              ? `₹ ${Math.abs(Math.round(runningBal)).toLocaleString('en-IN')} Advance`
                              : `₹ ${Math.round(runningBal).toLocaleString('en-IN')}`}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3.5 text-center align-middle whitespace-nowrap">
                            {isReturn ? (
                              (Number(row.refundAmount || 0) >= returnAmt && returnAmt > 0) || row.refundStatus === 'REFUNDED' ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1]">
                                  Refunded
                                </span>
                              ) : row.isCreditUsed || row.creditStatus === 'CREDIT_USED' ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  Credit Used
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFE4E6] text-[#BE123C]">
                                  Credit / Pending
                                </span>
                              )
                            ) : isRefund ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1]">
                                Refunded
                              </span>
                            ) : isPayment ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                                Success
                              </span>
                            ) : dueAmt <= 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                                Paid
                              </span>
                            ) : paymentAmt > 0 || advanceUsed > 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                                Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFE4E6] text-[#BE123C]">
                                Due
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">No ledger transactions found for this supplier</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE PURCHASE / TRANSACTION CARDS */}
            <div className="block md:hidden space-y-3 p-3">
              {displayEntries.length > 0 ? (
                displayEntries.map((row, idx) => {
                  const rawDate = row.date || row.createdAt;
                  const dateObj = rawDate ? new Date(rawDate) : null;
                  const dateStr = dateObj && !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const isMidnightUtc = dateObj && !isNaN(dateObj.getTime()) && dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0;
                  const timeStr = dateObj && !isNaN(dateObj.getTime())
                    ? (isMidnightUtc && row.createdAt
                        ? new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
                    : '';

                  const isPurchase = row.transactionType === 'PURCHASE';
                  const isPayment = row.transactionType === 'PAYMENT';
                  const isReturn = row.transactionType === 'RETURN';
                  const isRefund = row.transactionType === 'REFUND';
                  const isOpening = row.transactionType === 'ADJUSTMENT' || row.notes?.includes('Opening');

                  const purchaseAmt = isPurchase ? (row.purchaseAmount || row.purchaseId?.totalInvoiceAmount || 0) : 0;
                  const returnAmt = isReturn ? (row.returnAmount || row.returnValue || 0) : 0;
                  const refundAmt = isRefund ? (row.refundAmount || 0) : 0;
                  const paymentAmt = isPayment ? (row.paidAmount || 0) : Number(row.purchaseId?.paidAmount || 0);
                  const runningBal = row.runningBalance || 0;
                  const advanceUsed = isPurchase ? Number(row.advanceUsed || row.purchaseId?.advanceUsed || 0) : 0;
                  const unrefundedCredit = isReturn ? Math.max(0, Number(row.returnAmount || row.returnValue || 0) - Number(row.refundAmount || row.refundedAmount || 0)) : 0;

                  const refNo = row.purchaseId?.invoiceNumber || row.referenceNumber || row.voucherNo || `TRX-${idx + 1}`;

                  const getPaymentMethodLabel = (notes = '', mode = '') => {
                    const text = `${notes} ${mode}`.toLowerCase();
                    if (text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('paytm')) return 'UPI Payment';
                    if (text.includes('bank') || text.includes('transfer') || text.includes('neft') || text.includes('rtgs')) return 'Bank Transfer';
                    if (text.includes('cheque') || text.includes('check')) return 'Cheque Payment';
                    if (text.includes('online') || text.includes('card')) return 'Online Payment';
                    if (text.includes('cash')) return 'Cash Payment';
                    return 'Payment';
                  };

                  const detailsText = isPurchase
                    ? `Purchase - ${row.purchaseId?.items?.length || 1} Item(s)${advanceUsed > 0 ? ` (₹${advanceUsed.toLocaleString('en-IN')} Advance Used)` : ''}`
                    : isReturn
                    ? `${row.referenceNumber || 'Supplier Return'}${row.returnId?.productId?.name ? ` (${row.returnId.productId.name})` : ''}`
                    : isRefund
                    ? `${row.referenceNumber || 'Supplier Refund'} (${row.paymentMode || 'Cash'})`
                    : isPayment
                    ? getPaymentMethodLabel(row.notes, row.paymentMode)
                    : row.notes || 'Adjustment';

                  return (
                    <div
                      key={row._id || idx}
                      onClick={() => setSelectedTransactionDrawer(row)}
                      className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all"
                    >
                      {/* Header: Date & Type Badge */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Date &amp; Time</span>
                          <span className="font-extrabold text-gray-900 text-xs block">{dateStr}</span>
                          {timeStr && <span className="text-[10px] text-gray-400 font-mono block">{timeStr}</span>}
                        </div>
                        <div>
                          {isPurchase && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#F3E8FF] text-[#7E22CE]">
                              Purchase
                            </span>
                          )}
                          {isReturn && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]">
                              Return
                            </span>
                          )}
                          {isRefund && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                              Refund
                            </span>
                          )}
                          {isPayment && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#DCFCE7] text-[#15803D]">
                              Payment
                            </span>
                          )}
                          {isOpening && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFEDD5] text-[#C2410C]">
                              Adjustment
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Particulars / Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Ref No</span>
                          <span className="font-mono font-bold text-emerald-800 block truncate">{refNo}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Particulars</span>
                          <span className="font-medium text-gray-900 block break-words">{detailsText}</span>
                        </div>
                      </div>

                      {/* Amounts Breakdown Grid */}
                      <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                        <div>
                          <span className="text-[9px] text-gray-400 font-semibold block uppercase">Amount</span>
                          <span className="text-xs font-black text-gray-900 block">
                            {purchaseAmt > 0
                              ? `₹ ${Math.round(purchaseAmt).toLocaleString('en-IN')}`
                              : returnAmt > 0
                              ? `₹ ${Math.round(returnAmt).toLocaleString('en-IN')}`
                              : refundAmt > 0
                              ? `₹ ${Math.round(refundAmt).toLocaleString('en-IN')}`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[9px] font-semibold block uppercase ${isReturn ? 'text-purple-600' : isRefund ? 'text-sky-600' : 'text-emerald-600'}`}>
                            {isReturn ? 'Credit' : isRefund ? 'Refund' : 'Payment'}
                          </span>
                          <span className={`text-xs font-black block ${isReturn ? 'text-purple-700' : isRefund ? 'text-sky-700' : 'text-[#047857]'}`}>
                            {isReturn ? `₹ ${Math.round(returnAmt).toLocaleString('en-IN')}` : isRefund ? `-₹ ${Math.round(refundAmt).toLocaleString('en-IN')}` : paymentAmt > 0 ? `₹ ${Math.round(paymentAmt).toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-purple-600 font-semibold block uppercase">Balance</span>
                          <span className="text-xs font-black text-gray-900 block">
                            {runningBal < 0 ? `-₹ ${Math.abs(Math.round(runningBal)).toLocaleString('en-IN')}` : `₹ ${Math.round(runningBal).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      {isReturn && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                          {unrefundedCredit > 0 && (
                            <button
                              type="button"
                              onClick={(e) => openRefundModal(row, e)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                            >
                              Receive Refund
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => openEditReturnModal(row, e)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
                  No ledger transactions found for this supplier
                </div>
              )}
            </div>

            <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {filteredEntries.length} transactions</span>
            </div>
          </div>
        </div>

        {/* Right Column: Outstanding Summary & Payment History Panel */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">
          
          {/* Card 1: Outstanding Summary */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Outstanding Summary</h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Current Due</span>
                <span className="font-bold text-red-600 font-mono text-sm whitespace-nowrap">
                  ₹ {summary.closingBalance > 0 ? Math.round(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Overdue (&gt; 30 Days)</span>
                <span className="font-bold text-red-600 font-mono whitespace-nowrap">
                  ₹ {summary.overdueAmount ? Math.round(summary.overdueAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Due in 30 Days</span>
                <span className="font-bold text-amber-600 font-mono whitespace-nowrap">
                  ₹ {summary.dueIn30Days ? Math.round(summary.dueIn30Days).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-2.5 btn-agri-primary rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>Make Payment</span>
            </button>
          </div>

          {/* Card 2: Payment History */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
              <button className="text-[11px] font-medium text-[#047857] hover:underline">View All</button>
            </div>

            <div className="space-y-2 text-xs">
              {paymentsList.length > 0 ? (
                paymentsList.map((p, idx) => {
                  const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                  return (
                    <div key={p._id || idx} className="flex items-center justify-between p-2 bg-gray-50/70 rounded-xl border border-gray-100 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 block text-[11px] truncate">{pDate}</span>
                        <span className="text-[10px] text-gray-500 truncate block">{p.method}</span>
                      </div>
                      <div className="text-right whitespace-nowrap shrink-0">
                        <span className="font-bold text-[#047857] font-mono text-xs whitespace-nowrap">
                          ₹ {Math.round(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium ml-1.5 whitespace-nowrap">Payment</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-gray-400 text-center py-2">No payment history recorded</div>
              )}
            </div>
          </div>

          {/* Card 3: Purchase Summary */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Purchase Summary</h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Total Purchases</span>
                <span className="font-bold text-gray-900 font-mono whitespace-nowrap">
                  ₹ {Math.round(summary.totalPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Items Purchased</span>
                <span className="font-medium text-gray-800">{summary.totalItemsPurchased}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Last Purchase</span>
                <span className="font-medium text-gray-800">
                  {summary.lastPurchaseDate ? new Date(summary.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Average Purchase Value</span>
                <span className="font-bold text-gray-900 font-mono whitespace-nowrap">
                  ₹ {Math.round(summary.avgPurchaseValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Quick Actions Grid */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs space-y-2">
            <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => navigate('/purchases/new')}
                className="p-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer space-y-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#047857]" />
                <span className="font-semibold text-gray-800 block text-[11px]">New Purchase</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="p-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer space-y-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-gray-800 block text-[11px]">Make Payment</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="p-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer space-y-1"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-semibold text-gray-800 block text-[11px]">View Purchases</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-xl text-left transition-colors cursor-pointer space-y-1"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-gray-800 block text-[11px]">Statement</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Centered Purchase Invoice Details Modal */}
      <PurchaseInvoiceModal
        isOpen={Boolean(selectedPurchase)}
        purchase={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
      />

      {/* Centered Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={Boolean(selectedPayment)}
        payment={selectedPayment}
        supplier={supplier}
        onClose={() => setSelectedPayment(null)}
      />

      {/* Centered Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={Boolean(selectedTransactionDrawer)}
        transaction={selectedTransactionDrawer}
        supplier={supplier}
        onClose={() => setSelectedTransactionDrawer(null)}
        onOpenRefund={openRefundModal}
        onOpenEditReturn={openEditReturnModal}
      />

      {/* Make Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Record Supplier Payment</h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Supplier</label>
                <input
                  type="text"
                  readOnly
                  value={supplier.name || 'Supplier'}
                  className="w-full px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Link to Purchase Invoice (Optional)</label>
                <select
                  value={selectedPurchaseForPayment}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedPurchaseForPayment(pId);
                    if (pId) {
                      const found = ledgerEntries.find(it => (it.purchaseId?._id || it.purchaseId) === pId);
                      const dueVal = found?.purchaseId?.dueAmount ?? found?.dueAmount ?? 0;
                      if (dueVal > 0 && !paymentAmount) setPaymentAmount(dueVal.toString());
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                >
                  <option value="">-- General Supplier Payment (Unlinked) --</option>
                  {ledgerEntries.filter(it => it.transactionType === 'PURCHASE' && (it.purchaseId?._id || it.purchaseId)).map(it => {
                    const p = it.purchaseId || {};
                    const pId = p._id || p;
                    const invNo = p.supplierInvoiceNumber || p.purchaseNumber || it.referenceNumber || 'Invoice';
                    const due = p.dueAmount !== undefined ? p.dueAmount : it.dueAmount || 0;
                    const tot = p.totalInvoiceAmount !== undefined ? p.totalInvoiceAmount : it.purchaseAmount || 0;
                    return (
                      <option key={pId} value={pId}>
                        {invNo} (Total: ₹{Number(tot).toLocaleString('en-IN')}, Outstanding: ₹{Number(due).toLocaleString('en-IN')})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  onFocus={(e) => e.target.select()}
                  value={paymentAmount === 0 || paymentAmount === '0' || !paymentAmount ? '' : paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 text-sm focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Notes / Reference</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid via UPI GPay ref #12345"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="px-4 py-2 btn-agri-primary rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{paymentMutation.isPending ? 'Saving...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Supplier Refund Modal */}
      {refundModalReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">Receive Supplier Refund</h3>
                <span className="text-xs text-gray-500 font-medium">
                  {refundModalReturn.referenceNumber || 'Return Record'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalReturn(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Return Total:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    ₹ {Number(refundModalReturn.returnAmount || refundModalReturn.returnValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Already Refunded:</span>
                  <span className="font-bold text-sky-700 font-mono">
                    ₹ {Number(refundModalReturn.refundAmount || refundModalReturn.refundedAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#047857] font-semibold pt-1 border-t border-slate-200">
                  <span>Available Credit to Refund:</span>
                  <span className="font-bold font-mono">
                    ₹ {Math.max(0, Number(refundModalReturn.returnAmount || refundModalReturn.returnValue || 0) - Number(refundModalReturn.refundAmount || refundModalReturn.refundedAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Refund Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  onFocus={(e) => e.target.select()}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 text-sm focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Payment Mode</label>
                  <select
                    value={refundPaymentMode}
                    onChange={(e) => setRefundPaymentMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Refund Date</label>
                  <input
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={refundRefNumber}
                  onChange={(e) => setRefundRefNumber(e.target.value)}
                  placeholder="e.g. Bank UTR / UPI Ref ID"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Notes / Reason</label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Supplier refund received in bank"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRefundModalReturn(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundMutation.isPending}
                  className="px-4 py-2 btn-agri-primary rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Return Modal */}
      {editModalReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Supplier Return</h3>
                <span className="text-xs text-gray-500 font-medium">
                  {editModalReturn.referenceNumber || 'Return Record'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditModalReturn(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditReturnSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Return Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editReturnQty}
                    onChange={(e) => setEditReturnQty(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:border-[#00783C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">Rate / Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editReturnPrice}
                    onChange={(e) => setEditReturnPrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:border-[#00783C]"
                  />
                </div>
              </div>

              <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100 flex justify-between text-xs font-semibold text-[#047857]">
                <span>Calculated Return Value:</span>
                <span className="font-mono font-bold">
                  ₹ {(Number(editReturnQty || 0) * Number(editReturnPrice || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Return Reason</label>
                <select
                  value={editReturnReason}
                  onChange={(e) => setEditReturnReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                >
                  <option value="Defective batch packaging">Defective batch packaging</option>
                  <option value="Expired / Near Expiry stock">Expired / Near Expiry stock</option>
                  <option value="Quality discrepancy / Laboratory check">Quality discrepancy / Laboratory check</option>
                  <option value="Excess stock returned to supplier">Excess stock returned to supplier</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Notes / Remarks</label>
                <input
                  type="text"
                  value={editReturnNotes}
                  onChange={(e) => setEditReturnNotes(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#00783C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalReturn(null)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editReturnMutation.isPending}
                  className="px-4 py-2 btn-agri-primary rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editReturnMutation.isPending ? 'Updating...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add / Edit Supplier Drawer */}
      <QuickAddSupplierDrawer
        isOpen={isEditSupplierOpen}
        onClose={() => setIsEditSupplierOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
          setIsEditSupplierOpen(false);
        }}
      />
      </div>

      {/* HIDDEN DEDICATED PRINT CONTAINER FOR A4 SUPPLIER LEDGER STATEMENT */}
      <div className="printable-ledger-document supplier-ledger-print hidden print:block bg-white text-black p-0 m-0 font-sans">
        {/* 1. SHOP & VEDIXA BRANDING HEADER */}
        <div className="flex items-start justify-between border-b-2 border-[#047857] pb-2.5 mb-3">
          {/* Top-Left: Logged-In Shop Details */}
          <div className="flex items-center gap-3">
            {(shopSettings.logoUrl || shopSettings.shopLogo) && (
              <img
                src={shopSettings.logoUrl || shopSettings.shopLogo}
                alt="Shop Logo"
                className="h-11 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-lg font-black text-[#047857] uppercase tracking-tight">
                {shopSettings.shopName || shopSettings.name || 'Agri Solutions Store'}
              </h1>
              {shopSettings.address && (
                <p className="text-[9.5px] text-gray-700 font-medium leading-tight">
                  {shopSettings.address}
                </p>
              )}
              <p className="text-[9.5px] text-gray-700 font-medium leading-tight">
                Phone: {shopSettings.mobile || shopSettings.phone || 'N/A'}
                {shopSettings.gstNumber || shopSettings.gstin ? ` | GSTIN: ${shopSettings.gstNumber || shopSettings.gstin}` : ''}
                {shopSettings.email ? ` | Email: ${shopSettings.email}` : ''}
              </p>
            </div>
          </div>

          {/* Top-Right: Official VEDIXA Branding System ([VEDIXA LOGO] + VEDIXA text underneath) */}
          <div className="flex flex-col items-center justify-center shrink-0 text-center">
            <img
              src={vedixaLogoImg}
              alt="VEDIXA"
              className="h-9 w-auto object-contain select-none"
            />
            <span className="text-[9px] font-black text-[#047857] tracking-wider uppercase mt-0.5">
              VEDIXA
            </span>
          </div>
        </div>

        {/* 2. DOCUMENT TITLE & SUPPLIER DETAILS + SUMMARY BOX */}
        <div className="grid grid-cols-12 gap-3 mb-3">
          {/* Left (7 cols): Supplier Info */}
          <div className="col-span-7 space-y-1">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
              SUPPLIER LEDGER STATEMENT
            </h2>
            <div className="text-[11px] text-gray-800 space-y-0.5">
              <p className="font-bold text-gray-900">
                Supplier Name : <span className="font-extrabold">{supplier?.name || 'Valued Supplier'}</span>
              </p>
              <p>
                Supplier Phone : <span className="font-mono">{supplier?.mobile || supplier?.phone || 'N/A'}</span>
              </p>
              <p>
                Supplier Address: {formatSupplierAddress(supplier)}
              </p>
              {supplier?.gstNumber || supplier?.gstin ? (
                <p>
                  Supplier GSTIN : <span className="font-mono">{supplier?.gstNumber || supplier?.gstin}</span>
                </p>
              ) : null}
              <p className="text-[10px] text-gray-600">
                Statement Period: Full History | Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>

          {/* Right (5 cols): Summary Box */}
          <div className="col-span-5 bg-slate-50 border border-slate-300 rounded-lg p-2.5 space-y-1 text-[11px]">
            <h3 className="text-[11px] font-bold text-[#047857] uppercase border-b border-slate-200 pb-1 mb-1">
              ACCOUNT SUMMARY
            </h3>
            <div className="space-y-0.5">
              <div className="flex justify-between font-medium">
                <span>Gross Purchases:</span>
                <span className="font-mono font-bold">₹ {Math.round(summary.grossPurchases || summary.totalPurchases || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-medium text-rose-700">
                <span>Purchase Returns:</span>
                <span className="font-mono font-bold">₹ {Math.round(summary.purchaseReturns || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Net Purchases:</span>
                <span className="font-mono font-bold">₹ {Math.round(summary.netPurchases || ((summary.grossPurchases || summary.totalPurchases || 0) - (summary.purchaseReturns || 0))).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-medium text-[#047857]">
                <span>Total Payments:</span>
                <span className="font-mono font-bold">₹ {Math.round(summary.totalPayments || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between font-bold border-t border-slate-300 pt-1 mt-1 text-[11.5px] ${summary.closingBalance < 0 ? 'text-[#047857]' : summary.closingBalance > 0 ? 'text-[#dc2626]' : 'text-gray-900'}`}>
                <span>Current Balance:</span>
                <span className="font-mono font-extrabold">
                  ₹ {Math.round(Math.abs(summary.closingBalance || 0)).toLocaleString('en-IN')} {summary.closingBalance < 0 ? '(Advance)' : summary.closingBalance > 0 ? '(Payable)' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TRANSACTIONS TABLE */}
        <table className="print-supplier-ledger-table w-full border-collapse">
          <thead>
            <tr className="bg-[#047857] text-white text-[10px] uppercase font-bold">
              <th className="py-1.5 px-2 text-center border border-[#047857]">DATE</th>
              <th className="py-1.5 px-2 text-center border border-[#047857]">TYPE</th>
              <th className="py-1.5 px-2 text-left border border-[#047857]">DETAILS</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">AMOUNT (₹)</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">PAYMENT / CREDIT (₹)</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">BALANCE (₹)</th>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-center text-gray-500 italic border border-gray-200">
                  No transactions found for this supplier
                </td>
              </tr>
            ) : (
              filteredEntries.map((row, index) => {
                const rawDate = row.date || row.createdAt;
                const dateObj = rawDate ? new Date(rawDate) : null;
                const dateStr = dateObj && !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—';
                const isMidnightUtc = dateObj && !isNaN(dateObj.getTime()) && dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0;
                const timeStr = dateObj && !isNaN(dateObj.getTime())
                  ? (isMidnightUtc && row.createdAt
                      ? new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
                  : '';

                const isPurchase = row.transactionType === 'PURCHASE';
                const isPayment = row.transactionType === 'PAYMENT';
                const isReturn = row.transactionType === 'RETURN';
                const isRefund = row.transactionType === 'REFUND';

                const purchaseAmt = isPurchase ? (row.purchaseAmount || row.purchaseId?.totalInvoiceAmount || 0) : 0;
                const returnAmt = isReturn ? (row.returnAmount || row.returnValue || 0) : 0;
                const refundAmt = isRefund ? (row.refundAmount || 0) : 0;
                const paymentAmt = isPayment ? (row.paidAmount || 0) : Number(row.purchaseId?.paidAmount || 0);
                const runningBal = row.runningBalance || 0;
                const advanceUsed = isPurchase ? Number(row.advanceUsed || row.purchaseId?.advanceUsed || 0) : 0;

                const purchaseItemsCount = row.purchaseId?.items?.length || row.itemsCount || 1;
                const returnItemsCount = row.returnId?.quantity || 1;

                const typeLabel = isPurchase ? 'Purchase' : isReturn ? 'Return' : isRefund ? 'Refund' : isPayment ? 'Payment' : 'Adjustment';

                const detailsLabel = isPurchase
                  ? `${purchaseItemsCount} Item${purchaseItemsCount > 1 ? 's' : ''}`
                  : isReturn
                  ? `${returnItemsCount} Item${returnItemsCount > 1 ? 's' : ''}`
                  : isRefund
                  ? 'Supplier Refund'
                  : isPayment
                  ? (row.paymentMode ? `${row.paymentMode} Payment` : 'Payment')
                  : (row.notes || 'Adjustment');

                return (
                  <tr
                    key={row._id || index}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#f8faf8]'}
                  >
                    <td className="py-1.5 px-2 text-center border border-gray-200 font-mono text-[9.5px]">
                      <div>{dateStr}</div>
                      {timeStr && <div className="text-[8.5px] text-gray-500">{timeStr}</div>}
                    </td>
                    <td className="py-1.5 px-2 text-center border border-gray-200 font-semibold">
                      {typeLabel}
                    </td>
                    <td className="py-1.5 px-2 text-left border border-gray-200">
                      {detailsLabel}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-semibold">
                      {isPurchase && purchaseAmt > 0
                        ? `₹ ${Math.round(purchaseAmt).toLocaleString('en-IN')}`
                        : isReturn && returnAmt > 0
                        ? `₹ ${Math.round(returnAmt).toLocaleString('en-IN')}`
                        : isRefund && refundAmt > 0
                        ? `₹ ${Math.round(refundAmt).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-semibold">
                      {isPurchase ? (
                        advanceUsed > 0 && paymentAmt > 0 ? (
                          <span className="text-[#047857]">
                            ₹ {Math.round(paymentAmt).toLocaleString('en-IN')} + ₹ {Math.round(advanceUsed).toLocaleString('en-IN')} Advance
                          </span>
                        ) : advanceUsed > 0 ? (
                          <span className="text-[#047857]">
                            ₹ {Math.round(advanceUsed).toLocaleString('en-IN')} Advance
                          </span>
                        ) : paymentAmt > 0 ? (
                          <span className="text-[#047857]">
                            ₹ {Math.round(paymentAmt).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">—</span>
                        )
                      ) : isReturn ? (
                        Number(row.refundAmount || 0) >= returnAmt && returnAmt > 0 ? (
                          <span className="text-sky-700">
                            ₹ {Math.round(returnAmt).toLocaleString('en-IN')} Refund
                          </span>
                        ) : Number(row.refundAmount || 0) > 0 ? (
                          <span className="text-purple-700">
                            ₹ {Math.round(row.refundAmount).toLocaleString('en-IN')} Refund + ₹ {Math.round(returnAmt - Number(row.refundAmount)).toLocaleString('en-IN')} Credit
                          </span>
                        ) : (
                          <span className="text-purple-700">
                            ₹ {Math.round(returnAmt).toLocaleString('en-IN')} Supplier Credit
                          </span>
                        )
                      ) : isRefund ? (
                        <span className="text-sky-700">
                          -₹ {Math.round(refundAmt).toLocaleString('en-IN')} Received
                        </span>
                      ) : paymentAmt > 0 ? (
                        <span className="text-[#047857]">
                          ₹ {Math.round(paymentAmt).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-bold">
                      {runningBal < 0
                        ? `-₹ ${Math.abs(Math.round(runningBal)).toLocaleString('en-IN')}`
                        : `₹ ${Math.round(runningBal).toLocaleString('en-IN')}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 4. FOOTER */}
        <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500 font-medium">
          Computer Generated Supplier Ledger Statement • No Signature Required • Generated by {shopSettings.shopName || shopSettings.name || 'VEDIXA AGRI SOLUTIONS'}
        </div>
      </div>
    </>
  );
}
