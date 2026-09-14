import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { envConfig } from '../config/env.config.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS } from '../common/httpStatuses.js';

export const configureSecurityMiddlewares = (app) => {
  // Helmet for security headers (allowing cross-origin images for static assets)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          envConfig.env === 'development' ||
          envConfig.cors.allowedOrigins.includes(origin) ||
          /^https?:\/\/([a-z0-9-]+\.)*vedixaerp\.com$/i.test(origin) ||
          /^https?:\/\/.*\.onrender\.com$/i.test(origin) ||
          /^https?:\/\/.*\.vercel\.app$/i.test(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/i.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new AppError('Not allowed by CORS', HTTP_STATUS.FORBIDDEN));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Compression
  app.use(compression());

  // Mongo Sanitization against NoSQL injection (Express 5 safe)
  app.use((req, _res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.params) mongoSanitize.sanitize(req.params);
    next();
  });

  // Rate Limiting Tier 1: Auth & Sensitive Security Endpoints (Strict protection against brute-force)
  const authLimiter = rateLimit({
    windowMs: envConfig.rateLimit.windowMs,
    max: envConfig.rateLimit.maxAuth || 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.method === 'OPTIONS') return true;
      if (envConfig.env === 'development') return true;
      return false;
    },
    handler: (_req, res) => {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      });
    },
  });

  // Rate Limiting Tier 2: General Authenticated ERP API (Generous threshold for ERP multi-tab & reporting usage)
  const generalApiLimiter = rateLimit({
    windowMs: envConfig.rateLimit.windowMs,
    max: envConfig.rateLimit.max || 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.method === 'OPTIONS') return true;
      if (req.path === '/health' || req.path === '/ping' || req.path.endsWith('/health')) return true;
      if (envConfig.env === 'development') return true;
      return false;
    },
    handler: (_req, res) => {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'API rate limit exceeded. Please slow down requests.',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      });
    },
  });

  // Apply Auth limiter to auth sensitive routes
  app.use(`${envConfig.apiPrefix}/auth/login`, authLimiter);
  app.use(`${envConfig.apiPrefix}/auth/signup`, authLimiter);
  app.use(`${envConfig.apiPrefix}/auth/forgot-password`, authLimiter);
  app.use(`${envConfig.apiPrefix}/auth/reset-password`, authLimiter);
  app.use(`${envConfig.apiPrefix}/auth/verify-signup-otp`, authLimiter);
  app.use(`${envConfig.apiPrefix}/admin/auth/login`, authLimiter);

  // Apply General API limiter to all other API endpoints
  app.use(`${envConfig.apiPrefix}/`, generalApiLimiter);
};
