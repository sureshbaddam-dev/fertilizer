import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    icon: {
      type: String,
      default: 'Layers',
      trim: true,
    },
    color: {
      type: String,
      default: 'emerald',
      trim: true,
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

categorySchema.plugin(softDeletePlugin);
categorySchema.index({ userId: 1, slug: 1 }, { unique: true });
categorySchema.index({ userId: 1, name: 1 });
categorySchema.index({ name: 'text', description: 'text' });

export const Category = mongoose.model('Category', categorySchema);
