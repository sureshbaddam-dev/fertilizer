import { Router } from 'express';
import {
  sendAdminOtp,
  verifyAdminOtp,
  refreshAdminToken,
  adminLogout,
} from './controllers/adminAuth.controller.js';

const router = Router();

router.post('/send-otp', sendAdminOtp);
router.post('/verify-otp', verifyAdminOtp);
router.post('/refresh', refreshAdminToken);
router.post('/logout', adminLogout);

export default router;
