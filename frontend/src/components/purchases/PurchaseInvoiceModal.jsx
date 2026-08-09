import React from 'react';
import TransactionDetailsModal from './TransactionDetailsModal';

export default function PurchaseInvoiceModal({
  isOpen,
  purchase = null,
  onClose,
}) {
  if (!isOpen || !purchase) return null;

  const transactionData = {
    transactionType: 'PURCHASE',
    purchaseId: purchase,
    supplierId: purchase.supplierId || {},
    purchaseAmount: purchase.totalInvoiceAmount || purchase.subtotal || 0,
    paidAmount: purchase.paidAmount || 0,
    dueAmount: purchase.dueAmount || 0,
    date: purchase.purchaseDate || purchase.createdAt,
    referenceNumber: purchase.supplierInvoiceNumber || purchase.purchaseNumber,
    notes: purchase.notes,
    payments: purchase.payments || [],
    items: purchase.items || [],
    ...purchase,
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
