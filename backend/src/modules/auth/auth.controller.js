import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { authService } from './auth.service.js';

import { logger } from '../../config/logger.config.js';

export const signup = asyncHandler(async (req, res) => {
  logger.info(`[4] Service Started`);
  const result = await authService.signup(req.body);
  logger.info(`[8] Response Sent`);
  return sendSuccess(res, 'Registration initiated. OTP sent to mobile number.', result, HTTP_STATUS.OK);
});

export const verifySignupOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifySignupOtp(req.body);
  return sendSuccess(res, 'Mobile verified and user registered successfully.', result, HTTP_STATUS.CREATED);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, 'Login successful.', result, HTTP_STATUS.OK);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return sendSuccess(res, 'Password reset OTP sent to mobile number.', result, HTTP_STATUS.OK);
});

export const verifyForgotOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyForgotOtp(req.body);
  return sendSuccess(res, 'OTP verified successfully.', result, HTTP_STATUS.OK);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return sendSuccess(res, 'Password reset successful.', result, HTTP_STATUS.OK);
});

export const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 'Logged out successfully.', null, HTTP_STATUS.OK);
});

export const refreshToken = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 'Token refreshed successfully.', null, HTTP_STATUS.OK);
});
