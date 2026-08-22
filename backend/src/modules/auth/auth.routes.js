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
  initiateSignupOtp,
  resendSignupOtp,
  verifyEmail,
  resendVerificationEmail,
  completeOnboarding,
  checkEmailAvailability,
} from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  signupRules,
  verifyOtpRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  initiateSignupRules,
  verifySignupOtpRules,
  completeOnboardingRules,
} from './auth.validator.js';

import { logger } from '../../config/logger.config.js';

const router = Router();

router.post(
  '/signup',
  (req, _res, next) => {
    logger.info(`\n========================\n[1] Signup API Hit\n========================`);
    next();
  },
  initiateSignupRules,
  initiateSignupOtp
);
router.get('/check-email', checkEmailAvailability);
router.get('/signup/check-email', checkEmailAvailability);
router.post('/signup/check-email', checkEmailAvailability);
router.post('/signup/initiate-otp', initiateSignupRules, initiateSignupOtp);
router.post('/signup/email', initiateSignupRules, initiateSignupOtp);
router.post('/signup/verify-otp', verifySignupOtpRules, verifySignupOtp);
router.post('/signup/resend-otp', resendSignupOtp);
router.post('/complete-onboarding', protect, completeOnboardingRules, completeOnboarding);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/verify-signup-otp', verifySignupOtp);
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
