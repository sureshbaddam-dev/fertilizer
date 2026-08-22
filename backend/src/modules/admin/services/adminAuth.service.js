import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../auth/user.model.js';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { sendTwilioVerification, checkTwilioVerification } from '../utils/twilioVerify.util.js';

const COOLDOWN_MS = 60 * 1000; // 60 seconds

// In-memory security store for 60s resend cooldown
const cooldownStore = new Map(); // key: cleanDigits -> expireTimestamp

function normalizeDigits(mobileStr) {
  if (!mobileStr) return '';
  return mobileStr.toString().replace(/\D/g, '');
}

export const adminAuthService = {
  /**
   * Send Admin Login OTP via Twilio Verify API v2
   */
  async sendAdminOtp(mobile) {
    const rawMobile = (mobile || '').trim();
    const cleanDigits = normalizeDigits(rawMobile);

    logger.info(`[ADMIN OTP] sendAdminOtp requested for mobile input: "${rawMobile}" (clean digits: ${cleanDigits})`);

    if (!cleanDigits || cleanDigits.length < 10) {
      throw new AppError('Please enter a valid 10-digit mobile number.', HTTP_STATUS.BAD_REQUEST);
    }

    const envAdminPhone = process.env.ADMIN_PHONE_NUMBER || '+919848081875';
    const cleanEnvPhone = normalizeDigits(envAdminPhone);

    // 1. Validate fixed authorized Admin mobile number (+919848081875)
    const isAuthorized =
      cleanDigits === cleanEnvPhone ||
      (cleanDigits.length >= 10 && cleanEnvPhone.length >= 10 && cleanDigits.slice(-10) === cleanEnvPhone.slice(-10));

    if (!isAuthorized) {
      logger.warn(`[ADMIN OTP] Unauthorized mobile attempt: "${rawMobile}". Rejecting with HTTP 403.`);
      throw new AppError('This mobile number is not authorized for Admin access.', HTTP_STATUS.FORBIDDEN);
    }

    // 2. Enforce 60-second resend cooldown
    const cooldownExpiresAt = cooldownStore.get(cleanDigits);
    if (cooldownExpiresAt && Date.now() < cooldownExpiresAt) {
      const remainingSeconds = Math.ceil((cooldownExpiresAt - Date.now()) / 1000);
      throw new AppError(
        `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }

    // 3. Call Twilio Verify API v2 FIRST and await real HTTP response
    // If Twilio fails, sendTwilioVerification throws an AppError and code halts before setting cooldown store.
    const twilioResult = await sendTwilioVerification(rawMobile);

    // 4. ONLY AFTER Twilio Verify accepts the request, activate 60s cooldown
    cooldownStore.set(cleanDigits, Date.now() + COOLDOWN_MS);

    logger.info(
      { mobile: cleanDigits, sid: twilioResult.sid, status: twilioResult.status },
      '[ADMIN AUTH] Twilio Verify API request accepted. 60s cooldown activated.'
    );

    return {
      mobile: rawMobile,
      cooldownSeconds: 60,
      verificationSid: twilioResult.sid,
      message: 'OTP sent to authorized Admin mobile number via SMS.',
    };
  },

  /**
   * Verify Admin Login OTP via Twilio Verify Check & Issue Admin-only Token
   */
  async verifyAdminOtp(mobile, otp, req) {
    const rawMobile = (mobile || '').trim();
    const cleanDigits = normalizeDigits(rawMobile);
    const rawOtp = (otp || '').trim();

    logger.info(`[ADMIN OTP] verifyAdminOtp requested for mobile: "${rawMobile}"`);

    if (!rawOtp || rawOtp.length < 4) {
      throw new AppError('Please enter a valid OTP code.', HTTP_STATUS.BAD_REQUEST);
    }

    const envAdminPhone = process.env.ADMIN_PHONE_NUMBER || '+919848081875';
    const cleanEnvPhone = normalizeDigits(envAdminPhone);

    // Validate fixed authorized Admin mobile number
    const isAuthorized =
      cleanDigits === cleanEnvPhone ||
      (cleanDigits.length >= 10 && cleanEnvPhone.length >= 10 && cleanDigits.slice(-10) === cleanEnvPhone.slice(-10));

    if (!isAuthorized) {
      throw new AppError('This mobile number is not authorized for Admin access.', HTTP_STATUS.FORBIDDEN);
    }

    // Call Twilio Verify Check API
    // Throws AppError if OTP code is invalid, expired, or status is not 'approved'
    await checkTwilioVerification(rawMobile, rawOtp);

    // Retrieve or provision Single Authorized Admin User in DB
    const last10Digits = cleanDigits.slice(-10);
    const adminQuery = {
      $or: [
        { mobile: cleanDigits },
        { mobile: `+91${last10Digits}` },
        { mobile: last10Digits },
        { role: { $in: ['super_admin', 'SUPER_ADMIN'] } },
      ],
    };

    const adminMatches = await User.find(adminQuery).sort({ createdAt: 1 });
    let adminUser = adminMatches[0] || null;

    // Deduplicate: if multiple admin records exist, delete duplicates to maintain EXACTLY ONE Super Admin account
    if (adminMatches.length > 1) {
      const duplicateIds = adminMatches.slice(1).map((u) => u._id);
      await User.deleteMany({ _id: { $in: duplicateIds } });
      logger.info({ deletedCount: duplicateIds.length }, '[ADMIN AUTH] Deduplicated extra Super Admin database records.');
    }

    const standardizedMobile = envAdminPhone.startsWith('+') ? envAdminPhone : `+91${last10Digits}`;

    if (!adminUser) {
      const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
      adminUser = await User.create({
        ownerName: 'Super Admin',
        mobile: standardizedMobile,
        email: 'admin@vedixa.com',
        passwordHash: defaultPasswordHash,
        role: 'super_admin',
        isMobileVerified: true,
        isActive: true,
      });
    } else {
      adminUser.mobile = standardizedMobile;
      adminUser.role = 'super_admin';
      adminUser.isMobileVerified = true;
      adminUser.isActive = true;
      await adminUser.save();
    }

    // Sign Admin-Only Access Token using ADMIN_JWT_SECRET
    const adminSecret = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_jwt_key_vedixa_2026_x89a';
    const accessToken = jwt.sign(
      {
        id: adminUser._id.toString(),
        role: adminUser.role,
        isAdminToken: true,
      },
      adminSecret,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        id: adminUser._id.toString(),
        role: adminUser.role,
        isAdminToken: true,
      },
      adminSecret,
      { expiresIn: '7d' }
    );

    // Save refresh token on user model
    adminUser.currentRefreshToken = refreshToken;
    await adminUser.save();

    logger.info({ adminId: adminUser._id, mobile: cleanDigits }, '[ADMIN AUTH] Admin OTP verified via Twilio Verify API v2 successfully');

    return {
      user: {
        _id: adminUser._id,
        ownerName: adminUser.ownerName,
        mobile: adminUser.mobile,
        email: adminUser.email,
        role: adminUser.role,
      },
      accessToken,
      refreshToken,
    };
  },
};
