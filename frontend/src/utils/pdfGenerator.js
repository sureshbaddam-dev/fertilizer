import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getItemUnitPrice } from './pricing';

/**
 * Single Unified Vector jsPDF Generator for Customer Ledger Statement.
 * Generated programmatically directly from API/DB objects.
 * Used identically for:
 * 1. Download PDF
 * 2. In-Page Native Browser Print (via hidden iframe)
 * 3. WhatsApp Preview Modal & Attachment
 */
export function buildLedgerPdfDoc(custArg, shopSettingsArg = {}, txsArg = [], totalsArg = {}, periodStrArg = 'Last 30 Days') {
  const doc = new jsPDF();

  // Normalize argument positions defensively
  let customer = custArg || {};
  let shopSettings = shopSettingsArg || {};
  let filteredTransactions = txsArg || [];
  let totals = totalsArg || {};
  let periodStr = periodStrArg || 'Last 30 Days';

  if (Array.isArray(custArg)) {
    filteredTransactions = custArg;
    customer = shopSettingsArg && typeof shopSettingsArg === 'object' && !Array.isArray(shopSettingsArg) ? shopSettingsArg : {};
    shopSettings = txsArg && typeof txsArg === 'object' && !Array.isArray(txsArg) ? txsArg : {};
  }

  const shopName = shopSettings.shopName || shopSettings.name || 'Agri Solutions Store';
  const address = shopSettings.address || '';
  const mobile = shopSettings.mobile || shopSettings.phone || '';
  const gstin = shopSettings.gstNumber || shopSettings.gstin || '';
  const email = shopSettings.email || '';

  const custName = customer?.name || customer?.customerName || 'Valued Customer';
  const custMobile = customer?.mobile || customer?.phone || 'N/A';
  const custVillage = customer?.village || customer?.area || '';
  const custMandal = customer?.mandal || '';
  const custDistrict = customer?.district || '';
  const custState = customer?.state || 'Andhra Pradesh';
  const custGstin = customer?.gstin || customer?.gstNumber || '';

  const addressParts = [
    customer?.address,
    custVillage,
    custMandal,
    custDistrict,
    custState,
  ].filter(Boolean);

  const custAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const logoUrl = shopSettings.logoUrl || shopSettings.shopLogo || '';
  let textLeftX = 8;

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 8, 8, 30, 16);
      textLeftX = 42;
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
      textLeftX = 8;
    }
  }

  // 1. SHOP DETAILS HEADER
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // #047857
  doc.text(shopName, textLeftX, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`${address}`, textLeftX, 20);
  doc.text(`Phone: ${mobile} | GSTIN: ${gstin} | Email: ${email}`, textLeftX, 25);

  doc.setLineWidth(0.6);
  doc.setDrawColor(4, 120, 87);
  doc.line(8, 28, 202, 28);

  // 2. DOCUMENT TITLE & CUSTOMER DETAILS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CUSTOMER LEDGER STATEMENT', 8, 35);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Customer Name  : ${custName}`, 8, 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer Phone : ${custMobile}`, 8, 47);
  doc.text(`Customer Address: ${custAddress}`, 8, 52);
  doc.text(`Statement Period: ${periodStr || 'All Time'} | Generated: ${todayFormatted}${custGstin ? ` | GSTIN: ${custGstin}` : ''}`, 8, 57);

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // 3. ACCOUNT SUMMARY BOX (Clean fixed two-column layout at top-right X=110mm, width=92mm, right edge=202mm)
  const totPurchases = Number(totals?.totalPurchases ?? customer?.totalPurchases ?? 0);
  const totPaid = Number(totals?.totalPaid ?? customer?.totalPaid ?? 0);
  const dueVal = Number(totals?.outstanding ?? totals?.outstandingBalance ?? customer?.outstandingBalance ?? 0);

  doc.setFillColor(248, 250, 248);
  doc.roundedRect(110, 32, 92, 26, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(110, 32, 92, 26, 2, 2, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('ACCOUNT SUMMARY', 114, 37);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Purchases:', 114, 43);
  doc.text('Total Payments:', 114, 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totPurchases), 198, 43, { align: 'right' });
  doc.setTextColor(4, 120, 87);
  doc.text(formatCurrency(totPaid), 198, 48, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dueVal > 0 ? 220 : 4, dueVal > 0 ? 38 : 120, dueVal > 0 ? 38 : 87);
  doc.text('Outstanding Balance:', 114, 54);
  doc.text(formatCurrency(dueVal), 198, 54, { align: 'right' });

  // 4. LEDGER TRANSACTIONS TABLE (194mm Total Width, 8mm Left Margin, 5 Columns, No Borders, Alternating Row Colors, All Centered)
  const tableData = [];
  const txList = Array.isArray(filteredTransactions) ? filteredTransactions : [];

  if (txList.length === 0) {
    tableData.push(['-', 'No ledger transactions found', '-', '-', '-']);
  } else {
    txList.forEach((tx) => {
      if (!tx) return;

      const dateStr = tx.dateFormatted || tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
      const timeStr = tx.timeFormatted || tx.time || '';
      const dateDisplay = timeStr ? `${dateStr}\n${timeStr}` : dateStr;

      let particularsLines = [];
      let rateLines = [];
      let qtyLines = [];
      let totalLines = [];

      const txType = tx.type || (tx.credit > 0 ? 'Payment' : 'Invoice');
      const isPayment = txType === 'Payment' || (tx.credit > 0 && !tx.debit);
      const isAdvance = txType === 'Advance' || (tx.particulars && tx.particulars.toLowerCase().includes('advance'));

      if (isAdvance) {
        const pMode = tx.paymentMode || tx.mode || 'Cash';
        const advNote = tx.notes || tx.remarks;
        particularsLines.push(`Advance Payment — ${pMode}`);
        if (advNote) particularsLines.push(`Note: ${advNote}`);
        rateLines.push('-');
        qtyLines.push('-');
        const advTotal = Number(tx.amount || tx.credit || tx.paidAmount || 0);
        totalLines.push(formatCurrency(advTotal));
      } else if (isPayment) {
        const pMode = tx.paymentMode || tx.mode || 'Cash';
        const payNote = tx.notes || tx.remarks;
        particularsLines.push(`Payment — ${pMode}`);
        if (payNote) particularsLines.push(`Note: ${payNote}`);
        rateLines.push('-');
        qtyLines.push('-');
        const payTotal = Number(tx.amount || tx.credit || tx.paidAmount || 0);
        totalLines.push(formatCurrency(payTotal));
      } else if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach((it) => {
          const pName = it.productName || it.name || 'Agri Product';
          const qty = Number(it.quantity || it.qty || 1);
          const unit = it.unit || it.unitName || 'Bag';
          const price = getItemUnitPrice(it);
          const lineTotal = Number(it.totalAmount || it.total || (qty * price));

          particularsLines.push(`${pName} × ${qty} ${unit}`);
          rateLines.push(formatCurrency(price));
          qtyLines.push(`${qty} ${unit}`);
          totalLines.push(formatCurrency(lineTotal));
        });
      } else {
        particularsLines.push(tx.particulars || tx.description || 'Sales Invoice Purchase');
        rateLines.push('-');
        qtyLines.push(`${tx.itemCount || 1} Item(s)`);
        const invTotal = Number(tx.debit || tx.totalAmount || tx.grandTotal || tx.amount || 0);
        totalLines.push(formatCurrency(invTotal));
      }

      tableData.push([
        dateDisplay,
        particularsLines.join('\n'),
        rateLines.join('\n'),
        qtyLines.join('\n'),
        totalLines.join('\n'),
      ]);
    });
  }

  autoTable(doc, {
    startY: 63,
    margin: { left: 8, right: 8, top: 10, bottom: 14 },
    head: [['DATE & TIME', 'PARTICULARS', 'RATE', 'QUANTITY', 'TOTAL']],
    body: tableData,
    theme: 'striped',
    showHead: 'everyPage',
    tableLineWidth: 0,
    headStyles: {
      fillColor: [4, 120, 87],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3.5,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 248],
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 74, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 27, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 23, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Computer Generated Ledger Statement • No Signature Required • Generated by VEDIXA ERP`,
        8,
        287
      );
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 180, 287);
    },
  });

  return doc;
}

/**
 * Downloads the Customer Ledger PDF immediately without tab redirect or page navigation.
 */
export function generateLedgerPdf(customer, shopSettings, filteredTransactions, totals, periodStr) {
  const doc = buildLedgerPdfDoc(customer, shopSettings, filteredTransactions, totals, periodStr);
  const custName = customer?.name || 'Customer';
  const custNameClean = custName.replace(/[^a-zA-Z0-9]/g, '_');
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Ledger_${custNameClean}_${todayStr}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Triggers native browser print dialog for the vector PDF in-page via a hidden iframe (No page redirect or new tab).
 */
export function printLedgerPdf(customer, shopSettings, filteredTransactions, totals, periodStr) {
  const doc = buildLedgerPdfDoc(customer, shopSettings, filteredTransactions, totals, periodStr);
  const blobUrl = doc.output('bloburl');

  let iframe = document.getElementById('vedixa-pdf-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'vedixa-pdf-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  iframe.src = blobUrl;
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print iframe error:', err);
    }
  };
}

export function buildFullShopAddress(shopSettings = {}) {
  const parts = [];
  const rawAddr = shopSettings.address || shopSettings.shopAddress || shopSettings.addressLine || '';
  const village = shopSettings.village || shopSettings.area || '';
  const mandal = shopSettings.mandal || '';
  const district = shopSettings.district || '';
  const state = shopSettings.state || '';
  const pincode = shopSettings.pincode || shopSettings.pinCode || '';

  if (rawAddr) parts.push(rawAddr.trim());
  if (village && (!rawAddr || !rawAddr.toLowerCase().includes(village.toLowerCase()))) parts.push(village.trim());
  if (mandal && (!rawAddr || !rawAddr.toLowerCase().includes(mandal.toLowerCase()))) parts.push(mandal.trim());
  if (district && (!rawAddr || !rawAddr.toLowerCase().includes(district.toLowerCase()))) parts.push(district.trim());
  if (state && (!rawAddr || !rawAddr.toLowerCase().includes(state.toLowerCase()))) parts.push(state.trim());
  if (pincode && (!rawAddr || !rawAddr.includes(String(pincode)))) parts.push(String(pincode).trim());

  return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Single Unified Vector jsPDF Generator for Sales Retail Invoice.
 * Programmatically constructs a clean A4 retail invoice document.
 */
export function buildInvoicePdfDoc(invoice = {}, shopSettings = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = shopSettings.shopName || shopSettings.businessName || shopSettings.name || 'Agri Solutions Store';
  const address = buildFullShopAddress(shopSettings);
  const mobile = shopSettings.mobile || shopSettings.phone || '-';
  const gstin = shopSettings.gstNumber || shopSettings.gstin || '-';
  const email = shopSettings.email || '';

  const invoiceNo = invoice.invoiceNumber || invoice.refNo || invoice.id || invoice._id || 'INV-2026-1001';
  const rawDate = invoice.date || invoice.createdAt || new Date();
  const invoiceDate = typeof rawDate === 'string' && rawDate.includes('T')
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(rawDate);

  const custName = invoice.customerName || invoice.customer?.name || 'Walk-in Customer';
  const custMobile = invoice.customerMobile || invoice.customer?.mobile || invoice.customer?.phone || 'N/A';
  const custAddress = invoice.customerAddress || invoice.customer?.address || '';

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const logoUrl = shopSettings.logoUrl || shopSettings.shopLogo || '';
  let textLeftX = 8;

  // Render Shop Logo if available
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 8, 8, 30, 16);
      textLeftX = 42;
    } catch (e) {
      console.warn('Could not render logo in Invoice PDF:', e);
      textLeftX = 8;
    }
  }

  // 1. TOP HEADER: SHOP DETAILS
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // Emerald brand color #047857
  doc.text(shopName.toUpperCase(), textLeftX, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(address, textLeftX, 20);

  const contactLine = gstin && gstin !== '-'
    ? `Phone: ${mobile} | GSTIN: ${gstin}${email ? ` | Email: ${email}` : ''}`
    : `Phone: ${mobile}${email ? ` | Email: ${email}` : ''}`;
  doc.text(contactLine, textLeftX, 25);

  // Top Separator Line (Left 8mm, Right 202mm -> Width 194mm)
  doc.setLineWidth(0.6);
  doc.setDrawColor(4, 120, 87);
  doc.line(8, 28, 202, 28);

  // 2. INVOICE & CUSTOMER DETAILS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TAX INVOICE', 8, 35);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Customer Name  : ${custName}`, 8, 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer Phone : ${custMobile}`, 8, 47);
  doc.text(`Customer Address: ${custAddress || 'N/A'}`, 8, 52);
  doc.text(`Invoice Date    : ${invoiceDate}`, 8, 57);

  // Right Box: Invoice Meta (Aligned at X = 120mm)
  const payMode = invoice.paymentMethod || invoice.paymentMode || 'Cash';
  const statusStr = (invoice.status || 'PAID').toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice No  :', 120, 42);
  doc.setTextColor(4, 120, 87);
  doc.text(String(invoiceNo), 145, 42);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${payMode}`, 120, 47);

  doc.setFont('helvetica', 'bold');
  if (statusStr === 'PAID') {
    doc.setTextColor(4, 120, 87);
  } else if (statusStr === 'DUE' || statusStr === 'UNPAID') {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(217, 119, 6);
  }
  doc.text(`Status      : ${statusStr}`, 120, 52);

  // 3. ITEMS TABLE (Printable width: 194mm, Margins 8mm left / 8mm right, Borderless, Alternating Colors, All Centered)
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const tableRows = items.map((it, idx) => {
    const pName = it.productName || it.name || 'Agri Product';
    const qty = Number(it.quantity || it.qty || 1);
    const unit = it.unit || it.unitName || 'Bag';
    const rate = getItemUnitPrice(it);
    const disc = Number(it.discountAmount || it.discount || 0);
    const total = Number(it.totalAmount || it.total || (qty * rate - disc));

    return [
      idx + 1,
      pName,
      `${qty} ${unit}`,
      formatCurrency(rate),
      disc > 0 ? formatCurrency(disc) : '-',
      formatCurrency(total),
    ];
  });

  autoTable(doc, {
    startY: 63,
    margin: { left: 8, right: 8, top: 10, bottom: 14 },
    head: [['#', 'PRODUCT DESCRIPTION', 'QTY / UNIT', 'RATE', 'DISCOUNT', 'TOTAL AMOUNT']],
    body: tableRows,
    theme: 'striped',
    showHead: 'everyPage',
    tableLineWidth: 0,
    headStyles: {
      fillColor: [4, 120, 87],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3.5,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 248],
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 68, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
    },
  });

  // 4. STATEMENT SUMMARY CARD (Positioned dynamically below lastAutoTable.finalY + 8, X=110mm, width=92mm, right edge=202mm)
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 8;

  const subtotal = Number(invoice.subtotal || invoice.subTotal || invoice.totalAmount || 0);
  const discountVal = Number(invoice.discountAmount || invoice.discount || 0);
  const grandTotal = Number(invoice.grandTotal || invoice.totalAmount || invoice.total || (subtotal - discountVal));
  const paidAmount = Number(invoice.paidAmount || invoice.paid || (statusStr === 'PAID' ? grandTotal : 0));
  const dueAmount = Number(invoice.dueAmount || invoice.due || Math.max(0, grandTotal - paidAmount));

  const summaryRows = 4 + (discountVal > 0 ? 1 : 0);
  const summaryHeight = 10 + summaryRows * 5.5;

  doc.setFillColor(248, 250, 248);
  doc.roundedRect(110, finalY, 92, summaryHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(110, finalY, 92, summaryHeight, 2, 2, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('STATEMENT SUMMARY', 114, finalY + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  let currentLineY = finalY + 12;
  doc.text('Subtotal:', 114, currentLineY);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(subtotal), 198, currentLineY, { align: 'right' });

  if (discountVal > 0) {
    currentLineY += 5.5;
    doc.setTextColor(71, 85, 105);
    doc.text('Discount:', 114, currentLineY);
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${formatCurrency(discountVal)}`, 198, currentLineY, { align: 'right' });
  }

  currentLineY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 114, currentLineY);
  doc.text(formatCurrency(grandTotal), 198, currentLineY, { align: 'right' });

  currentLineY += 5.5;
  doc.setTextColor(4, 120, 87);
  doc.text('Paid Amount:', 114, currentLineY);
  doc.text(formatCurrency(paidAmount), 198, currentLineY, { align: 'right' });

  currentLineY += 5.5;
  if (dueAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Due Amount:', 114, currentLineY);
    doc.text(formatCurrency(dueAmount), 198, currentLineY, { align: 'right' });
  } else {
    doc.setTextColor(4, 120, 87);
    doc.text('Due Amount:', 114, currentLineY);
    doc.text(formatCurrency(0), 198, currentLineY, { align: 'right' });
  }

  // 5. FOOTER & THANK YOU MESSAGE
  const footerY = Math.max(currentLineY + 16, 270);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('Thank You For Your Business! Visit Again.', 105, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a Computer Generated Tax Invoice • Powered by VEDIXA ERP',
    105,
    footerY + 5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates and downloads a Sales Invoice PDF document directly from data.
 */
export function generateInvoicePdf(invoice, shopSettings) {
  const doc = buildInvoicePdfDoc(invoice, shopSettings);
  const invNo = invoice?.invoiceNumber || invoice?.refNo || 'INV-1001';
  const cleanInvNo = String(invNo).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${cleanInvNo}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Triggers native browser print dialog for the vector Invoice PDF in-page via a hidden iframe.
 */
export function printInvoicePdf(invoice, shopSettings) {
  const doc = buildInvoicePdfDoc(invoice, shopSettings);
  const blobUrl = doc.output('bloburl');

  let iframe = document.getElementById('vedixa-pdf-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'vedixa-pdf-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  iframe.src = blobUrl;
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print iframe error:', err);
    }
  };
}

/**
 * Generates and downloads a Payment Receipt PDF document.
 */
export function generatePaymentReceiptPdf(payment, customer, shopSettings) {
  const doc = new jsPDF();

  const shopName = shopSettings.shopName || 'VEDIXA AGRI SOLUTIONS';
  const address = shopSettings.address || 'Main Road, Guntur Market Yard, Andhra Pradesh - 522001';
  const mobile = shopSettings.mobile || '9848081875';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(shopName, 14, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(address, 14, 19);
  doc.text(`Phone: ${mobile}`, 14, 23);

  doc.setLineWidth(0.5);
  doc.setDrawColor(4, 120, 87);
  doc.line(14, 26, 196, 26);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT RECEIPT', 14, 33);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No : ${payment.refNo || 'PAY-1001'}`, 14, 39);
  doc.text(`Date       : ${payment.date || new Date().toLocaleDateString('en-IN')}`, 14, 44);
  doc.text(`Customer   : ${customer?.name || 'Customer'}`, 14, 49);
  doc.text(`Mode       : ${payment.paymentMode || 'Cash'}`, 14, 54);
  doc.text(`Amount     : Rs. ${Number(payment.credit || payment.amount || 0).toLocaleString('en-IN')}`, 14, 59);

  doc.save(`PaymentReceipt_${payment.refNo || '1001'}.pdf`);
}

/**
 * Single Unified Vector jsPDF Generator for Invoice History Report Statement.
 * Programmatically constructs a clean A4 vector document directly from DB/API data.
 */
export function buildInvoiceHistoryPdfDoc(invoices = [], summary = {}, shopSettings = {}, appliedFilters = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = shopSettings.shopName || shopSettings.name || 'VEDIXA AGRI SOLUTIONS';
  const address = shopSettings.address || 'Main Road, Guntur Market Yard, Andhra Pradesh - 522001';
  const mobile = shopSettings.mobile || shopSettings.phone || '9848081875';
  const gstin = shopSettings.gstNumber || shopSettings.gstin || '';
  const email = shopSettings.email || '';

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const logoUrl = shopSettings.logoUrl || shopSettings.shopLogo || '';
  let textLeftX = 12;

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 12, 10, 24, 24);
      textLeftX = 40;
    } catch (e) {
      console.warn('Could not render logo in Statement PDF:', e);
      textLeftX = 12;
    }
  }

  // 1. SHOP DETAILS HEADER
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // #047857
  doc.text(shopName.toUpperCase(), textLeftX, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(address, textLeftX, 21);

  const contactLine = gstin
    ? `Mobile: ${mobile} | GSTIN: ${gstin}`
    : `Mobile: ${mobile}${email ? ` | Email: ${email}` : ''}`;
  doc.text(contactLine, textLeftX, 26);

  // Top Separator Line
  doc.setLineWidth(0.6);
  doc.setDrawColor(4, 120, 87);
  doc.line(12, 32, 198, 32);

  // 2. REPORT TITLE & METADATA
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE HISTORY REPORT', 12, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated On: ${todayFormatted}`, 12, 46);

  let filterStr = 'Status: All Invoices';
  if (appliedFilters.dateFrom || appliedFilters.dateTo) {
    filterStr += ` | Date: ${appliedFilters.dateFrom || 'Start'} to ${appliedFilters.dateTo || 'Today'}`;
  }
  doc.text(filterStr, 12, 51);

  // 3. INVOICES TABLE (Printable width: 186mm = 10 + 32 + 36 + 50 + 24 + 34)
  const tableRows = (invoices || []).map((inv, idx) => {
    const invNo = inv.invoiceNumber || inv.refNo || `INV-${idx + 1001}`;
    const rawDate = inv.date || inv.createdAt || '';
    const dateStr = typeof rawDate === 'string' && rawDate.includes('T')
      ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : String(rawDate);

    const custName = inv.customerName || inv.customer?.name || 'Walk-in Customer';
    const custMobile = inv.customerMobile || inv.customer?.mobile || '';

    const payMode = inv.paymentMethod || inv.paymentMode || 'Cash';
    const statusStr = (inv.status || 'PAID').toUpperCase();

    const grandTotal = Number(inv.totalAmount || inv.grandTotal || 0);

    const itemsSummary = Array.isArray(inv.items) && inv.items.length > 0
      ? inv.items.map(it => `${it.productName || it.name || 'Agri Item'} (${it.quantity || 1} ${it.unit || 'Bag'})`).join(', ')
      : 'Agri Products';

    return [
      idx + 1,
      `${invNo}\n${dateStr}`,
      custMobile ? `${custName}\nPh: ${custMobile}` : custName,
      itemsSummary,
      `${payMode}\n[${statusStr}]`,
      `₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });

  autoTable(doc, {
    startY: 56,
    margin: { left: 12, right: 12, top: 10, bottom: 20 },
    head: [['#', 'Invoice No & Date', 'Customer Details', 'Items Purchased', 'Mode & Status', 'Total Amount (₹)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [4, 120, 87],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3.5,
      halign: 'left',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold', halign: 'left' },
      2: { cellWidth: 36, halign: 'left' },
      3: { cellWidth: 50, halign: 'left' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    tableLineWidth: 0.15,
    tableLineColor: [203, 213, 225],
  });

  // 4. SUMMARY TOTALS SECTION
  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 8;

  const totalBillsCount = summary.totalBills || invoices.length;
  const totAmount = Number(summary.totalAmount || 0);
  const totPaid = Number(summary.totalPaid || 0);
  const totDue = Number(summary.totalDue || 0);

  // Summary Card Box (X=114, width=84mm -> Ends at 198mm)
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(114, finalY, 84, 40, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(114, finalY, 84, 40, 2, 2, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('STATEMENT SUMMARY', 118, finalY + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Total Invoices:', 118, finalY + 14);
  doc.text(`${totalBillsCount}`, 194, finalY + 14, { align: 'right' });

  doc.text('Subtotal:', 118, finalY + 20);
  doc.text(`₹ ${totAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 194, finalY + 20, { align: 'right' });

  doc.text('Total Paid:', 118, finalY + 26);
  doc.setTextColor(4, 120, 87);
  doc.text(`₹ ${totPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 194, finalY + 26, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('Total Due Amount:', 118, finalY + 33);
  doc.text(`₹ ${totDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 194, finalY + 33, { align: 'right' });

  // 5. FOOTER
  const footerY = Math.max(finalY + 48, 275);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('Thank You For Your Business!', 105, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Computer Generated Invoice History Statement • Generated by VEDIXA ERP',
    105,
    footerY + 5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Opens the Invoice History PDF Statement in a new browser tab for preview.
 */
export function previewInvoiceHistoryPdf(invoices, summary, shopSettings, appliedFilters) {
  const doc = buildInvoiceHistoryPdfDoc(invoices, summary, shopSettings, appliedFilters);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

/**
 * Downloads the Invoice History PDF Statement directly.
 */
export function generateInvoiceHistoryPdf(invoices, summary, shopSettings, appliedFilters) {
  const doc = buildInvoiceHistoryPdfDoc(invoices, summary, shopSettings, appliedFilters);
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Invoice_History_Report_${todayStr}.pdf`;
  doc.save(filename);
  return filename;
}
