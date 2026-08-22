import express from 'express';
import { requireAdminRole } from './middlewares/admin.middleware.js';
import { backupController } from './controllers/backup.controller.js';

const router = express.Router();

// Require Admin role & Admin JWT verification for all backup operations
router.use(requireAdminRole());

// Admin Database Backup Endpoints
router.post('/create', backupController.createBackup);
router.post('/', backupController.createBackup);
router.get('/overview', backupController.getBackupOverview);
router.get('/', backupController.getBackupHistory);

// Restore History
router.get('/restore/history', backupController.getRestoreHistory);

// Specific Backup Actions & Restore Engine
router.get('/:backupId', backupController.getBackupDetails);
router.get('/:backupId/download', backupController.downloadBackup);
router.delete('/:backupId', backupController.deleteBackup);

// Restore Analysis & Execution
router.post('/:backupId/restore/analyze', backupController.analyzeRestore);
router.post('/:backupId/restore/preview', backupController.analyzeRestore);
router.post('/:backupId/restore/execute', backupController.executeRestore);
router.post('/:backupId/restore', backupController.executeRestore);

export default router;
