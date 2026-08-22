import Redis from 'ioredis';
import { envConfig } from './env.config.js';
import { logger } from './logger.config.js';

let redisClient = null;

export const connectRedis = () => {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: envConfig.redis.host,
    port: envConfig.redis.port,
    password: envConfig.redis.password,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis connection established successfully.');
  });

  redisClient.on('error', (err) => {
    // Suppress unhandled error crash when Redis is offline locally
  });

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed cleanly.');
  }
};
