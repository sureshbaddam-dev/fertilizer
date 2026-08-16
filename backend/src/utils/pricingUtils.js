/**
 * Utility for safe monetary normalization.
 * Prevents IEEE-754 floating point precision issues (e.g. 420 becoming 419.99999999999994 or 419.99).
 */
export const normalizeMoney = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const MONEY_TOLERANCE = 0.01;

/**
 * Authoritative Invoice Payment Status Calculator with Floating-Point Protection.
 *
 * Status Rules:
 * 1. Cancelled: If currentStatus is 'Cancelled' or 'cancelled', returns 'Cancelled'.
 * 2. Paid: If dueAmount <= MONEY_TOLERANCE (0.01), returns 'Paid'.
 * 3. Partial: If paidAmount > MONEY_TOLERANCE AND dueAmount > MONEY_TOLERANCE, returns 'Partial'.
 * 4. Due: If paidAmount <= MONEY_TOLERANCE AND dueAmount > MONEY_TOLERANCE, returns 'Due'.
 */
export const calculateInvoicePaymentStatus = (totalAmount, paidAmount, dueAmount, currentStatus = '') => {
  const statusStr = (currentStatus || '').toString().trim().toLowerCase();
  if (statusStr === 'cancelled') {
    return 'Cancelled';
  }

  const normTotal = Math.max(0, normalizeMoney(totalAmount));
  const normPaid = Math.max(0, normalizeMoney(paidAmount));

  let normDue = dueAmount !== undefined && dueAmount !== null
    ? normalizeMoney(dueAmount)
    : normalizeMoney(normTotal - normPaid);

  if (normDue < 0) normDue = 0;

  if (normDue <= MONEY_TOLERANCE) {
    return 'Paid';
  }

  if (normPaid > MONEY_TOLERANCE && normDue > MONEY_TOLERANCE) {
    return 'Partial';
  }

  return 'Due';
};
