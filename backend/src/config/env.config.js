import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const envConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  mongo: {
    uri: process.env.MAIN_MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/mandhi_erp',
    mainUri: process.env.MAIN_MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/mandhi_erp',
    backupUri: process.env.BACKUP_MONGODB_URI || process.env.MAIN_MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/mandhi_erp_backups',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_mandhi_secret_key_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_mandhi_refresh_secret_key_12345',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000').split(','),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL || 'info@vedixaerp.com',
    senderName: process.env.EMAIL_FROM_NAME || process.env.BREVO_SENDER_NAME || 'VEDIXA ERP',
    templateId: parseInt(process.env.BREVO_TEMPLATE_ID || '2', 10),
  },
};
