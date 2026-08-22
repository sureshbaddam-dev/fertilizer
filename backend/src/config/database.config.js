import mongoose from 'mongoose';
import { envConfig } from './env.config.js';
import { logger } from './logger.config.js';

export const connectDatabase = async () => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(err, 'MongoDB connection failed');
    });

    await mongoose.connect(envConfig.mongo.uri, {
      autoIndex: envConfig.env !== 'production',
      serverSelectionTimeoutMS: 10000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
    });
    logger.info(`Primary MongoDB Atlas connected successfully to database: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error(`Failed to connect to Primary MongoDB Atlas: ${error.message}. Primary database write operations are halted. Do NOT fall back to backup database.`);
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
