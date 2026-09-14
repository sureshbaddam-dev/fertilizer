import React from 'react';
import { getItemUnitPrice } from '../../utils/pricing';
import { buildFullShopAddress } from '../../utils/pdfGenerator';
import { authService } from '../../services/authService';

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
    'Dhanvantari Fertilizers';

  const fullShopAddress = buildFullShopAddress(shopSettings) || '';
  const shopPhone =
    shopSettings.whatsappNumber ||
    shopSettings.mobile ||
    shopSettings.phone ||
    authUser.mobile ||
    '';
  const shopEmail = shopSettings.email || authUser.email || '';
  const shopGST = shopSettings.gstNumber || shopSettings.gstin || shopSettings.gstNo || '';

  const rawDate = invoice.date || invoice.createdAt || new Date();
  const invoiceDateStr = typeof rawDate === 'string' && rawDate.includes('T')
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(rawDate);

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = Number(invoice.subtotal || invoice.subTotal || invoice.totalAmount || 0);
  const discountAmount = Number(invoice.discountAmount || invoice.discount || 0);
  const taxAmount = Number(invoice.taxAmount || 0);
  const grandTotal = Number(invoice.grandTotal || invoice.totalAmount || invoice.total || (subtotal - discountAmount));
  const currentPaid = Number(invoice.paidAmount !== undefined ? invoice.paidAmount : (invoice.paid || 0));
  const currentDue = Number(invoice.dueAmount !== undefined ? invoice.dueAmount : (invoice.due !== undefined ? invoice.due : Math.max(0, grandTotal - currentPaid)));

  const currentStatus = (
    invoice.status ||
    (currentDue <= 0 ? 'PAID' : currentPaid > 0 ? 'PARTIAL' : 'DUE')
  ).toUpperCase();

  const customerName = invoice.customerName || invoice.customer?.name || 'Walk-in Customer';
  const customerPhone = invoice.customerMobile || invoice.customer?.mobile || invoice.customer?.phone || 'N/A';
  const customerAddr = invoice.customerAddress || invoice.customer?.village || invoice.customer?.address || 'N/A';
  const customerGstin = invoice.customer?.gstin || '';
  const invoiceNo = invoice.invoiceNumber || invoice.refNo || 'INV-001';
  const paymentMode = invoice.paymentMode || invoice.paymentMethod || 'Cash';

  const rawSubtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || it.qty || 1) * getItemUnitPrice(it),
    0
  );
  const billDisc = Number(invoice.discountAmount || invoice.discount || 0);

  const formatCurrency = (val) => `Rs. ${Math.round(Number(val || 0)).toLocaleString('en-IN')}`;

  return (
    <div
      className={`printable-invoice-paper bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-4 font-sans text-xs text-gray-900 leading-normal max-w-[800px] mx-auto shadow-sm print:shadow-none print:border-none print:p-0 ${className}`}
    >
      {/* 1. BUSINESS HEADER */}
      <div className="flex justify-between items-start pb-2 gap-4">
        {/* Left: Shop Name & Details */}
        <div className="space-y-0.5 max-w-lg">
          <h1 className="text-lg sm:text-xl font-bold text-[#047857] leading-tight tracking-tight">
            {shopDisplayName}
          </h1>
          {fullShopAddress && fullShopAddress !== '-' && (
            <p className="text-[11px] text-gray-600 font-normal leading-tight">
              {fullShopAddress}
            </p>
          )}
          <div className="text-[11px] text-gray-600 font-normal flex flex-wrap items-center gap-1.5 pt-0.5">
            {shopPhone && shopPhone !== '-' && (
              <span>Phone: {shopPhone}</span>
            )}
            {shopPhone && shopPhone !== '-' && shopEmail && <span>|</span>}
            {shopEmail && (
              <span>Email: {shopEmail}</span>
            )}
            {shopGST && shopGST !== '-' && (
              <>
                <span>|</span>
                <span>GSTIN: {shopGST}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: VEDIXA Branding */}
        <div className="text-right shrink-0 pt-0.5">
          <span className="text-xs sm:text-sm font-black text-[#047857] tracking-wider uppercase">
            VEDIXA
          </span>
        </div>
      </div>

      {/* Thin professional green divider */}
      <div className="h-[2px] bg-[#047857] w-full" />

      {/* 2. INVOICE TITLE */}
      <div className="pt-1">
        <h2 className="text-xs sm:text-sm font-extrabold text-gray-950 uppercase tracking-wide">
          TAX INVOICE
        </h2>
      </div>

      {/* 3. CUSTOMER + INVOICE DETAILS (2-Column Grid) */}
      <div className="grid grid-cols-2 gap-4 text-xs pt-1">
        {/* Left: Customer Info */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-32 shrink-0">Customer Name :</span>
            <span className="font-bold text-gray-950">{customerName}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-32 shrink-0">Customer Phone :</span>
            <span className="font-normal text-gray-800">{customerPhone}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-32 shrink-0">Customer Address:</span>
            <span className="font-normal text-gray-800">{customerAddr}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-32 shrink-0">Invoice Date :</span>
            <span className="font-normal text-gray-800">{invoiceDateStr}</span>
          </div>
          {customerGstin && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-gray-700 font-normal w-32 shrink-0">Customer GSTIN :</span>
              <span className="font-medium text-gray-800">{customerGstin}</span>
            </div>
          )}
        </div>

        {/* Right: Invoice Meta */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-28 shrink-0">Invoice No :</span>
            <span className="font-bold text-[#047857]">{invoiceNo}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-28 shrink-0">Payment Mode:</span>
            <span className="font-normal text-gray-800">{paymentMode}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-700 font-normal w-28 shrink-0">Status :</span>
            <span
              className={`font-bold ${
                currentStatus === 'PAID'
                  ? 'text-[#047857]'
                  : currentStatus === 'DUE'
                  ? 'text-red-600'
                  : 'text-amber-700'
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ITEMS TABLE */}
      <div className="pt-2 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#047857] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-[6%]">#</th>
              <th className="py-2.5 px-4 text-center w-[36%]">PRODUCT DESCRIPTION</th>
              <th className="py-2.5 px-3 text-center w-[14%]">QTY / UNIT</th>
              <th className="py-2.5 px-3 text-center w-[14%]">RATE</th>
              <th className="py-2.5 px-3 text-center w-[14%]">DISCOUNT</th>
              <th className="py-2.5 px-4 text-right w-[16%]">TOTAL AMOUNT</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {items.map((item, idx) => {
              const pName = item.productName || item.product?.name || item.name || 'Agri Item';
              const qty = Number(item.quantity || item.qty || 1);
              const unit =
                item.unit ||
                item.unitName ||
                item.unitId?.shortName ||
                item.product?.defaultUnitId?.shortName ||
                'bot';
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
                <tr
                  key={idx}
                  className={`${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} border-b border-gray-100 hover:bg-emerald-50/30 transition`}
                >
                  <td className="py-2.5 px-3 text-center text-gray-600 font-normal">{idx + 1}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-gray-950 break-words">{pName}</td>
                  <td className="py-2.5 px-3 text-center text-gray-800 font-normal whitespace-nowrap">{qty} {unit}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-gray-950 whitespace-nowrap">{formatCurrency(rate)}</td>
                  <td className="py-2.5 px-3 text-center text-gray-700 font-normal whitespace-nowrap">
                    {effectiveDisc > 0 ? formatCurrency(effectiveDisc) : 'Rs. 0'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-gray-950 whitespace-nowrap">{formatCurrency(rowTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. STATEMENT SUMMARY SECTION (Right Side) */}
      <div className="flex justify-end pt-3">
        <div className="w-64 sm:w-72 rounded-xl border border-slate-300/80 bg-[#f8fafc] p-3.5 space-y-1.5 text-xs">
          <h3 className="text-xs font-bold text-[#047857] uppercase tracking-wide pb-1">
            STATEMENT SUMMARY
          </h3>

          <div className="flex justify-between items-center text-gray-700">
            <span className="font-normal">Subtotal:</span>
            <span className="font-bold text-gray-950">{formatCurrency(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-red-600">
              <span className="font-normal">Discount:</span>
              <span className="font-bold">- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-normal">Tax Amount:</span>
              <span className="font-bold text-gray-950">{formatCurrency(taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-950 pt-0.5">
            <span className="font-bold">Grand Total:</span>
            <span className="font-bold text-gray-950">{formatCurrency(grandTotal)}</span>
          </div>

          <div className="flex justify-between items-center text-[#047857]">
            <span className="font-bold">Paid Amount:</span>
            <span className="font-bold">{formatCurrency(currentPaid)}</span>
          </div>

          <div className="flex justify-between items-center pt-0.5">
            <span className="font-bold text-gray-700">Due Amount:</span>
            <span className={`font-bold ${currentDue > 0 ? 'text-red-600' : 'text-[#047857]'}`}>
              {formatCurrency(currentDue)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. FOOTER */}
      <div className="pt-10 sm:pt-14 pb-2 text-center space-y-1">
        <p className="text-xs sm:text-sm font-bold text-[#047857]">
          Thank You For Your Business! Visit Again.
        </p>
        <p className="text-[10px] text-gray-400 font-normal">
          This is a Computer Generated Tax Invoice • Powered by VEDIXA ERP
        </p>
      </div>
    </div>
  );
}

