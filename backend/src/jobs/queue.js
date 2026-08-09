import { Queue } from 'bullmq';
import { envConfig } from '../config/env.config.js';
import { logger } from '../config/logger.config.js';

const connection = {
  host: envConfig.redis.host,
  port: envConfig.redis.port,
  password: envConfig.redis.password,
};

export const createQueue = (name) => {
  try {
    const queue = new Queue(name, { connection });
    logger.info({ queueName: name }, 'BullMQ Queue initialized successfully');
    return queue;
  } catch (error) {
    logger.error({ error: error.message, queueName: name }, 'Failed to initialize BullMQ Queue');
    return null;
  }
};
