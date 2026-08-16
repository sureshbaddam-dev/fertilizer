import { backupService } from '../services/backup.service.js';
import { restoreService } from '../services/restore.service.js';
import { sendSuccess } from '../../../common/apiResponse.js';

export const backupController = {
  createBackup: async (req, res, next) => {
    try {
      const metadata = await backupService.createDatabaseBackup({
        adminUser: req.adminUser,
        req,
      });
      return sendSuccess(res, 'Database backup created successfully', metadata);
    } catch (err) {
      next(err);
    }
  },

  getBackupOverview: async (req, res, next) => {
    try {
      const overview = await backupService.getBackupOverview();
      return sendSuccess(res, 'Backup overview fetched successfully', overview);
    } catch (err) {
      next(err);
    }
  },

  getBackupHistory: async (req, res, next) => {
    try {
      const history = await backupService.getBackupHistory();
      return sendSuccess(res, 'Backup history fetched successfully', history);
    } catch (err) {
      next(err);
    }
  },

  getBackupDetails: async (req, res, next) => {
    try {
      const { backupId } = req.params;
      const details = await backupService.getBackupDetails(backupId);
      return sendSuccess(res, 'Backup details fetched successfully', details);
    } catch (err) {
      next(err);
    }
  },

  downloadBackup: async (req, res, next) => {
    try {
      const { backupId } = req.params;
      const { metadata, snapshotData } = await backupService.downloadBackupPayload(backupId, req.adminUser, req);

      const fileName = `${backupId}_FULL_SNAPSHOT.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      return res.send(JSON.stringify({ metadata, snapshotData }, null, 2));
    } catch (err) {
      next(err);
    }
  },

  deleteBackup: async (req, res, next) => {
    try {
      const { backupId } = req.params;
      const { confirmationText } = req.body;
      const result = await backupService.deleteBackup(backupId, confirmationText, req.adminUser, req);
      return sendSuccess(res, 'Backup deleted successfully', result);
    } catch (err) {
      next(err);
    }
  },

  // RESTORE ENDPOINTS
  analyzeRestore: async (req, res, next) => {
    try {
      const { backupId } = req.params;
      const { targetUserId } = req.body;
      const analysis = await restoreService.analyzeBackupForRestore({
        backupId,
        targetUserId,
      });
      return sendSuccess(res, 'Restore analysis generated successfully', analysis);
    } catch (err) {
      next(err);
    }
  },

  executeRestore: async (req, res, next) => {
    try {
      const { backupId } = req.params;
      const { targetUserId, selectedCollections, confirmationText, ticketId } = req.body;
      const result = await restoreService.executeRestore({
        backupId,
        targetUserId,
        selectedCollections,
        confirmationText,
        ticketId,
        adminUser: req.adminUser,
        req,
      });
      return sendSuccess(res, 'Missing-records-only restore executed successfully', result);
    } catch (err) {
      next(err);
    }
  },

  getRestoreHistory: async (req, res, next) => {
    try {
      const history = await restoreService.getRestoreHistory();
      return sendSuccess(res, 'Restore history fetched successfully', history);
    } catch (err) {
      next(err);
    }
  },
};
