import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
      index: true,
    },
    supplierInvoiceNumber: {
      type: String,
      required: [true, 'Supplier invoice number is required'],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    purchaseType: {
      type: String,
      default: 'Goods Purchase',
    },
    paymentType: {
      type: String,
      enum: ['Full Payment', 'Partial Payment', 'Credit (Due)'],
      default: 'Partial Payment',
    },
    dueDate: {
      type: Date,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalInvoiceAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      default: 'Ramesh Kumar',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
    deletedBy: {
      type: String,
      default: null,
    },
    restoredAt: {
      type: Date,
      default: null,
    },
    restoredBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ userId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ userId: 1, supplierInvoiceNumber: 1, supplierId: 1 });
purchaseSchema.index({ userId: 1, isDeleted: 1, purchaseDate: -1, createdAt: -1 });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
