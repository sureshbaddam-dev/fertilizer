import mongoose from 'mongoose';

const purchaseReturnSchema = new mongoose.Schema(
  {
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
      required: [true, 'Purchase Invoice is required'],
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
