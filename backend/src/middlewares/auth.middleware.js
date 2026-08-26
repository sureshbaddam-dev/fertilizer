import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../common/httpStatuses.js';
import { verifyAccessToken } from '../utils/jwt.utils.js';
import { User } from '../modules/auth/user.model.js';

export const protect = asyncHandler(async (req, _res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
    token = req.cookies.token || req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Authentication token missing. Please log in.', HTTP_STATUS.UNAUTHORIZED));
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new AppError('User belonging to this token no longer exists or is inactive.', HTTP_STATUS.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch (_error) {
    return next(new AppError('Invalid or expired authentication token. Please log in again.', HTTP_STATUS.UNAUTHORIZED));
  }
});

export const authenticate = protect;
