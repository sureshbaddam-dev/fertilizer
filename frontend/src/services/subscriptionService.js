import { apiClient } from './apiClient';

export const subscriptionService = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  getMySubscription: () => apiClient.get('/subscriptions/my-subscription'),
  validateCoupon: (code, price) => apiClient.post('/subscriptions/validate-coupon', { code, price }),
  createRazorpayOrder: (planCode, couponCode) =>
    apiClient.post('/subscriptions/create-razorpay-order', { planCode, couponCode }),
  verifyPayment: (payload) => apiClient.post('/subscriptions/verify-payment', payload),
  adminActivate: (data) => apiClient.post('/subscriptions/admin/activate', data),
  createCoupon: (data) => apiClient.post('/subscriptions/admin/coupons', data),
  getCoupons: () => apiClient.get('/subscriptions/admin/coupons'),
  requestFreeDemo: (requestedPlan) => apiClient.post('/subscriptions/demo-request', { requestedPlan }),
};
