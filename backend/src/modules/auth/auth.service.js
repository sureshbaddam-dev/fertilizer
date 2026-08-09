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

    // Development Mode Terminal Output Requirement
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const generatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const formattedOtpBox =
        `\n========================================\n\n` +
        `🔐 OTP GENERATED\n\n` +
        (ownerName ? `Owner Name : ${ownerName}\n\n` : '') +
        `Mobile Number : ${mobile}\n\n` +
        `OTP : ${otp}\n\n` +
        `Expires In : 5 Minutes\n\n` +
        `Generated At : ${generatedAt}\n\n` +
        `========================================\n\n`;

      process.stdout.write(formattedOtpBox);
      console.log(formattedOtpBox);
      logger.info({ mobile, otp, type }, `OTP Generated: ${otp} for ${mobile}`);
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
    // 1. Find user in MongoDB
    const user = await User.findOne({ mobile }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid mobile number or password', HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
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
};
