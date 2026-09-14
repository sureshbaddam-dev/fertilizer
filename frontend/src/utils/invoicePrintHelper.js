import { getItemUnitPrice } from './pricing';
import { buildFullShopAddress } from './pdfGenerator';
import { authService } from '../services/authService';

/**
 * Builds a clean, professional, print-ready HTML string for an A4 Tax Invoice.
 * 100% pure HTML & CSS document matching the official VEDIXA Tax Invoice design.
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

  const itemRowsHtml = items.map((item, idx) => {
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

    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 10px; text-align: center; color: #475569;">${idx + 1}</td>
        <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: #0f172a;">${pName}</td>
        <td style="padding: 8px 10px; text-align: center; color: #1e293b; white-space: nowrap;">${qty} ${unit}</td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f172a; white-space: nowrap;">${formatCurrency(rate)}</td>
        <td style="padding: 8px 10px; text-align: center; color: #475569; white-space: nowrap;">${effectiveDisc > 0 ? formatCurrency(effectiveDisc) : 'Rs. 0'}</td>
        <td style="padding: 8px 14px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">${formatCurrency(rowTotal)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0 auto;
      width: 100%;
      max-width: 194mm;
    }
    .invoice-card {
      background: #ffffff;
      padding: 4px 6px;
      width: 100%;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
    }
    .shop-details {
      max-width: 480px;
    }
    .shop-name {
      font-size: 18px;
      font-weight: 800;
      color: #047857;
      line-height: 1.2;
      margin-bottom: 3px;
    }
    .shop-addr {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 2px;
    }
    .shop-meta {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.35;
    }
    .brand-title {
      font-size: 13px;
      font-weight: 900;
      color: #047857;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding-top: 2px;
    }
    .green-divider {
      height: 2px;
      background: #047857;
      width: 100%;
      margin: 4px 0 10px 0;
    }
    .title-row {
      margin-bottom: 8px;
    }
    .invoice-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 16px;
      font-size: 11px;
      margin-bottom: 12px;
    }
    .info-item {
      display: flex;
      margin-bottom: 3px;
    }
    .info-label {
      color: #334155;
      width: 120px;
      flex-shrink: 0;
    }
    .info-label-right {
      color: #334155;
      width: 100px;
      flex-shrink: 0;
    }
    .info-val {
      color: #0f172a;
    }
    .info-val.bold {
      font-weight: 700;
    }
    .info-val.green-bold {
      font-weight: 700;
      color: #047857;
    }
    .table-container {
      margin-top: 6px;
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    thead tr {
      background-color: #047857 !important;
      color: #ffffff !important;
    }
    th {
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-card {
      width: 260px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 10.5px;
    }
    .summary-title {
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
      padding-bottom: 3px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
      color: #334155;
    }
    .summary-row.grand-total {
      color: #0f172a;
      font-weight: 700;
      padding-top: 2px;
    }
    .summary-row.paid {
      color: #047857;
      font-weight: 700;
    }
    .summary-row.due {
      font-weight: 700;
      padding-top: 2px;
    }
    .footer-section {
      margin-top: 40px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .thank-you-text {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      margin-bottom: 3px;
    }
    .powered-by-text {
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    
    <!-- 1. Header: Shop Details (Left) & VEDIXA (Right) -->
    <div class="header-row">
      <div class="shop-details">
        <h1 class="shop-name">${shopDisplayName}</h1>
        ${fullShopAddress ? `<p class="shop-addr">${fullShopAddress}</p>` : ''}
        <div class="shop-meta">
          ${shopPhone ? `Phone: ${shopPhone}` : ''}
          ${shopPhone && shopEmail ? ' | ' : ''}
          ${shopEmail ? `Email: ${shopEmail}` : ''}
          ${shopGST ? ` | GSTIN: ${shopGST}` : ''}
        </div>
      </div>
      <div class="brand-title">VEDIXA</div>
    </div>

    <!-- Green divider line -->
    <div class="green-divider"></div>

    <!-- 2. TAX INVOICE Title -->
    <div class="title-row">
      <h2 class="invoice-title">TAX INVOICE</h2>
    </div>

    <!-- 3. Customer & Invoice Details -->
    <div class="info-grid">
      <!-- Left: Customer -->
      <div>
        <div class="info-item">
          <span class="info-label">Customer Name :</span>
          <span class="info-val bold">${customerName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Customer Phone :</span>
          <span class="info-val">${customerPhone}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Customer Address:</span>
          <span class="info-val">${customerAddr}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Invoice Date :</span>
          <span class="info-val">${invoiceDateStr}</span>
        </div>
        ${customerGstin ? `
          <div class="info-item">
            <span class="info-label">Customer GSTIN :</span>
            <span class="info-val">${customerGstin}</span>
          </div>
        ` : ''}
      </div>

      <!-- Right: Invoice Metadata -->
      <div>
        <div class="info-item">
          <span class="info-label-right">Invoice No :</span>
          <span class="info-val green-bold">${invoiceNo}</span>
        </div>
        <div class="info-item">
          <span class="info-label-right">Payment Mode:</span>
          <span class="info-val">${paymentMode}</span>
        </div>
        <div class="info-item">
          <span class="info-label-right">Status :</span>
          <span class="info-val bold" style="color: ${currentStatus === 'PAID' ? '#047857' : currentStatus === 'DUE' ? '#dc2626' : '#d97706'};">
            ${currentStatus}
          </span>
        </div>
      </div>
    </div>

    <!-- 4. Product Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">#</th>
            <th style="width: 36%; text-align: center;">PRODUCT DESCRIPTION</th>
            <th style="width: 14%; text-align: center;">QTY / UNIT</th>
            <th style="width: 14%; text-align: center;">RATE</th>
            <th style="width: 14%; text-align: center;">DISCOUNT</th>
            <th style="width: 16%; text-align: right;">TOTAL AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 5. Statement Summary Section -->
    <div class="summary-section">
      <div class="summary-card">
        <div class="summary-title">STATEMENT SUMMARY</div>
        
        <div class="summary-row">
          <span>Subtotal:</span>
          <span style="font-weight: 700; color: #0f172a;">${formatCurrency(subtotal)}</span>
        </div>

        ${discountAmount > 0 ? `
          <div class="summary-row" style="color: #dc2626;">
            <span>Discount:</span>
            <span style="font-weight: 700;">- ${formatCurrency(discountAmount)}</span>
          </div>
        ` : ''}

        ${taxAmount > 0 ? `
          <div class="summary-row">
            <span>Tax Amount:</span>
            <span style="font-weight: 700; color: #0f172a;">${formatCurrency(taxAmount)}</span>
          </div>
        ` : ''}

        <div class="summary-row grand-total">
          <span style="font-weight: 700;">Grand Total:</span>
          <span style="font-weight: 700; color: #0f172a;">${formatCurrency(grandTotal)}</span>
        </div>

        <div class="summary-row paid">
          <span style="font-weight: 700; color: #047857;">Paid Amount:</span>
          <span style="font-weight: 700; color: #047857;">${formatCurrency(currentPaid)}</span>
        </div>

        <div class="summary-row due">
          <span style="font-weight: 700; color: #475569;">Due Amount:</span>
          <span style="font-weight: 700; color: ${currentDue > 0 ? '#dc2626' : '#047857'};">${formatCurrency(currentDue)}</span>
        </div>
      </div>
    </div>

    <!-- 6. Footer -->
    <div class="footer-section">
      <p class="thank-you-text">Thank You For Your Business! Visit Again.</p>
      <p class="powered-by-text">This is a Computer Generated Tax Invoice • Powered by VEDIXA ERP</p>
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

    // Give iframe resources a moment to render before triggering print dialog
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

