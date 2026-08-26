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

export const initiateSignupRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address'),
  body('password')
    .custom((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(val))
    .withMessage('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  body('termsAccepted')
    .custom((val) => val === true || val === 'true')
    .withMessage('Please accept the Terms & Conditions, Privacy Policy and Refund & Cancellation Policy to continue.'),
  validateRequest,
];

export const verifySignupOtpRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email address is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP is required'),
  validateRequest,
];

export const completeOnboardingRules = [
  body('ownerName').trim().notEmpty().withMessage('Name is required'),
  body('mobile')
    .trim()
    .customSanitizer((val) => {
      if (!val) return '';
      let cleaned = val.toString().replace(/[\s\-\(\)]/g, '');
      if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
      if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
      if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
      return cleaned;
    })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit Indian mobile number'),
  body('shopName').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),
  body('gstNumber')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid 15-character GSTIN number (e.g. 36AAAAA0000A1Z5)'),
  body('city').optional({ checkFalsy: true }).trim(),
  body('state').optional({ checkFalsy: true }).trim(),
  body('pincode').optional({ checkFalsy: true }).trim(),
  validateRequest,
];

export const signupRules = [
  body('password')
    .custom((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(val))
    .withMessage('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  validateRequest,
];

export const verifyOtpRules = [
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
  body('newPassword')
    .custom((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(val))
    .withMessage('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  validateRequest,
];
