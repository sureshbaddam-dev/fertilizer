import mongoose from 'mongoose';

const supplierLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['PURCHASE', 'PAYMENT', 'ADJUSTMENT', 'RETURN'],
      default: 'PURCHASE',
      required: true,
    },
    purchaseAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    runningBalance: {
      type: Number,
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supplierLedgerSchema.index({ supplierId: 1, date: -1 });
supplierLedgerSchema.index({ userId: 1, supplierId: 1, isDeleted: 1, date: -1 });
supplierLedgerSchema.index({ userId: 1, isDeleted: 1, date: -1 });

export const SupplierLedger = mongoose.model('SupplierLedger', supplierLedgerSchema);
