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
} from './subscription.controller.js';

const router = Router();

router.use(protect);

router.get('/plans', getPlans);
router.get('/my-subscription', getUserSubscription);
router.post('/validate-coupon', validateCoupon);
router.post('/create-razorpay-order', createRazorpayOrder);
router.post('/verify-payment', verifyPayment);
router.post('/subscribe', subscribeUser);

// Admin endpoints
router.post('/admin/activate', adminActivateSubscription);
router.post('/admin/coupons', createCoupon);
router.get('/admin/coupons', getAllCoupons);

export default router;
