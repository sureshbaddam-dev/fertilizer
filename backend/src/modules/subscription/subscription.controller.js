import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { subscriptionService } from './subscription.service.js';

export const getPlans = asyncHandler(async (_req, res) => {
  const plans = await subscriptionService.getAllPlans();
  return sendSuccess(res, 'Subscription plans retrieved.', { plans }, HTTP_STATUS.OK);
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

export const subscribeUser = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.subscribeUser(req.user._id, req.body);
  return sendSuccess(res, 'Subscription activated successfully.', { subscription }, HTTP_STATUS.OK);
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
