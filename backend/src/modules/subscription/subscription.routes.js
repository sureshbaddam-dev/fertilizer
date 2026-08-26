import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getPlans,
  getUserSubscription,
  validateCoupon,
  createRazorpayOrder,
  verifyPayment,
  handleRazorpayWebhook,
  adminActivateSubscription,
  createCoupon,
  getAllCoupons,
  requestFreeDemo,
  getDemoRequests,
  approveDemoRequest,
  rejectDemoRequest,
} from './subscription.controller.js';

const router = Router();

// Public Webhook Handler (Verified via HMAC SHA-256 Signature Header)
router.post('/webhook', handleRazorpayWebhook);

// Protected Endpoints for Authenticated Users
router.use(protect);

router.get('/plans', getPlans);
router.get('/my-subscription', getUserSubscription);
router.post('/validate-coupon', validateCoupon);
router.post('/create-razorpay-order', createRazorpayOrder);
router.post('/verify-payment', verifyPayment);
router.post('/demo-request', requestFreeDemo);

// Admin Control Endpoints
router.post('/admin/activate', adminActivateSubscription);
router.post('/admin/coupons', createCoupon);
router.get('/admin/coupons', getAllCoupons);
router.get('/admin/demo-requests', getDemoRequests);
router.post('/admin/demo-requests/:id/approve', approveDemoRequest);
router.post('/admin/demo-requests/:id/reject', rejectDemoRequest);

export default router;
