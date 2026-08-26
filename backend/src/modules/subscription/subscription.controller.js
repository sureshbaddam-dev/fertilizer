import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { subscriptionService } from './subscription.service.js';

export const getPlans = asyncHandler(async (_req, res) => {
  const config = await subscriptionService.getSubscriptionConfig();
  return sendSuccess(
    res,
    'Subscription plans retrieved.',
    {
      isSubscriptionSystemActive: config.isSubscriptionSystemActive,
      plans: config.plans,
    },
    HTTP_STATUS.OK
  );
});

export const getUserSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getUserSubscription(req.user._id);
  return sendSuccess(res, 'User subscription status retrieved.', data, HTTP_STATUS.OK);
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, price } = req.body;
  const result = await subscriptionService.validateCoupon(code, Number(price || 0));
  return sendSuccess(res, 'Coupon validated.', result, HTTP_STATUS.OK);
});

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const orderData = await subscriptionService.createRazorpayOrder(req.user._id, req.body);
  return sendSuccess(res, 'Razorpay order created successfully.', orderData, HTTP_STATUS.CREATED);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.verifyAndActivateSubscription(req.user._id, req.body);
  return sendSuccess(res, 'Payment verified & subscription activated successfully.', { subscription }, HTTP_STATUS.OK);
});

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signatureHeader = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const result = await subscriptionService.handleRazorpayWebhook(rawBody, signatureHeader);
  return sendSuccess(res, 'Razorpay webhook processed successfully.', result, HTTP_STATUS.OK);
});

export const adminActivateSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.adminActivateUserSubscription(req.user._id, req.body);
  return sendSuccess(res, 'Subscription manually activated by Admin.', { subscription }, HTTP_STATUS.OK);
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await subscriptionService.createCoupon(req.body);
  return sendSuccess(res, 'Coupon code created successfully.', { coupon }, HTTP_STATUS.CREATED);
});

export const getAllCoupons = asyncHandler(async (_req, res) => {
  const coupons = await subscriptionService.getAllCoupons();
  return sendSuccess(res, 'All coupons retrieved.', { coupons }, HTTP_STATUS.OK);
});

export const requestFreeDemo = asyncHandler(async (req, res) => {
  const demoRequest = await subscriptionService.requestFreeDemo(req.user._id, req.body);
  return sendSuccess(res, 'Free demo requested successfully.', { demoRequest }, HTTP_STATUS.CREATED);
});

export const getDemoRequests = asyncHandler(async (req, res) => {
  const demoRequests = await subscriptionService.getDemoRequests(req.query.status);
  return sendSuccess(res, 'Demo requests retrieved.', { demoRequests }, HTTP_STATUS.OK);
});

export const approveDemoRequest = asyncHandler(async (req, res) => {
  const demoRequest = await subscriptionService.approveDemoRequest(req.user, req.params.id, req.body);
  return sendSuccess(res, 'Demo request approved & granted.', { demoRequest }, HTTP_STATUS.OK);
});

export const rejectDemoRequest = asyncHandler(async (req, res) => {
  const demoRequest = await subscriptionService.rejectDemoRequest(req.user, req.params.id, req.body);
  return sendSuccess(res, 'Demo request rejected.', { demoRequest }, HTTP_STATUS.OK);
});
