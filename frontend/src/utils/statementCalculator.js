function parseTxDate(tx) {
  if (!tx) return new Date();
  const raw = tx.rawDate || tx.createdAt || tx.date || tx.updatedAt;
  if (!raw) return new Date();

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // If it's a full ISO timestamp with time (e.g. 2026-09-09T23:03:00.000Z), parse directly
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // Otherwise, parse date parts (DD/MM/YYYY or YYYY-MM-DD)
    const parts = trimmed.split(/[-/ ]/);
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10) - 1;
      const p3 = parseInt(parts[2], 10);
      const year = p3 > 1000 ? p3 : p1;
      const month = p3 > 1000 ? p2 : parseInt(parts[1], 10) - 1;
      const day = p3 > 1000 ? p1 : parseInt(parts[2], 10);
      const customD = new Date(year, month, day);

      if (tx.time && typeof tx.time === 'string') {
        const timeMatch = tx.time.trim().match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10) || 0;
          const seconds = parseInt(timeMatch[3], 10) || 0;
          const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          customD.setHours(hours, minutes, seconds, 0);
        }
      }
      if (!isNaN(customD.getTime())) return customD;
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return new Date();
}

function getTxTimestamp(tx) {
  const d = tx.rawDateObj || parseTxDate(tx);
  return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
}

/**
 * Chronological Ascending comparator (Oldest first) for accurate running balance computation
 */
function compareTxChronologicalAsc(a, b) {
  const timeA = getTxTimestamp(a);
  const timeB = getTxTimestamp(b);
  if (timeA !== timeB) return timeA - timeB;

  if (a.type === 'Invoice' && b.type === 'Payment') return -1;
  if (a.type === 'Payment' && b.type === 'Invoice') return 1;

  const idA = String(a.id || a._id || a.refNo || '');
  const idB = String(b.id || b._id || b.refNo || '');
  return idA.localeCompare(idB);
}

/**
 * Display Descending comparator (Newest / Latest first at TOP) for Customer Ledger UI display
 */
function compareTxDisplayDesc(a, b) {
  const timeA = getTxTimestamp(a);
  const timeB = getTxTimestamp(b);
  if (timeA !== timeB) return timeB - timeA;

  if (a.type === 'Payment' && b.type === 'Invoice') return -1;
  if (a.type === 'Invoice' && b.type === 'Payment') return 1;

  const idA = String(a.id || a._id || a.refNo || '');
  const idB = String(b.id || b._id || b.refNo || '');
  return idB.localeCompare(idA);
}

/**
 * Centralized Authoritative Customer Statement Calculator.
 * Computes New Purchases, Payments, Closing Due, and Running Balance Transactions
 * for Monthly, Custom Date, and Full History statement periods.
 * Always returns transactions with LATEST at TOP (descending order) for display.
 */
export function calculateCustomerStatement({
  transactions = [],
  customer = {},
  statementType = 'MONTHLY', // 'MONTHLY' | 'CUSTOM' | 'FULL'
  selectedMonth = '', // 'YYYY-MM'
  fromDate = '', // 'YYYY-MM-DD'
  toDate = '', // 'YYYY-MM-DD'
}) {
  const rawList = Array.isArray(transactions)
    ? transactions.filter((tx) => tx && tx.type !== 'Opening Balance' && tx.type !== 'OPENING_BALANCE')
    : [];

  // Identify all existing invoice numbers to safely filter out duplicate standalone payment rows for the same invoice
  const invoiceNumbers = new Set(
    rawList
      .filter((tx) => tx && tx.type === 'Invoice')
      .map((tx) => (tx.refNo || tx.invoiceNumber || '').trim())
      .filter(Boolean)
  );

  const cleanList = rawList.filter((tx) => {
    if (!tx) return false;
    if (tx.type === 'Payment' || tx.paymentType === 'INVOICE_PAYMENT') {
      if (tx.refNo?.startsWith('PAY-BILL-')) {
        const invNum = tx.refNo.replace('PAY-BILL-', '').trim();
        if (invoiceNumbers.has(invNum)) return false;
      }
      if (tx.invoiceNumber && invoiceNumbers.has(tx.invoiceNumber.trim())) {
        return false;
      }
    }
    return true;
  });

  const normalizeTx = (tx) => {
    const isInvoice = tx.type === 'Invoice';
    const txDate = parseTxDate(tx);
    const amount = isInvoice ? Number(tx.amount !== undefined ? tx.amount : (tx.totalAmount !== undefined ? tx.totalAmount : (tx.debit || 0))) : 0;
    const paid = isInvoice
      ? Number(tx.paid !== undefined ? tx.paid : (tx.paidAmount !== undefined ? tx.paidAmount : (tx.credit || 0)))
      : Number(tx.paid !== undefined ? tx.paid : (tx.amount || tx.credit || 0));
    const balance = isInvoice ? Math.max(0, amount - paid) : 0;
    const debit = isInvoice ? amount : 0;
    const credit = paid;

    return {
      ...tx,
      rawDateObj: txDate,
      amount,
      paid,
      balance,
      debit,
      credit,
    };
  };

  if (statementType === 'FULL') {
    let runningBal = 0;
    let totalPurchasesDebits = 0;
    let totalCredits = 0;

    const fullTxs = cleanList
      .map((tx) => {
        const norm = normalizeTx(tx);
        totalPurchasesDebits += norm.debit;
        totalCredits += norm.credit;
        return norm;
      })
      .sort(compareTxChronologicalAsc);

    const finalTxs = fullTxs.map((tx) => {
      runningBal = runningBal + tx.debit - tx.credit;
      return {
        ...tx,
        balance: runningBal,
        runningBalance: runningBal,
      };
    });

    const newPurchases = totalPurchasesDebits;
    const payments = totalCredits;
    const closingDue = newPurchases - payments;
    const displayList = [...finalTxs].sort(compareTxDisplayDesc);

    return {
      statementType: 'FULL',
      periodLabel: 'Full Historical Ledger',
      monthLabel: 'Full Ledger Statement',
      openingBalance: 0,
      newPurchases,
      payments,
      closingDue,
      monthlyTransactions: displayList,
      transactions: displayList,
    };
  }

  if (statementType === 'CUSTOM') {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(0);
    const end = toDate ? new Date(`${toDate}T23:59:59`) : new Date();

    let priorDebits = 0;
    let priorCredits = 0;
    let periodPurchases = 0;
    let periodCredits = 0;

    const periodList = [];

    cleanList.forEach((tx) => {
      const norm = normalizeTx(tx);
      const txDate = norm.rawDateObj;

      if (!isNaN(txDate)) {
        if (txDate < start) {
          priorDebits += norm.debit;
          priorCredits += norm.credit;
        } else if (txDate >= start && txDate <= end) {
          periodPurchases += norm.debit;
          periodCredits += norm.credit;
          periodList.push(norm);
        }
      }
    });

    periodList.sort(compareTxChronologicalAsc);

    const openBal = priorDebits - priorCredits;
    let runningBal = openBal;

    const finalTxs = periodList.map((tx) => {
      runningBal = runningBal + tx.debit - tx.credit;
      return {
        ...tx,
        balance: runningBal,
        runningBalance: runningBal,
      };
    });

    const closingDue = runningBal;
    const fromLabel = fromDate ? new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
    const toLabel = toDate ? new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';
    const displayList = [...finalTxs].sort(compareTxDisplayDesc);

    return {
      statementType: 'CUSTOM',
      periodLabel: `${fromLabel} to ${toLabel}`,
      monthLabel: `${fromLabel} to ${toLabel}`,
      openingBalance: openBal,
      newPurchases: periodPurchases,
      payments: periodCredits,
      closingDue,
      monthlyTransactions: displayList,
      transactions: displayList,
    };
  }

  // DEFAULT: MONTHLY
  const now = new Date();
  const mStr = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yrStr, moStr] = mStr.split('-');
  const year = parseInt(yrStr, 10) || now.getFullYear();
  const monthIdx = (parseInt(moStr, 10) || (now.getMonth() + 1)) - 1;

  const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  const monthLabel = startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  let priorDebits = 0;
  let priorCredits = 0;
  let monthPurchases = 0;
  let monthCredits = 0;

  const monthList = [];

  cleanList.forEach((tx) => {
    const norm = normalizeTx(tx);
    const txDate = norm.rawDateObj;

    if (!isNaN(txDate)) {
      if (txDate < startOfMonth) {
        priorDebits += norm.debit;
        priorCredits += norm.credit;
      } else if (txDate >= startOfMonth && txDate <= endOfMonth) {
        monthPurchases += norm.debit;
        monthCredits += norm.credit;
        monthList.push(norm);
      }
    }
  });

  monthList.sort(compareTxChronologicalAsc);

  const openBal = priorDebits - priorCredits;
  let runningBal = openBal;

  const finalTxs = monthList.map((tx) => {
    runningBal = runningBal + tx.debit - tx.credit;
    return {
      ...tx,
      balance: runningBal,
      runningBalance: runningBal,
    };
  });

  const closingDue = runningBal;
  const displayList = [...finalTxs].sort(compareTxDisplayDesc);

  return {
    statementType: 'MONTHLY',
    periodLabel: monthLabel,
    monthLabel,
    openingBalance: openBal,
    newPurchases: monthPurchases,
    payments: monthCredits,
    closingDue,
    monthlyTransactions: displayList,
    transactions: displayList,
  };
}

/**
 * Formats standard WhatsApp Monthly Statement Message with dynamic UPI payment link and shop details.
 */
export function buildWhatsAppStatementMessage({
  monthLabel = '',
  newPurchases = 0,
  totalPurchases = 0,
  payments = 0,
  due = 0,
  shopSettings = {},
  isFromBillDrawer = false,
}) {
  const shopName = (shopSettings.shopName || shopSettings.name || 'Agri Store').trim();
  const upiId = (shopSettings.upiId || shopSettings.upi || '').trim();
  const monthUpper = (monthLabel || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })).toUpperCase();

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  let msg = `CUSTOMER ACCOUNT STATEMENT – ${monthUpper}\n\n`;

  if (isFromBillDrawer && newPurchases > 0 && totalPurchases > newPurchases) {
    msg += `New Purchases: ${fmt(newPurchases)}\n`;
    const priorMonthPurchases = Math.max(0, totalPurchases - newPurchases);
    msg += `${monthUpper} Month Purchases: ${fmt(priorMonthPurchases)}\n`;
    msg += `Total Purchases: ${fmt(totalPurchases)}\n`;
  } else {
    msg += `Total Purchases: ${fmt(totalPurchases)}\n`;
  }

  msg += `Payments: ${fmt(payments)}\n`;
  msg += `Due: ${fmt(due)}\n\n`;

  if (upiId && due > 0) {
    const encodedShop = encodeURIComponent(shopName);
    msg += `Pay Now:\nupi://pay?pa=${upiId}&pn=${encodedShop}&am=${due}&cu=INR\n\n`;
  }

  const shopWhatsapp = (shopSettings.whatsappNumber || shopSettings.mobile || '').trim();
  if (shopWhatsapp) {
    msg += `Thank you,\n${shopName}\nPhone: ${shopWhatsapp}`;
  } else {
    msg += `Thank you,\n${shopName}`;
  }

  return msg;
}

/**
 * Shared Formatter for Customer Ledger Address (Web + PDF).
 * Constructs address stopping at District. Intentionally excludes State and PIN Code.
 */
export function formatCustomerLedgerAddress(customer = {}) {
  const rawAddr = (customer?.address || '').trim();
  const village = (customer?.village || customer?.area || '').trim();
  const mandal = (customer?.mandal || '').trim();
  const district = (customer?.district || '').trim();

  const parts = [];
  if (rawAddr) parts.push(rawAddr);
  if (village && !rawAddr.toLowerCase().includes(village.toLowerCase())) parts.push(village);
  if (mandal && !rawAddr.toLowerCase().includes(mandal.toLowerCase())) parts.push(mandal);
  if (district && !rawAddr.toLowerCase().includes(district.toLowerCase())) parts.push(district);

  return parts.length > 0 ? parts.join(', ') : 'N/A';
}
