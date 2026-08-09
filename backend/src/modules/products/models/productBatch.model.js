import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const productBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      index: true,
    },
    mfgDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    purchaseRate: {
      type: Number,
      default: 0,
    },
    mrp: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    initialQuantity: {
      type: Number,
      default: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productBatchSchema.virtual('quantityPurchased').get(function () {
  return this.initialQuantity ?? 0;
});

productBatchSchema.virtual('quantityRemaining').get(function () {
  return this.currentStock ?? 0;
});

productBatchSchema.virtual('purchaseDate').get(function () {
  return this.createdAt;
});

productBatchSchema.plugin(softDeletePlugin);
productBatchSchema.index({ productId: 1, batchNumber: 1 });
productBatchSchema.index({ productId: 1, isActive: 1, currentStock: 1, createdAt: 1 });

export const ProductBatch = mongoose.model('ProductBatch', productBatchSchema);
