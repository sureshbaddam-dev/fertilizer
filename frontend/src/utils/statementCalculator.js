function parseTxDate(tx) {
  if (!tx) return new Date();
  const raw = tx.rawDate || tx.date || tx.createdAt || tx.updatedAt;
  if (!raw) return new Date();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  if (typeof raw === 'string') {
    const parts = raw.trim().split(/[-/ ]/);
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10) - 1;
      const p3 = parseInt(parts[2], 10);
      if (p3 > 1000) {
        const customD = new Date(p3, p2, p1);
        if (!isNaN(customD.getTime())) return customD;
      }
    }
  }
  return new Date();
}

/**
 * Centralized Authoritative Customer Statement Calculator.
 * Computes exact Opening Balance, New Purchases, Payments, Closing Due, and Running Balance Transactions
 * for Monthly, Custom Date, and Full History statement periods.
 */
export function calculateCustomerStatement({
  transactions = [],
  customer = {},
  statementType = 'MONTHLY', // 'MONTHLY' | 'CUSTOM' | 'FULL'
  selectedMonth = '', // 'YYYY-MM'
  fromDate = '', // 'YYYY-MM-DD'
  toDate = '', // 'YYYY-MM-DD'
}) {
  const rawList = Array.isArray(transactions) ? transactions : [];

  if (statementType === 'FULL') {
    let runningBal = Number(customer?.previousDue || 0);
    let totalDebits = 0;
    let totalCredits = 0;

    const fullTxs = rawList
      .filter(Boolean)
      .map((tx) => {
        const txDate = parseTxDate(tx);
        const debit = Number(tx.debit || (tx.type === 'Invoice' ? tx.totalAmount || 0 : 0));
        const credit = Number(tx.credit || (tx.type === 'Payment' || tx.type === 'Advance' ? tx.amount || 0 : 0));

        totalDebits += debit;
        totalCredits += credit;

        return {
          ...tx,
          rawDateObj: txDate,
          debit,
          credit,
        };
      })
      .sort((a, b) => (a.rawDateObj || 0) - (b.rawDateObj || 0));

    const finalTxs = fullTxs.map((tx) => {
      runningBal = runningBal + tx.debit - tx.credit;
      return {
        ...tx,
        balance: runningBal,
      };
    });

    const openBal = Number(customer?.previousDue || 0);
    const newPurchases = totalDebits;
    const payments = totalCredits;
    const closingDue = openBal + newPurchases - payments;

    return {
      statementType: 'FULL',
      periodLabel: 'Full Historical Ledger',
      monthLabel: 'Full Ledger Statement',
      openingBalance: openBal,
      newPurchases,
      payments,
      closingDue,
      monthlyTransactions: finalTxs,
      transactions: finalTxs,
    };
  }

  if (statementType === 'CUSTOM') {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(0);
    const end = toDate ? new Date(`${toDate}T23:59:59`) : new Date();

    let priorDebits = 0;
    let priorCredits = 0;
    let periodDebits = 0;
    let periodCredits = 0;

    const periodList = [];

    rawList.filter(Boolean).forEach((tx) => {
      const txDate = parseTxDate(tx);
      const debit = Number(tx.debit || (tx.type === 'Invoice' ? tx.totalAmount || 0 : 0));
      const credit = Number(tx.credit || (tx.type === 'Payment' || tx.type === 'Advance' ? tx.amount || 0 : 0));

      if (!isNaN(txDate)) {
        if (txDate < start) {
          priorDebits += debit;
          priorCredits += credit;
        } else if (txDate >= start && txDate <= end) {
          periodDebits += debit;
          periodCredits += credit;
          periodList.push({
            ...tx,
            rawDateObj: txDate,
            debit,
            credit,
          });
        }
      }
    });

    periodList.sort((a, b) => (a.rawDateObj || 0) - (b.rawDateObj || 0));

    const openBal = Number(customer?.previousDue || 0) + priorDebits - priorCredits;
    let runningBal = openBal;

    const finalTxs = periodList.map((tx) => {
      runningBal = runningBal + tx.debit - tx.credit;
      return {
        ...tx,
        balance: runningBal,
      };
    });

    const closingDue = openBal + periodDebits - periodCredits;
    const fromLabel = fromDate ? new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
    const toLabel = toDate ? new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today';

    return {
      statementType: 'CUSTOM',
      periodLabel: `${fromLabel} to ${toLabel}`,
      monthLabel: `${fromLabel} to ${toLabel}`,
      openingBalance: openBal,
      newPurchases: periodDebits,
      payments: periodCredits,
      closingDue,
      monthlyTransactions: finalTxs,
      transactions: finalTxs,
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
  let monthDebits = 0;
  let monthCredits = 0;

  const monthList = [];

  rawList.filter(Boolean).forEach((tx) => {
    const txDate = parseTxDate(tx);
    const debit = Number(tx.debit || (tx.type === 'Invoice' ? tx.totalAmount || 0 : 0));
    const credit = Number(tx.credit || (tx.type === 'Payment' || tx.type === 'Advance' ? tx.amount || 0 : 0));

    if (!isNaN(txDate)) {
      if (txDate < startOfMonth) {
        priorDebits += debit;
        priorCredits += credit;
      } else if (txDate >= startOfMonth && txDate <= endOfMonth) {
        monthDebits += debit;
        monthCredits += credit;
        monthList.push({
          ...tx,
          rawDateObj: txDate,
          debit,
          credit,
        });
      }
    }
  });

  monthList.sort((a, b) => (a.rawDateObj || 0) - (b.rawDateObj || 0));

  const openBal = Number(customer?.previousDue || 0) + priorDebits - priorCredits;
  let runningBal = openBal;

  const finalTxs = monthList.map((tx) => {
    runningBal = runningBal + tx.debit - tx.credit;
    return {
      ...tx,
      balance: runningBal,
    };
  });

  const closingDue = openBal + monthDebits - monthCredits;

  return {
    statementType: 'MONTHLY',
    periodLabel: monthLabel,
    monthLabel,
    openingBalance: openBal,
    newPurchases: monthDebits,
    payments: monthCredits,
    closingDue,
    monthlyTransactions: finalTxs,
    transactions: finalTxs,
  };
}

/**
 * Formats standard WhatsApp Monthly Statement Message with dynamic UPI payment link and shop details.
 */
export function buildWhatsAppStatementMessage({
  monthLabel = '',
  openingBalance = 0,
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
  msg += `Opening Balance: ${fmt(openingBalance)}\n`;

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

  msg += `Thank you,\n${shopName}`;

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
