import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search,
  Filter,
  Download,
  Plus,
  MessageSquare,
  Edit2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  TrendingUp,
  X,
  Check,
  Trash2,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import AddCustomerModal from '../../components/customers/AddCustomerModal';
import { customerService } from '../../services/customerService';
import Button from '../../components/ui/Button';
import PageLayout from '../../components/ui/PageLayout';

// Edit Customer Modal Component
function EditCustomerModal({ isOpen, onClose, customer, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    mobile: customer?.mobile || '',
    village: customer?.village || customer?.address || '',
    mandal: customer?.mandal || '',
    district: customer?.district || '',
    type: customer?.type || 'Regular',
    creditLimit: customer?.creditLimit || 50000,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await customerService.updateCustomer(customer._id, formData);
      onSaveSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <Edit2 className="w-4 h-4 text-[#047857]" />
            <span>Edit Customer Details</span>
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
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] font-semibold text-gray-700 block">Customer Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Customer Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#00783C]"
              >
                <option value="Regular">Regular</option>
                <option value="Wholesale">Wholesale</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Village / Area</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Mandal</label>
              <input
                type="text"
                value={formData.mandal}
                onChange={(e) => setFormData({ ...formData, mandal: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 block">Credit Limit (₹)</label>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#00783C]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 btn-agri-primary rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteCustomerModal({ isOpen, onClose, customer, onDeleteSuccess }) {
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !customer) return null;

  const dueVal = Number(customer.outstandingBalance || 0);

  const handleDelete = async () => {
    if (dueVal > 0) {
      setErrorMsg(`Cannot delete customer "${customer.name}" because they have an active outstanding balance of ₹ ${dueVal.toLocaleString('en-IN')}. Please settle all dues first.`);
      return;
    }

    setDeleting(true);
    setErrorMsg('');
    try {
      await customerService.deleteCustomer(customer._id);
      onDeleteSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-red-600">
            <Trash2 className="w-4 h-4" />
            <span>Delete Customer?</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 text-gray-700">
          <p className="font-semibold">Are you sure you want to delete this customer?</p>
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-0.5 font-mono">
            <span className="font-bold text-gray-900 block">{customer.name}</span>
            <span className="text-[11px] text-gray-500">Mobile: {customer.mobile}</span>
          </div>
          <p className="text-[11px] text-gray-500 italic">This action cannot be undone.</p>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-1.5 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// WhatsApp Broadcast Modal Component
function WhatsAppBroadcastModal({ isOpen, onClose, customers }) {
  const [audience, setAudience] = useState('due');

  if (!isOpen) return null;

  const dueCustomers = customers.filter((c) => (c.outstandingBalance || 0) > 0);

  const handleSend = () => {
    const text = `🌾 *VEDIXA AGRI SOLUTIONS*\n*Customer Ledger Summary Broadcast*\n\nTotal Due Customers: ${dueCustomers.length}\nTotal Outstanding Amount: ₹ ${dueCustomers.reduce((a, b) => a + (b.outstandingBalance || 0), 0).toLocaleString('en-IN')}\n\nThank you for choosing Vedixa Agri Solutions!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-4 space-y-3 z-50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            <MessageSquare className="w-4 h-4 text-[#047857]" />
            <span>Send WhatsApp Statement</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-gray-700 block">Target Audience</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
              <input
                type="radio"
                name="aud"
                value="due"
                checked={audience === 'due'}
                onChange={() => setAudience('due')}
                className="accent-[#047857]"
              />
              <div>
                <span className="font-bold text-gray-900 block">Due Customers Only ({dueCustomers.length})</span>
                <span className="text-[10px] text-gray-500">Send reminder to customers with unpaid dues</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
              <input
                type="radio"
                name="aud"
                value="all"
                checked={audience === 'all'}
                onChange={() => setAudience('all')}
                className="accent-[#047857]"
              />
              <div>
                <span className="font-bold text-gray-900 block">All Customers ({customers.length})</span>
                <span className="text-[10px] text-gray-500">Send general update statement to all</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 btn-agri-primary rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dropdown States
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Fetch Customers dynamically from MongoDB
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['customers-list-page', searchQuery],
    queryFn: () => customerService.getCustomers({ search: searchQuery }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const customersList = useMemo(
    () => (Array.isArray(apiData?.data?.customers) ? apiData.data.customers : []),
    [apiData?.data?.customers]
  );

  // Dynamic summary computation
  const summary = useMemo(() => {
    const totalCust = customersList.length;
    const totalOut = customersList.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
    const dueCount = customersList.filter((c) => (c.outstandingBalance || 0) > 0).length;
    return {
      totalCustomers: totalCust,
      totalOutstanding: totalOut,
      customersWithDue: dueCount,
      advanceAmount: apiData?.data?.summary?.advanceAmount || 3850,
    };
  }, [customersList, apiData?.data?.summary?.advanceAmount]);

  // Top Due Customers derived dynamically
  const topDueCustomers = useMemo(() => {
    return [...customersList]
      .filter((c) => (c.outstandingBalance || 0) > 0)
      .sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0))
      .slice(0, 5);
  }, [customersList]);

  // Pagination calculation
  const totalEntries = customersList.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customersList.slice(start, start + pageSize);
  }, [customersList, currentPage, pageSize]);

  // Professional PDF Export using jsPDF & autoTable in Landscape mode (Zero Cropping!)
  const handleExportPDF = () => {
    setIsExportOpen(false);

    // Landscape orientation (297mm x 210mm) guarantees all 7 columns fit with 0 cropping
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Helper to draw Header & Summary on top of pages
    const drawHeaderAndSummary = () => {
      const pageWidth = doc.internal.pageSize.width;

      // 1. Header Banner
      doc.setFillColor(4, 120, 87); // VEDIXA Green (#047857)
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('VEDIXA AGRI SOLUTIONS', 12, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Fertilizers, Pesticides & Seeds Master Dealer | Main Market, Narketpally', 12, 17);
      doc.text('GSTIN: 36ABCDE1234F1Z5 | Phone: +91 98765 43210', 12, 22);

      // 2. Report Title
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CUSTOMER MASTER LIST REPORT', 12, 31);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated Date & Time: ${dateFormatted} at ${timeFormatted}`, 12, 36);

      // 3. Dynamic Summary Bar
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(12, 40, pageWidth - 24, 14, 2, 2, 'F');

      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Customers: ${summary.totalCustomers}`, 18, 49);
      doc.text(`Customers with Due: ${summary.customersWithDue}`, 90, 49);
      doc.setTextColor(220, 38, 38);
      doc.text(`Total Outstanding Due: Rs. ${summary.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 175, 49);
    };

    // Table Data Matrix
    const tableHeaders = [
      [
        '#',
        'Customer Name',
        'Mobile Number',
        'Village / Area',
        'Total Purchases (Rs.)',
        'Total Paid (Rs.)',
        'Outstanding Due (Rs.)',
      ],
    ];

    let grandPurchases = 0;
    let grandPaid = 0;
    let grandDue = 0;

    const tableData = customersList.map((c, i) => {
      const p = Number(c.totalPurchases || 0);
      const pd = Number(c.totalPaid || 0);
      const d = Number(c.outstandingBalance || 0);

      grandPurchases += p;
      grandPaid += pd;
      grandDue += d;

      return [
        i + 1,
        c.name || 'Customer',
        c.mobile || '-',
        c.village || c.address || 'Narketpally',
        p.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        pd.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        d.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      ];
    });

    // Grand Totals Row
    tableData.push([
      '',
      'GRAND TOTAL',
      '',
      '',
      grandPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      grandPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      grandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      startY: 58,
      margin: { top: 58, bottom: 16, left: 12, right: 12 },
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      showHeader: 'everyPage',
      headStyles: {
        fillColor: [4, 120, 87],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { fontStyle: 'bold', cellWidth: 60 },
        2: { fontStyle: 'normal', cellWidth: 40 },
        3: { cellWidth: 55 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 35 },
        6: { halign: 'right', cellWidth: 34, fontStyle: 'bold' },
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [31, 41, 55],
        overflow: 'linebreak', // Wraps long text automatically without cropping!
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.height;

        // Draw header and summary on every page
        drawHeaderAndSummary();

        // Footer Page Numbers
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} | VEDIXA AGRI SOLUTIONS - Master Customer Report (Confidential)`,
          12,
          pageHeight - 8
        );
      },
      didParseCell: (data) => {
        // Highlight Grand Total row in green
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [4, 120, 87];
        }
      },
    });

    const filenameDate = dateFormatted.replace(/\//g, '-');
    doc.save(`Customer_List_${filenameDate}.pdf`);
  };

  // CSV / Excel File Export Handler
  const handleExportCSV = () => {
    setIsExportOpen(false);
    const headers = ['#', 'Customer Name', 'Mobile Number', 'Village / Area', 'Total Purchases', 'Total Paid', 'Due Outstanding'];
    const rows = customersList.map((c, i) => [
      i + 1,
      `"${c.name}"`,
      `"${c.mobile}"`,
      `"${c.village || c.address || ''}"`,
      c.totalPurchases || 0,
      c.totalPaid || 0,
      c.outstandingBalance || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_List_${dateFormatted}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Refresh customer query cache
  const handleRefetch = () => {
    queryClient.invalidateQueries(['customers-list-page']);
  };

  // Individual WhatsApp Chat
  const handleSingleWhatsApp = (e, c) => {
    e.stopPropagation();
    const text = `🌾 *VEDIXA AGRI SOLUTIONS*\nHello ${c.name},\nYour outstanding due balance is ₹ ${(c.outstandingBalance || 0).toLocaleString('en-IN')}.\nThank you!`;
    window.open(`https://api.whatsapp.com/send?phone=${c.mobile}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <PageLayout
      title="Customer List"
      breadcrumb="Vedixa ERP > Customers"
      icon={Users}
      action={(
        <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <Button variant="primary" icon={Plus} onClick={() => setIsAddCustomerOpen(true)} className="text-xs px-3 sm:px-4 py-2 flex-1 sm:flex-initial justify-center shadow-2xs">
            <span>Add Customer</span>
            <span className="hidden sm:inline"> (F2)</span>
          </Button>
          <Button variant="secondary" icon={MessageSquare} onClick={() => setIsWhatsAppModalOpen(true)} className="text-xs px-3 py-2 shrink-0 shadow-2xs">
            <span>WhatsApp</span>
          </Button>
        </div>
      )}
    >

      {/* 2. MAIN 2-COLUMN LAYOUT: TABLE ON LEFT, SIDEBAR ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: CUSTOMER TABLE SECTION */}
        <div className="lg:col-span-9 space-y-3">
          
          {/* Table Toolbar */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              
              {/* Tab Header Indicator */}
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 bg-[#047857] text-white font-bold rounded-xl text-xs shadow-2xs">
                  All Customers ({summary.totalCustomers})
                </span>
              </div>

              {/* Toolbar Tools: Export, Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto relative">
                {/* Export Dropdown Options */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Export</span>
                  </button>

                  {isExportOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 font-medium">
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center gap-2 text-xs text-gray-800 cursor-pointer border-b border-gray-100"
                      >
                        <FileText className="w-4 h-4 text-red-500" />
                        <div>
                          <span className="font-bold block">Export as PDF</span>
                          <span className="text-[10px] text-gray-400">Professional A4 File</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center gap-2 text-xs text-gray-800 cursor-pointer border-b border-gray-100"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold block">Export as Excel (.xlsx)</span>
                          <span className="text-[10px] text-gray-400">Spreadsheet format</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center gap-2 text-xs text-gray-800 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-bold block">Export as CSV</span>
                          <span className="text-[10px] text-gray-400">Comma Separated</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customer, mobile, village..."
                    className="w-full h-8 pl-8 pr-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-[#00783C]"
                  />
                </div>
              </div>
            </div>

            {/* CUSTOMER LIST TABLE (DESKTOP) */}
            <div className="hidden md:block border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Mobile</th>
                    <th className="py-3 px-3">Village / Area</th>
                    <th className="py-3 px-3 text-right">Total Purchases</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right">Due (Outstanding)</th>
                    <th className="py-3 px-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin" />
                          <span>Loading MongoDB customers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((c, idx) => {
                      const rowNum = (currentPage - 1) * pageSize + idx + 1;
                      const dueVal = Number(c.outstandingBalance || 0);

                      return (
                        <tr
                          key={c._id}
                          onClick={() => navigate(`/customers/${c._id}/ledger`)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-gray-500">{rowNum}</td>

                          {/* Customer Name */}
                          <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                            <span>{c.name}</span>
                          </td>

                          {/* Mobile Number */}
                          <td className="py-2.5 px-3 font-mono text-gray-700 whitespace-nowrap">{c.mobile}</td>

                          {/* Village / Area */}
                          <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                            {c.village || c.address || 'Narketpally'}
                          </td>

                          {/* Total Purchases */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                            ₹ {(c.totalPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Total Paid */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                            ₹ {(c.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Due (Outstanding) */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={dueVal > 0 ? 'text-red-600' : 'text-gray-900'}>
                              ₹ {dueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 relative">
                              {/* Edit Icon */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCustomer(c);
                                }}
                                className="p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* WhatsApp Icon */}
                              <button
                                type="button"
                                onClick={(e) => handleSingleWhatsApp(e, c)}
                                className="p-1 rounded-lg text-gray-500 hover:text-[#047857] hover:bg-emerald-50 cursor-pointer"
                                title="Send WhatsApp Statement"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* More Options Dropdown */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === c._id ? null : c._id);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeDropdownId === c._id && (
                                <div className="absolute right-0 top-7 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 font-medium text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownId(null);
                                      setDeletingCustomer(c);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 text-xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Customer</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                        No customers found matching search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CUSTOMER LIST MOBILE CARDS */}
            <div className="block md:hidden space-y-3">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="w-4 h-4 border-2 border-[#00783C] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs font-semibold">Loading MongoDB customers...</span>
                </div>
              ) : paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((c, idx) => {
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;
                  const dueVal = Number(c.outstandingBalance || 0);

                  return (
                    <div
                      key={c._id}
                      onClick={() => navigate(`/customers/${c._id}/ledger`)}
                      className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition-all"
                    >
                      {/* Header: Row #, Customer Name, Type Badge & Actions */}
                      <div className="flex items-start justify-between pb-2 border-b border-gray-100 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-400 font-mono">#{rowNum}</span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-gray-900 text-sm leading-tight">{c.name}</span>
                              {c.type && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  c.type === 'Wholesale'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {c.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCustomer(c);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSingleWhatsApp(e, c)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#047857] hover:bg-emerald-50 cursor-pointer"
                            title="WhatsApp Statement"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCustomer(c);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Details Grid: Mobile & Village / Area */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Mobile</span>
                          <span className="font-mono font-bold text-gray-900 block">{c.mobile || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Village / Area</span>
                          <span className="font-medium text-gray-800 block break-words">{c.village || c.address || 'Narketpally'}</span>
                        </div>
                      </div>

                      {/* Financial Totals Grid: Total Purchases, Paid, Outstanding Due */}
                      <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-3 gap-1 text-center font-mono">
                        <div>
                          <span className="text-[9px] text-gray-400 font-semibold block uppercase">Purchases</span>
                          <span className="text-xs font-black text-gray-900 block">
                            ₹ {(c.totalPurchases || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-emerald-600 font-semibold block uppercase">Paid</span>
                          <span className="text-xs font-black text-[#047857] block">
                            ₹ {(c.totalPaid || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-red-500 font-semibold block uppercase">Due</span>
                          <span className={`text-xs font-black block ${dueVal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            ₹ {dueVal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200">
                  No customers found matching search
                </div>
              )}
            </div>

            {/* Dynamic Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-gray-500 font-medium">
                Showing {totalEntries > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
              </span>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === i + 1
                          ? 'bg-[#047857] text-white shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY CARDS & QUICK ACTIONS SIDEBAR */}
        <div className="lg:col-span-3 space-y-3.5">
          
          {/* Card 1: Customer Summary */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-gray-900 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-[#047857]" />
              <span>Customer Summary</span>
            </div>

            <div className="space-y-2 font-medium text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Total Customers</span>
                <span className="font-mono font-bold text-gray-900">{summary.totalCustomers}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Customers with Due</span>
                <span className="font-mono font-bold text-amber-700">{summary.customersWithDue}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Outstanding Summary */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-gray-900 border-b border-gray-100 pb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Outstanding Summary</span>
            </div>

            <div className="space-y-2 font-medium text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Total Outstanding</span>
                <span className="font-mono font-extrabold text-red-600 text-sm">
                  ₹ {summary.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Advance Amount</span>
                <span className="font-mono font-bold text-[#047857]">
                  ₹ {summary.advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Top Due Customers */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-900">Top Due Customers</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] font-bold text-[#047857] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2 font-medium text-xs">
              {topDueCustomers.length > 0 ? (
                topDueCustomers.map((c, i) => (
                  <div
                    key={c._id}
                    onClick={() => navigate(`/customers/${c._id}/ledger`)}
                    className="flex items-center justify-between border-b border-gray-50 pb-1.5 last:border-0 hover:bg-emerald-50/40 p-1 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-gray-400">{i + 1}.</span>
                      <span className="font-bold text-gray-900 truncate">{c.name}</span>
                    </div>
                    <span className="font-mono font-extrabold text-red-600 shrink-0">
                      ₹ {(c.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 italic text-center py-2">No customers with due</p>
              )}
            </div>
          </div>

          {/* Card 4: Quick Actions */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2">
            <span className="font-bold text-gray-900 block border-b border-gray-100 pb-2">Quick Actions</span>
            
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="w-full py-2 px-3 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs font-bold text-[#047857] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Customer (F2)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="w-full py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#047857]" />
                <span>Send WhatsApp to All</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerCreated={handleRefetch}
      />

      <EditCustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
        onSaveSuccess={handleRefetch}
      />

      <DeleteCustomerModal
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        customer={deletingCustomer}
        onDeleteSuccess={handleRefetch}
      />

      <WhatsAppBroadcastModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customers={customersList}
      />

    </PageLayout>
  );
}
