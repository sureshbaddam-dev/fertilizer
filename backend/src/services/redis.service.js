import { getRedisClient } from '../config/redis.config.js';
import { logger } from '../config/logger.config.js';

const memoryStore = new Map();

export const redisService = {
  async get(key) {
    try {
      const client = getRedisClient();
      if (client && client.status === 'ready') {
        const data = await client.get(key);
        if (data) return JSON.parse(data);
      }
    } catch (_error) {
      // Fall through to memoryStore fallback
    }
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key, value, ttlInSeconds = 3600) {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      if (client && client.status === 'ready') {
        if (ttlInSeconds) {
          await client.set(key, serialized, 'EX', ttlInSeconds);
        } else {
          await client.set(key, serialized);
        }
      }
    } catch (_error) {
      // Fall through to memoryStore fallback
    }
    const expiresAt = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
    memoryStore.set(key, { value, expiresAt });
    return true;
  },

  async del(key) {
    try {
      const client = getRedisClient();
      if (client && client.status === 'ready') {
        await client.del(key);
      }
    } catch (_error) {}
    memoryStore.delete(key);
    return true;
  },
};
