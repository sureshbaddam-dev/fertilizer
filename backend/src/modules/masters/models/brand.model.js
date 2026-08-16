import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const brandSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    description: {
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

brandSchema.plugin(softDeletePlugin);
brandSchema.index({ userId: 1, name: 1 });

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
