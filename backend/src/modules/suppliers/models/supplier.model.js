import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    mobile: {
      type: String,
      required: [true, 'Supplier mobile number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    outstandingBalance: {
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
  }
);

supplierSchema.plugin(softDeletePlugin);
supplierSchema.index({ name: 'text', companyName: 'text', mobile: 'text' });
supplierSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export const Supplier = mongoose.model('Supplier', supplierSchema);
