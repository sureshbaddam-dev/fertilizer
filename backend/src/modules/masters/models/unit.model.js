import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const unitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Unit name is required'],
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      required: [true, 'Short name is required'],
      trim: true,
    },
    allowDecimals: {
      type: Boolean,
      default: false,
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

unitSchema.plugin(softDeletePlugin);
unitSchema.index({ userId: 1, name: 1 });
unitSchema.index({ name: 'text', shortName: 'text' });

export const Unit = mongoose.model('Unit', unitSchema);
