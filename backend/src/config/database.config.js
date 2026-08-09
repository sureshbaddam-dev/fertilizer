import mongoose from 'mongoose';
import { envConfig } from './env.config.js';
import { logger } from './logger.config.js';

export const connectDatabase = async () => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error.');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected.');
    });

    await mongoose.connect(envConfig.mongo.uri, {
      autoIndex: envConfig.env !== 'production',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB.');
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
