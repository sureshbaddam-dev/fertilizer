import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productCode: { type: String, default: '' },
    productName: { type: String, default: '' },
    brandName: { type: String, default: '' },
    categoryName: { type: String, default: '' },
    unitName: { type: String, default: 'Unit' },
    hsnCode: { type: String, default: '' },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductBatch',
      required: false,
      default: null,
    },
    batchNumber: {
      type: String,
      required: false,
      default: null,
    },
    mfgDate: Date,
    expiryDate: Date,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    purchaseRate: {
      type: Number,
      required: true,
    },
    mrp: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    gstPercent: {
      type: Number,
      default: 18,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    taxableAmount: {
      type: Number,
      default: 0,
    },
    lineTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PurchaseItem = mongoose.model('PurchaseItem', purchaseItemSchema);
