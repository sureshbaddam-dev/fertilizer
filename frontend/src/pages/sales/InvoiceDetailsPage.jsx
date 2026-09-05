import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Edit,
  Trash2,
  QrCode,
  ExternalLink,
  MessageSquare,
  X,
  Check,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { settingService } from '../../services/settingService';
import { useSettings } from '../../contexts/SettingsContext';
import { authService } from '../../services/authService';
import { buildFullShopAddress, generateInvoicePdf, printInvoicePdf } from '../../utils/pdfGenerator';
import { getItemUnitPrice } from '../../utils/pricing';
import vedixaLogoImg from '../../assets/vedixa_logo.png';

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  // Fetch Original Sales Invoice from MongoDB database using Invoice ID / Number
  const { data: invoiceApi, isLoading, isError } = useQuery({
    queryKey: ['sales-invoice-details', invoiceId],
    queryFn: () => invoiceService.getInvoiceById(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invoice = useMemo(() => {
    return invoiceApi?.data || invoiceApi || null;
  }, [invoiceApi]);

  // Delete Invoice Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['sales-invoices']);
      queryClient.invalidateQueries(['dashboard-summary']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['customer-ledger-profile']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['products-inventory']);
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['reports-bi']);
      setIsDeleteModalOpen(false);
      navigate(-1);
    },
    onError: (err) => {
      setDeleteErrorMsg(err?.response?.data?.message || err?.message || 'Failed to delete invoice');
    },
  });

  const handleEditInvoice = () => {
    const idToUse = invoice?._id || invoiceId;
    navigate(`/invoices/${idToUse}/edit`);
  };

  const handleDeleteInvoice = () => {
    if (!invoice) return;
    setDeleteErrorMsg('');
    deleteMutation.mutate(invoice._id || invoice.invoiceNumber);
  };

  // Consume Shop Profile Settings from Shared Context
  const { settings: shopSettingsContext } = useSettings();
  const shopSettings = useMemo(() => shopSettingsContext || {}, [shopSettingsContext]);

  const authUser = useMemo(() => {
    return authService.getCurrentUser() || {};
  }, []);

  const shopDisplayName =
    shopSettings.shopName ||
    shopSettings.businessName ||
    shopSettings.name ||
    authUser.shopName ||
    authUser.businessName ||
    authUser.ownerName ||
    '-';

  const fullShopAddress = useMemo(() => {
    return buildFullShopAddress(shopSettings);
  }, [shopSettings]);

  const shopGST = shopSettings.gstNumber || shopSettings.gstin || shopSettings.gstNo || '-';
  const shopPhone =
    shopSettings.whatsappNumber ||
    shopSettings.mobile ||
    shopSettings.phone ||
    '-';
  const shopUPI = shopSettings.upiId || '';
  const shopLogo = shopSettings.logoUrl || shopSettings.shopLogo || '';

  const upiId = shopUPI;
  const upiPayeeName = shopSettings.upiPayeeName || shopDisplayName;
  const grandTotalAmt = Number(invoice?.totalAmount || 0);

  const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayeeName)}&am=${grandTotalAmt}&tr=${invoice?.invoiceNumber}&tn=${encodeURIComponent('Payment for Invoice ' + (invoice?.invoiceNumber || ''))}&cu=INR`;
  const upiQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiPayLink)}`;
  const qrCodeUrl = upiQrCodeUrl;

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printInvoicePdf(invoice, shopSettings);
    } catch (err) {
      console.error('Print PDF failed:', err);
    }
  };

  const [downloadNoticeMsg, setDownloadNoticeMsg] = useState('');

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      await generateInvoicePdf(invoice, shopSettings);
    } catch (err) {
      console.error('Download PDF failed:', err);
    }
  };

  const [isWhatsappPreviewOpen, setIsWhatsappPreviewOpen] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [includeQr, setIncludeQr] = useState(true);
  const [includePayLink, setIncludePayLink] = useState(true);

  const openWhatsappPreview = () => {
    if (!invoice) return;
    const custName = invoice.customerName || invoice.customer?.name || 'Valued Customer';
    const shopDisplayName = shopSettings.shopName || 'RAMESH FERTILIZERS & SEEDS AGENCY';
    const shopWhatsapp = (shopSettings.whatsappNumber || shopSettings.mobile || '').trim();

    let template =
      shopSettings.invoiceWhatsappTemplate ||
      'Dear {{CUSTOMER_NAME}},\n\nThank you for purchasing from {{SHOP_NAME}}.\n\nInvoice No: {{INVOICE_NO}}\nInvoice Amount: ₹ {{AMOUNT}}\n\nPayment Link:\n{{UPI_PAYMENT_LINK}}\n\nThank you.\n{{SHOP_NAME}}\nPhone: {{SHOP_MOBILE}}';

    let msg = template
      .replace(/{{CUSTOMER_NAME}}/g, custName)
      .replace(/{{SHOP_NAME}}/g, shopDisplayName)
      .replace(/{{INVOICE_NO}}/g, invoice.invoiceNumber || '')
      .replace(/{{AMOUNT}}/g, Number(invoice.totalAmount || 0).toLocaleString('en-IN'))
      .replace(/{{UPI_PAYMENT_LINK}}/g, upiPayLink)
      .replace(/{{SHOP_MOBILE}}/g, shopWhatsapp)
      .replace(/{{SHOP_WHATSAPP}}/g, shopWhatsapp);

    setEditableMessage(msg);
    setIsWhatsappPreviewOpen(true);
  };

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const handleSendFinalWhatsApp = () => {
    if (!invoice) return;

    // 1. Open WhatsApp Web immediately on active user click gesture to prevent browser popup blocking
    const custMobile = invoice.customerMobile || invoice.customer?.mobile || '';
    const cleanPhone = custMobile.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(editableMessage)}`, '_blank');

    // 2. Download Invoice PDF locally in background (non-blocking)
    handleDownloadPdf().catch((err) => {
      console.warn('PDF download warning:', err);
    });

    // 3. Close document preview modal & open "Invoice Ready to Share" success dialog
    setIsWhatsappPreviewOpen(false);
    setIsSuccessDialogOpen(true);
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('whatsapp') === 'true' && invoice) {
      openWhatsappPreview();
    }
  }, [searchParams, invoice]);

  const handleShareWhatsApp = () => {
    openWhatsappPreview();
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center gap-2 text-gray-400 font-sans text-xs">
        <div className="w-5 h-5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
        <span>Loading Sales Invoice details from database...</span>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3 font-sans max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-extrabold text-gray-900">Sales Invoice Not Found</h2>
        <p className="text-xs text-gray-500">
          The requested invoice (#{invoiceId}) could not be retrieved from the database.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Back to Customer Ledger
        </button>
      </div>
    );
  }

  const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];

  const subtotal = Number(invoice.subtotal || invoice.totalAmount || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const grandTotal = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const dueAmount = Number(invoice.dueAmount || Math.max(0, grandTotal - paidAmount));

  const invoiceDateStr = invoice.date || invoice.createdAt
    ? new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const invoiceTimeStr = invoice.createdAt || invoice.date
    ? new Date(invoice.createdAt || invoice.date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'N/A';

  return (
    <div className="space-y-4 sm:space-y-5 font-sans text-xs w-full pb-16 max-w-5xl mx-auto px-1 sm:px-0">
      
      {/* WHATSAPP PDF ATTACHMENT INSTRUCTION HELPER BANNER */}
      {downloadNoticeMsg && (
        <div className="p-3.5 bg-emerald-50 text-[#047857] border border-emerald-300 rounded-2xl font-bold flex items-center justify-between shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#047857] shrink-0" />
            <span>{downloadNoticeMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadNoticeMsg('')}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Top Header Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 cursor-pointer transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
          <span>Back to Customer Ledger</span>
        </button>

        {/* Read-Only Badge & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold text-[11px] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span>Read Only</span>
          </span>

          <button
            type="button"
            onClick={handleEditInvoice}
            className="px-3.5 py-2 bg-[#047857] hover:bg-[#036448] text-white rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Edit className="w-4 h-4 text-white" />
            <span>Edit Bill</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-gray-600" />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Share2 className="w-4 h-4 text-[#047857]" />
            <span>Share WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal Dialog */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 p-5 space-y-4 text-center z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2 text-left">
              <h3 className="text-base font-extrabold text-gray-900 text-center">Delete Invoice?</h3>
              <p className="text-xs text-gray-600 font-medium">
                Deleting this invoice will:
              </p>
              <ul className="text-xs text-gray-700 bg-red-50/70 p-3 rounded-xl border border-red-200 space-y-1 list-disc list-inside font-medium">
                <li>Restore Inventory Stock</li>
                <li>Remove Invoice</li>
                <li>Remove Ledger Entry</li>
                <li>Update Customer Outstanding</li>
                <li>Update Dashboard</li>
                <li>Update Reports</li>
              </ul>
            </div>

            {deleteErrorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-left font-medium">
                {deleteErrorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Printable Tax Invoice Document Card */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 sm:p-8 shadow-xs space-y-5 sm:space-y-6">
        
        {/* Document Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-4 sm:pb-5 gap-3.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-[#047857] text-white font-extrabold rounded-lg text-xs tracking-wide uppercase">
                TAX INVOICE
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {invoice.status || 'Paid'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight pt-1 uppercase break-words">
              {shopDisplayName}
            </h1>
            <p className="text-xs text-gray-600 font-medium leading-relaxed break-words">
              {fullShopAddress}
            </p>
            <p className="text-[11px] text-gray-500 font-mono break-words">
              GSTIN: {shopGST} • Phone: {shopPhone}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <div className="sm:text-right space-y-1 bg-gray-50 p-3 sm:p-3.5 rounded-xl border border-gray-200/60 font-mono text-xs flex-1 sm:flex-none">
              <div className="text-gray-500 font-bold uppercase text-[10px]">Invoice Number</div>
              <div className="text-base font-extrabold text-[#047857]">{invoice.invoiceNumber}</div>
              <div className="text-gray-600 font-semibold pt-1 border-t border-gray-200 text-[11px]">
                Date: {invoiceDateStr} • {invoiceTimeStr}
              </div>
            </div>

            {/* Official VEDIXA Top-Right Branding */}
            <div className="flex flex-col items-center justify-center text-center shrink-0 pl-1">
              <img
                src={vedixaLogoImg}
                alt="VEDIXA"
                className="h-10 w-auto object-contain select-none"
              />
              <span className="text-[9.5px] font-black text-[#047857] tracking-wider uppercase mt-0.5">
                VEDIXA
              </span>
            </div>
          </div>
        </div>

        {/* Billed To Customer Information Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Billed To Customer
            </span>
            <span className="text-sm font-extrabold text-gray-900 block">
              {invoice.customerName || invoice.customer?.name || 'General Customer'}
            </span>
            <div className="flex items-center gap-1.5 text-gray-600 text-xs font-mono">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span>{invoice.customerMobile || invoice.customer?.mobile || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{invoice.customerAddress || invoice.customer?.village || '—'}</span>
            </div>
          </div>

          <div className="space-y-1 sm:text-right flex flex-col sm:items-end justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Payment Details
            </span>
            <div className="font-mono text-xs text-gray-800">
              Payment Method: <span className="font-bold text-gray-900">{invoice.paymentMode || 'Cash'}</span>
            </div>
            <div className="font-mono text-xs text-gray-800">
              Due Status: <span className="font-bold text-emerald-700">{invoice.dueStatus || 'No Due'}</span>
            </div>
            {invoice.notes && (
              <p className="text-[11px] text-gray-500 italic max-w-xs">{invoice.notes}</p>
            )}
          </div>
        </div>

        {/* Itemized Billed Products Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
            Billed Items ({items.length})
          </h3>

          {/* DESKTOP & PRINT BILLED ITEMS TABLE */}
          <div className="hidden md:block print:block border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
            <table className="w-full text-center text-[11px] border-collapse print-invoice-table print:text-[10px] font-sans">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-2 text-center align-middle w-[5%] font-sans">#</th>
                  <th className="py-3 px-3 text-center align-middle w-[32%] font-sans">Product Description</th>
                  <th className="py-3 px-2 text-center align-middle w-[12%] font-sans">Qty / Unit</th>
                  <th className="py-3 px-3 text-center align-middle w-[16%] font-sans">Rate (₹)</th>
                  <th className="py-3 px-3 text-center align-middle w-[13%] font-sans">Discount (₹)</th>
                  <th className="py-3 px-3 text-center align-middle w-[22%] font-sans">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800 font-sans">
                {(() => {
                  const rawSubtotal = items.reduce((sum, it) => sum + (Number(it.quantity || it.qty || 1) * getItemUnitPrice(it)), 0);
                  const billDisc = Number(invoice.discountAmount || 0);

                  return items.map((item, idx) => {
                    const pName = item.productName || item.product?.name || item.name || 'Agri Item';
                    const qty = Number(item.quantity || item.qty || 1);
                    const unit = item.unit || item.unitId?.shortName || item.product?.defaultUnitId?.shortName || 'Bag';
                    const rate = getItemUnitPrice(item);
                    const itemGross = qty * rate;
                    const disc = Number(item.discountAmount || item.discount || 0);
                    const effectiveDisc = disc > 0
                      ? disc
                      : (billDisc > 0 && rawSubtotal > 0 ? Math.round((itemGross / rawSubtotal) * billDisc * 100) / 100 : 0);
                    const rowTotal = Math.max(0, itemGross - effectiveDisc);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-2 text-center font-sans text-gray-400 align-middle">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-900 align-middle break-words font-sans">{pName}</td>
                        <td className="py-2.5 px-2 text-center font-sans font-bold text-gray-900 align-middle whitespace-nowrap">{qty} {unit}</td>
                        <td className="py-2.5 px-3 text-center font-sans font-medium text-gray-900 align-middle whitespace-nowrap">₹ {Math.round(rate).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 px-3 text-center font-sans font-bold text-[#047857] align-middle whitespace-nowrap">
                          {effectiveDisc > 0 ? `₹ ${Math.round(effectiveDisc).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₹ 0'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans font-bold text-gray-900 align-middle whitespace-nowrap">
                          ₹ {Math.round(rowTotal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* MOBILE RESPONSIVE PRODUCT CARDS */}
          <div className="block md:hidden print:hidden space-y-2.5">
            {(() => {
              const rawSubtotal = items.reduce((sum, it) => sum + (Number(it.quantity || it.qty || 1) * getItemUnitPrice(it)), 0);
              const billDisc = Number(invoice.discountAmount || 0);

              return items.map((item, idx) => {
                const pName = item.productName || item.product?.name || item.name || 'Agri Item';
                const qty = Number(item.quantity || item.qty || 1);
                const unit = item.unit || item.unitId?.shortName || item.product?.defaultUnitId?.shortName || 'Bag';
                const rate = getItemUnitPrice(item);
                const itemGross = qty * rate;
                const disc = Number(item.discountAmount || item.discount || 0);
                const effectiveDisc = disc > 0
                  ? disc
                  : (billDisc > 0 && rawSubtotal > 0 ? Math.round((itemGross / rawSubtotal) * billDisc * 100) / 100 : 0);
                const rowTotal = Math.max(0, itemGross - effectiveDisc);

                return (
                  <div key={idx} className="bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs space-y-2 font-sans">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="font-extrabold text-gray-900 text-xs">{pName}</span>
                      <span className="font-mono font-black text-[#047857] text-xs">
                        ₹ {Math.round(rowTotal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-sans">Qty</span>
                        <span className="font-bold text-gray-800">{qty} {unit}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-sans">Rate</span>
                        <span className="font-bold text-gray-800">₹ {Math.round(rate).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-sans">Discount</span>
                        <span className="font-bold text-[#047857]">₹ {Math.round(effectiveDisc).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Financial Totals Breakdown & UPI Payment Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 print:block">
          
          {/* Audit Trail Box */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/60 space-y-1.5 text-xs print:hidden">
            <span className="font-extrabold text-gray-900 block text-xs">Invoice Audit Trail</span>
            <div className="text-gray-600 space-y-1 text-[11px] font-mono">
              <div>Invoice Status: <span className="font-bold text-gray-900">{invoice.status || 'Paid'}</span></div>
              <div>Payment Mode: <span className="font-bold text-gray-900">{invoice.paymentMode || 'Cash'}</span></div>
              <div>Shop VPA: <span className="font-bold text-emerald-700">{upiId}</span></div>
              <div>Database ID: <span className="font-bold text-gray-700">{invoice._id || invoice.id}</span></div>
            </div>
          </div>

          {/* Dynamic Pay Now via UPI QR Code Card */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col justify-between items-center text-center space-y-2 print:hidden">
            <div className="flex items-center gap-1.5 font-extrabold text-gray-900 text-xs">
              <QrCode className="w-4 h-4 text-[#047857]" />
              <span>Scan &amp; Pay via PhonePe / GPay</span>
            </div>
            
            <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <img src={upiQrCodeUrl} alt="UPI QR Code" className="w-24 h-24 object-contain" />
            </div>

            <div className="w-full space-y-1">
              <a
                href={upiPayLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 bg-[#047857] hover:bg-[#036448] text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-colors"
              >
                <span>Pay ₹{grandTotal.toLocaleString('en-IN')} Now</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[10px] text-gray-500 font-mono block">VPA: {upiId}</span>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">₹ {subtotal.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Total Discount:</span>
                <span className="font-bold text-emerald-700">- ₹ {discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>GST Tax Amount:</span>
              <span className="font-bold text-gray-900">₹ {taxAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-[#047857]">₹ {grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1">
              <span>Paid Amount:</span>
              <span>₹ {paidAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-xs font-bold text-red-600 pt-1 border-t border-gray-200">
              <span>Outstanding Due:</span>
              <span>₹ {dueAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer Authorization Stamp */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-end text-[11px] text-gray-400 gap-4">
          <div>
            <p className="font-bold text-gray-700">Thank you for your business!</p>
            <p>Computer generated tax invoice • VEDIXA ERP</p>
          </div>
          <div className="text-right font-mono">
            <div className="h-10 border-b border-gray-300 w-36 mb-1"></div>
            <span>Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* ZOHO / VYAPAR / TALLY STYLE INVOICE DOCUMENT PREVIEW MODAL */}
      {isWhatsappPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs"
          onClick={() => setIsWhatsappPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-gray-100 p-5 space-y-4 z-50 max-h-[92vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200 font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-gray-900">Tax Invoice Document Preview</h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Official Tax Invoice #{invoice.invoiceNumber} • Ready to Print, Download, or Share
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWhatsappPreviewOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Grid: CENTER PAPER DOCUMENT PREVIEW (col-span-8) & RIGHT SIDEBAR PANEL (col-span-4) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-hidden">
              
              {/* CENTER COLUMN: ACTUAL INVOICE DOCUMENT PAPER PREVIEW */}
              <div className="lg:col-span-8 bg-slate-100/80 p-4 rounded-2xl border border-slate-200 overflow-y-auto max-h-[64vh] shadow-inner space-y-4">
                
                {/* Paper Sheet Document Box */}
                <div className="bg-white shadow-xl border border-gray-300 rounded-xl p-6 space-y-5 text-xs text-gray-900 font-sans">
                  
                  {/* Shop & Invoice Header */}
                  <div className="flex justify-between items-start border-b-2 border-[#047857] pb-4">
                    <div className="space-y-1">
                      <h1 className="text-xl font-extrabold text-emerald-900 tracking-tight">{shopDisplayName}</h1>
                      <p className="text-xs font-semibold text-gray-700">{shopSettings.address || 'Main Road, Guntur Market Yard, AP'}</p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-gray-600">
                        <span>Phone: {shopSettings.mobile || '9848081875'}</span>
                        <span>GSTIN: {shopSettings.gstNumber || '37AABCF1234H1Z5'}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="px-3 py-1 bg-emerald-100 text-[#047857] font-extrabold text-xs rounded-md uppercase tracking-wider block">
                        TAX INVOICE
                      </span>
                      <div className="text-xs font-mono font-bold text-gray-900">#{invoice.invoiceNumber}</div>
                      <div className="text-[11px] font-mono text-gray-500">Date: {invoiceDateStr}</div>
                    </div>
                  </div>

                  {/* Customer Box */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200 font-sans text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Billed To</span>
                      <h2 className="font-extrabold text-gray-900 text-sm">{invoice.customerName || invoice.customer?.name || 'Valued Customer'}</h2>
                      <div className="text-gray-600 font-mono">Phone: {invoice.customerMobile || invoice.customer?.mobile || 'N/A'}</div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block font-sans">Payment Details</span>
                      <div>Status: <span className="font-extrabold text-emerald-700">{invoice.status || 'Paid'}</span></div>
                      <div>Method: <span className="font-bold text-gray-800">{invoice.paymentMethod || 'Cash'}</span></div>
                    </div>
                  </div>

                  {/* Billed Items Table */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-xs text-gray-900 uppercase">Billed Product Items ({items.length})</h3>
                    <div className="border border-gray-300 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-100 text-[10px] font-bold text-gray-700 uppercase border-b border-gray-300">
                          <tr>
                            <th className="py-2.5 px-3 border-r border-gray-300 text-left">Product Name</th>
                            <th className="py-2.5 px-3 border-r border-gray-300 text-center">Qty / Unit</th>
                            <th className="py-2.5 px-3 border-r border-gray-300 text-center">Rate (₹)</th>
                            <th className="py-2.5 px-3 border-r border-gray-300 text-center">Discount (₹)</th>
                            <th className="py-2.5 px-3 border-r border-gray-300 text-center">GST %</th>
                            <th className="py-2.5 px-3 text-center">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-medium text-gray-900">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-2.5 px-3 border-r border-gray-300 font-bold text-left">{item.productName || item.name || 'Agri Product'}</td>
                              <td className="py-2.5 px-3 border-r border-gray-300 text-center font-mono">{item.quantity || item.qty || 1} {item.unit || 'Bag'}</td>
                              <td className="py-2.5 px-3 border-r border-gray-300 text-center font-mono">₹ {Math.round(item.sellingPrice || item.rate || item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="py-2.5 px-3 border-r border-gray-300 text-center font-mono text-gray-500">₹ {Math.round(item.discountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                              <td className="py-2.5 px-3 border-r border-gray-300 text-center font-mono text-gray-600">{item.gstRate ?? 0}%</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                ₹ {Math.round(item.totalAmount || (item.quantity * item.sellingPrice) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Totals & Footer QR */}
                  <div className="flex justify-between items-end pt-3 border-t border-gray-300">
                    <div className="space-y-1">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-16 h-16 object-contain border border-gray-200 rounded p-1" />
                      <span className="text-[9px] font-bold text-gray-600 block">Scan to Pay via PhonePe / GPay</span>
                    </div>

                    <div className="w-64 bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600 font-medium">
                        <span className="text-left">Subtotal:</span>
                        <span className="font-mono text-right pr-3">₹ {Math.round(subtotal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span className="text-left">Paid Amount:</span>
                        <span className="font-mono text-right pr-3">₹ {Math.round(paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-600 font-bold pt-1.5 border-t border-gray-300">
                        <span className="text-left">Due Amount:</span>
                        <span className="font-mono text-right pr-3">₹ {Math.round(dueAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN: WHATSAPP OPTIONS & MESSAGE PANEL */}
              <div className="lg:col-span-4 space-y-4 flex flex-col justify-between bg-gray-50/80 p-4 rounded-2xl border border-gray-200 text-xs">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-gray-900 text-xs border-b border-gray-200 pb-2">
                    <MessageSquare className="w-4 h-4 text-[#047857]" />
                    <span>WhatsApp Share Options</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-700 block text-[11px]">Editable WhatsApp Message</label>
                    <textarea
                      rows={8}
                      value={editableMessage}
                      onChange={(e) => setEditableMessage(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-[11px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]/20 resize-none"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-gray-200">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Attachment Options</span>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 text-[11px]">
                      <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} className="rounded text-[#047857]" />
                      <span>Attach Invoice PDF Document</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 text-[11px]">
                      <input type="checkbox" checked={includeQr} onChange={(e) => setIncludeQr(e.target.checked)} className="rounded text-[#047857]" />
                      <span>Include Dynamic UPI QR Code</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-xl text-[11px] font-medium space-y-1">
                  <span className="font-bold block">📎 Attachment Note:</span>
                  <span>Share WhatsApp will download the Invoice PDF locally and open WhatsApp Web with pre-formatted text.</span>
                </div>
              </div>

            </div>

            {/* Modal Bottom Bar: Download PDF | Print | Share WhatsApp */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-gray-600" />
                  <span>Print Invoice</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWhatsappPreviewOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendFinalWhatsApp}
                  className="px-5 py-2.5 bg-[#047857] hover:bg-[#036448] text-white font-extrabold rounded-xl text-xs shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Share WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE READY TO SHARE SUCCESS DIALOG */}
      {isSuccessDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs"
          onClick={() => setIsSuccessDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-6 space-y-5 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200 shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6 text-[#047857]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-gray-900 leading-tight">Invoice Ready to Share</h2>
                <p className="text-xs text-gray-500 font-medium">WhatsApp opened in new tab • PDF downloaded to computer</p>
              </div>
            </div>

            {/* Success Message Body */}
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 space-y-2 text-xs text-gray-800">
              <p className="font-semibold leading-relaxed">
                Your Invoice PDF has been downloaded successfully. WhatsApp has been opened with the message already prepared. Please click the <span className="font-extrabold text-[#047857]">📎 (Attach)</span> icon in WhatsApp, select the downloaded Invoice PDF, and send it to the customer.
              </p>
            </div>

            {/* Downloads Location Note */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-400 shrink-0" />
              <span>The Invoice PDF has been saved to your browser's default <strong>Downloads</strong> folder.</span>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  handleDownloadPdf();
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-gray-600" />
                <span>Download Again</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSuccessDialogOpen(false)}
                className="px-5 py-2 bg-[#047857] hover:bg-[#036448] text-white font-extrabold rounded-xl text-xs shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
