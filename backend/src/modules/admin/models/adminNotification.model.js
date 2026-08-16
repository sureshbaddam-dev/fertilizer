import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    targetAudience: {
      type: String,
      enum: ['ALL_USERS', 'SELECTED_USERS', 'EXPIRING_SOON', 'DEMO_USERS', 'SPECIFIC_USER'],
      default: 'ALL_USERS',
    },
    notificationType: {
      type: String,
      enum: ['SUBSCRIPTION_EXPIRY', 'PAYMENT', 'SYSTEM_ANNOUNCEMENT', 'MAINTENANCE', 'PROMOTIONAL'],
      default: 'SYSTEM_ANNOUNCEMENT',
    },
    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sentByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentByAdminName: {
      type: String,
      required: true,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
