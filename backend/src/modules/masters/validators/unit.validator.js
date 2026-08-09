import { body } from 'express-validator';
import { validateRequest } from '../../auth/auth.validator.js';

export const createUnitRules = [
  body('name').trim().notEmpty().withMessage('Unit name is required'),
  body('shortName').trim().notEmpty().withMessage('Short name is required'),
  body('allowDecimals').optional().isBoolean().withMessage('allowDecimals must be boolean'),
  validateRequest,
];

export const updateUnitRules = [
  body('name').optional().trim().notEmpty().withMessage('Unit name cannot be empty'),
  body('shortName').optional().trim().notEmpty().withMessage('Short name cannot be empty'),
  body('allowDecimals').optional().isBoolean().withMessage('allowDecimals must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  validateRequest,
];
