import { Router } from 'express';
import { dashboardController } from './controllers/dashboard.controller.js';

import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/overview', dashboardController.getDashboardOverview);
router.get('/notifications', dashboardController.getNotifications);

export default router;
