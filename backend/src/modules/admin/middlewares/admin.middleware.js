import jwt from 'jsonwebtoken';
import { sendError } from '../../../common/apiResponse.js';
import { User } from '../../auth/user.model.js';
import { logger } from '../../../config/logger.config.js';

export const requireAdminRole = (allowedRoles = ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN']) => {
  return async (req, res, next) => {
    try {
      // 1. Extract Admin token from Authorization header or cookie
      const token =
        req.cookies?.adminToken ||
        req.cookies?.token ||
        (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

      if (!token) {
        return sendError(res, 'Unauthorized access. Admin authentication required.', 401);
      }

      // 2. Verify token strictly using ADMIN_JWT_SECRET
      const adminSecret = process.env.ADMIN_JWT_SECRET || 'super_secret_admin_jwt_key_vedixa_2026_x89a';
      let decoded;
      try {
        decoded = jwt.verify(token, adminSecret);
      } catch (err) {
        // If token verification fails (e.g. normal user token signed with regular JWT_SECRET), reject immediately
        return sendError(res, 'Unauthorized. Invalid or expired Admin token.', 401);
      }

      if (!decoded || !decoded.isAdminToken) {
        return sendError(res, 'Forbidden. Token is not authorized for Admin access.', 403);
      }

      // 3. Retrieve user from DB to verify active status & role
      const user = await User.findById(decoded.id || decoded._id);
      if (!user || user.isActive === false) {
        return sendError(res, 'Admin user account not found or deactivated.', 403);
      }

      const normalizedRole = (user.role || '').toLowerCase();
      const isAdminUser =
        normalizedRole === 'admin' ||
        normalizedRole === 'super_admin' ||
        normalizedRole === 'finance_admin' ||
        normalizedRole === 'support_admin';

      if (!isAdminUser) {
        return sendError(res, 'Forbidden. Access restricted to Admin Panel users.', 403);
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const hasRole = allowedRoles.some(
          (role) => role.toLowerCase() === normalizedRole || (normalizedRole === 'admin' && role.toLowerCase().includes('admin'))
        );
        if (!hasRole) {
          return sendError(res, 'Forbidden. Insufficient admin privileges for this action.', 403);
        }
      }

      req.user = user;
      req.adminUser = user;
      next();
    } catch (error) {
      logger.error({ error }, 'Admin middleware authorization failed');
      return sendError(res, 'Internal server error during authorization.', 500);
    }
  };
};
