/**
 * Generates and downloads an Excel (.xlsx) report for Invoice History.
 * Exports structured backend data with shop metadata and column formatting.
 */
export async function exportInvoiceHistoryToExcel(invoices = [], shopSettings = {}) {
  const XLSX = await import('xlsx');
  const shopName = shopSettings.shopName || shopSettings.name || 'VEDIXA AGRI SOLUTIONS';
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const exportDateFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Metadata Header Rows & Column Headers
  const sheetData = [
    ['Shop Name:', shopName],
    ['Export Date:', exportDateFormatted],
    ['Report Name:', 'Invoice History'],
    [], // Blank separator row
    [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Mobile Number',
      'Total Amount (₹)',
      'Paid Amount (₹)',
      'Due Amount (₹)',
      'Payment Status',
      'Payment Mode',
    ],
  ];

  // Data Rows
  (invoices || []).forEach((inv) => {
    const invNo = inv.invoiceNumber || inv.refNo || 'N/A';
    const rawDate = inv.date || inv.createdAt || '';
    const dateStr = typeof rawDate === 'string' && rawDate.includes('T')
      ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : String(rawDate || '');

    const custName = inv.customerName || inv.customer?.name || 'Walk-in Customer';
    const custMobile = inv.customerMobile || inv.customer?.mobile || 'N/A';

    const grandTotal = Number(inv.totalAmount || inv.grandTotal || 0);
    const statusStr = (inv.status || 'PAID').toUpperCase();
    const paidAmount = Number(inv.paidAmount || inv.paid || (statusStr === 'PAID' ? grandTotal : 0));
    const dueAmount = Number(inv.dueAmount || inv.due || Math.max(0, grandTotal - paidAmount));
    const payMode = inv.paymentMethod || inv.paymentMode || 'Cash';

    sheetData.push([
      invNo,
      dateStr,
      custName,
      custMobile,
      grandTotal,
      paidAmount,
      dueAmount,
      statusStr,
      payMode,
    ]);
  });

  // Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set Auto Column Widths
  const colWidths = sheetData.reduce((acc, row) => {
    row.forEach((val, colIdx) => {
      const len = val !== null && val !== undefined ? String(val).length : 10;
      acc[colIdx] = Math.max(acc[colIdx] || 12, len + 3);
    });
    return acc;
  }, []);

  worksheet['!cols'] = colWidths.map((width) => ({ wch: width }));

  // Create Workbook & Save File
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice History');

  const filename = `Invoice_History_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
