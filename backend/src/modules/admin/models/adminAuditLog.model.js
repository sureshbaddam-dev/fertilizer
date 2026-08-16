import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminRole: {
      type: String,
      default: 'SUPER_ADMIN',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      index: true, // e.g. 'USER', 'SUBSCRIPTION', 'BACKUP', 'LEAD', 'SETTING'
    },
    targetId: {
      type: String,
      default: null,
    },
    targetName: {
      type: String,
      default: null,
    },
    details: {
      type: String,
      required: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);
