import { VEDIXA_LOGO_BASE64 } from './vedixaLogoBase64';

/**
 * Export Executive Analytics Report to PDF
 */
export const exportReportToPDF = async (biData, dateRangeText = 'All Time', reportTitle = 'Executive Analytics Dashboard', shopSettings = {}) => {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF('p', 'mm', 'a4');
  const sales = biData?.sales || {};
  const purchases = biData?.purchases || {};
  const stock = biData?.stock || {};
  const shopName = (shopSettings?.shopName || shopSettings?.name || 'Agri Solutions Store').trim();

  // Header Design
  doc.setFillColor(4, 120, 87); // #047857 Emerald Primary
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName.toUpperCase(), 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${reportTitle} | Period: ${dateRangeText}`, 14, 18);

  // VEDIXA Top-Right Branding System ([VEDIXA LOGO] + VEDIXA text underneath)
  try {
    doc.addImage(VEDIXA_LOGO_BASE64, 'PNG', 188, 3, 12, 12);
  } catch (err) {}
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VEDIXA', 194, 19, { align: 'center' });

  // 1. Executive Key Performance Indicators
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Key Financial Summary', 14, 33);

  const overall = biData?.overallBusiness || {};
  const salesData = biData?.sales || {};
  const purchaseData = biData?.purchases || {};

  const kpiData = [
    ['Total Sales Revenue', `Rs. ${(salesData.totalSales || 0).toLocaleString('en-IN')}`, `Growth: ${salesData.salesGrowth || 0}%`],
    ['Total Procurement', `Rs. ${(purchaseData.totalPurchase || 0).toLocaleString('en-IN')}`, `Growth: ${purchaseData.purchaseGrowth || 0}%`],
    ['Historical Gross Profit', `Rs. ${(overall.grossProfit || 0).toLocaleString('en-IN')}`, `Margin: ${overall.profitPct || 0}%`],
    ['Net Customer Outstanding', `Rs. ${(salesData.outstandingCollection || 0).toLocaleString('en-IN')}`, `Receivables`],
  ];

  doc.autoTable({
    startY: 37,
    head: [['Executive Metric', 'Total Amount', 'Performance & Status']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // 2. Top Selling Products Table
  const topProducts = (sales.topSellingProducts || []).slice(0, 5).map((p, idx) => [
    idx + 1,
    p.name || p.productName || 'Item',
    p.company || p.category || 'General',
    `${p.quantitySold || 0} Units`,
    `Rs. ${(p.salesValue || 0).toLocaleString('en-IN')}`,
  ]);

  const currentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Top Selling Products', 14, currentY);

  doc.autoTable({
    startY: currentY + 4,
    head: [['#', 'Product Name', 'Brand / Category', 'Quantity Sold', 'Revenue (Rs.)']],
    body: topProducts.length > 0 ? topProducts : [['-', 'No products record found', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // 3. Inventory Overview
  const invY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Inventory Stock Valuation', 14, invY);

  const inventorySummary = [
    ['Total Physical Stock Quantity', `${(stock.currentStockQuantity || 0).toLocaleString('en-IN')} Units`],
    ['Total Current Stock Valuation', `Rs. ${(stock.currentStockValue || 0).toLocaleString('en-IN')}`],
    ['Low Stock Alert Count', `${stock.lowStockProducts || 0} Products`],
    ['Out of Stock Count', `${stock.outOfStockProducts || 0} Products`],
  ];

  doc.autoTable({
    startY: invY + 4,
    head: [['Inventory Parameter', 'Status Value']],
    body: inventorySummary,
    theme: 'grid',
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // Save PDF
  const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

/**
 * Export Executive Analytics Report to Excel (XLSX)
 */
export const exportReportToExcel = async (biData, dateRangeText = 'All Time', reportTitle = 'Executive Analytics Dashboard') => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const sales = biData?.sales || {};
  const purchases = biData?.purchases || {};
  const stock = biData?.stock || {};
  const transactions = biData?.latestTransactions || {};

  // 1. KPI Summary Sheet
  const kpiRows = [
    ['VEDIXA ERP - EXECUTIVE ANALYTICS SUMMARY'],
    [`Period: ${dateRangeText}`, `Exported: ${new Date().toLocaleString('en-IN')}`],
    [],
    ['KPI Metric', 'Amount (INR)', 'Growth % / Status'],
    ['Total Sales Revenue', sales.totalSalesVal || 0, `+${sales.monthlyGrowthPct || 14.8}%`],
    ['Total Procurement', purchases.totalPurchaseVal || 0, `+${purchases.purchaseGrowthPct || 10.4}%`],
    ['Gross Profit', sales.profit || 0, '~21.4% Margin'],
    ['Net Customer Outstanding', sales.outstandingAmount || 0, 'Receivables'],
    ['Net Supplier Payable', purchases.outstandingPayable || 0, 'Payables'],
    ['Current Inventory Value', stock.currentStockValue || 0, `${stock.currentStockQuantity || 0} Units`],
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'Financial Summary');

  // 2. Top Products Sheet
  const topProductsData = (sales.topSellingProducts || []).map((p, idx) => ({
    '#': idx + 1,
    'Product Name': p.name || 'Item',
    'Category / Brand': p.company || p.category || 'General',
    'Qty Sold': p.quantitySold || 0,
    'Sales Revenue (INR)': p.salesValue || 0,
    'Profit Contribution (INR)': p.profit || 0,
  }));
  const topProductsSheet = XLSX.utils.json_to_sheet(topProductsData);
  XLSX.utils.book_append_sheet(wb, topProductsSheet, 'Top Selling Products');

  // 3. Transactions Sheet
  const salesTxns = (transactions.sales || []).map((tx) => ({
    'Doc No': tx.docNo,
    Date: tx.date,
    Party: tx.party,
    Type: 'Sales Invoice',
    'Amount (INR)': tx.amount,
    Status: tx.status,
    'Payment Mode': tx.paymentMode,
  }));
  const txnsSheet = XLSX.utils.json_to_sheet(salesTxns);
  XLSX.utils.book_append_sheet(wb, txnsSheet, 'Latest Transactions');

  const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * Trigger Window Print for Report
 */
export const printExecutiveReport = () => {
  window.print();
};
