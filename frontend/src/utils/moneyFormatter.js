/**
 * VEDIXA Standard Money / Rupee Formatter Utility
 * 
 * STANDARD MONEY RULE:
 * All monetary values across the entire application must be displayed in Indian Rupees
 * as WHOLE NUMBERS ONLY (no paise or decimal values).
 * 
 * Examples:
 *  1000      -> "₹ 1,000"
 *  1000.50   -> "₹ 1,001"
 *  1000.49   -> "₹ 1,000"
 *  0         -> "₹ 0"
 *  60653.00  -> "₹ 60,653"
 * 
 * IMPORTANT: Use this ONLY for money/currency values.
 * Do NOT use for non-money numbers like quantities, weights (kg/L), percentages, or GST rates!
 */

export const formatMoney = (val, includeSymbol = true) => {
  if (val === null || val === undefined || val === '') {
    return includeSymbol ? '₹ 0' : '0';
  }

  const num = Math.round(Number(val) || 0);
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  return includeSymbol ? `₹ ${formatted}` : formatted;
};

export const formatRupee = (val) => formatMoney(val, true);
export const formatRupeeNumber = (val) => formatMoney(val, false);
