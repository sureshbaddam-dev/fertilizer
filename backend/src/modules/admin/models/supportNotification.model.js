import mongoose from 'mongoose';

const supportNotificationSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
    },
    ticketCode: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userMobile: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

supportNotificationSchema.index({ isRead: 1, createdAt: -1 });

export const SupportNotification = mongoose.model('SupportNotification', supportNotificationSchema);
