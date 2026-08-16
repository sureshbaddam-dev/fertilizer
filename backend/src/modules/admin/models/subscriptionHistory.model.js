import mongoose from 'mongoose';

const subscriptionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userMobile: {
      type: String,
      default: '',
    },
    planCode: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    durationLabel: {
      type: String, // '1 Month', '3 Months', '6 Months', '7 Days Demo', '15 Days Demo', etc.
      required: true,
    },
    durationMonths: {
      type: Number,
      default: 1,
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['ONLINE_PAYMENT', 'ADMIN_GRANTED', 'DEMO', 'RENEWAL', 'EXTENSION'],
      default: 'ONLINE_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['SUCCESS', 'ADMIN_GRANTED', 'DEMO', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
      index: true,
    },
    grantedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    grantedByAdminName: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
