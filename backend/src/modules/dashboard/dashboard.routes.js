import { Router } from 'express';
import { dashboardController } from './controllers/dashboard.controller.js';

const router = Router();

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/notifications', dashboardController.getNotifications);

export default router;
