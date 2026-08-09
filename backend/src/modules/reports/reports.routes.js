import { Router } from 'express';
import { reportsController } from './controllers/reports.controller.js';

const router = Router();

router.get('/bi-analytics', reportsController.getBIAnalytics);

export default router;
