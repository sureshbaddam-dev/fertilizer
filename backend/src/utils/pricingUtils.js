/**
 * Centralized money rounding helper throughout the entire application.
 * All monetary amounts are strictly rounded to the nearest whole rupee (0 paise/decimals).
 * Examples: 1593.42 -> 1593, 1593.50 -> 1594, 243.20 -> 243, 243.80 -> 244.
 */
export const roundMoney = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round(num);
};

export const normalizeMoney = roundMoney;

export const MONEY_TOLERANCE = 0;

/**
 * Helper to check if a value is genuinely configured (distinguishing explicit 0 from null/undefined/missing/empty string).
 */
export const isConfigured = (val) => {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num);
};

/**
 * Single source of truth for resolving effective GST rate.
 * Priority: Batch GST rate (if configured) -> Product GST rate (if configured) -> 0
 * NOTE: Explicit 0 in batch stops fallback to product!
 */
export const resolveEffectiveGstRate = (batch, product) => {
  if (isConfigured(batch?.gstRate)) {
    return Number(batch.gstRate);
  }
  if (isConfigured(product?.gstRate)) {
    return Number(product.gstRate);
  }
  return 0;
};

/**
 * Single source of truth for resolving effective discount.
 * Priority: Batch discount (if configured) -> Product discount (if configured) -> { discount: 0, discountType: 'Percentage' }
 * NOTE: Explicit 0 in batch stops fallback to product!
 */
export const resolveEffectiveDiscount = (batch, product) => {
  if (isConfigured(batch?.discount)) {
    return {
      discount: Number(batch.discount),
      discountType: batch.discountType || product?.discountType || 'Percentage',
    };
  }
  if (isConfigured(product?.discount)) {
    return {
      discount: Number(product.discount),
      discountType: product.discountType || 'Percentage',
    };
  }
  return {
    discount: 0,
    discountType: 'Percentage',
  };
};

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

/**
 * Calculates item-level discount strictly for backend authoritative verification.
 */
export const calculateItemDiscountAuthoritative = (item, qty = 1, unitPrice = 0) => {
  const quantity = Math.max(0, Number(qty) || 0);
  const rate = Math.max(0, Number(unitPrice) || 0);
  const grossTotal = normalizeMoney(quantity * rate);

  const rawType =
    item.discType ||
    item.discountType ||
    (item.discountPct !== undefined && Number(item.discountPct) > 0 ? 'Percentage' : 'Percentage');

  const discType = rawType === 'Amount' || rawType === 'amount' || rawType === '₹' ? 'Amount' : 'Percentage';

  let discVal = 0;
  if (item.discountPct !== undefined && item.discountPct !== null && Number(item.discountPct) > 0) {
    discVal = Number(item.discountPct);
  } else if (item.discVal !== undefined && item.discVal !== null && Number(item.discVal) > 0) {
    discVal = Number(item.discVal);
  } else if (item.discountVal !== undefined && item.discountVal !== null && Number(item.discountVal) > 0) {
    discVal = Number(item.discountVal);
  } else if (item.discount !== undefined && item.discount !== null && Number(item.discount) > 0) {
    discVal = Number(item.discount);
  }

  let unitDiscount = 0;
  let totalDiscount = 0;
  let discountPct = 0;

  if (discType === 'Percentage' && discVal > 0) {
    discountPct = discVal;
    unitDiscount = normalizeMoney((rate * discVal) / 100);
    totalDiscount = normalizeMoney(grossTotal * (discVal / 100));
  } else if (discType === 'Amount' && discVal > 0) {
    unitDiscount = discVal;
    totalDiscount = normalizeMoney(Math.min(grossTotal, discVal <= rate ? quantity * discVal : discVal));
    discountPct = grossTotal > 0 ? normalizeMoney((totalDiscount / grossTotal) * 100) : 0;
  } else if (item.discountAmount !== undefined && Number(item.discountAmount) > 0) {
    totalDiscount = normalizeMoney(Math.min(grossTotal, Number(item.discountAmount)));
    unitDiscount = quantity > 0 ? normalizeMoney(totalDiscount / quantity) : totalDiscount;
    discountPct = grossTotal > 0 ? normalizeMoney((totalDiscount / grossTotal) * 100) : 0;
  }

  const taxableAmount = Math.max(0, normalizeMoney(grossTotal - totalDiscount));

  return {
    grossTotal,
    discVal,
    discType,
    discountPct,
    unitDiscount,
    discountAmount: totalDiscount,
    taxableAmount,
  };
};

/**
 * Calculates authoritative invoice financial totals on the backend.
 */
export const calculateAuthoritativeInvoiceTotals = ({
  items = [],
  billDiscountValue = 0,
  billDiscountType = 'amount',
  isGstEnabled = true,
}) => {
  let grossSubtotal = 0;
  let productDiscountTotal = 0;

  const itemCalculations = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)));
    const price = Math.max(0, Number(item.unitPrice !== undefined ? item.unitPrice : (item.price !== undefined ? item.price : 0)));
    const itemDisc = calculateItemDiscountAuthoritative(item, qty, price);

    grossSubtotal += itemDisc.grossTotal;
    productDiscountTotal += itemDisc.discountAmount;

    let gstRate = 0;
    if (isGstEnabled) {
      if (item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '') {
        gstRate = Number(item.gstRate);
      } else if (item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== '') {
        gstRate = Number(item.gstPercent);
      }
      if (isNaN(gstRate) || gstRate < 0) gstRate = 0;
    }

    return {
      ...item,
      quantity: qty,
      qty,
      unitPrice: price,
      price,
      grossTotal: itemDisc.grossTotal,
      discVal: itemDisc.discVal,
      discType: itemDisc.discType,
      discountPct: itemDisc.discountPct,
      discountAmount: itemDisc.discountAmount,
      taxableBeforeBillDisc: itemDisc.taxableAmount,
      gstRate,
    };
  });

  grossSubtotal = normalizeMoney(grossSubtotal);
  productDiscountTotal = normalizeMoney(productDiscountTotal);
  const subtotalAfterProductDiscount = Math.max(0, normalizeMoney(grossSubtotal - productDiscountTotal));

  let billDiscountAmount = 0;
  const numBillDisc = Number(billDiscountValue || 0);
  if (numBillDisc > 0) {
    const normType = billDiscountType === 'percentage' || billDiscountType === '%' ? 'percentage' : 'amount';
    const computed = normType === 'percentage'
      ? (subtotalAfterProductDiscount * numBillDisc) / 100
      : numBillDisc;
    billDiscountAmount = Math.min(subtotalAfterProductDiscount, Math.max(0, normalizeMoney(computed)));
  }

  const totalDiscount = normalizeMoney(productDiscountTotal + billDiscountAmount);
  const taxableSubtotal = Math.max(0, normalizeMoney(grossSubtotal - totalDiscount));

  let allocatedBillDiscSum = 0;
  let gstTotal = 0;

  const finalItems = itemCalculations.map((item, idx) => {
    let itemBillDisc = 0;
    if (billDiscountAmount > 0 && subtotalAfterProductDiscount > 0) {
      if (idx === itemCalculations.length - 1) {
        itemBillDisc = Math.max(0, normalizeMoney(billDiscountAmount - allocatedBillDiscSum));
      } else {
        itemBillDisc = normalizeMoney((item.taxableBeforeBillDisc / subtotalAfterProductDiscount) * billDiscountAmount);
        allocatedBillDiscSum += itemBillDisc;
      }
    }

    const itemFinalTaxable = Math.max(0, normalizeMoney(item.taxableBeforeBillDisc - itemBillDisc));
    const itemGstRate = item.gstRate || 0;
    const itemGstAmount = isGstEnabled && itemGstRate > 0
      ? normalizeMoney((itemFinalTaxable * itemGstRate) / 100)
      : 0;

    const lineTotal = normalizeMoney(itemFinalTaxable + itemGstAmount);
    gstTotal += itemGstAmount;

    return {
      ...item,
      billDiscountAmount: itemBillDisc,
      taxableAmount: itemFinalTaxable,
      gstAmount: itemGstAmount,
      lineTotal,
      totalAmount: lineTotal,
    };
  });

  gstTotal = normalizeMoney(gstTotal);
  const grandTotal = Math.max(0, normalizeMoney(taxableSubtotal + gstTotal));

  return {
    subtotal: grossSubtotal,
    productDiscountAmount: productDiscountTotal,
    billDiscountAmount,
    discountAmount: totalDiscount,
    taxableAmount: taxableSubtotal,
    taxAmount: gstTotal,
    grandTotal,
    totalAmount: grandTotal,
    items: finalItems,
  };
};
