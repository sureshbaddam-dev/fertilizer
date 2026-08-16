import { Router } from 'express';
import { reportsController } from './controllers/reports.controller.js';

import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/bi-analytics', reportsController.getBIAnalytics);

export default router;
