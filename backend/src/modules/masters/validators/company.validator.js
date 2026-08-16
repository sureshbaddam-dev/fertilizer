import { body, validationResult } from 'express-validator';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
export const validateCompanyRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new AppError('Validation Error', HTTP_STATUS.BAD_REQUEST, errorDetails));
  }
  next();
};

export const createCompanyRules = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('shortName').optional({ values: 'falsy' }).trim(),
  body('logo').optional({ values: 'falsy' }).trim(),
  body('gstin').optional({ values: 'falsy' }).trim(),
  body('contactPerson').optional({ values: 'falsy' }).trim(),
  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('address').optional({ values: 'falsy' }).trim(),
  validateCompanyRequest,
];

export const updateCompanyRules = [
  body('name').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('shortName').optional({ values: 'falsy' }).trim(),
  body('logo').optional({ values: 'falsy' }).trim(),
  body('gstin').optional({ values: 'falsy' }).trim(),
  body('contactPerson').optional({ values: 'falsy' }).trim(),
  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('address').optional({ values: 'falsy' }).trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  validateCompanyRequest,
];
