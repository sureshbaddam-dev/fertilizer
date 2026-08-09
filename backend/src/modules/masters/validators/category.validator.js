import { body } from 'express-validator';
import { validateRequest } from '../../auth/auth.validator.js';

export const createCategoryRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
  body('description').optional().trim(),
  validateRequest,
];

export const updateCategoryRules = [
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  validateRequest,
];
