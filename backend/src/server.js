import app from './app.js';
import { envConfig } from './config/env.config.js';
import { logger } from './config/logger.config.js';
import { connectDatabase, disconnectDatabase } from './config/database.config.js';
import { connectRedis, disconnectRedis } from './config/redis.config.js';


let server;

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDatabase();



    // 3. Connect Redis
    connectRedis();

    // 3. Start Server Listener
    server = app.listen(envConfig.port, () => {
      logger.info(`🚀 MANDHI Backend ERP Server running on port ${envConfig.port} in [${envConfig.env}] mode`);
      const keyId = envConfig.razorpay?.keyId || '';
      const keySecret = envConfig.razorpay?.keySecret || '';
      logger.info(`💳 Razorpay mode: TEST | Key ID prefix: ${keyId.slice(0, 9)}... | Key ID present: ${!!keyId} | Secret present: ${!!keySecret}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start MANDHI Backend ERP server');
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection detected');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception detected');
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
