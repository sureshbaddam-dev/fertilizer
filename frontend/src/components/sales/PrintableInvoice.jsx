import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { getItemUnitPrice } from '../../utils/pricing';
import { buildFullShopAddress } from '../../utils/pdfGenerator';
import { authService } from '../../services/authService';
import vedixaLogoImg from '../../assets/vedixa_logo.png';

export default function PrintableInvoice({ invoice, shopSettings = {}, className = '' }) {
  if (!invoice) return null;

  const authUser = authService.getCurrentUser() || {};

  const shopDisplayName =
    shopSettings.shopName ||
    shopSettings.businessName ||
    shopSettings.name ||
    authUser.shopName ||
    authUser.businessName ||
    authUser.ownerName ||
    'VEDIXA AGRI SOLUTIONS';

  const fullShopAddress = buildFullShopAddress(shopSettings) || 'Main Road, Market Yard, Andhra Pradesh';
  const shopGST = shopSettings.gstNumber || shopSettings.gstin || shopSettings.gstNo || '-';
  const shopPhone =
    shopSettings.whatsappNumber ||
    shopSettings.mobile ||
    shopSettings.phone ||
    '-';

  const rawDate = invoice.date || invoice.createdAt || new Date();
  const invoiceDateStr = typeof rawDate === 'string' && rawDate.includes('T')
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(rawDate);

  const invoiceTimeStr = invoice.createdAt || invoice.date
    ? new Date(invoice.createdAt || invoice.date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = Number(invoice.subtotal || invoice.subTotal || invoice.totalAmount || 0);
  const discountAmount = Number(invoice.discountAmount || invoice.discount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const grandTotal = Number(invoice.grandTotal || invoice.totalAmount || invoice.total || (subtotal - discountAmount));
  const currentPaid = Number(invoice.paidAmount !== undefined ? invoice.paidAmount : (invoice.paid || 0));
  const currentDue = Number(invoice.dueAmount !== undefined ? invoice.dueAmount : (invoice.due !== undefined ? invoice.due : Math.max(0, grandTotal - currentPaid)));

  const currentStatus =
    invoice.status ||
    (currentDue <= 0 ? 'PAID' : currentPaid > 0 ? 'PARTIAL' : 'DUE');

  return (
    <div
      className={`printable-invoice-paper bg-white border border-gray-300 rounded-2xl p-6 sm:p-8 space-y-5 font-sans text-xs text-gray-900 leading-normal ${className}`}
    >
      {/* 1. Header: Top-Left VEDIXA Logo & Top-Right Shop Details */}
      <div className="flex justify-between items-center pb-4 border-b-2 border-emerald-800 gap-4">
        {/* Top-Left: VEDIXA Logo Only */}
        <div className="flex items-center">
          <img
            src={vedixaLogoImg}
            alt="VEDIXA"
            className="h-16 max-h-18 w-auto max-w-[170px] object-contain select-none"
          />
        </div>

        {/* Top-Right: Shop / Business Details */}
        <div className="text-right space-y-0.5 max-w-md">
          <h1 className="text-base sm:text-lg font-black text-gray-950 uppercase tracking-tight leading-tight">
            {shopDisplayName}
          </h1>
          {fullShopAddress && (
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed break-words">
              {fullShopAddress}
            </p>
          )}
          {shopGST && shopGST !== '-' && (
            <div className="text-[11px] text-gray-700 font-mono font-medium">
              <strong>GSTIN:</strong> {shopGST}
            </div>
          )}
          {(shopSettings.email || authUser.email) && (
            <div className="text-[11px] text-gray-700 font-mono font-medium">
              <strong>Email:</strong> {shopSettings.email || authUser.email}
            </div>
          )}
          {shopPhone && shopPhone !== '-' && (
            <div className="text-[11px] text-gray-700 font-mono font-medium">
              <strong>Phone:</strong> {shopPhone}
            </div>
          )}
        </div>
      </div>

      {/* 2. Large TAX INVOICE Title Bar with Status Pill */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-black text-[#047857] tracking-wider uppercase">
            TAX INVOICE
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            Original for Recipient
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase">Payment Status:</span>
          <span
            className={`px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${
              currentStatus === 'PAID' || currentStatus === 'Paid'
                ? 'bg-emerald-50 text-[#047857] border-emerald-300'
                : currentStatus === 'PARTIAL' || currentStatus === 'Partial'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {currentStatus}
          </span>
        </div>
      </div>

      {/* 3. Invoice & Customer Information (Two-Column Layout) */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200 text-xs">
        {/* Left Column: Billed To / Customer */}
        <div className="space-y-1">
          <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider block">
            Billed To Customer
          </span>
          <span className="text-sm font-black text-gray-950 block">
            {invoice.customerName || invoice.customer?.name || 'General Customer'}
          </span>
          <div className="flex items-center gap-1.5 text-gray-700 text-xs font-mono">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{invoice.customerMobile || invoice.customer?.mobile || invoice.customer?.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{invoice.customerAddress || invoice.customer?.village || invoice.customer?.address || '—'}</span>
          </div>
          {invoice.customer?.gstin && (
            <div className="text-[11px] text-gray-700 font-mono pt-0.5">
              <strong>GSTIN:</strong> {invoice.customer.gstin}
            </div>
          )}
        </div>

        {/* Right Column: Invoice Details */}
        <div className="space-y-1.5 text-right flex flex-col items-end justify-center font-mono">
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-gray-500 font-bold uppercase text-[10px] font-sans">Invoice No:</span>
            <span className="text-sm font-black text-[#047857]">
              {invoice.invoiceNumber || invoice.refNo || 'INV'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 text-[11px]">
            <span className="text-gray-500 font-medium font-sans">Invoice Date:</span>
            <span className="font-bold text-gray-900">{invoiceDateStr} {invoiceTimeStr ? `• ${invoiceTimeStr}` : ''}</span>
          </div>

          <div className="flex items-center justify-end gap-2 text-[11px]">
            <span className="text-gray-500 font-medium font-sans">Payment Mode:</span>
            <span className="font-bold text-gray-900">{invoice.paymentMode || invoice.paymentMethod || 'Cash'}</span>
          </div>

          <div className="flex items-center justify-end gap-2 text-[11px]">
            <span className="text-gray-500 font-medium font-sans">Outstanding Due:</span>
            <span className={`font-bold ${currentDue <= 0 ? 'text-[#047857]' : 'text-red-600'}`}>
              ₹ {Math.round(currentDue).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Full-Width Professional Product Items Table */}
      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-xs border-collapse print-invoice-table font-sans">
          <thead className="bg-gray-100 border-b border-gray-300 text-gray-800 font-black uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-2 text-center align-middle w-[5%]">#</th>
              <th className="py-2.5 px-3 text-left align-middle w-[37%]">Product Description</th>
              <th className="py-2.5 px-2 text-center align-middle w-[14%]">Qty / Unit</th>
              <th className="py-2.5 px-3 text-right align-middle w-[14%]">Rate (₹)</th>
              <th className="py-2.5 px-3 text-right align-middle w-[12%]">Discount (₹)</th>
              <th className="py-2.5 px-3 text-right align-middle w-[18%]">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-medium text-gray-900 text-xs">
            {(() => {
              const rawSubtotal = items.reduce(
                (sum, it) => sum + Number(it.quantity || it.qty || 1) * getItemUnitPrice(it),
                0
              );
              const billDisc = Number(invoice.discountAmount || invoice.discount || 0);

              return items.map((item, idx) => {
                const pName = item.productName || item.product?.name || item.name || 'Agri Item';
                const qty = Number(item.quantity || item.qty || 1);
                const unit =
                  item.unit ||
                  item.unitName ||
                  item.unitId?.shortName ||
                  item.product?.defaultUnitId?.shortName ||
                  'Bag';
                const rate = getItemUnitPrice(item);
                const itemGross = qty * rate;
                const disc = Number(item.discountAmount || item.discount || 0);
                const effectiveDisc =
                  disc > 0
                    ? disc
                    : billDisc > 0 && rawSubtotal > 0
                    ? Math.round((itemGross / rawSubtotal) * billDisc * 100) / 100
                    : 0;
                const rowTotal = Math.max(0, itemGross - effectiveDisc);

                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-2 text-center text-gray-500 align-middle font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-left font-bold text-gray-950 align-middle break-words">
                      {pName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-900 align-middle whitespace-nowrap font-mono">
                      {qty} {unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900 align-middle whitespace-nowrap font-mono">
                      ₹ {Math.round(rate).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#047857] align-middle whitespace-nowrap font-mono">
                      {effectiveDisc > 0 ? `₹ ${Math.round(effectiveDisc).toLocaleString('en-IN')}` : '₹ 0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-gray-950 align-middle whitespace-nowrap font-mono">
                      ₹ {Math.round(rowTotal).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* 5. Totals Section & Notes */}
      <div className="flex justify-between items-start pt-1 gap-4 print-avoid-break">
        {/* Left Side: Notes & Terms */}
        <div className="flex-1 space-y-1.5 max-w-sm pt-1">
          {invoice.notes && (
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs">
              <span className="font-bold text-gray-700 block text-[10px] uppercase">Notes / Remarks:</span>
              <p className="text-gray-600 italic text-[11px]">{invoice.notes}</p>
            </div>
          )}
          <div className="text-[10px] text-gray-400 space-y-0.5">
            <p>• Goods once sold cannot be returned after 7 days.</p>
            <p>• Certified genuine agri inputs from licensed distributors.</p>
          </div>
        </div>

        {/* Right Side: Totals Breakdown Box */}
        <div className="w-72 sm:w-80 bg-gray-50/90 p-3.5 rounded-xl border border-gray-300 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-gray-600 text-xs">
            <span>Subtotal:</span>
            <span className="font-bold text-gray-950">₹ {Math.round(subtotal).toLocaleString('en-IN')}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 text-xs">
              <span>Total Discount:</span>
              <span className="font-bold">- ₹ {Math.round(discountAmount).toLocaleString('en-IN')}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between text-gray-600 text-xs">
              <span>GST Tax Amount:</span>
              <span className="font-bold text-gray-950">₹ {Math.round(taxAmount).toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black text-gray-950 py-2 border-y-2 border-gray-300">
            <span>Invoice Total:</span>
            <span className="text-[#047857] text-base font-black">₹ {Math.round(grandTotal).toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-[#047857]">
            <span>Paid Amount:</span>
            <span>₹ {Math.round(currentPaid).toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between text-xs font-bold text-red-600 pt-1 border-t border-gray-200">
            <span>Invoice Outstanding:</span>
            <span>₹ {Math.round(currentDue).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 6. Professional Footer & Signatory Area */}
      <div className="pt-4 border-t border-gray-300 flex justify-between items-end text-xs text-gray-500 print-avoid-break">
        <div className="space-y-0.5">
          <p className="font-black text-gray-900 text-xs">Thank you for your business!</p>
          <p className="text-[10px]">Computer Generated Tax Invoice • Powered by VEDIXA ERP</p>
        </div>

        <div className="text-right font-mono">
          <div className="text-[10px] font-bold text-gray-700 uppercase mb-6">For {shopDisplayName}</div>
          <div className="h-0.5 border-b border-gray-400 w-44 mb-1 ml-auto"></div>
          <span className="text-[10px] font-bold text-gray-700 block">Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
}
