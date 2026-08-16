import mongoose from 'mongoose';
import { getBackupDbConnection } from '../../../config/backupDb.config.js';
import { getBackupModels } from '../models/backupAtlas.model.js';
import { getRestoreHistoryModel } from '../models/restoreAtlas.model.js';
import { backupService } from './backup.service.js';
import { logAdminAuditAction } from './admin.service.js';

// Live Production Models from Main DB (READ-ONLY FOR COMPARISON, INSERT-ONLY FOR RESTORE)
import { User } from '../../auth/user.model.js';
import { ShopSettings } from '../../settings/models/shopSettings.model.js';
import { Customer } from '../../customers/models/customer.model.js';
import { Supplier } from '../../suppliers/models/supplier.model.js';
import { Product } from '../../products/models/product.model.js';
import { Purchase } from '../../purchases/models/purchase.model.js';
import { SalesInvoice } from '../../sales/models/salesInvoice.model.js';
import { UserSubscription } from '../../subscription/userSubscription.model.js';
import { SubscriptionPlan } from '../../subscription/subscriptionPlan.model.js';
import { SupportTicket } from '../../support/supportTicket.model.js';
import { SystemSetting } from '../models/systemSetting.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';

const MODEL_MAP = {
  users: User,
  shopSettings: ShopSettings,
  customers: Customer,
  suppliers: Supplier,
  products: Product,
  purchases: Purchase,
  salesInvoices: SalesInvoice,
  userSubscriptions: UserSubscription,
  subscriptionHistories: SubscriptionHistory,
  supportTickets: SupportTicket,
  systemSettings: SystemSetting,
};

// Dependency Execution Order for Restoration
const DEPENDENCY_ORDER = [
  'users',
  'shopSettings',
  'customers',
  'suppliers',
  'products',
  'purchases',
  'salesInvoices',
  'userSubscriptions',
  'subscriptionHistories',
  'supportTickets',
  'systemSettings',
];

export const restoreService = {
  analyzeBackupForRestore: async ({ backupId, targetUserId = 'ALL' }) => {
    const backupConn = await getBackupDbConnection();
    const { MetadataModel, SnapshotModel } = getBackupModels(backupConn);

    const [metadata, snapshot] = await Promise.all([
      MetadataModel.findOne({ backupId }).lean(),
      SnapshotModel.findOne({ backupId }).lean(),
    ]);

    if (!metadata || !snapshot || !snapshot.snapshotData) {
      throw new Error(`Backup snapshot ${backupId} not found`);
    }

    const snapshotData = snapshot.snapshotData;

    // Resolve Target User Info
    let targetUserInfo = {
      userId: 'ALL',
      ownerName: 'All Users (Full System)',
      mobile: 'N/A',
    };

    if (targetUserId && targetUserId !== 'ALL') {
      const userInBackup = (snapshotData.users || []).find((u) => String(u._id) === String(targetUserId));
      const liveUser = await User.findById(targetUserId).lean();
      const resolvedUser = liveUser || userInBackup;

      if (resolvedUser) {
        targetUserInfo = {
          userId: String(resolvedUser._id),
          ownerName: resolvedUser.ownerName || 'Unknown User',
          mobile: resolvedUser.mobile || 'N/A',
        };
      }
    }

    const collectionSummaries = [];
    const missingRecordsMap = {};
    let grandTotalAnalyzed = 0;
    let grandTotalMissing = 0;
    let grandTotalExisting = 0;
    let grandTotalModified = 0;

    for (const colName of DEPENDENCY_ORDER) {
      const backupRecords = snapshotData[colName] || [];
      if (backupRecords.length === 0) continue;

      // Filter backup records by targetUserId if specified
      let filteredBackupRecords = backupRecords;
      if (targetUserId && targetUserId !== 'ALL') {
        if (colName === 'users') {
          filteredBackupRecords = backupRecords.filter((r) => String(r._id) === String(targetUserId));
        } else if (colName === 'shopSettings') {
          filteredBackupRecords = backupRecords.filter((r) => String(r.userId) === String(targetUserId));
        } else {
          filteredBackupRecords = backupRecords.filter((r) => r.userId && String(r.userId) === String(targetUserId));
        }
      }

      if (filteredBackupRecords.length === 0) continue;

      const Model = MODEL_MAP[colName];
      let existingLiveRecords = [];
      if (Model) {
        let query = {};
        if (targetUserId && targetUserId !== 'ALL') {
          if (colName === 'users') query = { _id: targetUserId };
          else if (colName === 'shopSettings') query = { userId: targetUserId };
          else query = { userId: targetUserId };
        }
        existingLiveRecords = await Model.find(query).lean();
      }

      // Build Fast Lookup Map for Live Records
      const liveByIdMap = new Map();
      const liveByKeyMap = new Map();

      for (const liveRec of existingLiveRecords) {
        liveByIdMap.set(String(liveRec._id), liveRec);

        // Natural Unique Keys per collection
        if (colName === 'users' && liveRec.mobile) {
          liveByKeyMap.set(liveRec.mobile, liveRec);
        } else if (colName === 'customers' && liveRec.mobile && liveRec.userId) {
          liveByKeyMap.set(`${liveRec.userId}_${liveRec.mobile}_${liveRec.customerType || 'ADDED'}`, liveRec);
        } else if (colName === 'suppliers' && liveRec.mobile && liveRec.userId) {
          liveByKeyMap.set(`${liveRec.userId}_${liveRec.mobile}`, liveRec);
        } else if (colName === 'products' && liveRec.userId && liveRec.name) {
          liveByKeyMap.set(`${liveRec.userId}_${liveRec.name.trim().toLowerCase()}`, liveRec);
        } else if (colName === 'purchases' && liveRec.userId && liveRec.purchaseNumber) {
          liveByKeyMap.set(`${liveRec.userId}_${liveRec.purchaseNumber}`, liveRec);
        } else if (colName === 'salesInvoices' && liveRec.userId && liveRec.invoiceNumber) {
          liveByKeyMap.set(`${liveRec.userId}_${liveRec.invoiceNumber}`, liveRec);
        } else if (colName === 'supportTickets' && liveRec.ticketId) {
          liveByKeyMap.set(liveRec.ticketId, liveRec);
        }
      }

      let existingCount = 0;
      let missingCount = 0;
      let modifiedCount = 0;
      const missingList = [];

      for (const backupRec of filteredBackupRecords) {
        const idStr = String(backupRec._id);
        let naturalKey = null;

        if (colName === 'users') naturalKey = backupRec.mobile;
        else if (colName === 'customers') naturalKey = `${backupRec.userId}_${backupRec.mobile}_${backupRec.customerType || 'ADDED'}`;
        else if (colName === 'suppliers') naturalKey = `${backupRec.userId}_${backupRec.mobile}`;
        else if (colName === 'products') naturalKey = `${backupRec.userId}_${(backupRec.name || '').trim().toLowerCase()}`;
        else if (colName === 'purchases') naturalKey = `${backupRec.userId}_${backupRec.purchaseNumber}`;
        else if (colName === 'salesInvoices') naturalKey = `${backupRec.userId}_${backupRec.invoiceNumber}`;
        else if (colName === 'supportTickets') naturalKey = backupRec.ticketId;

        const liveMatch = liveByIdMap.get(idStr) || (naturalKey ? liveByKeyMap.get(naturalKey) : null);

        const isLiveSoftDeleted = liveMatch && liveMatch.isActive === false;
        const isBackupActive = backupRec.isActive !== false;

        if (liveMatch && (!isLiveSoftDeleted || !isBackupActive)) {
          existingCount++;
          // Check if modified
          const backupUpdated = backupRec.updatedAt ? new Date(backupRec.updatedAt).getTime() : 0;
          const liveUpdated = liveMatch.updatedAt ? new Date(liveMatch.updatedAt).getTime() : 0;
          if (backupUpdated !== liveUpdated) {
            modifiedCount++;
          }
        } else {
          missingCount++;
          missingList.push(backupRec);
        }
      }

      grandTotalAnalyzed += filteredBackupRecords.length;
      grandTotalMissing += missingCount;
      grandTotalExisting += existingCount;
      grandTotalModified += modifiedCount;

      missingRecordsMap[colName] = missingList;

      collectionSummaries.push({
        collectionName: colName,
        totalInBackup: filteredBackupRecords.length,
        existingCount,
        missingCount,
        modifiedCount,
        toRestoreCount: missingCount,
      });
    }

    return {
      backupId,
      backupCreatedAt: metadata.createdAt,
      targetUser: targetUserInfo,
      summary: {
        totalAnalyzed: grandTotalAnalyzed,
        totalExisting: grandTotalExisting,
        totalMissing: grandTotalMissing,
        totalModified: grandTotalModified,
        totalToRestore: grandTotalMissing,
      },
      collectionSummaries,
      missingRecordsMap,
    };
  },

  executeRestore: async ({
    backupId,
    targetUserId = 'ALL',
    selectedCollections = [],
    confirmationText = '',
    ticketId = '',
    adminUser,
    req,
  }) => {
    if (confirmationText !== 'RESTORE') {
      throw new Error('Confirmation failed. You must type RESTORE to execute restoration.');
    }

    // Validate Support Ticket belonging to selected targetUserId
    if (ticketId && targetUserId && targetUserId !== 'ALL') {
      const cleanTicket = String(ticketId).trim();
      const ticketQuery = { $or: [{ ticketId: cleanTicket }] };
      if (mongoose.Types.ObjectId.isValid(cleanTicket)) {
        ticketQuery.$or.push({ _id: cleanTicket });
      }
      const ticketDoc = await SupportTicket.findOne(ticketQuery).lean();
      if (ticketDoc) {
        const ticketUserIdStr = String(ticketDoc.userId?._id || ticketDoc.userId);
        if (ticketUserIdStr !== String(targetUserId)) {
          throw new Error(
            `Support Ticket #${ticketDoc.ticketId || cleanTicket} belongs to another user account. It cannot be attached to user recovery for ${targetUserId}.`
          );
        }
      }
    }

    // 1. CREATE AUTOMATIC PRE-RESTORE SAFETY BACKUP SNAPSHOT FIRST
    console.log(`🛡️ Creating automatic Pre-Restore Safety Backup before restoring ${backupId}...`);
    const safetyMetadata = await backupService.createDatabaseBackup({ adminUser, req, isSafety: true });
    const safetyBackupId = safetyMetadata?.backupId || 'SAFETY-UNKNOWN';

    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const randSuffix = String(Math.floor(100 + Math.random() * 900));
    const restoreId = `RESTORE-${dateStr}-${randSuffix}`;

    const backupConn = await getBackupDbConnection();
    const RestoreHistoryModel = getRestoreHistoryModel(backupConn);

    // Initialize Restore History Record
    const restoreHistory = await RestoreHistoryModel.create({
      restoreId,
      sourceBackupId: backupId,
      safetyBackupId,
      targetUserId,
      status: 'IN_PROGRESS',
      startedAt: now,
      createdByAdminId: adminUser?._id ? String(adminUser._id) : 'SYSTEM',
      createdByAdminName: adminUser?.ownerName || adminUser?.name || 'System Admin',
      ticketId: ticketId || '',
    });

    try {
      // 2. RUN ANALYSIS TO GET EXACT MISSING RECORDS
      const analysis = await restoreService.analyzeBackupForRestore({ backupId, targetUserId });
      restoreHistory.targetUserName = analysis.targetUser?.ownerName || 'All Users';
      restoreHistory.targetUserMobile = analysis.targetUser?.mobile || '';

      const missingMap = analysis.missingRecordsMap;
      const collectionsToProcess = selectedCollections.length > 0
        ? DEPENDENCY_ORDER.filter((c) => selectedCollections.includes(c))
        : DEPENDENCY_ORDER;

      let grandRestored = 0;
      let grandSkipped = 0;
      let grandFailed = 0;
      const collectionResults = [];

      // 3. RESTORE MISSING RECORDS IN DEPENDENCY ORDER (INSERT-ONLY / REACTIVATE-ONLY)
      for (const colName of collectionsToProcess) {
        const missingRecords = missingMap[colName] || [];
        if (missingRecords.length === 0) continue;

        const Model = MODEL_MAP[colName];
        if (!Model) continue;

        let colRestored = 0;
        let colSkipped = 0;
        let colFailed = 0;

        for (const rawDoc of missingRecords) {
          try {
            const idStr = String(rawDoc._id);
            const liveExist = await Model.findById(idStr).lean();

            if (liveExist) {
              // CASE A: Live record is active -> SKIP (Never overwrite active live data)
              if (liveExist.isActive !== false) {
                colSkipped++;
                continue;
              }

              // CASE B: Live record is soft-deleted AND backup record was active -> REACTIVATE existing document preserving original _id
              if (rawDoc.isActive !== false) {
                const reactivateUpdate = {
                  ...rawDoc,
                  isActive: true,
                  deletedAt: null,
                  deletedBy: null,
                };
                delete reactivateUpdate._id;

                await Model.collection.updateOne(
                  { _id: liveExist._id },
                  { $set: reactivateUpdate }
                );
                colRestored++;
                continue;
              } else {
                colSkipped++;
                continue;
              }
            }

            // CASE C: Live record does not exist -> INSERT clean document with exact _id
            const cleanDoc = { ...rawDoc };
            await Model.collection.insertOne(cleanDoc);
            colRestored++;
          } catch (err) {
            if (err.code === 11000 || err.message?.includes('duplicate key')) {
              colSkipped++;
            } else {
              console.error(`❌ Restore insert error for ${colName} (${rawDoc._id}):`, err.message);
              colFailed++;
            }
          }
        }

        grandRestored += colRestored;
        grandSkipped += colSkipped;
        grandFailed += colFailed;

        collectionResults.push({
          collectionName: colName,
          missingCount: missingRecords.length,
          restoredCount: colRestored,
          skippedCount: colSkipped,
          failedCount: colFailed,
        });
      }

      // 4. MARK RESTORE HISTORY COMPLETED
      restoreHistory.status = grandFailed > 0 && grandRestored === 0 ? 'FAILED' : grandFailed > 0 ? 'PARTIAL' : 'COMPLETED';
      restoreHistory.completedAt = new Date();
      restoreHistory.summary = {
        totalAnalyzed: analysis.summary.totalAnalyzed,
        totalMissing: analysis.summary.totalMissing,
        totalRestored: grandRestored,
        totalSkipped: grandSkipped,
        totalFailed: grandFailed,
      };
      restoreHistory.collectionResults = collectionResults;
      await restoreHistory.save();

      // 5. AUDIT LOG
      if (adminUser) {
        await logAdminAuditAction({
          adminId: adminUser._id,
          adminName: adminUser.ownerName,
          adminRole: adminUser.role,
          action: 'DATABASE_RESTORE_COMPLETED',
          targetType: 'RESTORE',
          targetId: restoreId,
          targetName: restoreId,
          details: `Restored ${grandRestored} missing records from backup ${backupId} for target ${restoreHistory.targetUserName}. Pre-restore safety backup: ${safetyBackupId}.`,
          req,
        });
      }

      return {
        restoreId,
        sourceBackupId: backupId,
        safetyBackupId,
        status: restoreHistory.status,
        summary: restoreHistory.summary,
        collectionResults,
      };
    } catch (err) {
      restoreHistory.status = 'FAILED';
      restoreHistory.errorMessage = err.message || 'Restore execution failed';
      await restoreHistory.save().catch(() => {});

      if (adminUser) {
        await logAdminAuditAction({
          adminId: adminUser._id,
          adminName: adminUser.ownerName,
          adminRole: adminUser.role,
          action: 'DATABASE_RESTORE_FAILED',
          targetType: 'RESTORE',
          targetId: restoreId,
          targetName: restoreId,
          details: `Restore ${restoreId} failed: ${err.message}. Pre-restore safety backup: ${safetyBackupId}.`,
          req,
        });
      }

      throw err;
    }
  },

  getRestoreHistory: async () => {
    const backupConn = await getBackupDbConnection();
    const RestoreHistoryModel = getRestoreHistoryModel(backupConn);
    return await RestoreHistoryModel.find().sort({ createdAt: -1 }).lean();
  },
};
