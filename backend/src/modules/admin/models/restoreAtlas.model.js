import mongoose from 'mongoose';

const restoreHistorySchema = new mongoose.Schema(
  {
    restoreId: { type: String, required: true, unique: true, index: true },
    sourceBackupId: { type: String, required: true, index: true },
    safetyBackupId: { type: String, default: '' },
    targetUserId: { type: String, default: 'ALL' },
    targetUserName: { type: String, default: 'All Users' },
    targetUserMobile: { type: String, default: '' },
    ticketId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PREVIEW', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL'],
      default: 'IN_PROGRESS',
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdByAdminId: { type: String, default: 'SYSTEM' },
    createdByAdminName: { type: String, default: 'System Admin' },
    summary: {
      totalAnalyzed: { type: Number, default: 0 },
      totalMissing: { type: Number, default: 0 },
      totalRestored: { type: Number, default: 0 },
      totalSkipped: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
    },
    collectionResults: [
      {
        collectionName: String,
        missingCount: Number,
        restoredCount: Number,
        skippedCount: Number,
        failedCount: Number,
      },
    ],
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

export const getRestoreHistoryModel = (backupConn) => {
  return backupConn.models.RestoreHistory || backupConn.model('RestoreHistory', restoreHistorySchema);
};
