import mongoose from 'mongoose';

const demoRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    requestedPlan: {
      type: String,
      enum: ['1_MONTH', '3_MONTHS', '6_MONTHS'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    grantedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    grantedByAdminName: {
      type: String,
      default: '',
    },
    grantedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const DemoRequest = mongoose.model('DemoRequest', demoRequestSchema);
