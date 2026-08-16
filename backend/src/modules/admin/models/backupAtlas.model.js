import mongoose from 'mongoose';

const backupMetadataSchema = new mongoose.Schema(
  {
    backupId: { type: String, required: true, unique: true, index: true },
    sourceDatabase: { type: String, default: 'MAIN' },
    destinationDatabase: { type: String, default: 'BACKUP' },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    createdByAdminId: { type: String, default: 'SYSTEM' },
    createdByAdminName: { type: String, default: 'System Admin' },
    collectionsCount: { type: Number, default: 0 },
    totalRecordsCount: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    sizeFormatted: { type: String, default: '0 KB' },
    collectionStats: [
      {
        collectionName: String,
        recordCount: Number,
        sizeBytes: Number,
      },
    ],
    errorMessage: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const backupSnapshotSchema = new mongoose.Schema(
  {
    backupId: { type: String, required: true, unique: true, index: true },
    snapshotData: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const getBackupModels = (backupConn) => {
  const MetadataModel = backupConn.models.BackupMetadata || backupConn.model('BackupMetadata', backupMetadataSchema);
  const SnapshotModel = backupConn.models.BackupSnapshot || backupConn.model('BackupSnapshot', backupSnapshotSchema);
  return { MetadataModel, SnapshotModel };
};
