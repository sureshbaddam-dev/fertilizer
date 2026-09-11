import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../common/httpStatuses.js';
import { subscriptionService } from '../modules/subscription/subscription.service.js';

export const requireActiveSubscription = asyncHandler(async (req, _res, next) => {
  // 1. Bypass subscription check for Super Admin and Admin accounts
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
    return next();
  }

  if (!req.user || !req.user._id) {
    return next(new AppError('Authentication required.', HTTP_STATUS.UNAUTHORIZED));
  }

  const userId = req.user._id;
  const subResult = await subscriptionService.getUserSubscription(userId);

  if (!subResult || !subResult.hasActiveSubscription) {
    const isTrial = subResult?.isTrial;
    const msg = isTrial
      ? 'Your free trial has expired. Please choose a subscription plan to continue.'
      : 'Your subscription has expired. Please choose a subscription plan to continue.';

    const err = new AppError(msg, HTTP_STATUS.FORBIDDEN);
    err.code = isTrial ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_EXPIRED';
    err.subscriptionStatus = subResult?.subscriptionStatus || (isTrial ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_EXPIRED');
    return next(err);
  }

  next();
});
