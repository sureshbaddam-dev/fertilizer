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

export const formatRupees = (val) => `₹ ${roundMoney(val).toLocaleString('en-IN')}`;

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
 * Priority:
 * 1. Batch GST rate > 0 -> returns batch.gstRate
 * 2. Batch GST rate === 0:
 *    - If explicitly marked zero (isExplicitGstZero / isExplicitZero) -> returns 0
 *    - If product GST rate is configured and > 0 -> returns product.gstRate (legacy default 0 fallback)
 *    - Else -> returns 0
 * 3. Batch GST rate null/undefined/missing:
 *    - If product GST rate is configured -> returns product.gstRate
 *    - Else -> returns 0
 */
export const resolveEffectiveGstRate = (batch, product) => {
  if (batch && isConfigured(batch.gstRate)) {
    const bGst = Number(batch.gstRate);
    if (bGst > 0) {
      return bGst;
    }
    if (batch.isExplicitGstZero === true || batch.isExplicitZero === true) {
      return 0;
    }
    if (product && isConfigured(product.gstRate) && Number(product.gstRate) > 0) {
      return Number(product.gstRate);
    }
    return 0;
  }
  if (product && isConfigured(product.gstRate)) {
    return Number(product.gstRate);
  }
  return 0;
};

/**
 * Single source of truth for resolving effective discount.
 * Priority:
 * 1. Batch discount > 0 -> returns { discount: batch.discount, discountType }
 * 2. Batch discount === 0:
 *    - If explicitly marked zero (isExplicitDiscountZero / isExplicitZero) -> returns { discount: 0, discountType }
 *    - If product discount is configured and > 0 -> returns { discount: product.discount, discountType: product.discountType } (legacy default 0 fallback)
 *    - Else -> returns { discount: 0, discountType }
 * 3. Batch discount null/undefined/missing:
 *    - If product discount is configured -> returns { discount: product.discount, discountType: product.discountType }
 *    - Else -> returns { discount: 0, discountType: 'Percentage' }
 */
export const resolveEffectiveDiscount = (batch, product) => {
  if (batch && isConfigured(batch.discount)) {
    const bDisc = Number(batch.discount);
    const discType = batch.discountType || product?.discountType || 'Percentage';
    if (bDisc > 0) {
      return {
        discount: bDisc,
        discountType: discType,
      };
    }
    if (batch.isExplicitDiscountZero === true || batch.isExplicitZero === true) {
      return {
        discount: 0,
        discountType: discType,
      };
    }
    if (product && isConfigured(product.discount) && Number(product.discount) > 0) {
      return {
        discount: Number(product.discount),
        discountType: product.discountType || 'Percentage',
      };
    }
    return {
      discount: 0,
      discountType: discType,
    };
  }
  if (product && isConfigured(product.discount)) {
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
 * Utility to extract the unit price from an invoice item or product.
 * Returns the actual unitPrice from database schema, or fallback fields if present.
 */
export const getItemUnitPrice = (item) => {
  if (!item) return 0;

  // Primary backend schema property
  if (item.unitPrice !== undefined && item.unitPrice !== null) {
    const val = Number(item.unitPrice);
    if (!isNaN(val)) return val;
  }

  // Fallback properties for legacy or external product models
  if (item.sellingPrice !== undefined && item.sellingPrice !== null) {
    const val = Number(item.sellingPrice);
    if (!isNaN(val)) return val;
  }

  if (item.price !== undefined && item.price !== null) {
    const val = Number(item.price);
    if (!isNaN(val)) return val;
  }

  if (item.rate !== undefined && item.rate !== null) {
    const val = Number(item.rate);
    if (!isNaN(val)) return val;
  }

  if (item.salePrice !== undefined && item.salePrice !== null) {
    const val = Number(item.salePrice);
    if (!isNaN(val)) return val;
  }

  if (item.itemPrice !== undefined && item.itemPrice !== null) {
    const val = Number(item.itemPrice);
    if (!isNaN(val)) return val;
  }

  return 0;
};

/**
 * Calculates item-level discount and taxable amount for a single cart/invoice item.
 */
export const calculateItemDiscount = (item, qty = 1, unitPrice = 0) => {
  const quantity = Math.max(0, Number(qty) || 0);
  const rate = Math.max(0, Number(unitPrice) || 0);
  const grossTotal = normalizeMoney(quantity * rate);

  const rawType =
    item.discType ||
    item.discountType ||
    (item.discountPct !== undefined && Number(item.discountPct) > 0 ? 'Percentage' : 'Percentage');

  const discType = rawType === 'Amount' || rawType === 'amount' || rawType === '₹' ? 'Amount' : 'Percentage';

  // Resolve discount rate/value strictly (percentage or fixed amount per unit)
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
    // If fixed discount amount per unit or total line
    unitDiscount = discVal;
    totalDiscount = normalizeMoney(Math.min(grossTotal, discVal <= rate ? quantity * discVal : discVal));
    discountPct = grossTotal > 0 ? normalizeMoney((totalDiscount / grossTotal) * 100) : 0;
  } else if (item.discountAmount !== undefined && Number(item.discountAmount) > 0) {
    totalDiscount = normalizeMoney(Math.min(grossTotal, Number(item.discountAmount)));
    unitDiscount = quantity > 0 ? normalizeMoney(totalDiscount / quantity) : totalDiscount;
    discountPct = grossTotal > 0 ? normalizeMoney((totalDiscount / grossTotal) * 100) : 0;
  }

  const taxableAmount = Math.max(0, normalizeMoney(grossTotal - totalDiscount));
  const effectivePrice = quantity > 0 ? normalizeMoney(taxableAmount / quantity) : rate;

  return {
    grossTotal,
    discVal,
    discType,
    discountPct,
    unitDiscount,
    discountAmount: totalDiscount,
    taxableAmount,
    effectivePrice,
  };
};

/**
 * Formats a clean, professional discount string for display on invoices and tables.
 * Example outputs: "10% (₹300)", "₹300", "Rs. 0"
 */
export const formatItemDiscount = (item, effectiveDisc = null, currencyPrefix = 'Rs. ') => {
  const discAmt = effectiveDisc !== null
    ? Number(effectiveDisc)
    : Number(item?.discountAmount !== undefined ? item.discountAmount : (item?.discountVal ?? item?.discount ?? 0));

  let discPct = 0;
  if (item?.discountPct !== undefined && item?.discountPct !== null && Number(item.discountPct) > 0) {
    discPct = Number(item.discountPct);
  } else if (item?.discountType === 'Percentage' || item?.discType === 'Percentage') {
    if (item?.discVal !== undefined && Number(item.discVal) > 0) {
      discPct = Number(item.discVal);
    } else if (item?.discountVal !== undefined && Number(item.discountVal) > 0) {
      discPct = Number(item.discountVal);
    } else if (item?.discount !== undefined && Number(item.discount) > 0 && Number(item.discount) <= 100) {
      discPct = Number(item.discount);
    }
  }

  if (discAmt <= 0 && discPct <= 0) {
    return `${currencyPrefix}0`;
  }

  if (discPct > 0 && discAmt > 0) {
    return `${discPct}% (${currencyPrefix}${Math.round(discAmt).toLocaleString('en-IN')})`;
  }

  if (discPct > 0) {
    return `${discPct}%`;
  }

  return `${currencyPrefix}${Math.round(discAmt).toLocaleString('en-IN')}`;
};

/**
 * Unified authoritative invoice calculator.
 * Computes Gross Subtotal, Product Discounts, Bill Discounts, Taxable Amounts, Dynamic GST, and Grand Total.
 */
export const calculateInvoiceTotals = ({
  items = [],
  manualDiscountValue = '',
  manualDiscountType = 'percentage',
  shopDiscountData = null,
  isGstEnabled = true,
  gstType = 'CGST_SGST',
  defaultGstRate = 0,
}) => {
  let grossSubtotal = 0;
  let productDiscountTotal = 0;

  // 1. First Pass: Compute item gross total and item-level product discounts
  const itemCalculations = items.map((item) => {
    const qty = Math.max(0, Number(item.qty !== undefined ? item.qty : item.quantity !== undefined ? item.quantity : 1));
    const price = getItemUnitPrice(item);
    const itemDisc = calculateItemDiscount(item, qty, price);

    grossSubtotal += itemDisc.grossTotal;
    productDiscountTotal += itemDisc.discountAmount;

    // Resolve GST rate for this item (Batch/Product specific -> fallback defaultGstRate -> 0)
    let itemGstRate = 0;
    if (isGstEnabled) {
      if (item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '') {
        itemGstRate = Number(item.gstRate);
      } else if (item.gstPercent !== undefined && item.gstPercent !== null && item.gstPercent !== '') {
        itemGstRate = Number(item.gstPercent);
      } else if (defaultGstRate > 0) {
        itemGstRate = Number(defaultGstRate);
      }
      if (isNaN(itemGstRate) || itemGstRate < 0) itemGstRate = 0;
    }

    return {
      ...item,
      qty,
      quantity: qty,
      price,
      unitPrice: price,
      grossTotal: itemDisc.grossTotal,
      discVal: itemDisc.discVal,
      discType: itemDisc.discType,
      discountPct: itemDisc.discountPct,
      unitDiscount: itemDisc.unitDiscount,
      discountAmount: itemDisc.discountAmount,
      taxableBeforeBillDisc: itemDisc.taxableAmount,
      gstRate: itemGstRate,
      hsnCode: item.hsnCode || '',
    };
  });

  grossSubtotal = normalizeMoney(grossSubtotal);
  productDiscountTotal = normalizeMoney(productDiscountTotal);
  const subtotalAfterProductDiscount = Math.max(0, normalizeMoney(grossSubtotal - productDiscountTotal));

  // 2. Second Pass: Resolve Bill-level Discount (Priority: Manual Bill Discount -> Auto Shop Discount -> None)
  let billDiscountAmount = 0;
  let activeBillDiscount = { type: 'none', value: 0, amount: 0, source: 'none', label: 'No Discount' };

  const manualInput = String(manualDiscountValue || '').trim();
  const isManualEntered = manualInput !== '' && !isNaN(Number(manualInput)) && Number(manualInput) > 0;

  if (isManualEntered) {
    const val = Number(manualInput);
    const normType = manualDiscountType === 'percentage' || manualDiscountType === '%' ? 'percentage' : 'amount';
    const amount = normType === 'percentage'
      ? (subtotalAfterProductDiscount * val) / 100
      : val;
    billDiscountAmount = Math.min(subtotalAfterProductDiscount, Math.max(0, normalizeMoney(amount)));
    activeBillDiscount = {
      type: normType,
      value: val,
      amount: billDiscountAmount,
      source: 'manual',
      label: `Bill Discount (${normType === 'percentage' ? `${val}%` : `₹${val}`})`,
    };
  } else if (shopDiscountData?.isEnabled && Number(shopDiscountData?.discountValue) > 0) {
    const shopVal = Number(shopDiscountData.discountValue);
    const shopType = shopDiscountData.discountType || 'percentage';
    const amount = shopType === 'percentage'
      ? (subtotalAfterProductDiscount * shopVal) / 100
      : shopVal;
    billDiscountAmount = Math.min(subtotalAfterProductDiscount, Math.max(0, normalizeMoney(amount)));
    activeBillDiscount = {
      type: shopType,
      value: shopVal,
      amount: billDiscountAmount,
      source: 'shop',
      label: shopDiscountData.title || (shopType === 'percentage' ? `Flat ${shopVal}% OFF` : `Flat ₹${shopVal} OFF`),
    };
  }

  const totalDiscount = normalizeMoney(productDiscountTotal + billDiscountAmount);
  const taxableSubtotal = Math.max(0, normalizeMoney(grossSubtotal - totalDiscount));

  // 3. Third Pass: Proportional allocation of bill discount to taxable items and calculate GST
  let allocatedBillDiscSum = 0;
  let gstTotal = 0;

  const distinctGstRates = new Set();

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
    if (itemGstRate > 0) {
      distinctGstRates.add(itemGstRate);
    }

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

  // Determine GST Label
  let gstRateLabel = '0%';
  if (isGstEnabled) {
    if (distinctGstRates.size === 1) {
      gstRateLabel = `${Array.from(distinctGstRates)[0]}%`;
    } else if (distinctGstRates.size > 1) {
      gstRateLabel = 'Mixed';
    } else if (defaultGstRate > 0) {
      gstRateLabel = `${defaultGstRate}%`;
    }
  }

  const isIgst = gstType === 'IGST';
  const halfGst = normalizeMoney(gstTotal / 2);

  const gstBreakdown = {
    isGstEnabled: Boolean(isGstEnabled && (gstTotal > 0 || distinctGstRates.size > 0 || defaultGstRate > 0)),
    gstRate: distinctGstRates.size === 1 ? Array.from(distinctGstRates)[0] : defaultGstRate,
    gstRateLabel,
    gstAmount: gstTotal,
    cgst: isIgst ? 0 : halfGst,
    sgst: isIgst ? 0 : halfGst,
    igst: isIgst ? gstTotal : 0,
    gstType: isIgst ? 'IGST' : 'CGST_SGST',
  };

  return {
    grossSubtotal,
    productDiscountTotal,
    billDiscountAmount,
    totalDiscount,
    taxableSubtotal,
    gstTotal,
    gstCalculation: gstBreakdown,
    grandTotal,
    activeBillDiscount,
    items: finalItems,
  };
};


