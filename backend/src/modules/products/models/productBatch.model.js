import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const productBatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['Percentage', 'Amount'],
      default: 'Percentage',
    },
    gstRate: {
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
productBatchSchema.index({ userId: 1, productId: 1, batchNumber: 1 });
productBatchSchema.index({ userId: 1, productId: 1, isDeleted: 1, isActive: 1, currentStock: 1, createdAt: 1 });
productBatchSchema.index({ userId: 1, purchaseId: 1, isDeleted: 1 });

export const ProductBatch = mongoose.model('ProductBatch', productBatchSchema);
