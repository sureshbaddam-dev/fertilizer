import { Router } from 'express';
import { shopDiscountController } from './controllers/shopDiscount.controller.js';
import { shopSettingsController } from './controllers/shopSettings.controller.js';

const router = Router();

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
