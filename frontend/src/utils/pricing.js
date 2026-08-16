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
 * Utility to compute line item total based on quantity and unitPrice.
 */
export const calculateLineTotal = (quantity, unitPrice, discountAmount = 0) => {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPrice) || 0);
  const disc = Math.max(0, Number(discountAmount) || 0);
  return Math.max(0, qty * price - disc);
};
