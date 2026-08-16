import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { adminAuthService } from '../services/adminAuth.service.js';
import { authService } from '../../auth/auth.service.js';

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
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const sendAdminOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const result = await adminAuthService.sendAdminOtp(mobile);
  return sendSuccess(res, 'OTP sent to authorized Admin mobile number.', result, HTTP_STATUS.OK);
});

export const verifyAdminOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;
  const result = await adminAuthService.verifyAdminOtp(mobile, otp, req);

  if (result.accessToken) {
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }

  return sendSuccess(res, 'Admin authentication successful.', result, HTTP_STATUS.OK);
});

export const refreshAdminToken = asyncHandler(async (req, res) => {
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

  return sendSuccess(res, 'Admin session refreshed successfully.', result, HTTP_STATUS.OK);
});

export const adminLogout = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

  if (token) {
    await authService.logout(token, req.user?._id);
  }

  res.clearCookie('token', ACCESS_COOKIE_OPTIONS);
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
  return sendSuccess(res, 'Admin logged out successfully.', null, HTTP_STATUS.OK);
});
