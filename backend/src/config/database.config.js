import mongoose from 'mongoose';
import { envConfig } from './env.config.js';
import { logger } from './logger.config.js';

export const connectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected, reusing existing connection.');
      return mongoose.connection;
    }

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(err, 'MongoDB connection failed');
    });

    await mongoose.connect(envConfig.mongo.uri, {
      autoIndex: envConfig.env !== 'production',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '25', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
      retryWrites: true,
    });
    logger.info(`Primary MongoDB connected successfully to database: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect to Primary MongoDB: ${error.message}. Primary database write operations are halted. Do NOT fall back to backup database.`);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly.');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting MongoDB.');
  }
};
