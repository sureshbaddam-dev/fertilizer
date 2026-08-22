import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendSuccess } from '../../../common/apiResponse.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { adminAuthService } from '../services/adminAuth.service.js';

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
  return sendSuccess(res, result.message || 'OTP sent to authorized Admin mobile number via SMS.', result, HTTP_STATUS.OK);
});

export const verifyAdminOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;
  const result = await adminAuthService.verifyAdminOtp(mobile, otp, req);

  if (result.accessToken) {
    res.cookie('adminToken', result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('token', result.accessToken, ACCESS_COOKIE_OPTIONS);
  }
  if (result.refreshToken) {
    res.cookie('adminRefreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
  }

  return sendSuccess(res, 'Admin authentication successful.', result, HTTP_STATUS.OK);
});

export const refreshAdminToken = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Admin token active.', {}, HTTP_STATUS.OK);
});

export const adminLogout = asyncHandler(async (req, res) => {
  res.clearCookie('adminToken', ACCESS_COOKIE_OPTIONS);
  res.clearCookie('token', ACCESS_COOKIE_OPTIONS);
  res.clearCookie('adminRefreshToken', REFRESH_COOKIE_OPTIONS);
  return sendSuccess(res, 'Admin logged out successfully.', null, HTTP_STATUS.OK);
});
