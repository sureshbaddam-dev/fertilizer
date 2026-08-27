import webpush from 'web-push';
import { envConfig } from '../../../config/env.config.js';
import { logger } from '../../../config/logger.config.js';
import { PushSubscription } from '../models/pushSubscription.model.js';

let isVapidInitialized = false;

function initializeVapid() {
  if (isVapidInitialized) return;

  const publicKey = envConfig.vapid.publicKey || process.env.VAPID_PUBLIC_KEY || '';
  const privateKey = envConfig.vapid.privateKey || process.env.VAPID_PRIVATE_KEY || '';
  const subject = envConfig.vapid.subject || 'mailto:info@vedixaerp.com';

  if (!publicKey || !privateKey) {
    logger.error('❌ Web Push Error: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing in environment configuration.');
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidInitialized = true;
    logger.info('✅ Web Push VAPID Service initialized successfully with persistent keys.');
  } catch (err) {
    logger.error(`❌ Failed to initialize Web Push VAPID: ${err.message}`);
  }
}

export const pushNotificationService = {
  getVapidPublicKey() {
    initializeVapid();
    return envConfig.vapid.publicKey || process.env.VAPID_PUBLIC_KEY || '';
  },

  async saveSubscription(userId, subscriptionData, userAgent = '') {
    if (!subscriptionData || !subscriptionData.endpoint || !subscriptionData.keys) {
      throw new Error('Invalid push subscription payload');
    }

    const { endpoint, keys } = subscriptionData;
    const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 'desktop';

    const updatedSub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
        deviceType,
      },
      { upsert: true, new: true }
    );

    logger.info(`📱 Push subscription saved/updated for User ${userId} (${deviceType})`);
    return updatedSub;
  },

  async removeSubscription(endpoint) {
    if (!endpoint) return;
    await PushSubscription.deleteOne({ endpoint });
    logger.info(`🗑️ Removed push subscription: ${endpoint.slice(-15)}`);
  },

  async sendToSubscription(subDoc, payloadObj) {
    initializeVapid();
    if (!isVapidInitialized) return false;

    const pushSubscription = {
      endpoint: subDoc.endpoint,
      keys: {
        p256dh: subDoc.keys.p256dh,
        auth: subDoc.keys.auth,
      },
    };

    const payloadString = JSON.stringify({
      title: payloadObj.title || 'VEDIXA ERP Alert',
      body: payloadObj.body || payloadObj.message || '',
      icon: payloadObj.icon || '/favicon.png',
      badge: payloadObj.badge || '/favicon.png',
      url: payloadObj.url || payloadObj.path || '/dashboard',
      tag: payloadObj.tag || `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    try {
      const pushOptions = {
        TTL: 86400, // 24 hours
        urgency: 'high', // Bypasses Android battery doze for immediate status bar delivery
      };
      await webpush.sendNotification(pushSubscription, payloadString, pushOptions);
      return true;
    } catch (err) {
      const statusCode = err.statusCode || err.status;
      if (statusCode === 404 || statusCode === 410) {
        logger.info(`🧹 Removing expired/invalid Push Subscription (HTTP ${statusCode}): ${subDoc.endpoint.slice(-15)}`);
        await PushSubscription.deleteOne({ _id: subDoc._id });
      } else {
        logger.error(`❌ Push notification failed for endpoint ${subDoc.endpoint.slice(-15)}: ${err.message}`);
      }
      return false;
    }
  },

  async sendPushToUser(userId, payloadObj) {
    if (!userId) return;
    const subscriptions = await PushSubscription.find({ userId }).lean();
    if (!subscriptions || subscriptions.length === 0) return;

    logger.info(`⚡ Dispatching Web Push to User ${userId} across ${subscriptions.length} registered device(s)`);
    await Promise.all(subscriptions.map((sub) => this.sendToSubscription(sub, payloadObj)));
  },

  async sendPushToAudience(targetAudience, targetUserIds = [], payloadObj) {
    initializeVapid();

    let query = {};
    const { UserSubscription } = await import('../../subscription/userSubscription.model.js');
    const { User } = await import('../../auth/user.model.js');

    if (targetAudience === 'SELECTED_USERS' || targetAudience === 'SPECIFIC_USER') {
      if (!targetUserIds || targetUserIds.length === 0) return;
      query = { userId: { $in: targetUserIds } };
    } else if (targetAudience === 'EXPIRING_SOON') {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const expiringSubs = await UserSubscription.find({
        status: 'ACTIVE',
        expiryDate: { $gte: new Date(), $lte: sevenDaysLater },
      }).select('userId');
      const expiringUserIds = expiringSubs.map((s) => s.userId);
      if (expiringUserIds.length === 0) return;
      query = { userId: { $in: expiringUserIds } };
    } else if (targetAudience === 'DEMO_USERS') {
      const demoSubs = await UserSubscription.find({
        status: 'ACTIVE',
        activationType: 'DEMO',
      }).select('userId');
      const demoUserIds = demoSubs.map((s) => s.userId);
      if (demoUserIds.length === 0) return;
      query = { userId: { $in: demoUserIds } };
    } else {
      // ALL_USERS: target all active push subscriptions
      query = {};
    }

    const subscriptions = await PushSubscription.find(query).lean();
    if (!subscriptions || subscriptions.length === 0) {
      logger.info(`ℹ️ No active Web Push subscriptions found for target audience: ${targetAudience}`);
      return;
    }

    logger.info(`🚀 Broadcasting Web Push to ${subscriptions.length} subscription(s) for audience: ${targetAudience}`);
    await Promise.all(subscriptions.map((sub) => this.sendToSubscription(sub, payloadObj)));
  },
};
