import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    billingPeriod: {
      type: String,
      enum: ['MONTHLY', 'YEARLY'],
      default: 'MONTHLY',
    },
    features: [
      {
        type: String,
      },
    ],
    discountTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
