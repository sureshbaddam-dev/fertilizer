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
        if (!origin || envConfig.cors.allowedOrigins.includes(origin) || envConfig.env === 'development') {
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

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: envConfig.rateLimit.windowMs,
    max: envConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Always skip OPTIONS preflight CORS requests
      if (req.method === 'OPTIONS') return true;
      // Skip rate limiting in development mode or for localhost requests
      if (envConfig.env === 'development') {
        const clientIp = req.ip || req.socket?.remoteAddress || '';
        if (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('localhost')) {
          return true;
        }
      }
      return false;
    },
    handler: (_req, _res, next) => {
      next(new AppError('Too many requests, please try again later.', HTTP_STATUS.TOO_MANY_REQUESTS));
    },
  });

  app.use(`${envConfig.apiPrefix}/`, limiter);
};
