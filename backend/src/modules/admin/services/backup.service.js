import { getBackupDbConnection } from '../../../config/backupDb.config.js';
import { getBackupModels } from '../models/backupAtlas.model.js';
import { logAdminAuditAction } from './admin.service.js';

// Live Production Models from Main DB (READ-ONLY FOR BACKUP)
import { User } from '../../auth/user.model.js';
import { ShopSettings } from '../../settings/models/shopSettings.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Product } from '../../products/models/product.model.js';
import { Purchase } from '../../purchases/models/purchase.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { UserSubscription } from '../../subscription/userSubscription.model.js';
import { SubscriptionPlan } from '../../subscription/subscriptionPlan.model.js';
import { DemoRequest } from '../../subscription/demoRequest.model.js';
import { SupportTicket } from '../../support/supportTicket.model.js';
import { SystemSetting } from '../models/systemSetting.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';

let isBackupInProgress = false;

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const backupService = {
  isBackupRunning: () => isBackupInProgress,

  createDatabaseBackup: async ({ adminUser, req, isSafety = false }) => {
    if (isBackupInProgress) {
      throw new Error('Backup is currently in progress. Please wait for the current backup to finish.');
    }

    isBackupInProgress = true;
    let createdMetadata = null;
    let backupConn = null;

    try {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const randSuffix = String(Math.floor(100 + Math.random() * 900));
      const backupId = isSafety ? `SAFETY-${dateStr}-${randSuffix}` : `BACKUP-${dateStr}-${randSuffix}`;

      backupConn = await getBackupDbConnection();
      const { MetadataModel, SnapshotModel } = getBackupModels(backupConn);

      // Create initial IN_PROGRESS record in Backup DB
      createdMetadata = await MetadataModel.create({
        backupId,
        sourceDatabase: 'MAIN',
        destinationDatabase: 'BACKUP',
        status: 'IN_PROGRESS',
        createdByAdminId: adminUser?._id ? String(adminUser._id) : 'SYSTEM',
        createdByAdminName: adminUser?.ownerName || adminUser?.name || 'System Admin',
      });

      // 1. READ ALL LIVE ERP DATA FROM MAIN DB (READ-ONLY)
      const [
        users,
        shopSettings,
        customers,
        suppliers,
        products,
        purchases,
        salesInvoices,
        userSubscriptions,
        subscriptionPlans,
        subscriptionHistories,
        demoRequests,
        supportTickets,
        systemSettings,
      ] = await Promise.all([
        User.find().select('-passwordHash').lean(),
        ShopSettings.find().lean(),
        Customer.find().lean(),
        Supplier.find().lean(),
        Product.find().lean(),
        Purchase.find().lean(),
        SalesInvoice.find().lean(),
        UserSubscription.find().lean(),
        SubscriptionPlan.find().lean(),
        SubscriptionHistory.find().lean(),
        DemoRequest.find().lean(),
        SupportTicket.find().lean(),
        SystemSetting.find().lean(),
      ]);

      const snapshotMap = {
        users,
        shopSettings,
        customers,
        suppliers,
        products,
        purchases,
        salesInvoices,
        userSubscriptions,
        subscriptionPlans,
        subscriptionHistories,
        demoRequests,
        supportTickets,
        systemSettings,
      };

      // 2. CALCULATE COLLECTION STATS AND TOTAL RECORDS
      let totalRecords = 0;
      const collectionStats = [];

      for (const [colName, records] of Object.entries(snapshotMap)) {
        const count = records.length;
        totalRecords += count;
        const colSizeBytes = Buffer.byteLength(JSON.stringify(records));
        collectionStats.push({
          collectionName: colName,
          recordCount: count,
          sizeBytes: colSizeBytes,
        });
      }

      const snapshotJson = JSON.stringify({
        backupId,
        createdAt: now,
        snapshotData: snapshotMap,
      });

      const totalSizeBytes = Buffer.byteLength(snapshotJson);
      const sizeFormatted = formatBytes(totalSizeBytes);

      // 3. STORE SNAPSHOT DOCUMENT IN SEPARATE BACKUP DB
      await SnapshotModel.create({
        backupId,
        snapshotData: snapshotMap,
      });

      // 3b. UPSERT RAW COLLECTION DOCUMENTS IN VEDIXA_BACKUPS (PRESERVE _id, NO DUPLICATES)
      for (const [colName, records] of Object.entries(snapshotMap)) {
        if (records && records.length > 0) {
          try {
            const rawCollection = backupConn.collection(colName);
            const bulkOps = records.map((doc) => ({
              replaceOne: {
                filter: { _id: doc._id },
                replacement: doc,
                upsert: true,
              },
            }));
            await rawCollection.bulkWrite(bulkOps);
          } catch (colErr) {
            console.error(`Warning: Failed to sync raw collection ${colName} into backup DB:`, colErr.message);
          }
        }
      }

      // 4. MARK METADATA COMPLETED
      createdMetadata.status = 'COMPLETED';
      createdMetadata.collectionsCount = Object.keys(snapshotMap).length;
      createdMetadata.totalRecordsCount = totalRecords;
      createdMetadata.sizeBytes = totalSizeBytes;
      createdMetadata.sizeFormatted = sizeFormatted;
      createdMetadata.collectionStats = collectionStats;
      createdMetadata.completedAt = new Date();
      await createdMetadata.save();

      // 5. AUDIT LOG
      if (adminUser) {
        await logAdminAuditAction({
          adminId: adminUser._id,
          adminName: adminUser.ownerName,
          adminRole: adminUser.role,
          action: 'DATABASE_BACKUP_CREATED',
          targetType: 'BACKUP',
          targetId: backupId,
          targetName: backupId,
          details: `Created full database snapshot ${backupId} (${sizeFormatted}, ${totalRecords} records) in Backup MongoDB Atlas.`,
          req,
        });
      }

      return createdMetadata;
    } catch (err) {
      if (createdMetadata) {
        createdMetadata.status = 'FAILED';
        createdMetadata.errorMessage = err.message || 'Backup execution failed';
        await createdMetadata.save().catch(() => {});
      }
      throw err;
    } finally {
      isBackupInProgress = false;
    }
  },

  getBackupOverview: async () => {
    const backupConn = await getBackupDbConnection();
    const { MetadataModel } = getBackupModels(backupConn);

    const [totalBackups, latestBackup] = await Promise.all([
      MetadataModel.countDocuments(),
      MetadataModel.findOne().sort({ createdAt: -1 }).lean(),
    ]);

    return {
      lastBackupTime: latestBackup ? latestBackup.createdAt : null,
      lastBackupStatus: latestBackup ? latestBackup.status : 'NO_BACKUPS',
      totalBackups: totalBackups || 0,
      latestBackupSize: latestBackup ? latestBackup.sizeFormatted : '0 KB',
      isBackupRunning: isBackupInProgress,
    };
  },

  getBackupHistory: async () => {
    const backupConn = await getBackupDbConnection();
    const { MetadataModel } = getBackupModels(backupConn);
    return await MetadataModel.find().sort({ createdAt: -1 }).lean();
  },

  getBackupDetails: async (backupId) => {
    const backupConn = await getBackupDbConnection();
    const { MetadataModel } = getBackupModels(backupConn);
    const metadata = await MetadataModel.findOne({ backupId }).lean();
    if (!metadata) throw new Error('Backup metadata not found');
    return metadata;
  },

  downloadBackupPayload: async (backupId, adminUser, req) => {
    const backupConn = await getBackupDbConnection();
    const { MetadataModel, SnapshotModel } = getBackupModels(backupConn);

    const [metadata, snapshot] = await Promise.all([
      MetadataModel.findOne({ backupId }).lean(),
      SnapshotModel.findOne({ backupId }).lean(),
    ]);

    if (!metadata || !snapshot) throw new Error('Backup payload not found');

    if (adminUser) {
      await logAdminAuditAction({
        adminId: adminUser._id,
        adminName: adminUser.ownerName,
        adminRole: adminUser.role,
        action: 'DATABASE_BACKUP_DOWNLOADED',
        targetType: 'BACKUP',
        targetId: backupId,
        targetName: backupId,
        details: `Downloaded database snapshot ${backupId}.`,
        req,
      });
    }

    return {
      metadata,
      snapshotData: snapshot.snapshotData,
    };
  },

  deleteBackup: async (backupId, confirmationText, adminUser, req) => {
    if (confirmationText !== 'DELETE') {
      throw new Error('Deletion cancelled. You must type DELETE to confirm removal.');
    }

    const backupConn = await getBackupDbConnection();
    const { MetadataModel, SnapshotModel } = getBackupModels(backupConn);

    const metadata = await MetadataModel.findOne({ backupId });
    if (!metadata) throw new Error('Backup record not found');

    await Promise.all([
      MetadataModel.deleteOne({ backupId }),
      SnapshotModel.deleteOne({ backupId }),
    ]);

    if (adminUser) {
      await logAdminAuditAction({
        adminId: adminUser._id,
        adminName: adminUser.ownerName,
        adminRole: adminUser.role,
        action: 'DATABASE_BACKUP_DELETED',
        targetType: 'BACKUP',
        targetId: backupId,
        targetName: backupId,
        details: `Permanently deleted database backup snapshot ${backupId} from Backup MongoDB Atlas.`,
        req,
      });
    }

    return { message: `Backup ${backupId} permanently deleted.` };
  },
};
