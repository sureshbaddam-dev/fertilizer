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
  googleAuth,
  completeGoogleProfile,
  getProfile,
  updateProfile,
  emailPasswordSignup,
  verifyEmail,
  resendVerificationEmail,
} from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
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
router.post('/signup/email', emailPasswordSignup);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/verify-signup-otp', verifyOtpRules, verifySignupOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordRules, forgotPassword);
router.post('/verify-forgot-otp', verifyOtpRules, verifyForgotOtp);
router.post('/reset-password', resetPasswordRules, resetPassword);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/refresh', refreshToken);
router.post('/google', googleAuth);
router.post('/google/complete-profile', completeGoogleProfile);

// User Profile Endpoints (Protected)
router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);

export default router;
