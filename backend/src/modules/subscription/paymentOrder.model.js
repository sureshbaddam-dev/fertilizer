import mongoose from 'mongoose';

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    months: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    couponCode: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['CREATED', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'CREATED',
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentOrderSchema.index({ userId: 1, createdAt: -1 });

export const PaymentOrder = mongoose.model('PaymentOrder', paymentOrderSchema);
