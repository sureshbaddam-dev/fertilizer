import { Product } from '../modules/products/models/product.model.js';
import { Supplier } from '../modules/suppliers/models/supplier.model.js';
import { SupplierLedger } from '../modules/suppliers/models/supplierLedger.model.js';
import { Purchase } from '../modules/purchases/models/purchase.model.js';
import { SalesInvoice } from '../modules/sales/models/salesInvoice.model.js';
import { PurchaseItem } from '../modules/purchases/models/purchaseItem.model.js';
import { logger } from '../config/logger.config.js';

/**
 * 90-Day Product Soft-Delete Retention & Safety Cleanup Job
 * Safely purges soft-deleted products older than 90 days ONLY if they contain no historical sales or purchase records.
 */
export async function cleanupSoftDeletedProductsOlderThan90Days() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const eligibleProducts = await Product.find({
    isActive: false,
    deletedAt: { $ne: null, $lte: ninetyDaysAgo },
  }).lean().exec();

  if (!eligibleProducts || eligibleProducts.length === 0) {
    return { cleanedCount: 0 };
  }

  let cleanedCount = 0;

  for (const prod of eligibleProducts) {
    const hasSales = await SalesInvoice.exists({ 'items.productId': prod._id });
    const hasPurchases = await PurchaseItem.exists({ productId: prod._id });

    if (hasSales || hasPurchases) {
      logger.info(`ℹ️ Soft-deleted Product '${prod.name}' [${prod._id}] is >90 days old but retained to preserve financial/accounting history.`);
      continue;
    }

    await Product.deleteOne({ _id: prod._id });
    cleanedCount += 1;
    logger.info(`🗑️ Permanently cleaned up unreferenced soft-deleted Product '${prod.name}' [${prod._id}] (Deleted at: ${prod.deletedAt})`);
  }

  return { cleanedCount };
}

/**
 * 90-Day Supplier Soft-Delete Retention & Safety Cleanup Job
 * Safely purges soft-deleted suppliers older than 90 days ONLY if they contain no historical purchases or ledger entries.
 */
export async function cleanupSoftDeletedSuppliersOlderThan90Days() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const eligibleSuppliers = await Supplier.find({
    isActive: false,
    deletedAt: { $ne: null, $lte: ninetyDaysAgo },
  }).lean().exec();

  if (!eligibleSuppliers || eligibleSuppliers.length === 0) {
    return { cleanedCount: 0 };
  }

  let cleanedCount = 0;

  for (const sup of eligibleSuppliers) {
    const hasLedgers = await SupplierLedger.exists({ supplierId: sup._id });
    const hasPurchases = await Purchase.exists({ supplierId: sup._id });

    if (hasLedgers || hasPurchases) {
      logger.info(`ℹ️ Soft-deleted Supplier '${sup.name}' [${sup._id}] is >90 days old but retained to preserve ledger & transaction history.`);
      continue;
    }

    await Supplier.deleteOne({ _id: sup._id });
    cleanedCount += 1;
    logger.info(`🗑️ Permanently cleaned up unreferenced soft-deleted Supplier '${sup.name}' [${sup._id}] (Deleted at: ${sup.deletedAt})`);
  }

  return { cleanedCount };
}

/**
 * 90-Day Purchase Soft-Delete Retention & Safety Cleanup Job
 * Safely purges soft-deleted purchases older than 90 days ONLY if they contain no active stock or historical sales dependencies.
 */
export async function cleanupSoftDeletedPurchasesOlderThan90Days() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const eligiblePurchases = await Purchase.find({
    isDeleted: true,
    deletedAt: { $ne: null, $lte: ninetyDaysAgo },
  }).lean().exec();

  if (!eligiblePurchases || eligiblePurchases.length === 0) {
    return { cleanedCount: 0 };
  }

  let cleanedCount = 0;

  for (const pur of eligiblePurchases) {
    const hasActiveLedger = await SupplierLedger.exists({ purchaseId: pur._id, isDeleted: { $ne: true } });
    if (hasActiveLedger) {
      logger.info(`ℹ️ Soft-deleted Purchase #${pur.purchaseNumber} [${pur._id}] is >90 days old but retained due to financial ledger integrity.`);
      continue;
    }

    await PurchaseItem.deleteMany({ purchaseId: pur._id });
    await Purchase.deleteOne({ _id: pur._id });
    cleanedCount += 1;
    logger.info(`🗑️ Permanently cleaned up soft-deleted Purchase #${pur.purchaseNumber} [${pur._id}] (Deleted at: ${pur.deletedAt})`);
  }

  return { cleanedCount };
}
