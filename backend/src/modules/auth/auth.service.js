import bcrypt from 'bcryptjs';
import { User } from './user.model.js';
import { redisService } from '../../services/redis.service.js';
import { logger } from '../../config/logger.config.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.utils.js';

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const authService = {
  async generateAndStoreOtp(mobile, type = 'signup', ownerName = '') {
    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:${type}:${mobile}`;

    // Store in Redis with 5 minutes TTL
    await redisService.set(redisKey, { otp }, OTP_EXPIRY_SECONDS);

    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      logger.info(`OTP: ${otp}`);
    }

    return otp;
  },

  async signup({ ownerName, mobile, password }) {
    // 1. Check if user already exists in MongoDB
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      throw new AppError('Mobile number is already registered. Please login.', HTTP_STATUS.CONFLICT);
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Store pending user data in Redis
    const pendingKey = `pending_user:${mobile}`;
    await redisService.set(pendingKey, { ownerName, mobile, passwordHash }, OTP_EXPIRY_SECONDS);

    // 4. Generate & Store OTP
    const otp = await this.generateAndStoreOtp(mobile, 'signup', ownerName);

    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    return {
      mobile,
      otp: isDev ? otp : undefined,
      message: 'OTP sent successfully to your mobile number',
    };
  },

  async verifySignupOtp({ mobile, otp }) {
    const redisKey = `otp:signup:${mobile}`;
    const storedOtpData = await redisService.get(redisKey);

    if (!storedOtpData || storedOtpData.otp !== otp) {
      throw new AppError('Invalid or expired OTP', HTTP_STATUS.BAD_REQUEST);
    }

    const pendingKey = `pending_user:${mobile}`;
    const pendingUser = await redisService.get(pendingKey);

    if (!pendingUser) {
      throw new AppError('Registration session expired. Please sign up again.', HTTP_STATUS.BAD_REQUEST);
    }

    // Create user in MongoDB
    const user = await User.create({
      ownerName: pendingUser.ownerName,
      mobile: pendingUser.mobile,
      passwordHash: pendingUser.passwordHash,
      isMobileVerified: true,
      role: 'owner',
      isActive: true,
    });

    // Cleanup Redis keys
    await redisService.del(redisKey);
    await redisService.del(pendingKey);

    // Generate JWT Tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save active session for Refresh Token Rotation & 7-Day Sliding Expiry
    const sessionKey = `refresh_token:${user._id}`;
    await redisService.set(sessionKey, { refreshToken, userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    await User.findByIdAndUpdate(user._id, { $set: { currentRefreshToken: refreshToken } });

    return {
      user: {
        id: user._id,
        ownerName: user.ownerName,
        mobile: user.mobile,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  },

  async login({ mobile, password }) {
    if (!mobile || !password) {
      throw new AppError('Mobile number and password are required', HTTP_STATUS.BAD_REQUEST);
    }

    const cleanMobile = mobile.toString().trim();

    // 1. Find user in MongoDB
    const user = await User.findOne({ mobile: cleanMobile }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid mobile number or password', HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.isActive === false) {
      throw new AppError('Account is deactivated. Please contact support.', HTTP_STATUS.FORBIDDEN);
    }

    // 2. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid mobile number or password', HTTP_STATUS.UNAUTHORIZED);
    }

    // 3. Generate JWT Tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save active session for Refresh Token Rotation & 7-Day Sliding Expiry
    const sessionKey = `refresh_token:${user._id}`;
    await redisService.set(sessionKey, { refreshToken, userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    await User.findByIdAndUpdate(user._id, { $set: { currentRefreshToken: refreshToken } });

    return {
      user: {
        id: user._id,
        _id: user._id,
        ownerName: user.ownerName,
        mobile: user.mobile,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  },

  async refreshToken(providedToken) {
    if (!providedToken) {
      throw new AppError('Refresh token required. Please log in.', HTTP_STATUS.UNAUTHORIZED);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(providedToken);
    } catch (_err) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
    }

    const userId = decoded.id;
    const user = await User.findById(userId).select('+currentRefreshToken');
    if (!user || user.isActive === false) {
      throw new AppError('User belonging to this session no longer exists or is inactive.', HTTP_STATUS.UNAUTHORIZED);
    }

    const sessionKey = `refresh_token:${userId}`;
    const activeSession = await redisService.get(sessionKey);
    const validToken = activeSession?.refreshToken || user.currentRefreshToken;

    if (!validToken || validToken !== providedToken) {
      await redisService.del(sessionKey);
      await User.findByIdAndUpdate(userId, { $set: { currentRefreshToken: null } });
      throw new AppError('Refresh token has been revoked or expired. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Issue NEW 24-hour Access Token & NEW 7-day Refresh Token
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // SLIDING EXPIRY + ROTATION: Update session store with new 7 days window (604800 seconds)
    await redisService.set(sessionKey, { refreshToken: newRefreshToken, userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    await User.findByIdAndUpdate(user._id, { $set: { currentRefreshToken: newRefreshToken } });

    return {
      user: {
        id: user._id,
        _id: user._id,
        ownerName: user.ownerName,
        mobile: user.mobile,
        role: user.role,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(providedToken, userId) {
    let targetId = userId;
    if (!targetId && providedToken) {
      try {
        const decoded = verifyRefreshToken(providedToken);
        targetId = decoded.id;
      } catch (_err) {
        // Token invalid, ignore
      }
    }
    if (targetId) {
      await redisService.del(`refresh_token:${targetId}`);
      await User.findByIdAndUpdate(targetId, { $set: { currentRefreshToken: null } });
    }
    return true;
  },

  async forgotPassword({ mobile }) {
    const user = await User.findOne({ mobile });
    if (!user) {
      throw new AppError('No account registered with this mobile number', HTTP_STATUS.NOT_FOUND);
    }

    const otp = await this.generateAndStoreOtp(mobile, 'forgot', user.ownerName);
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    return {
      mobile,
      otp: isDev ? otp : undefined,
      message: 'OTP sent successfully for password reset',
    };
  },

  async verifyForgotOtp({ mobile, otp }) {
    const redisKey = `otp:forgot:${mobile}`;
    const storedOtpData = await redisService.get(redisKey);

    if (!storedOtpData || storedOtpData.otp !== otp) {
      throw new AppError('Invalid or expired OTP', HTTP_STATUS.BAD_REQUEST);
    }

    return { verified: true };
  },

  async resetPassword({ mobile, otp, newPassword }) {
    const redisKey = `otp:forgot:${mobile}`;
    const storedOtpData = await redisService.get(redisKey);

    if (!storedOtpData || storedOtpData.otp !== otp) {
      throw new AppError('Invalid or expired OTP', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Hash new password and update
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Clean up Redis key
    await redisService.del(redisKey);

    return { message: 'Password updated successfully. Please login with your new password.' };
  },

  async getProfile(userId) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND);
    }
    return user;
  },

  async updateProfile(userId, updateData) {
    const allowedUpdates = ['ownerName', 'email', 'profilePicUrl'];
    const updateObj = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updateObj[key] = updateData[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateObj }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND);
    }
    return user;
  },
};
