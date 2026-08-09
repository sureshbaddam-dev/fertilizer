import mongoose from 'mongoose';

const stockLedgerSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'DAMAGE', 'OPENING_STOCK'],
      default: 'PURCHASE',
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      required: false,
      default: null,
    },
    batchNumber: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    purchaseRate: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    previousStock: {
      type: Number,
      default: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: 'Ramesh Kumar',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

stockLedgerSchema.index({ productId: 1, batchId: 1, timestamp: -1 });
stockLedgerSchema.index({ productId: 1, timestamp: -1 });

export const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);
