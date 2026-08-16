import { Router } from 'express';
import { shopDiscountController } from './controllers/shopDiscount.controller.js';
import { shopSettingsController } from './controllers/shopSettings.controller.js';

import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

// Shop Profile & System Settings Routes (CRUD + Patch + Reset)
router.get('/profile', shopSettingsController.getSettings);
router.put('/profile', shopSettingsController.updateSettings);
router.patch('/profile', shopSettingsController.updateSettings);

router.get('/', shopSettingsController.getSettings);
router.put('/', shopSettingsController.updateSettings);
router.patch('/', shopSettingsController.updateSettings);
router.post('/reset', shopSettingsController.resetSettings);

// Shop Discount Settings Routes
router.get('/shop-discount', shopDiscountController.getShopDiscount);
router.put('/shop-discount', shopDiscountController.updateShopDiscount);

export default router;
