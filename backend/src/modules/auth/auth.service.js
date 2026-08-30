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
import { CURRENT_TERMS_VERSION } from '../../constants/legal.constants.js';

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
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    logger.info(`[GoogleAuth] Processing Google authentication for email: ${cleanEmail}, sub: ${sub}`);

    // 1. Check if user exists by googleId
    let user = await User.findOne({ googleId: sub });
    if (user) {
      logger.info(`[GoogleAuth] Found existing user by googleId. MongoDB _id: ${user._id}`);
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
    user = await User.findOne({ email: cleanEmail });
    if (user) {
      logger.info(`[GoogleAuth] Found existing user by email. MongoDB _id: ${user._id}`);
      await User.findByIdAndUpdate(user._id, {
        $set: {
          googleId: sub,
          emailVerified: true,
          ...(picture && !user.profilePicUrl ? { profilePicUrl: picture } : {}),
        },
      });
      user = await User.findById(user._id);
      return this._generateAuthResponse(user, true);
    }

    // 3. Unregistered new user -> Create User in MongoDB and issue tokens
    const pendingMobile = 'pending_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    user = await User.create({
      ownerName: name || 'Google User',
      email: cleanEmail,
      mobile: pendingMobile,
      googleId: sub,
      profilePicUrl: picture || '',
      emailVerified: true,
      isMobileVerified: false,
      isProfileComplete: false,
      role: 'owner',
      isActive: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    logger.info(`[GoogleAuth] Created NEW user in MongoDB. _id: ${user._id}, email: ${user.email}`);

    return this._generateAuthResponse(user, false);
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
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
      legalAcceptance: {
        accepted: true,
        acceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
      },
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

  async initiateSignupOtp({ email, password, confirmPassword, termsAccepted }) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      logger.warn('[Auth Service] Signup OTP failed: Missing email address');
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanEmail = email.trim().toLowerCase();
    const maskedEmail = cleanEmail.replace(/(.{2})(.*)(?=@)/, (_m, p1, p2) => p1 + '*'.repeat(p2.length));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      logger.warn(`[Auth Service] Signup OTP failed: Invalid email format for ${maskedEmail}`);
      throw new AppError('Please enter a valid email address', HTTP_STATUS.BAD_REQUEST);
    }

    const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!password || typeof password !== 'string' || !STRONG_PASSWORD_REGEX.test(password)) {
      logger.warn(`[Auth Service] Signup OTP failed: Strong password validation failed for ${maskedEmail}`);
      throw new AppError(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (password !== confirmPassword) {
      logger.warn(`[Auth Service] Signup OTP failed: Password mismatch for ${maskedEmail}`);
      throw new AppError('Password and Confirm Password do not match', HTTP_STATUS.BAD_REQUEST);
    }

    if (termsAccepted !== true && termsAccepted !== 'true') {
      logger.warn(`[Auth Service] Signup OTP failed: Terms not accepted for ${maskedEmail}`);
      throw new AppError(
        'Please accept the Terms & Conditions, Privacy Policy and Refund & Cancellation Policy to continue.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    logger.info(`[Auth Service] Input validation passed for ${maskedEmail}`);

    // 1. Check if email is already registered in User database
    const existingEmailUser = await User.findOne({ email: cleanEmail });
    if (existingEmailUser) {
      logger.warn(`[Auth Service] Duplicate user check: Account already exists for ${maskedEmail}`);
      throw new AppError('An account with this email address already exists. Please log in instead.', HTTP_STATUS.CONFLICT);
    }

    // DO NOT CREATE THE PERMANENT USER ACCOUNT BEFORE OTP VERIFICATION
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    const pendingData = {
      email: cleanEmail,
      passwordHash,
      otpHash,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      resendCooldown: Date.now() + 60 * 1000, // 60 seconds
    };

    try {
      await redisService.set(`otp:signup:${cleanEmail}`, pendingData, 600);
      logger.info(`[Auth Service] Stored pending OTP session state for ${maskedEmail}`);
    } catch (redisErr) {
      logger.error(`[Auth Service] Redis operation failed for ${maskedEmail}: ${redisErr.message}`);
    }

    logger.info(`[Signup OTP] Recipient: ${cleanEmail}`);

    // Send OTP through Brevo API (params: { otp })
    try {
      await emailService.sendBrevoOtpEmail({
        toEmail: cleanEmail,
        toName: 'Valued User',
        otp: otpCode,
      });
      logger.info(`[Signup OTP] OTP email dispatched successfully to recipient: ${cleanEmail}`);
    } catch (sendErr) {
      logger.error(`[Auth Service] Failed to send Brevo OTP email to ${maskedEmail}: ${sendErr.message}`);
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        logger.info(`[Dev OTP Fallback] Verification OTP Code for ${cleanEmail}: ${otpCode}`);
      } else {
        throw new AppError(
          `Unable to send verification OTP email: ${sendErr.message}. Please check your email address and try again.`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    }

    return {
      message: 'Verification OTP sent to your email address. Please enter the 6-digit code to complete registration.',
      email: cleanEmail,
      resendCooldownSeconds: 60,
      expiresInSeconds: 600,
    };
  },

  async verifySignupOtp({ email, otp }) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }

    const key = `otp:signup:${cleanEmail}`;
    let pendingData = await redisService.get(key);

    if (!pendingData) {
      throw new AppError('Verification OTP code has expired or does not exist. Please request a new OTP.', HTTP_STATUS.BAD_REQUEST);
    }

    if (Date.now() > pendingData.expiresAt) {
      await redisService.del(key);
      throw new AppError('OTP verification code has expired. Please request a new OTP.', HTTP_STATUS.BAD_REQUEST);
    }

    if (pendingData.attempts >= 5) {
      throw new AppError('Too many failed OTP attempts. Please request a new OTP code.', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const submittedHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (submittedHash !== pendingData.otpHash) {
      pendingData.attempts += 1;
      await redisService.set(key, pendingData, 600);
      throw new AppError('Invalid OTP verification code. Please check the 6-digit code and try again.', HTTP_STATUS.BAD_REQUEST);
    }

    // SINGLE-USE: Delete pending OTP store
    await redisService.del(key);

    // CREATE PERMANENT USER ACCOUNT NOW (Pending Business Details Onboarding)
    let user;
    const tempMobile = `pending_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      user = await User.create({
        ownerName: 'Pending Setup',
        email: pendingData.email,
        mobile: tempMobile,
        passwordHash: pendingData.passwordHash,
        emailVerified: true,
        isMobileVerified: false,
        isProfileComplete: false,
        role: 'owner',
        isActive: true,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        legalAcceptance: {
          accepted: true,
          acceptedAt: new Date(),
          termsVersion: CURRENT_TERMS_VERSION,
        },
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        const existing = await User.findOne({ email: pendingData.email });
        if (existing) {
          return this._generateAuthResponse(existing, true);
        }
      }
      throw createErr;
    }

    const response = await this._generateAuthResponse(user, false);
    return {
      ...response,
      message: 'Email verified successfully! Please complete your business details.',
    };
  },

  async resendSignupOtp({ email }) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanEmail = email.trim().toLowerCase();

    const key = `otp:signup:${cleanEmail}`;
    const pendingData = await redisService.get(key);

    if (!pendingData) {
      throw new AppError('No pending signup found for this email address. Please sign up again.', HTTP_STATUS.NOT_FOUND);
    }

    if (pendingData.resendCooldown && Date.now() < pendingData.resendCooldown) {
      const remainingSecs = Math.ceil((pendingData.resendCooldown - Date.now()) / 1000);
      throw new AppError(`Please wait ${remainingSecs} seconds before requesting another OTP code.`, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    pendingData.otpHash = otpHash;
    pendingData.attempts = 0;
    pendingData.resendCooldown = Date.now() + 60 * 1000;
    pendingData.expiresAt = Date.now() + 10 * 60 * 1000;

    await redisService.set(key, pendingData, 600);

    await emailService.sendBrevoOtpEmail({
      toEmail: cleanEmail,
      toName: pendingData.ownerName,
      otp: otpCode,
    });

    return {
      message: 'A new verification OTP code has been sent to your email address.',
      email: cleanEmail,
      resendCooldownSeconds: 60,
    };
  },

  async emailPasswordSignup(data) {
    return await this.initiateSignupOtp(data);
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
    logger.info(`[_generateAuthResponse] Signing accessToken for user._id: ${user._id}, email: ${user.email}, isActive: ${user.isActive}`);
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

    const isProfileComplete = Boolean(
      user.isProfileComplete ||
      (user.ownerName &&
        user.ownerName !== 'Pending Setup' &&
        user.mobile &&
        !user.mobile.startsWith('pending_'))
    );

    return {
      isProfileComplete,
      isExisting,
      user: {
        id: user._id,
        _id: user._id,
        ownerName: user.ownerName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profilePicUrl: user.profilePicUrl || '',
        profileImage: user.profilePicUrl || '',
        isProfileComplete,
        shopName,
      },
      accessToken,
      refreshToken,
    };
  },

  async checkEmailAvailability(email) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('Email address is required', HTTP_STATUS.BAD_REQUEST);
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new AppError('Please enter a valid email address', HTTP_STATUS.BAD_REQUEST);
    }
    const existing = await User.findOne({ email: cleanEmail }).select('_id').lean();
    if (existing) {
      return { available: false, exists: true, email: cleanEmail };
    }
    return { available: true, exists: false, email: cleanEmail };
  },

  async completeOnboarding(userId, onboardingData) {
    const { ownerName, mobile, shopName, address, gstNumber, city, state, pincode } = onboardingData || {};

    if (!userId) {
      throw new AppError('User authentication required', HTTP_STATUS.UNAUTHORIZED);
    }

    const cleanName = ownerName ? ownerName.trim() : '';
    const cleanMobile = mobile ? this.normalizeIndianMobile(mobile) : '';
    const tenDigitMobile = cleanMobile.startsWith('+91') ? cleanMobile.slice(3) : cleanMobile;

    if (!cleanName) {
      throw new AppError('Name is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (!/^\+91[6-9]\d{9}$/.test(cleanMobile) && !/^[6-9]\d{9}$/.test(tenDigitMobile)) {
      throw new AppError('Please enter a valid 10-digit Indian mobile number', HTTP_STATUS.BAD_REQUEST);
    }

    const cleanGst = gstNumber ? gstNumber.trim().toUpperCase() : '';
    if (cleanGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      throw new AppError('Please enter a valid 15-character GSTIN number (e.g. 36AAAAA0000A1Z5)', HTTP_STATUS.BAD_REQUEST);
    }

    const existingMobileUser = await User.findOne({
      _id: { $ne: userId },
      mobile: { $in: [cleanMobile, tenDigitMobile] },
    });
    if (existingMobileUser) {
      throw new AppError('This mobile number is already registered with another account.', HTTP_STATUS.CONFLICT);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ownerName: cleanName,
          mobile: cleanMobile,
          isMobileVerified: true,
          isProfileComplete: true,
        },
      },
      { new: true }
    );

    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND);
    }

    const cleanShopName = shopName ? shopName.trim() : '';
    const cleanAddress = address ? address.trim() : '';

    await ShopSettings.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          shopName: cleanShopName,
          ownerName: cleanName,
          mobile: cleanMobile,
          email: user.email,
          address: cleanAddress,
          gstNumber: cleanGst,
          ...(city && city.trim() ? { district: city.trim() } : {}),
          ...(state && state.trim() ? { state: state.trim() } : {}),
          ...(pincode && pincode.trim() ? { pincode: pincode.trim() } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return this._generateAuthResponse(user, true);
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
    const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!newPassword || typeof newPassword !== 'string' || !STRONG_PASSWORD_REGEX.test(newPassword)) {
      throw new AppError(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
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
    const userObj = user.toObject();
    return {
      ...userObj,
      profileImage: userObj.profilePicUrl || '',
      shopName: shopSettings?.shopName || '',
      shopSettings: shopSettings || null,
    };
  },

  async updateProfile(userId, updateData) {
    const allowedUpdates = ['ownerName', 'email', 'profilePicUrl', 'profileImage'];
    const updateObj = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        if (key === 'profileImage') {
          updateObj['profilePicUrl'] = updateData[key];
        } else {
          updateObj[key] = updateData[key];
        }
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
    const userObj = user.toObject();
    return {
      ...userObj,
      profileImage: userObj.profilePicUrl || '',
      shopName: shopSettings?.shopName || '',
      shopSettings: shopSettings || null,
    };
  },
};
