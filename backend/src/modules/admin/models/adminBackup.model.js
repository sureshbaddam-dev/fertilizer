import mongoose from 'mongoose';

const adminBackupSchema = new mongoose.Schema(
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
    },
    userMobile: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      default: '',
    },
    createdByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByAdminName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    fileSizeFormatted: {
      type: String,
      default: '0 KB',
    },
    backupStatus: {
      type: String,
      enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
      default: 'COMPLETED',
      index: true,
    },
    backupType: {
      type: String,
      enum: ['FULL_ERP', 'CUSTOM'],
      default: 'FULL_ERP',
    },
    recordCounts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dataPayload: {
      type: mongoose.Schema.Types.Mixed, // Encapsulated full JSON backup
      select: false, // Don't load by default in list queries
    },
  },
  {
    timestamps: true,
  }
);

export const AdminBackup = mongoose.model('AdminBackup', adminBackupSchema);
