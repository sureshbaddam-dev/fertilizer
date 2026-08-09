import { body, validationResult } from 'express-validator';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { logger } from '../../../config/logger.config.js';

export const validateCompanyRequest = (req, _res, next) => {
  const reqTitle = `CREATE COMPANY REQUEST (${req.method} ${req.originalUrl})`;
  logger.info(`\n========================================\n📥 ${reqTitle}\n========================================\nBody: ${JSON.stringify(req.body, null, 2)}\nParams: ${JSON.stringify(req.params, null, 2)}\nQuery: ${JSON.stringify(req.query, null, 2)}\n========================================`);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    const formattedLog = errorDetails
      .map((e) => `Field: [${e.field}] -> ${e.message} (Received value: '${e.value}')`)
      .join('\n');

    logger.error(`\n========================================\n❌ VALIDATION FAILED\n========================================\n${formattedLog}\n========================================`);

    return next(new AppError('Validation Error', HTTP_STATUS.BAD_REQUEST, errorDetails));
  }

  logger.info('✅ Validation Passed');
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
