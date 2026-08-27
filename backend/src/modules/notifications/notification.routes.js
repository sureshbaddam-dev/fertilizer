import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from './notification.controller.js';

const router = Router();

router.use(protect);

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);

export default router;
