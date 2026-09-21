import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../auth/user.model.js';
import { logger } from '../../../config/logger.config.js';
import { AppError } from '../../../utils/appError.js';
import { HTTP_STATUS } from '../../../common/httpStatuses.js';
import { envConfig } from '../../../config/env.config.js';

// Default bcrypt hash for 'Siri@1317'
const DEFAULT_ADMIN_PASSWORD_HASH = '$2b$10$W1xTz85XahV0d9d/U5WVQeSUuBmCUC/DP.a8PJXH2LKNffbnOxfs6';
const DEFAULT_ADMIN_JWT_SECRET = 'super_secret_admin_jwt_key_vedixa_2026_x89a';
const FALLBACK_ADMIN_ID = '660000000000000000000001';

export const adminAuthService = {
  /**
   * Secure Admin Login using fixed Username and Password (Bcrypt verified)
   * @param {Object} credentials - { username, password }
   */
  async loginAdmin({ username, password } = {}) {
    const expectedUsername = (process.env.ADMIN_USERNAME || envConfig.admin?.username || 'admin.vedixa').trim();
    const rawUsername = (username !== undefined && username !== null && username !== '' ? username : expectedUsername).toString().trim();
    const rawPassword = (password || '').toString();

    if (!rawPassword) {
      throw new AppError('Invalid username or password', HTTP_STATUS.UNAUTHORIZED);
    }

    const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH || envConfig.admin?.passwordHash || DEFAULT_ADMIN_PASSWORD_HASH;

    // Validate username (case-insensitive)
    const isUsernameMatch = rawUsername.toLowerCase() === expectedUsername.toLowerCase();

    // Validate password using secure bcrypt comparison
    let isPasswordMatch = false;
    try {
      isPasswordMatch = await bcrypt.compare(rawPassword, expectedPasswordHash);
    } catch (err) {
      logger.error({ err }, '[ADMIN AUTH] Error during bcrypt password verification');
      isPasswordMatch = false;
    }

    // Generic error response if either username or password does not match
    if (!isUsernameMatch || !isPasswordMatch) {
      logger.warn(
        { username: rawUsername, isUsernameMatch, isPasswordMatch },
        '[ADMIN AUTH] Failed admin login attempt.'
      );
      throw new AppError('Invalid username or password', HTTP_STATUS.UNAUTHORIZED);
    }

    // Provision / sync Super Admin user in DB safely
    let adminUserId = FALLBACK_ADMIN_ID;
    let adminUserObj = {
      _id: adminUserId,
      ownerName: 'Super Admin',
      username: expectedUsername,
      mobile: process.env.ADMIN_PHONE_NUMBER || '+919848081875',
      email: 'admin.vedixa@vedixaerp.com',
      role: 'super_admin',
      isActive: true,
    };

    try {
      if (User.db?.readyState === 1 || (User.base?.connection && User.base.connection.readyState === 1)) {
        const envAdminPhone = (process.env.ADMIN_PHONE_NUMBER || '+919848081875').trim();
        const cleanPhone = envAdminPhone.replace(/\D/g, '');
        const last10 = cleanPhone.slice(-10);

        const adminQuery = {
          $or: [
            { email: 'admin.vedixa@vedixaerp.com' },
            { email: 'admin@vedixa.com' },
            { mobile: envAdminPhone },
            { mobile: `+91${last10}` },
            { mobile: last10 },
            { role: { $in: ['super_admin', 'SUPER_ADMIN'] } },
          ],
        };

        const adminMatches = await User.find(adminQuery).sort({ createdAt: 1 });
        let adminUser = adminMatches && adminMatches.length > 0 ? adminMatches[0] : null;

        if (!adminUser) {
          try {
            adminUser = await User.create({
              ownerName: 'Super Admin',
              mobile: envAdminPhone,
              email: 'admin.vedixa@vedixaerp.com',
              passwordHash: expectedPasswordHash,
              role: 'super_admin',
              isMobileVerified: true,
              isActive: true,
            });
          } catch (createErr) {
            logger.warn({ createErr: createErr.message }, '[ADMIN AUTH] User.create warning, attempting findOne fallback');
            adminUser = await User.findOne({
              $or: [{ mobile: envAdminPhone }, { mobile: last10 }, { email: 'admin.vedixa@vedixaerp.com' }],
            });
          }
        }

        if (adminUser) {
          adminUser.role = 'super_admin';
          adminUser.isMobileVerified = true;
          adminUser.isActive = true;
          adminUserId = adminUser._id.toString();
          adminUserObj = {
            _id: adminUser._id,
            ownerName: adminUser.ownerName || 'Super Admin',
            username: expectedUsername,
            mobile: adminUser.mobile,
            email: adminUser.email,
            role: 'super_admin',
            isActive: true,
          };
          try {
            await adminUser.save();
          } catch (_saveErr) {
            // ignore save warnings if no changes or validation mismatch
          }
        }
      }
    } catch (dbErr) {
      logger.warn({ dbErr: dbErr.message }, '[ADMIN AUTH] DB sync warning during admin login, proceeding with verified JWT');
    }

    // Sign Admin-Only Access Token using ADMIN_JWT_SECRET
    const adminSecret = process.env.ADMIN_JWT_SECRET || envConfig.admin?.jwtSecret || DEFAULT_ADMIN_JWT_SECRET;
    const accessToken = jwt.sign(
      {
        id: adminUserId,
        role: 'super_admin',
        isAdminToken: true,
        username: expectedUsername,
      },
      adminSecret,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        id: adminUserId,
        role: 'super_admin',
        isAdminToken: true,
        username: expectedUsername,
      },
      adminSecret,
      { expiresIn: '7d' }
    );

    logger.info({ adminId: adminUserId, username: expectedUsername }, '[ADMIN AUTH] Admin login successful.');

    return {
      user: adminUserObj,
      accessToken,
      refreshToken,
    };
  },

  /**
   * Refresh Admin token using existing refresh token or access token cookie
   */
  async refreshAdminToken(req) {
    const token =
      req.cookies?.adminRefreshToken ||
      req.cookies?.adminToken ||
      req.cookies?.token ||
      (req.headers?.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

    if (!token) {
      throw new AppError('No active Admin session token provided', HTTP_STATUS.UNAUTHORIZED);
    }

    const adminSecret = process.env.ADMIN_JWT_SECRET || envConfig.admin?.jwtSecret || DEFAULT_ADMIN_JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, adminSecret);
    } catch (_err) {
      throw new AppError('Unauthorized. Invalid or expired Admin token.', HTTP_STATUS.UNAUTHORIZED);
    }

    if (!decoded || !decoded.isAdminToken) {
      throw new AppError('Forbidden. Token is not authorized for Admin access.', HTTP_STATUS.FORBIDDEN);
    }

    const expectedUsername = (process.env.ADMIN_USERNAME || envConfig.admin?.username || 'admin.vedixa').trim();
    const adminUserId = decoded.id || FALLBACK_ADMIN_ID;

    const newAccessToken = jwt.sign(
      {
        id: adminUserId,
        role: 'super_admin',
        isAdminToken: true,
        username: expectedUsername,
      },
      adminSecret,
      { expiresIn: '24h' }
    );

    return {
      user: {
        _id: adminUserId,
        ownerName: 'Super Admin',
        username: expectedUsername,
        email: 'admin.vedixa@vedixaerp.com',
        role: 'super_admin',
      },
      accessToken: newAccessToken,
    };
  },
};
