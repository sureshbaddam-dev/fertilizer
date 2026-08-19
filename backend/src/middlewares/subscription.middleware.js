import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../common/httpStatuses.js';
import { UserSubscription } from '../modules/subscription/userSubscription.model.js';

export const requireActiveSubscription = asyncHandler(async (req, _res, next) => {
  // 1. Bypass subscription check for Super Admin and Admin accounts
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    return next();
  }

  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required.', HTTP_STATUS.UNAUTHORIZED));
  }

  const userId = req.user._id;
  const sub = await UserSubscription.findOne({ userId });

  const hasActiveSub = sub && sub.status === 'ACTIVE' && sub.expiryDate && new Date(sub.expiryDate) >= new Date();

  if (!hasActiveSub) {
    if (sub && sub.status === 'ACTIVE' && sub.expiryDate && new Date(sub.expiryDate) < new Date()) {
      sub.status = 'EXPIRED';
      await sub.save();
    }
    return next(
      new AppError('Active subscription required to access this feature.', HTTP_STATUS.FORBIDDEN)
    );
  }

  next();
});
