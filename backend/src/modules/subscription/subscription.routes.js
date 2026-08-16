import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getPlans,
  getUserSubscription,
  validateCoupon,
  createRazorpayOrder,
  verifyPayment,
  subscribeUser,
  adminActivateSubscription,
  createCoupon,
  getAllCoupons,
  requestFreeDemo,
  getDemoRequests,
  approveDemoRequest,
  rejectDemoRequest,
} from './subscription.controller.js';

const router = Router();

router.use(protect);

router.get('/plans', getPlans);
router.get('/my-subscription', getUserSubscription);
router.post('/validate-coupon', validateCoupon);
router.post('/create-razorpay-order', createRazorpayOrder);
router.post('/verify-payment', verifyPayment);
router.post('/subscribe', subscribeUser);
router.post('/demo-request', requestFreeDemo);

// Admin endpoints
router.post('/admin/activate', adminActivateSubscription);
router.post('/admin/coupons', createCoupon);
router.get('/admin/coupons', getAllCoupons);
router.get('/admin/demo-requests', getDemoRequests);
router.post('/admin/demo-requests/:id/approve', approveDemoRequest);
router.post('/admin/demo-requests/:id/reject', rejectDemoRequest);

export default router;
