import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { categoryService } from './services/category.service.js';
import { unitService } from './services/unit.service.js';
import { supplierService } from '../suppliers/services/supplier.service.js';

import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  restoreCategory,
} from './controllers/category.controller.js';
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deactivateUnit,
  restoreUnit,
} from './controllers/unit.controller.js';

import { createCategoryRules, updateCategoryRules } from './validators/category.validator.js';
import { createUnitRules, updateUnitRules } from './validators/unit.validator.js';

import { uploadBrandLogoMiddleware } from '../../middlewares/upload.middleware.js';

import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deactivateBrand,
  restoreBrand,
} from './controllers/brand.controller.js';
import { brandService } from './services/brand.service.js';

const router = Router();

// Brand Logo Upload Route
router.post(
  '/upload-brand-logo',
  uploadBrandLogoMiddleware.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo image file selected' });
    }
    const imageUrl = `/uploads/brands/${req.file.filename}`;
    return sendSuccess(res, 'Brand logo uploaded successfully', { imageUrl }, HTTP_STATUS.OK);
  })
);

// Batch Fetch All Active Masters (For Transaction Dropdowns)
router.get(
  '/all',
  asyncHandler(async (_req, res) => {
    const { suppliers } = await supplierService.getAllSuppliers({ status: 'active' });
    const { brands } = await brandService.getAllBrands({ isActive: 'true' });
    const { categories } = await categoryService.getAllCategories({ isActive: 'true' });
    const { units } = await unitService.getAllUnits({ isActive: 'true' });

    return sendSuccess(
      res,
      'Active Master data fetched successfully',
      { suppliers, brands, categories, units },
      HTTP_STATUS.OK
    );
  })
);

// Brand Master Routes (Product Brands owned by Company)
router.get('/brands', getBrands);
router.post('/brands', createBrand);
router.get('/brands/:id', getBrandById);
router.put('/brands/:id', updateBrand);
router.patch('/brands/:id/deactivate', deactivateBrand);
router.patch('/brands/:id/activate', restoreBrand);
router.delete('/brands/:id', deactivateBrand);

// Category Master Routes (Soft Delete / Archive & Restore)
router.get('/categories', getCategories);
router.post('/categories', createCategoryRules, createCategory);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategoryRules, updateCategory);
router.patch('/categories/:id/deactivate', deactivateCategory);
router.patch('/categories/:id/activate', restoreCategory);
router.delete('/categories/:id', deactivateCategory);

// Unit Master Routes (Soft Delete / Archive & Restore)
router.get('/units', getUnits);
router.post('/units', createUnitRules, createUnit);
router.get('/units/:id', getUnitById);
router.put('/units/:id', updateUnitRules, updateUnit);
router.patch('/units/:id/deactivate', deactivateUnit);
router.patch('/units/:id/activate', restoreUnit);
router.delete('/units/:id', deactivateUnit);

export default router;
