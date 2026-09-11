import { getItemUnitPrice } from './pricing';
import { buildFullShopAddress } from './pdfGenerator';
import { authService } from '../services/authService';
import vedixaLogoImg from '../assets/vedixa_logo.png';

/**
 * Builds a clean, professional, print-ready HTML string for an A4 Tax Invoice.
 * 100% pure HTML & CSS document — NO canvas, NO screenshots, NO images-of-DOM.
 */
export function buildInvoiceHtml(invoice, shopSettings = {}) {
  if (!invoice) return '';

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
  const shopEmail = shopSettings.email || authUser.email || '';
  const logoSrc = vedixaLogoImg;

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

  const currentStatus = (
    invoice.status ||
    (currentDue <= 0 ? 'PAID' : currentPaid > 0 ? 'PARTIAL' : 'DUE')
  ).toUpperCase();

  const statusBg = currentStatus === 'PAID' ? '#ecfdf5' : currentStatus === 'PARTIAL' ? '#eff6ff' : '#fffbeb';
  const statusColor = currentStatus === 'PAID' ? '#047857' : currentStatus === 'PARTIAL' ? '#1d4ed8' : '#b45309';
  const statusBorder = currentStatus === 'PAID' ? '#a7f3d0' : currentStatus === 'PARTIAL' ? '#bfdbfe' : '#fde68a';

  const rawSubtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || it.qty || 1) * getItemUnitPrice(it),
    0
  );
  const billDisc = Number(invoice.discountAmount || invoice.discount || 0);

  const itemRowsHtml = items.map((item, idx) => {
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

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 6px 4px; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 6px 8px; text-align: left; font-weight: 700; color: #0f172a;">${pName}</td>
        <td style="padding: 6px 4px; text-align: center; font-weight: 700; color: #1e293b; font-family: monospace; white-space: nowrap;">${qty} ${unit}</td>
        <td style="padding: 6px 8px; text-align: right; color: #1e293b; font-family: monospace; white-space: nowrap;">₹ ${Math.round(rate).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #047857; font-family: monospace; white-space: nowrap;">${effectiveDisc > 0 ? `₹ ${Math.round(effectiveDisc).toLocaleString('en-IN')}` : '₹ 0'}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f172a; font-family: monospace; white-space: nowrap;">₹ ${Math.round(rowTotal).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  const customerName = invoice.customerName || invoice.customer?.name || 'General Customer';
  const customerPhone = invoice.customerMobile || invoice.customer?.mobile || invoice.customer?.phone || 'N/A';
  const customerAddr = invoice.customerAddress || invoice.customer?.village || invoice.customer?.address || '—';
  const customerGstin = invoice.customer?.gstin || '';
  const invoiceNo = invoice.invoiceNumber || invoice.refNo || 'INV';
  const paymentMode = invoice.paymentMode || invoice.paymentMethod || 'Cash';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0 auto;
      width: 100%;
      max-width: 194mm;
    }
    .invoice-card {
      background: #ffffff;
      padding: 16px 20px;
      width: 100%;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2px solid #047857;
      gap: 16px;
    }
    .brand-box {
      display: flex;
      align-items: center;
    }
    .brand-logo {
      height: 64px;
      max-height: 72px;
      width: auto;
      max-width: 170px;
      object-fit: contain;
    }
    .shop-details {
      text-align: right;
      max-width: 380px;
    }
    .shop-name {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    .shop-addr {
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 2px;
    }
    .shop-meta {
      font-size: 10px;
      color: #334155;
      font-family: monospace;
      line-height: 1.35;
    }
    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-top: 10px;
    }
    .title-text {
      font-size: 13px;
      font-weight: 900;
      color: #047857;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .title-sub {
      font-size: 9.5px;
      color: #94a3b8;
      font-family: monospace;
      margin-left: 8px;
    }
    .status-pill {
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-top: 10px;
    }
    .info-label {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 2px;
    }
    .customer-name {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      display: block;
      margin-bottom: 3px;
    }
    .info-line {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.35;
    }
    .table-container {
      margin-top: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    thead {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
    }
    th {
      padding: 7px 8px;
      font-size: 9.5px;
      font-weight: 900;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .notes-box {
      flex: 1;
      max-width: 320px;
    }
    .notes-card {
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 6px;
    }
    .terms-text {
      font-size: 9px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .totals-box {
      width: 250px;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-family: monospace;
      font-size: 11px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      color: #475569;
      margin-bottom: 4px;
    }
    .totals-row.grand-total {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      padding: 6px 0;
      border-top: 1.5px solid #cbd5e1;
      border-bottom: 1.5px solid #cbd5e1;
      margin: 6px 0;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 12px;
      margin-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 9.5px;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-area {
      text-align: right;
      font-family: monospace;
    }
    .signature-line {
      border-bottom: 1px solid #64748b;
      width: 150px;
      margin: 28px 0 3px auto;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    
    <!-- 1. Header: VEDIXA Logo (Left) & Shop Details (Right) -->
    <div class="header-row">
      <div class="brand-box">
        <img src="${logoSrc}" alt="VEDIXA" class="brand-logo" />
      </div>
      <div class="shop-details">
        <h1 class="shop-name">${shopDisplayName}</h1>
        ${fullShopAddress ? `<p class="shop-addr">${fullShopAddress}</p>` : ''}
        ${shopGST && shopGST !== '-' ? `<div class="shop-meta"><strong>GSTIN:</strong> ${shopGST}</div>` : ''}
        ${shopEmail ? `<div class="shop-meta"><strong>Email:</strong> ${shopEmail}</div>` : ''}
        ${shopPhone && shopPhone !== '-' ? `<div class="shop-meta"><strong>Phone:</strong> ${shopPhone}</div>` : ''}
      </div>
    </div>

    <!-- 2. TAX INVOICE Title Bar -->
    <div class="title-bar">
      <div>
        <span class="title-text">TAX INVOICE</span>
        <span class="title-sub">Original for Recipient</span>
      </div>
      <div class="status-pill">${currentStatus}</div>
    </div>

    <!-- 3. Customer & Invoice Info Grid -->
    <div class="info-grid">
      <!-- Left: Customer -->
      <div>
        <span class="info-label">Billed To Customer</span>
        <span class="customer-name">${customerName}</span>
        <div class="info-line">📞 <strong>Phone:</strong> ${customerPhone}</div>
        <div class="info-line">📍 <strong>Address:</strong> ${customerAddr}</div>
        ${customerGstin ? `<div class="info-line">🏷️ <strong>GSTIN:</strong> ${customerGstin}</div>` : ''}
      </div>

      <!-- Right: Invoice Metadata -->
      <div style="text-align: right; font-family: monospace;">
        <div style="font-size: 12px; margin-bottom: 3px;">
          <span style="color: #64748b; font-family: sans-serif; font-size: 9.5px; font-weight: 700;">INVOICE NO:</span>
          <strong style="color: #047857; font-size: 13px;">${invoiceNo}</strong>
        </div>
        <div class="info-line">
          <span style="color: #64748b; font-family: sans-serif; font-size: 9.5px;">Date:</span>
          <strong>${invoiceDateStr} ${invoiceTimeStr ? `• ${invoiceTimeStr}` : ''}</strong>
        </div>
        <div class="info-line">
          <span style="color: #64748b; font-family: sans-serif; font-size: 9.5px;">Payment Mode:</span>
          <strong>${paymentMode}</strong>
        </div>
        <div class="info-line">
          <span style="color: #64748b; font-family: sans-serif; font-size: 9.5px;">Outstanding Due:</span>
          <strong style="color: ${currentDue <= 0 ? '#047857' : '#dc2626'}; font-size: 11.5px;">₹ ${Math.round(currentDue).toLocaleString('en-IN')}</strong>
        </div>
      </div>
    </div>

    <!-- 4. Product Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">#</th>
            <th style="width: 38%; text-align: left;">Product Description</th>
            <th style="width: 14%; text-align: center;">Qty / Unit</th>
            <th style="width: 14%; text-align: right;">Rate (₹)</th>
            <th style="width: 12%; text-align: right;">Discount (₹)</th>
            <th style="width: 17%; text-align: right;">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 5. Totals Section & Notes -->
    <div class="bottom-section">
      <div class="notes-box">
        ${invoice.notes ? `
          <div class="notes-card">
            <span style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; display: block;">Notes / Remarks:</span>
            <p style="font-size: 10px; color: #475569; font-style: italic; margin-top: 2px;">${invoice.notes}</p>
          </div>
        ` : ''}
        <div class="terms-text">
          <p>• Goods once sold cannot be returned after 7 days.</p>
          <p>• Certified genuine agri inputs from licensed distributors.</p>
        </div>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span style="font-weight: 700; color: #0f172a;">₹ ${Math.round(subtotal).toLocaleString('en-IN')}</span>
        </div>
        ${discountAmount > 0 ? `
          <div class="totals-row" style="color: #047857;">
            <span>Total Discount:</span>
            <span style="font-weight: 700;">- ₹ ${Math.round(discountAmount).toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        ${taxAmount > 0 ? `
          <div class="totals-row">
            <span>GST Tax:</span>
            <span style="font-weight: 700; color: #0f172a;">₹ ${Math.round(taxAmount).toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="totals-row grand-total">
          <span>Invoice Total:</span>
          <span style="color: #047857; font-size: 14px;">₹ ${Math.round(grandTotal).toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row" style="color: #047857; font-weight: 700;">
          <span>Paid Amount:</span>
          <span>₹ ${Math.round(currentPaid).toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row" style="color: ${currentDue > 0 ? '#dc2626' : '#047857'}; font-weight: 700; padding-top: 3px; border-top: 1px solid #e2e8f0;">
          <span>Invoice Due:</span>
          <span>₹ ${Math.round(currentDue).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- 6. Footer & Signatory Area -->
    <div class="footer-row">
      <div>
        <p style="font-weight: 800; color: #0f172a; font-size: 10.5px; margin-bottom: 2px;">Thank you for your business!</p>
        <p style="color: #94a3b8; font-size: 8.5px;">Computer Generated Tax Invoice • Powered by VEDIXA ERP</p>
      </div>
      <div class="signature-area">
        <div style="font-size: 9px; font-weight: 700; color: #475569; text-transform: uppercase;">For ${shopDisplayName}</div>
        <div class="signature-line"></div>
        <span style="font-size: 8.5px; font-weight: 700; color: #475569; display: block;">Authorized Signatory</span>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Triggers native browser print dialog for the real HTML/CSS Tax Invoice via an isolated hidden iframe.
 * Absolutely NO screenshots, NO canvas capture, NO images-of-DOM, NO toast interference.
 */
export async function printInvoiceHtml(invoice, shopSettings = {}) {
  const htmlContent = buildInvoiceHtml(invoice, shopSettings);
  if (!htmlContent) return false;

  let iframe = document.getElementById('vedixa-invoice-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'vedixa-invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  return new Promise((resolve) => {
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      resolve(false);
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give iframe resources (images & fonts) a moment to render before triggering print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        resolve(true);
      } catch (err) {
        console.error('Invoice iframe print failed:', err);
        resolve(false);
      }
    }, 150);
  });
}
