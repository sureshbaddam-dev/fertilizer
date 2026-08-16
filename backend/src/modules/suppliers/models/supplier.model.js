import mongoose from 'mongoose';
import { softDeletePlugin } from '../../../common/softDelete.plugin.js';

const supplierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
supplierSchema.index({ userId: 1, mobile: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);

// Automatic index cleanup: Drop any legacy unique index on mobile in MongoDB
setTimeout(async () => {
  try {
    const collection = Supplier.collection;
    const indexes = await collection.indexes();
    for (const idx of indexes) {
      if (idx.unique && (idx.name.includes('mobile') || (idx.key && idx.key.mobile))) {
        console.log(`🧹 Dropping legacy unique index on suppliers collection: ${idx.name}`);
        await collection.dropIndex(idx.name);
      }
    }
  } catch (err) {
    // Ignore error if collection does not exist yet
  }
}, 1000);
