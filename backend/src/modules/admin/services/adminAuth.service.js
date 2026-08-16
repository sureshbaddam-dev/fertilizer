import bcrypt from 'bcryptjs';
import { User } from '../../auth/user.model.js';
import { redisService } from '../../../services/redis.service.js';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { generateAccessToken, generateRefreshToken } from '../../../utils/jwt.utils.js';
import { logAdminAuditAction } from './admin.service.js';

const AUTHORIZED_DEV_ADMIN_MOBILE = '9848081875';
const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const adminAuthService = {
  /**
   * Send Admin Login OTP
   */
  async sendAdminOtp(mobile) {
    const cleanMobile = (mobile || '').trim();

    // 1. Verify authorized admin mobile
    const existingAdmin = await User.findOne({ mobile: cleanMobile });
    const isAuthorizedMobile =
      cleanMobile === AUTHORIZED_DEV_ADMIN_MOBILE ||
      (existingAdmin &&
        ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(existingAdmin.role));

    if (!isAuthorizedMobile) {
      throw new AppError('This mobile number is not authorized for Admin access.', HTTP_STATUS.FORBIDDEN);
    }

    // 2. Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:admin_login:${cleanMobile}`;

    // Store in Redis/memory with 5 minutes TTL
    await redisService.set(redisKey, { otp, attempts: 0 }, OTP_EXPIRY_SECONDS);

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info(`Admin OTP: ${otp}`);
    }

    return {
      mobile: cleanMobile,
      message: 'OTP sent to authorized Admin mobile number.',
    };
  },

  /**
   * Verify Admin Login OTP & Issue Tokens
   */
  async verifyAdminOtp(mobile, otp, req) {
    const cleanMobile = (mobile || '').trim();
    const redisKey = `otp:admin_login:${cleanMobile}`;

    const storedData = await redisService.get(redisKey);
    if (!storedData || storedData.otp !== otp) {
      throw new AppError('Invalid or expired Admin OTP.', HTTP_STATUS.BAD_REQUEST);
    }

    // Invalidate OTP after successful verification
    await redisService.del(redisKey);

    // Retrieve or provision Authorized Admin User
    let adminUser = await User.findOne({ mobile: cleanMobile });
    if (!adminUser) {
      const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);
      adminUser = await User.create({
        ownerName: 'Super Admin',
        mobile: cleanMobile,
        email: 'admin@vedixa.com',
        passwordHash: defaultPasswordHash,
        role: 'super_admin',
        isMobileVerified: true,
        isActive: true,
      });
    } else {
      // Ensure user has admin role
      if (!['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(adminUser.role)) {
        adminUser.role = 'super_admin';
      }
      adminUser.isMobileVerified = true;
      adminUser.isActive = true;
      await adminUser.save();
    }

    // Generate JWT Access (24h) and Refresh (7d) Tokens
    const accessToken = generateAccessToken(adminUser._id, adminUser.role);
    const refreshToken = generateRefreshToken(adminUser._id, adminUser.role);

    // Save current refresh token on user model
    adminUser.currentRefreshToken = refreshToken;
    await adminUser.save();

    // Log security audit trail
    await logAdminAuditAction({
      adminId: adminUser._id,
      adminName: adminUser.ownerName,
      adminRole: adminUser.role,
      action: 'ADMIN_LOGIN',
      targetType: 'AUTH',
      targetId: adminUser._id,
      targetName: adminUser.ownerName,
      details: `Admin ${adminUser.ownerName} (${adminUser.mobile}) logged in successfully via OTP verification.`,
      req,
    });

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
