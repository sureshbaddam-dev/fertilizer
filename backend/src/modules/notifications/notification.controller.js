import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { pushNotificationService } from './services/pushNotification.service.js';

export const getVapidPublicKey = asyncHandler(async (_req, res) => {
  const publicKey = pushNotificationService.getVapidPublicKey();
  return sendSuccess(res, 'VAPID public key retrieved', { publicKey }, HTTP_STATUS.OK);
});

export const subscribePush = asyncHandler(async (req, res) => {
  const subscriptionData = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const sub = await pushNotificationService.saveSubscription(req.user._id, subscriptionData, userAgent);
  return sendSuccess(res, 'Push subscription registered successfully', { subscription: sub }, HTTP_STATUS.CREATED);
});

export const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  await pushNotificationService.removeSubscription(endpoint);
  return sendSuccess(res, 'Push subscription removed successfully', null, HTTP_STATUS.OK);
});
