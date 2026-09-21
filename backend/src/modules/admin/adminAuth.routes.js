import { Router } from 'express';
import {
  adminLogin,
  refreshAdminToken,
  adminLogout,
} from './controllers/adminAuth.controller.js';

const router = Router();

router.post('/login', adminLogin);
router.post('/refresh', refreshAdminToken);
router.post('/logout', adminLogout);

export default router;
