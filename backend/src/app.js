import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { envConfig } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { configureSecurityMiddlewares } from './middlewares/security.middleware.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { sendSuccess } from './common/apiResponse.js';

import authRoutes from './modules/auth/auth.routes.js';
import masterRoutes from './modules/masters/master.routes.js';
import supplierRoutes from './modules/suppliers/supplier.routes.js';
import productRoutes from './modules/products/product.routes.js';
import purchaseRoutes from './modules/purchases/purchase.routes.js';
import salesInvoiceRoutes from './modules/sales/routes/salesInvoice.routes.js';
import customerRoutes from './modules/customers/routes/customer.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve uploaded assets statically with cross-origin access enabled
app.use(
  '/uploads',
  cors(),
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Pino HTTP logger (disabled by default in normal mode to keep console silent)
if (process.env.DEBUG_LOGS === 'true') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
    })
  );
}

import cookieParser from 'cookie-parser';

// Body Parsers & Cookie Parser
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security Middlewares (CORS, Helmet, Rate Limiter, Compression, Mongo Sanitize)
configureSecurityMiddlewares(app);

// System Health & Ping Endpoints (Render Free-Tier Friendly)
app.get('/health', (_req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));
app.get('/ping', (_req, res) => res.status(200).send('pong'));

app.get(`${envConfig.apiPrefix}/health`, (_req, res) => {
  return sendSuccess(res, 'MANDHI ERP API System is Healthy', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    env: envConfig.env,
  });
});

// Auth Routes
app.use(`${envConfig.apiPrefix}/auth`, authRoutes);

// Master Data Routes
app.use(`${envConfig.apiPrefix}/masters`, masterRoutes);

// Supplier Routes
app.use(`${envConfig.apiPrefix}/suppliers`, supplierRoutes);

// Product Routes
app.use(`${envConfig.apiPrefix}/products`, productRoutes);

// Purchase Routes
app.use(`${envConfig.apiPrefix}/purchases`, purchaseRoutes);

// Sales Invoice Routes
app.use(`${envConfig.apiPrefix}/invoices`, salesInvoiceRoutes);

// Customer Routes
app.use(`${envConfig.apiPrefix}/customers`, customerRoutes);

// Settings Routes
app.use(`${envConfig.apiPrefix}/settings`, settingsRoutes);

// Dashboard Routes
app.use(`${envConfig.apiPrefix}/dashboard`, dashboardRoutes);

// Reports Routes
app.use(`${envConfig.apiPrefix}/reports`, reportsRoutes);

import supportRoutes from './modules/support/support.routes.js';
import subscriptionRoutes from './modules/subscription/subscription.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { trackWebsiteVisitor, recordVisitorHit } from './modules/admin/middlewares/visitorTracking.middleware.js';

// Public Visitor Ping Endpoint for live tracking
app.post(`${envConfig.apiPrefix}/analytics/ping`, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const { path: pagePath, visitorId } = req.body || {};
    const userAgent = req.headers['user-agent'] || '';
    await recordVisitorHit({ ip, path: pagePath || '/', userAgent, visitorId });
    return sendSuccess(res, 'Visitor activity recorded');
  } catch (_e) {
    return sendSuccess(res, 'Visitor activity recorded');
  }
});

// Visitor Analytics Tracking Middleware for Public Routes
app.use(trackWebsiteVisitor);

// Support & Ticket Routes
app.use(`${envConfig.apiPrefix}/support`, supportRoutes);

// SaaS Subscription Routes
app.use(`${envConfig.apiPrefix}/subscriptions`, subscriptionRoutes);

// Admin Control Panel Routes
app.use(`${envConfig.apiPrefix}/admin`, adminRoutes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
