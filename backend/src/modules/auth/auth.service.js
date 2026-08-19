import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from './user.model.js';
import { ShopSettings } from '../settings/models/shopSettings.model.js';
import { redisService } from '../../services/redis.service.js';
import { emailService } from '../../services/email.service.js';
import { logger } from '../../config/logger.config.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.utils.js';

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export const authService = {
  normalizeIndianMobile(phone) {
    if (!phone) return '';
    let cleaned = phone.toString().trim().replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    return cleaned;
  },

  async verifyGoogleToken(idToken) {
    if (!idToken || typeof idToken !== 'string') {
      throw new AppError('Google authentication token is required', HTTP_STATUS.BAD_REQUEST);
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    // 1. Primary Check: OAuth2Client verifyIdToken
    try {
      const client = new OAuth2Client(googleClientId || undefined);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId || undefined,
      });
      const payload = ticket.getPayload();

      if (payload && payload.sub && payload.email) {
        return {
          sub: payload.sub,
          email: payload.email.toLowerCase().trim(),
          name: payload.name || payload.given_name || 'Google User',
          picture: payload.picture || '',
        };
      }
    } catch (_err) {
      // Continue to secondary verification
    }

    // 2. Secondary Check: Google tokeninfo API (ID Token)
    try {
      const fetchRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (fetchRes.ok) {
        const payload = await fetchRes.json();
        if (payload && payload.sub && payload.email) {
          return {
            sub: payload.sub,
            email: payload.email.toLowerCase().trim(),
            name: payload.name || payload.given_name || 'Google User',
            picture: payload.picture || '',
          };
        }
      }
    } catch (_e) {
      // Continue
    }

    // 3. Tertiary Check: Google userinfo API (Access Token)
    try {
      const userinfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (userinfoRes.ok) {
        const payload = await userinfoRes.json();
        if (payload && payload.sub && payload.email) {
          return {
            sub: payload.sub,
            email: payload.email.toLowerCase().trim(),
            name: payload.name || payload.given_name || 'Google User',
            picture: payload.picture || '',
          };
        }
      }
    } catch (_e) {
      // Continue
    }

    throw new AppError('Google authentication failed. Invalid or expired Google credential.', HTTP_STATUS.UNAUTHORIZED);
  },

  async googleAuth({ idToken }) {
    const verifiedGoogle = await this.verifyGoogleToken(idToken);
    const { sub, email, name, picture } = verifiedGoogle;

    // 1. Check if user exists by googleId
    let user = await User.findOne({ googleId: sub });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          emailVerified: true,
          ...(picture && !user.profilePicUrl ? { profilePicUrl: picture } : {}),
        },
      });
      user = await User.findById(user._id);
      return this._generateAuthResponse(user, true);
    }

    // 2. Check if user exists by email (case-insensitive) -> Account linking
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          googleId: sub,
          emailVerified: true,
          isProfileComplete: true,
          ...(picture && !user.profilePicUrl ? { profilePicUrl: picture } : {}),
        },
      });
      user = await User.findById(user._id);
      return this._generateAuthResponse(user, true);
    }

    // 3. Unregistered new user -> Store temporary session for Profile Completion
    const googleSessionToken = `g_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sessionPayload = { sub, email, name, picture };
    await redisService.set(`google_sess:${googleSessionToken}`, sessionPayload, 900); // 15 minutes TTL

    return {
      isProfileComplete: false,
      googleSessionToken,
      googleData: {
        email,
        name,
        picture,
      },
    };
  },

  async completeGoogleSignup({ googleSessionToken, idToken, mobile, shopName, ownerName }) {
    let googleData = null;

    if (googleSessionToken) {
      googleData = await redisService.get(`google_sess:${googleSessionToken}`);
    }

    if (!googleData && idToken) {
      googleData = await this.verifyGoogleToken(idToken);
    }

    if (!googleData || !googleData.email || !googleData.sub) {
      throw new AppError('Google authentication session expired. Please sign in with Google again.', HTTP_STATUS.BAD_REQUEST);
    }

    const { sub, email, name, picture } = googleData;

    // Validate Shop Name
    if (!shopName || typeof shopName !== 'string' || !shopName.trim()) {
      throw new AppError('Shop Name is mandatory', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate and Normalize Mobile Number
    const normalizedMobile = this.normalizeIndianMobile(mobile);
    const tenDigitMobile = normalizedMobile.startsWith('+91') ? normalizedMobile.slice(3) : normalizedMobile;

    if (!/^\+91[6-9]\d{9}$/.test(normalizedMobile) && !/^[6-9]\d{9}$/.test(tenDigitMobile)) {
      throw new AppError('Please enter a valid 10-digit Indian mobile number', HTTP_STATUS.BAD_REQUEST);
    }

    // Enforce Uniqueness Check: Mobile Number
    const existingMobileUser = await User.findOne({
      mobile: { $in: [normalizedMobile, tenDigitMobile] },
    });
    if (existingMobileUser) {
      throw new AppError('This mobile number is already registered with another account.', HTTP_STATUS.CONFLICT);
    }

    // Enforce Uniqueness Check: Email
    const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
    if (existingEmailUser) {
      await User.findByIdAndUpdate(existingEmailUser._id, { $set: { googleId: sub, emailVerified: true, isProfileComplete: true } });
      const updatedUser = await User.findById(existingEmailUser._id);
      if (googleSessionToken) await redisService.del(`google_sess:${googleSessionToken}`);
      return this._generateAuthResponse(updatedUser, true);
    }

    // Enforce Uniqueness Check: Google ID
    const existingGoogleUser = await User.findOne({ googleId: sub });
    if (existingGoogleUser) {
      if (googleSessionToken) await redisService.del(`google_sess:${googleSessionToken}`);
      return this._generateAuthResponse(existingGoogleUser, true);
    }

    // Create New User with emailVerified: true
    const finalOwnerName = (ownerName && ownerName.trim()) || name || 'Store Owner';
    const user = await User.create({
      ownerName: finalOwnerName,
      email: email.toLowerCase(),
      mobile: normalizedMobile,
      googleId: sub,
      profilePicUrl: picture || '',
      emailVerified: true,
      isMobileVerified: true,
      isProfileComplete: true,
      role: 'owner',
      isActive: true,
    });

    // Create Default ShopSettings Document
    try {
      await ShopSettings.create({
        userId: user._id,
        shopName: shopName.trim(),
        ownerName: user.ownerName,
        mobile: user.mobile,
        email: user.email,
      });
    } catch (_shopErr) {
      await ShopSettings.findOneAndUpdate(
        { userId: user._id },
        { $set: { shopName: shopName.trim(), ownerName: user.ownerName, mobile: user.mobile, email: user.email } },
        { upsert: true }
      );
    }

    // Clean up temporary session key
    if (googleSessionToken) {
      await redisService.del(`google_sess:${googleSessionToken}`);
    }

    return this._generateAuthResponse(user, false);
  },

  async _generateAndSendVerificationEmail(user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    user.emailVerificationToken = tokenHash;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    const appBaseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${appBaseUrl}/verify-email?token=${rawToken}`;

    await emailService.sendVerificationEmail(user.email, verifyUrl);

    return { rawToken, verifyUrl };
  },

  async emailPasswordSignup({ email, ownerName, mobile, password, confirmPassword }) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new AppError('Please enter a valid email address', HTTP_STATUS.BAD_REQUEST);
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', HTTP_STATUS.BAD_REQUEST);
    }

    if (password !== confirmPassword) {
      throw new AppError('Password and Confirm Password do not match', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Check if an account already exists with this email address
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      // If email exists AND emailVerified === true -> Return duplicate account conflict
      if (existingUser.emailVerified) {
        throw new AppError('An account with this email address already exists. Please sign in instead.', HTTP_STATUS.CONFLICT);
      }

      // If email exists AND emailVerified === false -> Re-send new verification email without creating duplicate user
      const salt = await bcrypt.genSalt(10);
      existingUser.passwordHash = await bcrypt.hash(password, salt);
      if (ownerName && ownerName.trim()) {
        existingUser.ownerName = ownerName.trim();
      }

      try {
        await this._generateAndSendVerificationEmail(existingUser);
      } catch (err) {
        logger.error(`[Auth Service] Verification email delivery failed for unverified user ${cleanEmail}: ${err.message}`);
        throw new AppError(
          `Verification email could not be sent: ${err.message}. Please configure valid SMTP_USER and SMTP_PASSWORD in backend/.env.`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      return {
        message: 'This email is registered but not verified. A new verification email has been sent to your inbox.',
        email: cleanEmail,
        userId: existingUser._id,
        isUnverifiedResend: true,
      };
    }

    // 2. Email does not exist -> Create new user with emailVerified = false
    let finalMobile = mobile && mobile.trim() ? mobile.trim() : `+91_unverified_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (mobile && mobile.trim() && !mobile.includes('_unverified_')) {
      const existingMobile = await User.findOne({ mobile: finalMobile });
      if (existingMobile) {
        throw new AppError('This mobile number is already registered with another account.', HTTP_STATUS.CONFLICT);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUser;
    try {
      newUser = await User.create({
        ownerName: (ownerName && ownerName.trim()) || cleanEmail.split('@')[0],
        email: cleanEmail,
        mobile: finalMobile,
        passwordHash,
        emailVerified: false,
        isProfileComplete: false,
        role: 'owner',
        isActive: true,
      });
    } catch (dbErr) {
      // Handle MongoDB E11000 duplicate email race condition
      if (dbErr.code === 11000 && dbErr.keyPattern && dbErr.keyPattern.email) {
        const racedUser = await User.findOne({ email: cleanEmail });
        if (racedUser && racedUser.emailVerified) {
          throw new AppError('An account with this email address already exists. Please sign in instead.', HTTP_STATUS.CONFLICT);
        } else if (racedUser) {
          await this._generateAndSendVerificationEmail(racedUser);
          return {
            message: 'This email is registered but not verified. A new verification email has been sent to your inbox.',
            email: cleanEmail,
            userId: racedUser._id,
            isUnverifiedResend: true,
          };
        }
      }
      throw dbErr;
    }

    try {
      await this._generateAndSendVerificationEmail(newUser);
    } catch (err) {
      logger.error(`[Auth Service] Verification email delivery failed for ${cleanEmail}: ${err.message}`);
      throw new AppError(
        `Account created, but verification email could not be sent: ${err.message}. Please configure valid SMTP_USER and SMTP_PASSWORD in backend/.env.`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    return {
      message: 'Account created successfully! Please check your email to verify your account.',
      email: cleanEmail,
      userId: newUser._id,
    };
  },

  async verifyEmailToken(token) {
    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is missing or invalid', HTTP_STATUS.BAD_REQUEST);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Verification link is invalid or has expired. Please request a new verification link.', HTTP_STATUS.BAD_REQUEST);
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return {
      verified: true,
      email: user.email,
      message: 'Email address verified successfully! You can now log in.',
    };
  },

  async resendVerificationEmail(email) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      throw new AppError('Account not found with this email address.', HTTP_STATUS.NOT_FOUND);
    }

    if (user.emailVerified) {
      return { message: 'Your email address is already verified. Please sign in.' };
    }

    try {
      await this._generateAndSendVerificationEmail(user);
    } catch (err) {
      logger.error(`[Auth Service] Resend verification email failed for ${cleanEmail}: ${err.message}`);
      throw new AppError(
        `Failed to send verification email: ${err.message}. Please configure valid SMTP_USER and SMTP_PASSWORD in backend/.env.`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    return {
      message: 'A new verification email has been sent. Please check your inbox.',
      email: cleanEmail,
    };
  },

  async _generateAuthResponse(user, isExisting = false) {
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    const sessionKey = `refresh_token:${user._id}`;
    await redisService.set(sessionKey, { refreshToken, userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    await User.findByIdAndUpdate(user._id, { $set: { currentRefreshToken: refreshToken } });

    let shopName = '';
    try {
      const shopSettings = await ShopSettings.findOne({ userId: user._id });
      if (shopSettings && shopSettings.shopName) {
        shopName = shopSettings.shopName;
      }
    } catch (_e) {}

    return {
      isProfileComplete: true,
      isExisting,
      user: {
        id: user._id,
        _id: user._id,
        ownerName: user.ownerName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profilePicUrl: user.profilePicUrl,
        isProfileComplete: user.isProfileComplete,
        shopName,
      },
      accessToken,
      refreshToken,
    };
  },

  async login({ mobile, email, password }) {
    let identifier = email || mobile;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new AppError('Email or Mobile number is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!password || typeof password !== 'string') {
      throw new AppError('Password is required', HTTP_STATUS.BAD_REQUEST);
    }

    identifier = identifier.trim();
    let user = null;

    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash');
    } else {
      const normalizedMobile = this.normalizeIndianMobile(identifier);
      user = await User.findOne({ mobile: normalizedMobile }).select('+passwordHash');
      if (!user) {
        user = await User.findOne({ mobile: identifier }).select('+passwordHash');
      }
    }

    if (!user) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.isActive === false) {
      throw new AppError('Your account has been deactivated. Please contact support.', HTTP_STATUS.FORBIDDEN);
    }

    // Email verification check for email/password users
    if (user.email && !user.emailVerified && !user.googleId) {
      throw new AppError('Please verify your email address before signing in.', HTTP_STATUS.FORBIDDEN);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }

    return this._generateAuthResponse(user, true);
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
    const shopSettings = await ShopSettings.findOne({ userId: user._id });
    return {
      ...user.toObject(),
      shopName: shopSettings?.shopName || '',
      shopSettings: shopSettings || null,
    };
  },

  async updateProfile(userId, updateData) {
    const allowedUpdates = ['ownerName', 'email', 'profilePicUrl'];
    const updateObj = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        updateObj[key] = updateData[key];
      }
    }

    if (updateData.shopName && typeof updateData.shopName === 'string') {
      await ShopSettings.findOneAndUpdate(
        { userId },
        { $set: { shopName: updateData.shopName.trim() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateObj }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND);
    }

    const shopSettings = await ShopSettings.findOne({ userId });
    return {
      ...user.toObject(),
      shopName: shopSettings?.shopName || '',
      shopSettings: shopSettings || null,
    };
  },
};
