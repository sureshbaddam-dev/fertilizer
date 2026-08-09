import { Router } from 'express';
import {
  signup,
  verifySignupOtp,
  login,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  logout,
  refreshToken,
} from './auth.controller.js';
import {
  signupRules,
  verifyOtpRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} from './auth.validator.js';

import { logger } from '../../config/logger.config.js';

const router = Router();

router.post(
  '/signup',
  (req, _res, next) => {
    logger.info(`\n========================\n[1] Signup API Hit\n========================`);
    next();
  },
  signupRules,
  signup
);
router.post('/verify-signup-otp', verifyOtpRules, verifySignupOtp);
router.post('/login', loginRules, login);
router.post('/forgot-password', forgotPasswordRules, forgotPassword);
router.post('/verify-forgot-otp', verifyOtpRules, verifyForgotOtp);
router.post('/reset-password', resetPasswordRules, resetPassword);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

export default router;
