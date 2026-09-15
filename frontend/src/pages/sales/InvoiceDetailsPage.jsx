import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  FileText,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit,
  Trash2,
  ExternalLink,
  MessageSquare,
  X,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { useSettings } from '../../contexts/SettingsContext';
import { authService } from '../../services/authService';
import { buildFullShopAddress, generateInvoicePdf } from '../../utils/pdfGenerator';
import PrintableInvoice from '../../components/sales/PrintableInvoice';
import { printInvoiceHtml } from '../../utils/invoicePrintHelper';
import { toast } from '../../contexts/ToastContext';

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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
      setDeleteConfirmText('');
      toast.success('Bill deleted successfully');
      navigate(-1);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete invoice';
      toast.error(msg);
      setDeleteErrorMsg(msg);
    },
  });

  const handleEditInvoice = () => {
    const idToUse = invoice?._id || invoiceId;
    navigate(`/invoices/${idToUse}/edit`);
  };

  const handleOpenDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteConfirmText('');
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(false);
  };

  const handleDeleteInvoice = () => {
    if (!invoice || deleteConfirmText !== 'DELETE' || deleteMutation.isPending) return;
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

  const handlePrint = async () => {
    if (!invoice) return;
    await printInvoiceHtml(invoice, shopSettings);
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
          Back
        </button>
      </div>
    );
  }

  const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];

  const subtotal = Number(invoice.subtotal || invoice.totalAmount || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const grandTotal = Number(invoice.totalAmount || 0);
  const currentPaid = invoice.currentPaid !== undefined ? Number(invoice.currentPaid) : Number(invoice.paidAmount || 0);
  const currentDue = invoice.currentDue !== undefined ? Number(invoice.currentDue) : Math.max(0, grandTotal - currentPaid);
  const currentStatus = invoice.currentStatus || (currentDue <= 0 ? 'Paid' : currentPaid > 0 ? 'Partial' : (invoice.status || 'Unpaid'));

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
          <span>Back</span>
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
            onClick={handleOpenDeleteModal}
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
                  ⚠️ Are you sure you want to delete this invoice? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* IMPORTANT Instruction Box */}
            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/90 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>IMPORTANT</span>
              </div>
              <p className="text-[11px] font-semibold text-gray-700">Deleting this invoice will:</p>
              <ul className="text-[11px] text-gray-700 space-y-1 list-disc list-inside font-medium pl-1">
                <li>Restore the sold inventory stock</li>
                <li>Remove this invoice from the customer ledger</li>
                <li>Reverse the invoice amount from customer outstanding</li>
                <li>Reverse/remove payment allocation related to this invoice, if applicable</li>
                <li>Recalculate customer outstanding / advance balance</li>
                <li>Update dashboard and reports</li>
              </ul>
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
                onClick={handleDeleteInvoice}
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

      {/* Main Printable Tax Invoice Document Card */}
      <PrintableInvoice invoice={invoice} shopSettings={shopSettings} />

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
                <PrintableInvoice invoice={invoice} shopSettings={shopSettings} />
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
