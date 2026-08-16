import { sendError } from '../../../common/apiResponse.js';
import { User } from '../../auth/user.model.js';
import { logger } from '../../../config/logger.config.js';

export const requireAdminRole = (allowedRoles = ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN']) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized access. Admin authentication required.', 401);
      }

      // Fetch user role if missing
      const user = await User.findById(req.user.id || req.user._id);
      if (!user) {
        return sendError(res, 'User not found.', 404);
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

      // If specific role list provided
      if (allowedRoles && allowedRoles.length > 0) {
        const hasRole = allowedRoles.some(
          (role) => role.toLowerCase() === normalizedRole || (normalizedRole === 'admin' && role.toLowerCase().includes('admin'))
        );
        if (!hasRole) {
          return sendError(res, 'Forbidden. Insufficient admin privileges for this action.', 403);
        }
      }

      req.adminUser = user;
      next();
    } catch (error) {
      logger.error({ error }, 'Admin middleware authorization failed');
      return sendError(res, 'Internal server error during authorization.', 500);
    }
  };
};
