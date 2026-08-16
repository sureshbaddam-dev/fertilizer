import { body, validationResult } from 'express-validator';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';

export const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return next(new AppError('Validation Error', HTTP_STATUS.BAD_REQUEST, errorDetails));
  }
  next();
};

export const signupRules = [
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  validateRequest,
];

export const verifyOtpRules = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP is required'),
  validateRequest,
];

export const loginRules = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile number is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
];

export const forgotPasswordRules = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile number is required'),
  validateRequest,
];

export const resetPasswordRules = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  validateRequest,
];
