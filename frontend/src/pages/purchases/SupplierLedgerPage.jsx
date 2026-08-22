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
  Building,
  FileSpreadsheet,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import PurchaseInvoiceModal from '../../components/purchases/PurchaseInvoiceModal';
import PaymentDetailsModal from '../../components/purchases/PaymentDetailsModal';
import QuickAddSupplierDrawer from '../../components/purchases/QuickAddSupplierDrawer';
import TransactionDetailsModal from '../../components/purchases/TransactionDetailsModal';

export default function SupplierLedgerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { supplierId } = useParams();

  const [activeTab, setActiveTab] = useState('All Transactions');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Edit Supplier Drawer state
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);

  // Fetch Supplier Ledger Data directly using supplierId from URL
  const { data: ledgerApiData, isLoading, error } = useQuery({
    queryKey: ['supplier-ledger', supplierId, activeTab],
    queryFn: () =>
      supplierService.getSupplierLedger(supplierId, {
        transactionType: activeTab === 'Purchases' ? 'PURCHASE' : activeTab === 'Payments' ? 'PAYMENT' : 'ALL',
      }),
    enabled: Boolean(supplierId),
  });

  const supplier = ledgerApiData?.data?.supplier || {};
  const ledgerEntries = ledgerApiData?.data?.ledgerEntries || [];
  const summary = ledgerApiData?.data?.summary || {
    totalPurchases: 0,
    totalPayments: 0,
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

  // Filter Transactions by Search
  const filteredEntries = ledgerEntries.filter((item) => {
    if (!searchQuery.trim()) return true;
    const ref = (item.referenceNumber || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return ref.includes(q) || notes.includes(q);
  });

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

  return (
    <div className="space-y-4 w-full max-w-full pb-10">
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
            className="px-3 py-1.5 btn-agri-primary rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Top Supplier Profile Header Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
            <Building className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">{supplier.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supplier.isActive !== false ? 'badge-agri-active' : 'bg-gray-100 text-gray-600'}`}>
                {supplier.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {supplier.mobile && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <strong className="text-gray-700 font-medium">{supplier.mobile}</strong>
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

      {/* 4 Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Purchases */}
        <div className="bg-amber-50/40 border border-amber-100/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-gray-500 block">Total Purchases</span>
          <span className="text-lg font-bold text-amber-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.totalPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Database Lifetime Sum</span>
        </div>

        {/* Card 2: Total Payments */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-gray-500 block">Total Payments</span>
          <span className="text-lg font-bold text-sky-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.totalPayments || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Database Lifetime Sum</span>
        </div>

        {/* Card 3: Current Outstanding (Closing Balance) */}
        <div className={`border rounded-2xl p-3.5 space-y-1 ${isAdvance ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/40 border-red-100'}`}>
          <span className="text-xs font-medium text-gray-500 block">
            {isAdvance ? 'Current Outstanding (Advance)' : 'Current Outstanding (Due)'}
          </span>
          <span className={`text-lg font-bold font-mono block whitespace-nowrap ${isAdvance ? 'text-[#047857]' : 'text-red-600'}`}>
            {isAdvance
              ? `-₹ ${Math.round(Math.abs(summary.closingBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : `₹ ${Math.round(summary.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Current Database Balance</span>
        </div>

        {/* Card 4: Average Purchase Value */}
        <div className="bg-purple-50/40 border border-purple-100/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs font-medium text-gray-500 block">Average Purchase Value</span>
          <span className="text-lg font-bold text-purple-900 font-mono block whitespace-nowrap">
            ₹ {Math.round(summary.avgPurchaseValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-gray-400 font-normal block">Per Order Average</span>
        </div>
      </div>

      {/* Main Container: Left Transactions Table & Right Outstanding Panel */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        
        {/* Left Column: Transactions Table Card */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          
          {/* Controls Bar: Search & Export */}
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
                onClick={() => window.print()}
                className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export Statement</span>
              </button>
            </div>
          </div>

          {/* Tabs: All Transactions, Purchases, Payments, Adjustments */}
          <div className="flex items-center gap-6 border-b border-gray-200 font-medium text-xs">
            {['All Transactions', 'Purchases', 'Payments', 'Adjustments'].map((tab) => (
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
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Payment (₹)</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Balance (₹)</th>
                    <th className="py-3 px-3.5 text-center align-middle whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 font-normal text-xs">
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map((row, idx) => {
                      const dateStr = row.date
                        ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';

                      const isPurchase = row.transactionType === 'PURCHASE';
                      const isPayment = row.transactionType === 'PAYMENT';
                      const isOpening = row.transactionType === 'ADJUSTMENT' || row.notes?.includes('Opening');

                      const purchaseAmt = isPurchase ? (row.purchaseAmount || row.purchaseId?.totalInvoiceAmount || 0) : 0;
                      const paymentAmt = isPayment ? (row.paidAmount || 0) : Number(row.purchaseId?.paidAmount || row.paidAmount || 0);
                      const dueAmt = isPurchase ? Number(row.purchaseId?.dueAmount ?? (purchaseAmt - paymentAmt)) : 0;
                      const runningBal = row.runningBalance || 0;

                      const getPaymentMethodLabel = (notes = '', mode = '') => {
                        const text = `${notes} ${mode}`.toLowerCase();
                        if (text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('paytm')) {
                          return 'UPI Payment';
                        }
                        if (text.includes('bank') || text.includes('transfer') || text.includes('neft') || text.includes('rtgs') || text.includes('imps')) {
                          return 'Bank Transfer';
                        }
                        if (text.includes('cheque') || text.includes('check')) {
                          return 'Cheque Payment';
                        }
                        if (text.includes('online') || text.includes('card')) {
                          return 'Online Payment';
                        }
                        if (text.includes('cash')) {
                          return 'Cash Payment';
                        }
                        return 'Payment';
                      };

                      return (
                        <tr
                          key={row._id || idx}
                          onClick={() => setSelectedTransactionDrawer(row)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                          title="Click to view complete Transaction Details"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-medium text-gray-900 whitespace-nowrap">{dateStr}</td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-3.5 text-center align-middle whitespace-nowrap">
                            {isPurchase && (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F3E8FF] text-[#7E22CE]">
                                Purchase
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

                          {/* Details Column */}
                          <td className="py-3.5 px-3.5 text-left align-middle font-medium text-gray-800">
                            {isPurchase ? (
                              <span className="text-gray-900 text-xs font-semibold block">
                                {row.purchaseId?.items?.length || 0} {(row.purchaseId?.items?.length || 0) === 1 ? 'Item' : 'Items'}
                              </span>
                            ) : isPayment ? (
                              <span className="text-gray-900 text-xs font-medium block">
                                {getPaymentMethodLabel(row.notes, row.paymentMode)}
                              </span>
                            ) : (
                              <span className="text-gray-900 text-xs font-medium block">
                                Adjustment
                              </span>
                            )}
                          </td>

                          {/* Purchase Amount */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold text-gray-900 whitespace-nowrap">
                            {purchaseAmt > 0 ? `₹ ${Math.round(purchaseAmt).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
                          </td>

                          {/* Payment Amount */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold text-[#047857] whitespace-nowrap">
                            {paymentAmt > 0 ? `₹ ${Math.round(paymentAmt).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3.5 px-3.5 text-center align-middle font-mono font-bold text-gray-900 whitespace-nowrap">
                            ₹ {Math.round(runningBal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3.5 text-center align-middle whitespace-nowrap">
                            {isPayment ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                                Success
                              </span>
                            ) : dueAmt <= 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                                Paid
                              </span>
                            ) : paymentAmt > 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFEDD5] text-[#C2410C]">
                                Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                                Pending
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
              {filteredEntries.length > 0 ? (
                filteredEntries.map((row, idx) => {
                  const dateStr = row.date
                    ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const timeStr = row.date
                    ? new Date(row.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  const isPurchase = row.transactionType === 'PURCHASE';
                  const isPayment = row.transactionType === 'PAYMENT';
                  const isOpening = row.transactionType === 'ADJUSTMENT' || row.notes?.includes('Opening');

                  const purchaseAmt = isPurchase ? (row.purchaseAmount || row.purchaseId?.totalInvoiceAmount || 0) : 0;
                  const paymentAmt = isPayment ? (row.paidAmount || 0) : Number(row.purchaseId?.paidAmount || row.paidAmount || 0);
                  const runningBal = row.runningBalance || 0;

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
                    ? `Purchase - ${row.purchaseId?.items?.length || 1} Item(s)`
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
                            {purchaseAmt > 0 ? `₹ ${purchaseAmt.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Payment</span>
                          <span className="text-xs font-black text-[#047857] block">
                            {paymentAmt > 0 ? `₹ ${paymentAmt.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-purple-600 font-semibold block uppercase">Balance</span>
                          <span className="text-xs font-black text-gray-900 block">
                            ₹ {runningBal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
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
  );
}
