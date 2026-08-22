import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  MapPin,
  Building,
  UserCheck,
  Plus,
  MessageSquare,
  Printer,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  X,
  AlertCircle,
  Check,
  CheckCircle2,
  FileText,
  Download,
  Trash2,
  Eye,
  Edit3,
  Search,
  Calendar,
  Upload,
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import { generateLedgerPdf, printLedgerPdf, buildLedgerPdfDoc, generatePaymentReceiptPdf, generateMonthlyStatementPdf, printMonthlyStatementPdf, buildMonthlyStatementPdfDoc } from '../../utils/pdfGenerator';
import { calculateCustomerStatement, buildWhatsAppStatementMessage, formatCustomerLedgerAddress } from '../../utils/statementCalculator';
import PdfCanvasViewer from '../../components/PdfCanvasViewer';
import vedixaLogoImg from '../../assets/vedixa_logo.png';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = ['2026', '2025', '2024', '2023', '2022'];

// Record Payment Modal Dialog Component
function RecordPaymentModal({ isOpen, onClose, customer }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const paymentMutation = useMutation({
    mutationFn: (data) => customerService.recordPayment(customer?._id || customer?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile']);
      queryClient.invalidateQueries(['customer-ledger-details']);
      queryClient.invalidateQueries(['general-customers-list']);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setAmount('');
      setNotes('');
      setRefNo('');
      setErrorMsg('');
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to persist payment');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount (> 0)');
      return;
    }

    setErrorMsg('');
    paymentMutation.mutate({
      amount: numAmount,
      paymentMode,
      refNo: refNo.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <Plus className="w-4 h-4 text-[#047857]" />
            <span>Record Payment (F3)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-1.5 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs space-y-0.5">
            <span className="font-bold text-gray-900 block">{customer?.name}</span>
            <span className="text-[11px] text-gray-500 font-mono">{customer?.mobile}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Payment Amount (₹) *</label>
            <input
              type="number"
              required
              onFocus={(e) => e.target.select()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / PhonePe / GPay</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Reference No / Txn ID</label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="e.g. PAY-1002"
              className="w-full h-8 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Due clearance payment"
              className="w-full h-8 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paymentMutation.isPending}
              className="px-4 py-1.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{paymentMutation.isPending ? 'Saving...' : 'Save Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Record Advance Modal Dialog Component
function RecordAdvanceModal({ isOpen, onClose, customer }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const advanceMutation = useMutation({
    mutationFn: (data) => customerService.recordPayment(customer?._id || customer?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile']);
      queryClient.invalidateQueries(['customer-ledger-details']);
      queryClient.invalidateQueries(['general-customers-list']);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setAmount('');
      setNotes('');
      setErrorMsg('');
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to record advance');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid advance amount (> 0)');
      return;
    }

    setErrorMsg('');
    advanceMutation.mutate({
      amount: numAmount,
      paymentMode,
      refNo: `ADV-${Date.now().toString().slice(-6)}`,
      notes: notes.trim() ? `Advance: ${notes.trim()}` : 'Advance Deposit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <CreditCard className="w-4 h-4 text-[#047857]" />
            <span>Record Advance / Credit Deposit</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-1.5 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-xs space-y-0.5">
            <span className="font-bold text-gray-900 block">{customer?.name}</span>
            <span className="text-[11px] text-gray-500 font-mono">{customer?.mobile}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Advance Deposit Amount (₹) *</label>
            <input
              type="number"
              required
              onFocus={(e) => e.target.select()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#047857]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 block">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#047857]"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={advanceMutation.isPending}
              className="px-4 py-1.5 bg-[#047857] hover:bg-[#036448] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{advanceMutation.isPending ? 'Saving...' : 'Save Advance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerLedgerPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState('Ledger');
  const [transactionTypeInput, setTransactionTypeInput] = useState('All');
  const [refTypeInput, setRefTypeInput] = useState('All');
  const [appliedTxType, setAppliedTxType] = useState('All');
  const [appliedRefType, setAppliedRefType] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals Visibility
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isWhatsappLedgerPreviewOpen, setIsWhatsappLedgerPreviewOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const defaultMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [statementType, setStatementType] = useState('FULL'); // Default to 'FULL' history
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');

  const [selectedYearVal, selectedMonthNumVal] = useMemo(() => {
    if (selectedMonth && selectedMonth.includes('-')) {
      const parts = selectedMonth.split('-');
      return [parts[0], parts[1]];
    }
    const d = new Date();
    return [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0')];
  }, [selectedMonth]);

  const handleApplyCustomDates = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setCurrentPage(1);
  };

  const [selectedPeriod, setSelectedPeriod] = useState('Monthly Statement');
  const [editableLedgerMsg, setEditableLedgerMsg] = useState('');
  const [attachLedgerPdf, setAttachLedgerPdf] = useState(true);
  const [includeLedgerQr, setIncludeLedgerQr] = useState(true);
  const [includeLedgerPayLink, setIncludeLedgerPayLink] = useState(true);

  // Payment Receipt / Edit / Delete States
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('Cash');
  const [editPaymentRefNo, setEditPaymentRefNo] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editPaymentError, setEditPaymentError] = useState('');

  const [deletingPayment, setDeletingPayment] = useState(null);
  const [deletePaymentError, setDeletePaymentError] = useState('');

  // Notes & Documents Input State
  const [newNoteText, setNewNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [docError, setDocError] = useState('');

  // Global F3 shortcut for Record Payment
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsPaymentModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Customer profile & ledger dynamically from Backend MongoDB
  const { data: customerApiData, isLoading } = useQuery({
    queryKey: ['customer-ledger-profile', customerId],
    queryFn: () => (customerId ? customerService.getCustomerById(customerId) : null),
    enabled: Boolean(customerId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const apiResponse = customerApiData?.data?.data || customerApiData?.data || customerApiData || {};

  const customer = useMemo(() => {
    let rawCust = apiResponse.customer || apiResponse;
    if (rawCust && rawCust.customer) {
      rawCust = rawCust.customer;
    }
    return {
      _id: rawCust._id || customerId || '',
      name: rawCust.name || rawCust.customerName || 'Customer',
      mobile: rawCust.mobile || rawCust.phone || '',
      village: rawCust.village || '',
      mandal: rawCust.mandal || '',
      district: rawCust.district || '',
      state: rawCust.state || 'Andhra Pradesh',
      customerCode: rawCust.customerCode || (rawCust._id ? `CUST-${rawCust._id.toString().slice(-4).toUpperCase()}` : 'CUST'),
      registerDate: rawCust.createdAt ? new Date(rawCust.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
      salesPerson: rawCust.salesPerson || 'Store Admin',
      type: rawCust.type || 'Regular',
      status: rawCust.status || 'Active',
      gstin: rawCust.gstin || '',
      totalPurchases: Number(rawCust.totalPurchases || 0),
      totalPaid: Number(rawCust.totalPaid || 0),
      previousDue: Number(rawCust.previousDue || 0),
      outstandingBalance: Number(rawCust.outstandingBalance || 0),
      advanceBalance: Number(rawCust.advanceBalance || 0),
      creditLimit: Number(rawCust.creditLimit || 50000),
      availableLimit: Number(rawCust.availableLimit || Math.max(0, (rawCust.creditLimit || 50000) - (rawCust.outstandingBalance || 0) + (rawCust.advanceBalance || 0))),
      notes: Array.isArray(rawCust.notes) ? rawCust.notes : [],
      documents: Array.isArray(rawCust.documents) ? rawCust.documents : [],
    };
  }, [apiResponse, customerId]);

  const avatarInitials = useMemo(() => {
    const nameStr = customer.name || 'CU';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(nameStr).slice(0, 2).toUpperCase();
  }, [customer.name]);

  const rawTransactions = useMemo(() => {
    if (Array.isArray(apiResponse.transactions)) return apiResponse.transactions;
    if (Array.isArray(apiResponse.customer?.transactions)) return apiResponse.customer.transactions;
    return [];
  }, [apiResponse]);

  const rawInvoices = useMemo(() => {
    if (Array.isArray(apiResponse.invoices)) return apiResponse.invoices;
    return [];
  }, [apiResponse]);

  const rawPayments = useMemo(() => {
    if (Array.isArray(apiResponse.payments)) return apiResponse.payments;
    return [];
  }, [apiResponse]);

  // Authoritative Centralized Statement Calculation for current period & filters
  const monthlyCalculation = useMemo(() => {
    return calculateCustomerStatement({
      transactions: rawTransactions,
      customer,
      statementType,
      selectedMonth: selectedMonth || defaultMonthStr,
      fromDate,
      toDate,
    });
  }, [rawTransactions, customer, statementType, selectedMonth, defaultMonthStr, fromDate, toDate]);

  const displayTransactions = useMemo(() => {
    let list = monthlyCalculation.monthlyTransactions || monthlyCalculation.transactions || [];

    if (appliedTxType !== 'All' || appliedRefType !== 'All') {
      list = list.filter((tx) => {
        if (!tx) return false;

        if (appliedTxType !== 'All') {
          if (appliedTxType === 'Purchase' || appliedTxType === 'Invoice') {
            if (tx.type !== 'Invoice') return false;
          } else if (appliedTxType === 'Payment') {
            if (tx.type !== 'Payment') return false;
          } else if (appliedTxType === 'Advance') {
            if (tx.type !== 'Advance') return false;
          }
        }

        if (appliedRefType !== 'All') {
          if (appliedRefType === 'INV' || appliedRefType === 'Invoice') {
            if (tx.type !== 'Invoice') return false;
          } else if (appliedRefType === 'PAY' || appliedRefType === 'Payment') {
            if (tx.type !== 'Payment') return false;
          }
        }

        return true;
      });
    }

    return list;
  }, [monthlyCalculation, appliedTxType, appliedRefType]);

  // Single Source of Truth: Dynamic Financial Summary Metrics for Top Cards
  const dynamicTopMetrics = useMemo(() => {
    const isFull = statementType === 'FULL';
    const isMonthly = statementType === 'MONTHLY';

    const openingBal = Number(monthlyCalculation.openingBalance || 0);
    const purchases = Number(monthlyCalculation.newPurchases || (isFull ? customer.totalPurchases : 0) || 0);
    const paid = Number(monthlyCalculation.payments || (isFull ? customer.totalPaid : 0) || 0);
    const netBal = Number(monthlyCalculation.closingDue ?? (isFull ? customer.outstandingBalance : 0) ?? 0);
    const outstanding = netBal > 0 ? netBal : 0;
    const advance = netBal < 0 ? Math.abs(netBal) : (isFull ? Number(customer.advanceBalance || 0) : 0);

    return {
      showOpeningBalance: !isFull,
      openingBalance: openingBal,
      totalPurchases: purchases,
      totalPaid: paid,
      outstanding,
      advanceBalance: advance,
      openingLabel: 'Opening Balance',
      purchasesLabel: isFull ? 'Total Purchases' : (isMonthly ? 'Monthly Purchases' : 'Period Purchases'),
      paidLabel: isFull ? 'Total Paid' : (isMonthly ? 'Monthly Paid' : 'Period Paid'),
      outstandingLabel: isFull ? 'Outstanding' : (isMonthly ? 'Closing Due' : 'Period Due'),
      advanceLabel: isFull ? 'Advance Balance' : 'Period Advance',
    };
  }, [statementType, monthlyCalculation, customer]);

  const totalEntries = displayTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayTransactions.slice(start, start + pageSize);
  }, [displayTransactions, currentPage, pageSize]);

  // Consume Shop Settings from Shared Context
  const { settings: shopSettingsContext } = useSettings();
  const shopSettings = useMemo(() => shopSettingsContext || {}, [shopSettingsContext]);

  const shopName = shopSettings.shopName || shopSettings.name || 'VEDIXA AGRI SOLUTIONS';
  const shopMobile = shopSettings.mobile || shopSettings.phone || '9999999999';
  const shopUPI = shopSettings.upiId || '9999999999@ybl';

  const ledgerUpiPayLink = `upi://pay?pa=${shopUPI}&pn=${encodeURIComponent(shopName)}&am=${customer.outstandingBalance}&tr=LEDGER-${customerId}&tn=${encodeURIComponent('Due Clearance for ' + customer.name)}&cu=INR`;

  // Note & Document Mutations
  const addNoteMutation = useMutation({
    mutationFn: (text) => customerService.addNote(customerId, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile', customerId]);
      setNewNoteText('');
      setNoteError('');
    },
    onError: (err) => setNoteError(err?.response?.data?.message || 'Failed to save note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => customerService.deleteNote(customerId, noteId),
    onSuccess: () => queryClient.invalidateQueries(['customer-ledger-profile', customerId]),
  });

  const addDocMutation = useMutation({
    mutationFn: (data) => customerService.addDocument(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile', customerId]);
      setNewDocTitle('');
      setNewDocUrl('');
      setDocError('');
    },
    onError: (err) => setDocError(err?.response?.data?.message || 'Failed to upload document'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => customerService.deleteDocument(customerId, docId),
    onSuccess: () => queryClient.invalidateQueries(['customer-ledger-profile', customerId]),
  });

  // Edit / Delete Payment Mutations
  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, data }) => customerService.updatePayment(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile', customerId]);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['general-customers-list']);
      setEditingPayment(null);
      setEditPaymentError('');
    },
    onError: (err) => setEditPaymentError(err?.response?.data?.message || 'Failed to update payment'),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId) => customerService.deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-ledger-profile', customerId]);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['general-customers-list']);
      setDeletingPayment(null);
      setDeletePaymentError('');
    },
    onError: (err) => setDeletePaymentError(err?.response?.data?.message || 'Failed to delete payment'),
  });

  const handleApplyFilter = () => {
    setAppliedTxType(transactionTypeInput);
    setAppliedRefType(refTypeInput);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setStatementType('FULL');
    setSelectedMonth(defaultMonthStr);
    setFromDate('');
    setToDate('');
    setTempFromDate('');
    setTempToDate('');
    setTransactionTypeInput('All');
    setRefTypeInput('All');
    setAppliedTxType('All');
    setAppliedRefType('All');
    setCurrentPage(1);
  };

  const totals = useMemo(() => ({
    totalPurchases: customer.totalPurchases || 0,
    totalPaid: customer.totalPaid || 0,
    outstanding: customer.outstandingBalance || 0,
  }), [customer]);

  const handlePrintLedger = () => {
    window.print();
  };

  const handleDownloadLedgerPdf = () => {
    if (statementType === 'MONTHLY') {
      generateMonthlyStatementPdf(customer, shopSettings, monthlyCalculation);
    } else {
      generateLedgerPdf(customer, shopSettings, displayTransactions, totals, statementType === 'FULL' ? 'Full History' : 'Custom Period');
    }
  };

  const handleWhatsAppStatement = () => {
    const custMobile = (customer?.mobile || '').trim();
    if (!custMobile) {
      alert("Customer mobile number is missing. Please add the customer's mobile/WhatsApp number first.");
      return;
    }

    if (statementType === 'MONTHLY') {
      generateMonthlyStatementPdf(customer, shopSettings, monthlyCalculation);
    } else {
      generateLedgerPdf(customer, shopSettings, displayTransactions, totals, statementType === 'FULL' ? 'Full History' : 'Custom Period');
    }

    const cleanPhone = custMobile.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const waMsg = buildWhatsAppStatementMessage({
      monthLabel: monthlyCalculation?.monthLabel || 'Statement',
      openingBalance: monthlyCalculation.openingBalance,
      totalPurchases: monthlyCalculation.newPurchases,
      payments: monthlyCalculation.payments,
      due: monthlyCalculation.closingDue,
      shopSettings,
      isFromBillDrawer: false,
    });

    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenEditPayment = (p) => {
    setEditingPayment(p);
    const rawD = p.rawDate || p.date || new Date().toISOString();
    const dStr = typeof rawD === 'string' && rawD.includes('T') ? rawD.split('T')[0] : new Date().toISOString().split('T')[0];
    setEditPaymentDate(dStr);
    setEditPaymentAmount(p.credit || p.amount || 0);
    setEditPaymentMode(p.paymentMode || 'Cash');
    setEditPaymentRefNo(p.refNo || '');
    setEditPaymentNotes(p.notes || '');
    setEditPaymentError('');
  };

  const handleSavePaymentEdit = (e) => {
    e.preventDefault();
    if (!editingPayment) return;
    const paymentId = editingPayment._id || editingPayment.id;
    updatePaymentMutation.mutate({
      paymentId,
      data: {
        amount: parseFloat(editPaymentAmount),
        paymentMode: editPaymentMode,
        refNo: editPaymentRefNo,
        notes: editPaymentNotes,
        date: editPaymentDate,
      },
    });
  };

  const handleConfirmDeletePayment = () => {
    if (!deletingPayment) return;
    const paymentId = deletingPayment._id || deletingPayment.id;
    deletePaymentMutation.mutate(paymentId);
  };

  const handleDownloadPaymentPdf = (p) => {
    generatePaymentReceiptPdf(p, customer, shopSettings);
  };

  return (
    <div className="w-full pb-10 space-y-4 sm:space-y-5 font-sans text-xs">
      {/* ON-SCREEN UI CONTAINER (HIDDEN DURING PRINT) */}
      <div className="customer-ledger-screen-ui print:hidden space-y-4 sm:space-y-5">
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-gray-900 truncate">Customer Ledger</h1>
              <span className="px-2 py-0.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-bold text-[10px] shrink-0">
                {customer.status}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">Real-time synchronized transactions &amp; financial ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Record Payment</span>
          </button>
          <button
            type="button"
            onClick={handlePrintLedger}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadLedgerPdf}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handleWhatsAppStatement}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* LEFT COLUMN (9 COLS) */}
        <div className="lg:col-span-9 space-y-4 sm:space-y-5 min-w-0 w-full">
          {/* PROFILE CARD */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full lg:w-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0">
                  {avatarInitials}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">{customer.name}</h2>
                    <span className="px-2 py-0.5 bg-emerald-50 text-[#047857] rounded-full font-bold text-[10px] shrink-0">
                      {customer.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{customer.mobile || 'No Mobile Registered'}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Village: <strong className="text-gray-800">{customer.village || 'N/A'}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Mandal: <strong className="text-gray-800">{customer.mandal || 'N/A'}</strong></span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>District: <strong className="text-gray-800">{customer.district || 'N/A'}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* DYNAMIC FINANCIAL SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 sm:gap-2.5 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-gray-100 pt-3 lg:pt-0 lg:pl-4">
                {/* 1. Opening Balance Card (ONLY for Monthly Statement & Custom Date) */}
                {dynamicTopMetrics.showOpeningBalance && (
                  <div className="p-2 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200 w-full lg:w-auto lg:min-w-[90px] text-left lg:text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block truncate">
                      {dynamicTopMetrics.openingLabel}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm block truncate">
                      ₹ {dynamicTopMetrics.openingBalance.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                )}

                {/* 2. Purchases Card */}
                <div className="p-2 sm:p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 w-full lg:w-auto lg:min-w-[90px] text-left lg:text-right">
                  <span className="text-[10px] text-blue-600 font-bold uppercase block truncate">
                    {dynamicTopMetrics.purchasesLabel}
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-xs sm:text-sm block truncate">
                    ₹ {dynamicTopMetrics.totalPurchases.toLocaleString('en-IN')}.00
                  </span>
                </div>

                {/* 3. Paid Card */}
                <div className="p-2 sm:p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 w-full lg:w-auto lg:min-w-[90px] text-left lg:text-right">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block truncate">
                    {dynamicTopMetrics.paidLabel}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm block truncate">
                    ₹ {dynamicTopMetrics.totalPaid.toLocaleString('en-IN')}.00
                  </span>
                </div>

                {/* 4. Outstanding / Closing Due Card */}
                <div className={`p-2 sm:p-2.5 rounded-xl border w-full lg:w-auto lg:min-w-[95px] text-left lg:text-right ${dynamicTopMetrics.outstanding > 0 ? 'bg-red-50/80 border-red-200' : 'bg-gray-50/80 border-gray-200'}`}>
                  <span className="text-[10px] font-bold text-red-600 uppercase block truncate">
                    {dynamicTopMetrics.outstandingLabel}
                  </span>
                  <span className={`font-mono font-black text-xs sm:text-sm block truncate ${dynamicTopMetrics.outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    ₹ {dynamicTopMetrics.outstanding.toLocaleString('en-IN')}.00
                  </span>
                </div>

                {/* 5. Advance Balance / Period Advance Card */}
                <div className={`p-2 sm:p-2.5 rounded-xl border w-full lg:w-auto lg:min-w-[95px] text-left lg:text-right ${dynamicTopMetrics.advanceBalance > 0 ? 'bg-emerald-50/80 border-emerald-200/80' : 'bg-gray-50/80 border-gray-200/80'}`}>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block truncate">
                    {dynamicTopMetrics.advanceLabel}
                  </span>
                  <span className={`font-mono font-black text-xs sm:text-sm block truncate ${dynamicTopMetrics.advanceBalance > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                    ₹ {dynamicTopMetrics.advanceBalance.toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABS HEADER */}
          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none max-w-full pb-0.5 whitespace-nowrap text-xs font-bold w-full">
            {[
              { id: 'Ledger', label: 'Ledger' },
              { id: 'Profile', label: 'Profile & Details' },
              { id: 'Bills', label: `Bills (${rawInvoices.length})` },
              { id: 'Payments', label: `Payments (${rawPayments.length})` },
              { id: 'Advance', label: 'Advance / Credit' },
              { id: 'Notes', label: `Notes (${customer.notes.length})` },
              { id: 'Documents', label: `Documents (${customer.documents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${activeTab === tab.id
                    ? 'bg-white text-[#047857] border-[#047857] shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: LEDGER VIEW & FILTERS */}
          {activeTab === 'Ledger' && (
            <div className="space-y-4">
              {/* STATEMENT PERIOD SELECTOR BAR */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-2xs text-xs w-full max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
                  {/* Left: Filter Title & Primary Selector */}
                  <div className="flex flex-wrap items-center gap-2 max-w-full">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800 shrink-0">
                      <Calendar className="w-4 h-4 text-[#047857]" />
                      <span>Statement Period</span>
                    </div>

                    <select
                      value={statementType}
                      onChange={(e) => {
                        setStatementType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-8 px-2.5 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#047857] cursor-pointer transition-colors max-w-full"
                    >
                      <option value="FULL">Full History</option>
                      <option value="MONTHLY">Monthly Statement</option>
                      <option value="CUSTOM">Custom Date</option>
                    </select>
                  </div>

                  {/* Right: Sub-Controls based on Mode */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap max-w-full">
                    {statementType === 'MONTHLY' && (
                      <div className="flex items-center gap-1.5 flex-wrap max-w-full">
                        <label className="text-xs font-semibold text-gray-600 shrink-0">Select Month:</label>
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-0.5 max-w-full">
                          <select
                            value={selectedMonthNumVal}
                            onChange={(e) => {
                              setSelectedMonth(`${selectedYearVal}-${e.target.value}`);
                              setCurrentPage(1);
                            }}
                            className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer py-1"
                          >
                            {MONTH_NAMES.map((mName, idx) => {
                              const numStr = String(idx + 1).padStart(2, '0');
                              return (
                                <option key={mName} value={numStr}>
                                  {mName}
                                </option>
                              );
                            })}
                          </select>
                          <select
                            value={selectedYearVal}
                            onChange={(e) => {
                              setSelectedMonth(`${e.target.value}-${selectedMonthNumVal}`);
                              setCurrentPage(1);
                            }}
                            className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer py-1"
                          >
                            {YEAR_OPTIONS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {statementType === 'CUSTOM' && (
                      <div className="flex items-center gap-1.5 flex-wrap max-w-full">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-gray-600">From:</span>
                          <input
                            type="date"
                            value={tempFromDate}
                            onChange={(e) => setTempFromDate(e.target.value)}
                            className="h-8 px-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#047857]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-gray-600">To:</span>
                          <input
                            type="date"
                            value={tempToDate}
                            onChange={(e) => setTempToDate(e.target.value)}
                            className="h-8 px-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#047857]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyCustomDates}
                          className="px-2.5 py-1.5 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Apply</span>
                        </button>
                      </div>
                    )}

                    {statementType === 'FULL' && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-full font-bold text-[11px] flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Showing Full History</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* FILTER CONTROLS ROW */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 w-full">
                  <div className="space-y-1 w-full sm:w-auto">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Transaction Type</label>
                    <select
                      value={transactionTypeInput}
                      onChange={(e) => setTransactionTypeInput(e.target.value)}
                      className="h-8 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#047857] w-full sm:w-auto min-w-[130px]"
                    >
                      <option value="All">All Transactions</option>
                      <option value="Invoice">Invoices (Purchases)</option>
                      <option value="Payment">Payments Received</option>
                      <option value="Advance">Advance Deposits</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    className="h-8 px-3.5 bg-white border border-[#047857] text-[#047857] hover:bg-emerald-50 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-[#047857]" />
                    <span>Apply Filter</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-xs cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* MAIN LEDGER TABLE CONTAINER */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-700 uppercase">
                        <th className="py-3 px-3.5">Date &amp; Time</th>
                        <th className="py-3 px-3.5">Ref No / Type</th>
                        <th className="py-3 px-4">Particulars</th>
                        <th className="py-3 px-4 text-right">Debit (₹)</th>
                        <th className="py-3 px-4 text-right">Credit (₹)</th>
                        <th className="py-3 px-4 text-right">Balance (₹)</th>
                        <th className="py-3 px-3.5 text-center">Mode</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800 text-xs">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-gray-400">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
                              <span>Loading customer ledger...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/60 transition-colors align-middle">
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-bold text-gray-900 block leading-tight">{tx.date}</span>
                              <span className="text-[10px] text-gray-500 font-mono block">{tx.time || '10:30 AM'}</span>
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-gray-900 block">{tx.refNo}</span>
                              <span className="text-[10px] text-gray-500 block font-semibold">{tx.type}</span>
                            </td>

                            <td className="py-2.5 px-4">
                              {tx.type === 'Invoice' ? (
                                <span className="font-bold text-gray-900 block leading-tight">
                                  Purchase - {tx.items ? tx.items.length : 1} Items
                                </span>
                              ) : (
                                <div>
                                  <span className="font-bold text-gray-900 block">{tx.particulars || 'Payment Received'}</span>
                                  {tx.notes && <span className="text-[11px] text-gray-500 block">{tx.notes}</span>}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              {(tx.debit || 0) > 0 ? Math.round(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                            </td>

                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {(tx.credit || 0) > 0 ? Math.round(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                            </td>

                            <td className="py-2.5 px-4 text-right whitespace-nowrap font-mono font-bold">
                              {tx.formattedBalance ? (
                                <span className={tx.runningBalance > 0 ? 'text-red-600 font-black' : tx.runningBalance < 0 ? 'text-emerald-700 font-black' : 'text-gray-700 font-bold'}>
                                  {tx.formattedBalance}
                                </span>
                              ) : (
                                <span className={(tx.runningBalance || tx.balance || 0) > 0 ? 'text-red-600 font-black' : (tx.runningBalance || tx.balance || 0) < 0 ? 'text-emerald-700 font-black' : 'text-gray-700 font-bold'}>
                                  {(tx.runningBalance || tx.balance || 0) > 0
                                    ? `Outstanding ₹${Math.round(Math.abs(tx.runningBalance || tx.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                    : (tx.runningBalance || tx.balance || 0) < 0
                                      ? `Advance ₹${Math.round(Math.abs(tx.runningBalance || tx.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                      : '₹ 0'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-800 border border-gray-200 rounded-md font-bold text-[10px]">
                                {tx.paymentMode || 'Cash'}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {tx.type === 'Invoice' ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/invoices/${tx.refNo || tx.id}`)}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Invoice</span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptPayment(tx)}
                                    className="p-1.5 bg-emerald-50 text-[#047857] hover:bg-emerald-100 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                    title="View Receipt"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPayment(tx)}
                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                    title="Edit Payment"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingPayment(tx)}
                                    className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg cursor-pointer"
                                    title="Delete Payment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                            No ledger entries found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CUSTOMER LEDGER CARDS */}
                <div className="block md:hidden space-y-3 p-3">
                  {isLoading ? (
                    <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="w-4 h-4 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span className="text-xs font-semibold">Loading customer ledger...</span>
                    </div>
                  ) : paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx, idx) => {
                      const isInvoice = tx.type === 'Invoice';
                      const particularsText = isInvoice
                        ? `Purchase - ${tx.items ? tx.items.length : 1} Item(s)`
                        : tx.particulars || 'Payment Received';

                      return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 font-sans hover:border-emerald-300 transition-all"
                        >
                          {/* Card Header: Ref No, Type & Actions */}
                          <div className="flex items-start justify-between pb-2 border-b border-gray-100 gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-extrabold text-gray-900 text-xs">{tx.refNo}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  isInvoice
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {tx.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                {tx.date} • {tx.time || '10:30 AM'}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isInvoice ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/invoices/${tx.refNo || tx.id}`)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptPayment(tx)}
                                    className="p-1.5 bg-emerald-50 text-[#047857] hover:bg-emerald-100 rounded-lg cursor-pointer"
                                    title="View Receipt"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPayment(tx)}
                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                    title="Edit Payment"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingPayment(tx)}
                                    className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg cursor-pointer"
                                    title="Delete Payment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Particulars & Payment Mode */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Particulars</span>
                              <span className="font-medium text-gray-900 block break-words">{particularsText}</span>
                              {tx.notes && <span className="text-[10px] text-gray-500 block italic">{tx.notes}</span>}
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Payment Mode</span>
                              <span className="font-mono font-bold text-gray-800 block">{tx.paymentMode || 'Cash'}</span>
                            </div>
                          </div>

                          {/* Financial Amounts Breakdown Grid */}
                          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                            <div>
                              <span className="text-[9px] text-gray-400 font-semibold block uppercase">Debit (+)</span>
                              <span className="text-xs font-black text-gray-900 block">
                                {(tx.debit || 0) > 0 ? `₹ ${(tx.debit).toLocaleString('en-IN')}` : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Credit (-)</span>
                              <span className="text-xs font-black text-[#047857] block">
                                {(tx.credit || 0) > 0 ? `₹ ${(tx.credit).toLocaleString('en-IN')}` : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-purple-600 font-semibold block uppercase">Balance</span>
                              <span className="text-xs font-black text-gray-900 block">
                                {tx.formattedBalance || `₹ ${Math.abs(tx.runningBalance || tx.balance || 0).toLocaleString('en-IN')}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
                      No ledger entries found
                    </div>
                  )}
                </div>
              </div>

                {/* PAGINATION */}
                <div className="p-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-gray-500 font-medium text-[11px]">
                    Showing {paginatedTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="font-bold text-gray-700 px-1">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* TAB 2: PROFILE & DETAILS */}
          {activeTab === 'Profile' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Customer Profile &amp; Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div><span className="text-gray-500 font-medium">Customer Code:</span> <strong className="font-mono text-gray-900 ml-1">{customer.customerCode}</strong></div>
                <div><span className="text-gray-500 font-medium">Register Date:</span> <strong className="font-mono text-gray-900 ml-1">{customer.registerDate}</strong></div>
                <div><span className="text-gray-500 font-medium">Credit Limit:</span> <strong className="font-mono text-emerald-700 ml-1">₹ {customer.creditLimit.toLocaleString('en-IN')}</strong></div>
                <div><span className="text-gray-500 font-medium">Customer Type:</span> <strong className="text-gray-900 ml-1">{customer.type}</strong></div>
                <div><span className="text-gray-500 font-medium">Full Name:</span> <strong className="text-gray-900 ml-1">{customer.name}</strong></div>
                <div><span className="text-gray-500 font-medium">Mobile Phone:</span> <strong className="font-mono text-gray-900 ml-1">{customer.mobile}</strong></div>
                <div><span className="text-gray-500 font-medium">Village:</span> <strong className="text-gray-900 ml-1">{customer.village || 'N/A'}</strong></div>
                <div><span className="text-gray-500 font-medium">Mandal:</span> <strong className="text-gray-900 ml-1">{customer.mandal || 'N/A'}</strong></div>
                <div><span className="text-gray-500 font-medium">District:</span> <strong className="text-gray-900 ml-1">{customer.district || 'N/A'}</strong></div>
                <div><span className="text-gray-500 font-medium">GSTIN:</span> <strong className="font-mono text-gray-900 ml-1">{customer.gstin || 'Unregistered'}</strong></div>
              </div>
            </div>
          )}

          {/* TAB 3: BILLS (INVOICES) */}
          {activeTab === 'Bills' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden p-4 space-y-3">
              <h2 className="text-sm font-extrabold text-gray-900">Customer Sales Invoices ({rawInvoices.length})</h2>
              {rawInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-700 uppercase">
                        <th className="py-2.5 px-3">Invoice No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                        <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                        <th className="py-2.5 px-3 text-right">Due (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                      {rawInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-600">
                            {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">₹ {(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700">₹ {(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">₹ {(inv.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase ${(inv.status || '').toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                              {inv.status || 'Paid'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/invoices/${inv.invoiceNumber}`)}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 italic">No sales invoices recorded for this customer.</div>
              )}
            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {activeTab === 'Payments' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-gray-900">Payment Receipts ({rawPayments.length})</h2>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-3 py-1.5 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              {rawPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-700 uppercase">
                        <th className="py-2.5 px-3">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-3 text-center">Mode</th>
                        <th className="py-2.5 px-3">Remarks</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                      {rawPayments.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{p.refNo}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-600">
                            {new Date(p.date || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">₹ {(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 border border-gray-200 rounded font-bold text-[10px]">
                              {p.paymentMode || 'Cash'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 truncate max-w-xs">{p.notes || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptPayment(p)}
                                className="p-1.5 bg-emerald-50 text-[#047857] hover:bg-emerald-100 rounded-lg cursor-pointer"
                                title="View Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPayment(p)}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                title="Edit Payment"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPaymentPdf(p)}
                                className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPayment(p)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer"
                                title="Delete Payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 italic">No payment receipts recorded for this customer.</div>
              )}
            </div>
          )}

          {/* TAB 5: ADVANCE / CREDIT */}
          {activeTab === 'Advance' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h2 className="text-sm font-extrabold text-gray-900">Advance Balance &amp; Credit Limits</h2>
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#047857] text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Advance</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">Advance Balance</span>
                  <div className="text-lg font-black font-mono text-emerald-800">₹ {customer.advanceBalance.toLocaleString('en-IN')}.00</div>
                </div>

                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase block">Credit Limit</span>
                  <div className="text-lg font-black font-mono text-gray-900">₹ {customer.creditLimit.toLocaleString('en-IN')}.00</div>
                </div>

                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-800 uppercase block">Available Credit</span>
                  <div className="text-lg font-black font-mono text-blue-800">₹ {customer.availableLimit.toLocaleString('en-IN')}.00</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTES */}
          {activeTab === 'Notes' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Customer Notes &amp; Remarks</h2>

              {/* Add Note Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newNoteText.trim()) return;
                  addNoteMutation.mutate(newNoteText.trim());
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Type a new note for this customer..."
                  className="flex-1 h-9 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending}
                  className="px-4 h-9 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                </button>
              </form>
              {noteError && <div className="text-xs text-red-600 font-medium">{noteError}</div>}

              {customer.notes.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {customer.notes.map((n, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-900 font-medium">{n.text}</p>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          By {n.author || 'Admin'} • {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteNoteMutation.mutate(n._id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 italic">No notes recorded for this customer.</div>
              )}
            </div>
          )}

          {/* TAB 7: DOCUMENTS */}
          {activeTab === 'Documents' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Customer Documents</h2>

              {/* Upload Document Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newDocTitle.trim() || !newDocUrl.trim()) return;
                  addDocMutation.mutate({ title: newDocTitle.trim(), fileUrl: newDocUrl.trim() });
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Document Title (e.g. Aadhaar Card)"
                  className="h-9 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="File Link / URL"
                  className="h-9 px-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={addDocMutation.isPending}
                  className="h-9 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{addDocMutation.isPending ? 'Uploading...' : 'Save Document'}</span>
                </button>
              </form>
              {docError && <div className="text-xs text-red-600 font-medium">{docError}</div>}

              {customer.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {customer.documents.map((d, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900 block">{d.title}</span>
                        <span className="text-[10px] text-gray-500 font-mono block">
                          Uploaded {new Date(d.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                          title="Preview / Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteDocMutation.mutate(d._id)}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-400 italic">No documents uploaded for this customer.</div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN SUMMARY SIDEBAR */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-5">
          {/* CARD 1: OUTSTANDING SUMMARY */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <UserCheck className="w-4 h-4 text-[#047857]" />
              <h3 className="font-bold text-gray-900 text-xs">Financial Summary</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Total Purchases</span>
                <span className="font-mono font-bold text-gray-900">₹ {customer.totalPurchases.toLocaleString('en-IN')}.00</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Total Paid</span>
                <span className="font-mono font-bold text-emerald-700">₹ {customer.totalPaid.toLocaleString('en-IN')}.00</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                <span className="font-bold text-gray-900">Current Outstanding</span>
                <span className={`font-mono font-black text-sm ${customer.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  ₹ {customer.outstandingBalance.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-900">Advance Balance</span>
                <span className={`font-mono font-bold text-sm ${customer.advanceBalance > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                  ₹ {customer.advanceBalance.toLocaleString('en-IN')}.00
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('Bills')}
              className="w-full py-2 bg-white border border-emerald-300 text-[#047857] hover:bg-emerald-50 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
            >
              View Invoices ({rawInvoices.length})
            </button>
          </div>

          {/* CARD 3: QUICK ACTIONS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <UserCheck className="w-4 h-4 text-[#047857]" />
              <h3 className="font-bold text-gray-900 text-xs">Quick Actions</h3>
            </div>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-2 bg-white border border-gray-200 hover:border-[#047857] hover:bg-emerald-50 text-[#047857] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Payment (F3)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(true)}
                className="w-full py-2 bg-white border border-gray-200 hover:border-[#047857] hover:bg-emerald-50 text-[#047857] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Advance</span>
              </button>

              <button
                type="button"
                onClick={handlePrintLedger}
                className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Profile')}
                className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>View Customer Profile</span>
              </button>
            </div>
          </div>

          {/* CARD 4: RECENT INVOICES */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-900 text-xs">Recent Invoices</h3>
              <button
                type="button"
                onClick={() => setActiveTab('Bills')}
                className="text-[11px] text-[#047857] font-bold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {rawInvoices.slice(0, 4).map((inv, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/invoices/${inv.invoiceNumber}`)}
                  className="p-2.5 bg-gray-50/80 hover:bg-emerald-50/40 border border-gray-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-gray-900 block text-xs">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-gray-500 font-mono block">
                      {new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-extrabold text-gray-900 block text-xs">
                      ₹ {(inv.totalAmount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`px-2 py-0.5 font-bold text-[9px] rounded block text-center uppercase ${(inv.status || '').toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-600'
                      }`}>
                      {inv.status || 'Paid'}
                    </span>
                  </div>
                </div>
              ))}

              {rawInvoices.length === 0 && (
                <div className="text-gray-400 text-xs italic text-center py-3">No invoices yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ALL MODALS */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        customer={customer}
      />

      <RecordAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        customer={customer}
      />

      {/* CUSTOMER PAYMENT RECEIPT MODAL DIALOG */}
      {selectedReceiptPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
          onClick={() => setSelectedReceiptPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-5 space-y-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b-2 border-[#047857] pb-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-extrabold text-[#047857]">{shopName}</h2>
                <p className="text-[11px] text-[#047857] font-medium">{shopSettings?.address || ''}</p>
                <div className="text-[10px] font-mono text-gray-500">
                  GSTIN: {shopSettings?.gstNumber || ''} • Phone: {shopMobile}
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="px-2.5 py-1 bg-emerald-100 text-[#047857] font-extrabold text-[10px] rounded-md uppercase tracking-wider block">
                  Payment Receipt
                </span>
                <div className="text-[11px] font-mono font-bold text-gray-900">#{selectedReceiptPayment.refNo}</div>
                <div className="text-[10px] text-gray-500 font-mono">Date: {selectedReceiptPayment.date}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-gray-200 pb-2">
                <div>
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Customer Name</span>
                  <span className="font-extrabold text-gray-900">{customer.name}</span>
                  <span className="text-[11px] text-gray-500 block font-mono">{customer.mobile}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Payment Mode</span>
                  <span className="font-bold text-emerald-800">{selectedReceiptPayment.paymentMode || 'Cash'}</span>
                  <span className="text-[10px] text-gray-500 block font-mono">Ref: {selectedReceiptPayment.refNo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div>
                  <span className="text-gray-500 font-medium">Amount Received:</span>
                  <div className="text-base font-black text-[#047857]">
                    ₹ {Number(selectedReceiptPayment.credit || selectedReceiptPayment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {selectedReceiptPayment.notes && (
                <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-600">
                  <span className="font-bold">Remarks: </span>
                  <span>{selectedReceiptPayment.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownloadPaymentPdf(selectedReceiptPayment)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReceiptPayment(null)}
                className="px-4 py-1.5 bg-[#047857] hover:bg-[#036448] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL DIALOG */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs"
          onClick={() => setEditingPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-5 space-y-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Edit Payment Record</h3>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Reference Number / Txn ID</label>
                <input
                  type="text"
                  value={editPaymentRefNo}
                  onChange={(e) => setEditPaymentRefNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="PAY-001 or UPI Ref"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Remarks..."
                />
              </div>

              {editPaymentError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-medium">
                  {editPaymentError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePaymentMutation.isPending}
                  className="px-5 py-2 bg-[#047857] hover:bg-[#036448] text-white font-extrabold rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {updatePaymentMutation.isPending ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PAYMENT CONFIRMATION DIALOG */}
      {deletingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs"
          onClick={() => setDeletingPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-5 space-y-4 text-center z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-gray-900">Delete Payment?</h3>
              <p className="text-xs text-gray-600 font-medium">This payment will be permanently removed from MongoDB.</p>
              <p className="text-xs text-gray-600 font-medium">Outstanding balances &amp; due amounts will be recalculated.</p>
            </div>

            {deletePaymentError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-left font-medium">
                {deletePaymentError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayment}
                disabled={deletePaymentMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* HIDDEN DEDICATED PRINT CONTAINER FOR A4 SINGLE-PAGE CUSTOMER LEDGER */}
      <div className="printable-ledger-document customer-ledger-print hidden print:block bg-white text-black p-0 m-0 font-sans">
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

        {/* 2. DOCUMENT TITLE & CUSTOMER DETAILS + SUMMARY BOX */}
        <div className="grid grid-cols-12 gap-3 mb-3">
          {/* Left (7 cols): Customer Info */}
          <div className="col-span-7 space-y-1">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
              {statementType === 'MONTHLY' ? 'CUSTOMER ACCOUNT STATEMENT' : 'CUSTOMER LEDGER STATEMENT'}
            </h2>
            <div className="text-[11px] text-gray-800 space-y-0.5">
              <p className="font-bold text-gray-900">
                Customer Name : <span className="font-extrabold">{customer?.name || 'Valued Customer'}</span>
              </p>
              <p>
                Customer Phone : <span className="font-mono">{customer?.mobile || 'N/A'}</span>
              </p>
              <p>
                Customer Address: {formatCustomerLedgerAddress(customer)}
              </p>
              <p className="text-[10px] text-gray-600">
                Statement Period: {statementType === 'MONTHLY' ? (monthlyCalculation?.monthLabel || 'Current Month') : (statementType === 'FULL' ? 'Full History' : `${fromDate || ''} to ${toDate || ''}`)} | Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right (5 cols): Summary Box */}
          <div className="col-span-5 bg-slate-50 border border-slate-300 rounded-lg p-2.5 space-y-1 text-[11px]">
            <h3 className="text-[11px] font-bold text-[#047857] uppercase border-b border-slate-200 pb-1 mb-1">
              ACCOUNT SUMMARY
            </h3>
            {statementType === 'MONTHLY' ? (
              <div className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span>OPENING BALANCE:</span>
                  <span className="font-mono font-bold">₹ {Number(monthlyCalculation.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>NEW PURCHASES:</span>
                  <span className="font-mono font-bold">₹ {Number(monthlyCalculation.newPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-[#047857]">
                  <span>PAYMENTS:</span>
                  <span className="font-mono font-bold">₹ {Number(monthlyCalculation.payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-[#dc2626] border-t border-slate-300 pt-1 mt-1 text-[11.5px]">
                  <span>DUE / CLOSING BALANCE:</span>
                  <span className="font-mono font-extrabold">₹ {Number(monthlyCalculation.closingDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span>Total Purchases:</span>
                  <span className="font-mono font-bold">₹ {Number(totals.totalPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium text-[#047857]">
                  <span>Total Payments:</span>
                  <span className="font-mono font-bold">₹ {Number(totals.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between font-bold border-t border-slate-300 pt-1 mt-1 text-[11.5px] ${Number(totals.outstanding || 0) > 0 ? 'text-[#dc2626]' : 'text-[#047857]'}`}>
                  <span>Outstanding Balance:</span>
                  <span className="font-mono font-extrabold">₹ {Number(totals.outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. TRANSACTIONS TABLE */}
        <table className="print-ledger-table w-full border-collapse">
          <thead>
            <tr className="bg-[#047857] text-white text-[10px] uppercase font-bold">
              <th className="py-1.5 px-2 text-center border border-[#047857]">DATE</th>
              <th className="py-1.5 px-2 text-left border border-[#047857]">PARTICULARS</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">DEBIT (₹)</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">CREDIT (₹)</th>
              <th className="py-1.5 px-2 text-right border border-[#047857]">BALANCE (₹)</th>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {displayTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-gray-500 italic border border-gray-200">
                  No transactions found in this period
                </td>
              </tr>
            ) : (
              displayTransactions.map((tx, index) => {
                const isInvoice = tx.type === 'Invoice' || tx.debit > 0;
                const items = Array.isArray(tx.items) ? tx.items : [];

                return (
                  <tr
                    key={tx.id || tx._id || index}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#f8faf8]'}
                  >
                    <td className="py-1.5 px-2 text-center border border-gray-200 font-mono text-[9.5px]">
                      {tx.dateFormatted || tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')}
                    </td>
                    <td className="py-1.5 px-2 text-left border border-gray-200">
                      {isInvoice ? (
                        <div>
                          <p className="font-bold text-gray-900">
                            Purchase - {items.length > 0 ? `${items.length} Item${items.length > 1 ? 's' : ''}` : '1 Item'}
                            {(tx.invoiceNumber || tx.docNo || tx.refNo) ? `, ${(tx.invoiceNumber || tx.docNo || tx.refNo).replace(/^Bill\s*#?\s*/i, '')}` : ''}
                          </p>
                          {items.length > 0 && (
                            <div className="pl-1 mt-0.5 space-y-0.5 text-[9px] text-gray-600 font-mono">
                              {items.map((it, idx) => {
                                const qty = Number(it.quantity || it.qty || 1);
                                const price = Number(it.unitPrice || it.price || (qty > 0 ? (it.total || 0) / qty : 0));
                                return (
                                  <div key={idx} className="flex justify-between gap-2 max-w-[280px]">
                                    <span>• {it.productName || it.name || 'Item'}</span>
                                    <span>Qty: {qty} @ ₹{price > 0 ? price.toLocaleString('en-IN') : '0'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="font-semibold text-gray-800">
                          {tx.particulars || tx.description || tx.type || 'Payment'}
                          {tx.refNo ? ` (Ref: ${tx.refNo})` : ''}
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-semibold">
                      {tx.debit > 0 ? Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-semibold text-[#047857]">
                      {tx.credit > 0 ? Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right border border-gray-200 font-mono font-bold">
                      {Number(tx.balance ?? (tx.runningBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 4. FOOTER */}
        <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500 font-medium">
          Computer Generated Ledger Statement • No Signature Required • Generated by {shopSettings.shopName || shopSettings.name || 'VEDIXA AGRI SOLUTIONS'}
        </div>
      </div>
    </div>
  );
}
