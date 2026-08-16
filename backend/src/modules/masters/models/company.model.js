import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
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

companySchema.plugin(softDeletePlugin);
companySchema.index({ userId: 1, name: 1 });
companySchema.index({ name: 'text', shortName: 'text' });

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
