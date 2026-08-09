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

// Pino HTTP logger
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === `${envConfig.apiPrefix}/health`,
    },
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security Middlewares (CORS, Helmet, Rate Limiter, Compression, Mongo Sanitize)
configureSecurityMiddlewares(app);

// System Health Check Endpoint
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

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
