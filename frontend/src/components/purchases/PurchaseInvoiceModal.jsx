import React from 'react';
import TransactionDetailsModal from './TransactionDetailsModal';

export default function PurchaseInvoiceModal({
  isOpen,
  purchase = null,
  onClose,
}) {
  if (!isOpen || !purchase) return null;

  const totalInv = Number(purchase.totalInvoiceAmount || purchase.subtotal || 0);
  const advanceUsed = Number(purchase.advanceUsed || 0);
  const paid = Number(purchase.paidAmount || 0);
  const ret = Number(purchase.returnAmount || 0);
  const due = purchase.dueAmount !== undefined && purchase.dueAmount !== null
    ? Number(purchase.dueAmount)
    : Math.max(0, totalInv - advanceUsed - paid - ret);

  const transactionData = {
    ...purchase,
    transactionType: 'PURCHASE',
    purchaseId: purchase,
    supplierId: purchase.supplierId || {},
    purchaseAmount: totalInv,
    advanceUsed,
    paidAmount: paid,
    returnAmount: ret,
    dueAmount: due,
    runningBalance: due,
    date: purchase.purchaseDate || purchase.createdAt,
    referenceNumber: purchase.supplierInvoiceNumber || purchase.purchaseNumber,
    notes: purchase.notes,
    payments: purchase.payments || [],
    items: purchase.items || [],
  };

  return (
    <TransactionDetailsModal
      isOpen={isOpen}
      transaction={transactionData}
      supplier={purchase.supplierId}
      onClose={onClose}
    />
  );
}
