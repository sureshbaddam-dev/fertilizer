import { getRedisClient } from '../config/redis.config.js';
import { logger } from '../config/logger.config.js';

export const redisService = {
  async get(key) {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn({ error: error.message, key }, 'Redis GET error');
      return null;
    }
  },

  async set(key, value, ttlInSeconds = 3600) {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      if (ttlInSeconds) {
        await client.set(key, serialized, 'EX', ttlInSeconds);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.warn({ error: error.message, key }, 'Redis SET error');
      return false;
    }
  },

  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.warn({ error: error.message, key }, 'Redis DEL error');
      return false;
    }
  },
};
