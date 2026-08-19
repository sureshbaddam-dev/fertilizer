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

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (sliding)
  path: '/api/v1/auth', // Path-scoped strictly to /auth endpoints
};

export const verifySignupOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifySignupOtp(req.body);
  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }
  const { refreshToken: _, ...clientData } = result;
  return sendSuccess(res, 'Mobile verified and user registered successfully.', clientData, HTTP_STATUS.CREATED);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }
  const { refreshToken: _, ...clientData } = result;
  return sendSuccess(res, 'Login successful.', clientData, HTTP_STATUS.OK);
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

export const logout = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

  await authService.logout(token, req.user?._id);

  res.clearCookie('token', ACCESS_COOKIE_OPTIONS);
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
  return sendSuccess(res, 'Logged out successfully.', null, HTTP_STATUS.OK);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

  const result = await authService.refreshToken(token);

  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }

  const { refreshToken: _, ...clientData } = result;
  return sendSuccess(res, 'Token refreshed successfully.', clientData, HTTP_STATUS.OK);
});

export const googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.googleAuth(req.body);
  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }
  const { refreshToken: _, ...clientData } = result;
  return sendSuccess(res, 'Google authentication evaluated.', clientData, HTTP_STATUS.OK);
});

export const completeGoogleProfile = asyncHandler(async (req, res) => {
  const result = await authService.completeGoogleSignup(req.body);
  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }
  const { refreshToken: _, ...clientData } = result;
  return sendSuccess(res, 'Account profile completed successfully.', clientData, HTTP_STATUS.CREATED);
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  return sendSuccess(res, 'User profile retrieved successfully.', user, HTTP_STATUS.OK);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, 'User profile updated successfully.', user, HTTP_STATUS.OK);
});

export const emailPasswordSignup = asyncHandler(async (req, res) => {
  const result = await authService.emailPasswordSignup(req.body);
  return sendSuccess(res, result.message, result, HTTP_STATUS.CREATED);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await authService.verifyEmailToken(token);
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationEmail(email);
  return sendSuccess(res, result.message, result, HTTP_STATUS.OK);
});
