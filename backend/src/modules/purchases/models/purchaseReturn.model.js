import mongoose from 'mongoose';

const purchaseReturnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
      index: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
      index: true,
    },
    purchaseItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseItem',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
    returnValue: {
      type: Number,
      required: true,
    },
    settlementType: {
      type: String,
      enum: ['CREDIT', 'REFUND', 'PARTIAL_REFUND'],
      default: 'CREDIT',
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['PENDING_REFUND', 'SUPPLIER_CREDIT', 'PARTIALLY_REFUNDED', 'REFUNDED'],
      default: 'PENDING_REFUND',
      index: true,
    },
    refunds: [
      {
        refundNumber: { type: String, required: true },
        amount: { type: Number, required: true },
        paymentMode: { type: String, default: 'Cash' },
        referenceNumber: { type: String, default: '' },
        notes: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    paymentMode: {
      type: String,
      default: 'Cash',
    },
    refundReference: {
      type: String,
      trim: true,
      default: '',
    },
    reason: {
      type: String,
      trim: true,
      default: 'Defective batch packaging',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: 'Ramesh Kumar',
    },
  },
  {
    timestamps: true,
  }
);

purchaseReturnSchema.index({ supplierId: 1, returnDate: -1 });
purchaseReturnSchema.index({ productId: 1, purchaseId: 1 });

export const PurchaseReturn = mongoose.model('PurchaseReturn', purchaseReturnSchema);
