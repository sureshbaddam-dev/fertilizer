import mongoose from 'mongoose';

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    planCode: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    discountTokensTotal: {
      type: Number,
      default: 0,
    },
    discountTokensRemaining: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: null,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'SUCCESS',
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    activatedByAdmin: {
      type: Boolean,
      default: false,
    },
    activationType: {
      type: String,
      enum: ['ONLINE_PAYMENT', 'ADMIN_MANUAL'],
      default: 'ONLINE_PAYMENT',
    },
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);
