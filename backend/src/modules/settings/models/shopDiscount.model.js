import mongoose from 'mongoose';

const shopDiscountSchema = new mongoose.Schema(
  {
    discountType: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

export const ShopDiscount = mongoose.model('ShopDiscount', shopDiscountSchema);
