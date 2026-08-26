import { SubscriptionPlan } from './subscriptionPlan.model.js';
import { UserSubscription } from './userSubscription.model.js';
import { PaymentOrder } from './paymentOrder.model.js';
import { Coupon } from './coupon.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { razorpayService } from './razorpay.service.js';
import { SubscriptionSettings } from '../admin/models/subscriptionSettings.model.js';
import { SystemSetting } from '../admin/models/systemSetting.model.js';
import { getOrCreateSubscriptionSettings } from '../admin/services/admin.service.js';
import { SubscriptionHistory } from '../admin/models/subscriptionHistory.model.js';
import { logger } from '../../config/logger.config.js';

export const subscriptionService = {
  async seedInitialPlans() {
    const subSettings = await getOrCreateSubscriptionSettings();
    return subSettings;
  },

  async getSubscriptionConfig() {
    const subSettings = await getOrCreateSubscriptionSettings();
    const systemSettings = await SystemSetting.find().lean();
    
    let isSubscriptionSystemActive = true;
    const sysSetting = systemSettings.find((s) => s.key === 'subscriptionSystemEnabled');
    if (sysSetting && typeof sysSetting.value === 'boolean') {
      isSubscriptionSystemActive = sysSetting.value;
    }
    if (typeof subSettings.isSubscriptionSystemActive === 'boolean') {
      isSubscriptionSystemActive = isSubscriptionSystemActive && subSettings.isSubscriptionSystemActive;
    }

    const defaultFeatures = [
      'Complete VEDIXA Fertilizer ERP',
      'FIFO & Batch-wise Inventory Tracking',
      'Barcode Scanning & Custom Thermal/A4 Printing',
      'GST Billing & Tax Calculation',
      'WhatsApp Invoice Sharing',
      'Customer & Supplier Financial Ledgers',
      'Real-Time Dashboard Analytics',
      'Priority Customer Support',
    ];

    const activePlans = (subSettings.durations || [])
      .filter((d) => d.isEnabled !== false)
      .map((d) => {
        const hasOffer = d.offerPrice && Number(d.offerPrice) > 0 && Number(d.offerPrice) < Number(d.amount);
        const effectivePrice = hasOffer ? Number(d.offerPrice) : Number(d.amount);
        const originalPrice = hasOffer ? Number(d.amount) : null;

        return {
          code: d.code,
          name: d.label,
          billingPeriod: `${d.months} Month${d.months > 1 ? 's' : ''}`,
          months: d.months,
          amount: Number(d.amount),
          offerPrice: d.offerPrice ? Number(d.offerPrice) : null,
          price: effectivePrice,
          originalPrice: originalPrice,
          isPopular: d.months === 3 || d.code === '3_MONTHS',
          discountTokens: d.months * 5,
          isActive: true,
          features: defaultFeatures,
        };
      });

    return {
      isSubscriptionSystemActive,
      plans: activePlans,
      rawSettings: subSettings,
    };
  },

  async getAllPlans() {
    const config = await this.getSubscriptionConfig();
    return config.plans;
  },

  async getUserSubscription(userId) {
    let sub = await UserSubscription.findOne({ userId }).populate('planId');
    if (!sub) {
      return {
        hasActiveSubscription: false,
        subscription: null,
      };
    }

    const isExpired = sub.expiryDate && new Date(sub.expiryDate) < new Date();
    if (isExpired && sub.status === 'ACTIVE') {
      sub.status = 'EXPIRED';
      await sub.save();
    }

    return {
      hasActiveSubscription: sub.status === 'ACTIVE',
      subscription: sub,
    };
  },

  async validateCoupon(couponCode, planPrice) {
    if (!couponCode) return { finalAmount: planPrice, discountAmount: 0, coupon: null };

    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
    if (!coupon) {
      throw new AppError('Invalid or expired coupon code', HTTP_STATUS.BAD_REQUEST);
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      throw new AppError('Coupon code has expired', HTTP_STATUS.BAD_REQUEST);
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new AppError('Coupon code limit reached', HTTP_STATUS.BAD_REQUEST);
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((planPrice * coupon.discountValue) / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = Math.max(0, planPrice - discountAmount);
    return { finalAmount, discountAmount, coupon };
  },

  /**
   * Create Razorpay Order & Save PaymentOrder in Database (Server Source of Truth)
   */
  async createRazorpayOrder(userId, { planCode, couponCode }) {
    const config = await this.getSubscriptionConfig();
    if (!config.isSubscriptionSystemActive) {
      throw new AppError('Subscriptions are temporarily unavailable.', HTTP_STATUS.BAD_REQUEST);
    }

    let plan = config.plans.find((p) => p.code.toUpperCase() === String(planCode || '').toUpperCase());
    if (!plan && config.plans.length > 0) {
      if (planCode?.toUpperCase() === 'STARTER') plan = config.plans[0];
      else if (planCode?.toUpperCase() === 'PROFESSIONAL') plan = config.plans[1] || config.plans[0];
      else if (planCode?.toUpperCase() === 'PREMIUM') plan = config.plans[config.plans.length - 1];
      else plan = config.plans[0];
    }

    if (!plan) {
      throw new AppError('Subscription plan not found or disabled.', HTTP_STATUS.NOT_FOUND);
    }

    const basePrice = plan.price;
    const { finalAmount, discountAmount, coupon } = await this.validateCoupon(couponCode, basePrice);

    const orderData = await razorpayService.createOrder({
      amountInRupees: finalAmount,
      receipt: `sub_${userId.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planCode: plan.code,
        couponCode: coupon ? coupon.code : '',
      },
    });

    // Persist PaymentOrder in Database as Server Source of Truth
    await PaymentOrder.create({
      userId,
      razorpayOrderId: orderData.orderId,
      planCode: plan.code,
      planName: plan.name,
      months: plan.months || 1,
      amount: finalAmount,
      currency: orderData.currency || 'INR',
      couponCode: coupon ? coupon.code : null,
      status: 'CREATED',
    });

    return {
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: orderData.keyId,
      planCode: plan.code,
      planName: plan.name,
      originalPrice: plan.originalPrice || plan.amount,
      offerPrice: plan.offerPrice,
      price: plan.price,
      discountAmount,
      finalAmount,
      couponCode: coupon ? coupon.code : null,
    };
  },

  /**
   * Internal Core Idempotent Payment Fulfillment Helper
   */
  async fulfillSubscriptionPayment({ razorpayOrderId, razorpayPaymentId = null, razorpaySignature = null, source = 'ONLINE_PAYMENT' }) {
    if (!razorpayOrderId) {
      throw new AppError('Razorpay order ID is required for payment fulfillment.', HTTP_STATUS.BAD_REQUEST);
    }

    const order = await PaymentOrder.findOne({ razorpayOrderId });
    if (!order) {
      logger.error(`❌ Payment Fulfillment Error: No PaymentOrder found for Order ID: ${razorpayOrderId}`);
      throw new AppError('Payment order record not found.', HTTP_STATUS.NOT_FOUND);
    }

    // Idempotency Check 1: If Order is ALREADY PAID, return existing active user subscription
    if (order.status === 'PAID') {
      logger.info(`ℹ️ Payment Fulfillment: Order ${razorpayOrderId} is already marked PAID. Returning subscription.`);
      const existingSub = await UserSubscription.findOne({ userId: order.userId });
      return existingSub;
    }

    // Idempotency Check 2: If paymentId provided and already used on another user subscription
    if (razorpayPaymentId) {
      const existingPaymentSub = await UserSubscription.findOne({
        razorpayPaymentId,
        paymentStatus: 'SUCCESS',
      });
      if (existingPaymentSub) {
        logger.info(`ℹ️ Payment Fulfillment: Payment ID ${razorpayPaymentId} already processed. Returning existing subscription.`);
        return existingPaymentSub;
      }
    }

    // Atomic State Transition CREATED -> PAID
    const updatedOrder = await PaymentOrder.findOneAndUpdate(
      { _id: order._id, status: { $ne: 'PAID' } },
      {
        $set: {
          status: 'PAID',
          razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
          razorpaySignature: razorpaySignature || order.razorpaySignature,
          paidAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      // Concurrently updated by another request (e.g. webhook vs verify-payment race condition)
      const existingSub = await UserSubscription.findOne({ userId: order.userId });
      return existingSub;
    }

    // Renewal Expiry Date Calculation (Preserve remaining active days)
    const now = new Date();
    let sub = await UserSubscription.findOne({ userId: updatedOrder.userId });
    const isCurrentActive = sub && sub.status === 'ACTIVE' && sub.expiryDate && new Date(sub.expiryDate) > now;
    const baseDate = isCurrentActive ? new Date(sub.expiryDate) : now;

    // Safe Month Addition (Handles Jan 31 + 1 month -> Feb 28/29)
    const monthsToAdd = updatedOrder.months || 1;
    const expectedMonth = (baseDate.getMonth() + monthsToAdd) % 12;
    const targetExpiryDate = new Date(baseDate.getTime());
    targetExpiryDate.setMonth(targetExpiryDate.getMonth() + monthsToAdd);
    if (targetExpiryDate.getMonth() !== expectedMonth) {
      targetExpiryDate.setDate(0); // Adjust for month overflow
    }

    const startDate = isCurrentActive ? sub.startDate : now;

    if (sub) {
      sub.planCode = updatedOrder.planCode;
      sub.planName = updatedOrder.planName;
      sub.status = 'ACTIVE';
      sub.startDate = startDate;
      sub.expiryDate = targetExpiryDate;
      sub.discountTokensTotal = (updatedOrder.months || 1) * 5;
      sub.discountTokensRemaining = (updatedOrder.months || 1) * 5;
      sub.couponCode = updatedOrder.couponCode;
      sub.amountPaid = updatedOrder.amount;
      sub.paymentStatus = 'SUCCESS';
      sub.razorpayOrderId = updatedOrder.razorpayOrderId;
      sub.razorpayPaymentId = razorpayPaymentId || sub.razorpayPaymentId;
      sub.razorpaySignature = razorpaySignature || sub.razorpaySignature;
      sub.activatedByAdmin = false;
      sub.activationType = source;
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId: updatedOrder.userId,
        planCode: updatedOrder.planCode,
        planName: updatedOrder.planName,
        status: 'ACTIVE',
        startDate,
        expiryDate: targetExpiryDate,
        discountTokensTotal: (updatedOrder.months || 1) * 5,
        discountTokensRemaining: (updatedOrder.months || 1) * 5,
        couponCode: updatedOrder.couponCode,
        amountPaid: updatedOrder.amount,
        paymentStatus: 'SUCCESS',
        razorpayOrderId: updatedOrder.razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId || null,
        razorpaySignature: razorpaySignature || null,
        activatedByAdmin: false,
        activationType: source,
      });
    }

    // Record Online Payment History Record
    try {
      const existingHistory = await SubscriptionHistory.findOne({
        $or: [{ razorpayPaymentId }, { razorpayOrderId: updatedOrder.razorpayOrderId }],
      });

      if (!existingHistory) {
        const user = await User.findById(updatedOrder.userId).lean();
        await SubscriptionHistory.create({
          userId: updatedOrder.userId,
          userName: user?.ownerName || 'User',
          userMobile: user?.mobile || '',
          planCode: updatedOrder.planCode,
          planName: updatedOrder.planName,
          durationLabel: `${updatedOrder.months} Month${updatedOrder.months > 1 ? 's' : ''}`,
          durationMonths: updatedOrder.months,
          durationDays: updatedOrder.months * 30,
          startDate,
          expiryDate: targetExpiryDate,
          amountPaid: updatedOrder.amount,
          source,
          paymentStatus: 'SUCCESS',
          reason: `Online Subscription Purchase (${updatedOrder.planCode})`,
        });
      }
    } catch (histErr) {
      logger.error(`Failed to record SubscriptionHistory entry: ${histErr.message}`);
    }

    // Increment Coupon usedCount if applicable
    if (updatedOrder.couponCode) {
      try {
        await Coupon.updateOne({ code: updatedOrder.couponCode }, { $inc: { usedCount: 1 } });
      } catch (_cErr) {}
    }

    logger.info(`✅ Successfully fulfilled subscription payment for User ${updatedOrder.userId} (Order: ${updatedOrder.razorpayOrderId}, Plan: ${updatedOrder.planCode})`);
    return sub;
  },

  /**
   * Verify Razorpay Payment Signature & Activate Subscription
   */
  async verifyAndActivateSubscription(
    userId,
    { razorpayOrderId, razorpayPaymentId, razorpaySignature }
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Missing required Razorpay payment parameters (orderId, paymentId, signature)', HTTP_STATUS.BAD_REQUEST);
    }

    const isValidSignature = razorpayService.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      logger.error(`❌ Security Violation: Invalid Razorpay HMAC Signature submitted by User ${userId}`);
      throw new AppError('Razorpay payment signature verification failed. Invalid security token.', HTTP_STATUS.BAD_REQUEST);
    }

    return await this.fulfillSubscriptionPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      source: 'ONLINE_PAYMENT',
    });
  },

  /**
   * Mobile Return / Polling Helper: Check Razorpay Order Status Server-Side
   */
  async checkPaymentOrderStatus(userId, razorpayOrderId) {
    if (!razorpayOrderId) {
      throw new AppError('Razorpay order ID is required.', HTTP_STATUS.BAD_REQUEST);
    }

    const order = await PaymentOrder.findOne({ razorpayOrderId, userId });
    if (!order) {
      throw new AppError('Payment order not found for this user.', HTTP_STATUS.NOT_FOUND);
    }

    // 1. If already PAID in DB, return success
    if (order.status === 'PAID') {
      const activeSub = await UserSubscription.findOne({ userId });
      return { isPaid: true, status: 'PAID', subscription: activeSub };
    }

    // 2. Query Razorpay API directly for order status
    try {
      const razorpayOrder = await razorpayService.getOrderDetails(razorpayOrderId);
      if (razorpayOrder && razorpayOrder.status === 'paid') {
        const paymentsRes = await razorpayService.getOrderPayments(razorpayOrderId);
        const capturedPayment = paymentsRes?.items?.find((p) => p.status === 'captured') || paymentsRes?.items?.[0];
        const razorpayPaymentId = capturedPayment?.id || null;

        const activeSub = await this.fulfillSubscriptionPayment({
          razorpayOrderId,
          razorpayPaymentId,
          source: 'ONLINE_PAYMENT',
        });

        return { isPaid: true, status: 'PAID', subscription: activeSub };
      }
    } catch (err) {
      logger.warn(`[checkPaymentOrderStatus] Razorpay API query failed for ${razorpayOrderId}: ${err.message}`);
    }

    return { isPaid: false, status: order.status || 'PENDING' };
  },

  /**
   * Secure Razorpay Webhook Event Processing
   */
  async handleRazorpayWebhook(rawBody, signatureHeader) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      logger.error('❌ Webhook Processing Error: RAZORPAY_WEBHOOK_SECRET / RAZORPAY_KEY_SECRET missing in environment.');
      throw new AppError('Webhook secret unconfigured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    const isValidSignature = razorpayService.verifyWebhookSignature({
      rawBody,
      signature: signatureHeader,
      webhookSecret,
    });

    if (!isValidSignature) {
      logger.error('❌ Security Alert: Invalid Webhook HMAC Signature received.');
      throw new AppError('Invalid webhook signature', HTTP_STATUS.BAD_REQUEST);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch (_e) {
      throw new AppError('Invalid webhook JSON body', HTTP_STATUS.BAD_REQUEST);
    }

    const event = payload.event;
    logger.info(`📩 Received Valid Razorpay Webhook Event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        logger.info(`⚡ Processing Webhook Payment Fulfillment -> Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`);
        await this.fulfillSubscriptionPayment({
          razorpayOrderId,
          razorpayPaymentId,
          source: 'ONLINE_PAYMENT',
        });
      }
    }

    return { processed: true };
  },

  // Admin APIs: Free Manual Activation
  async adminActivateUserSubscription(adminUserId, { targetUserId, planCode, durationDays = 30, customDiscountTokens }) {
    await this.seedInitialPlans();
    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError('Target user not found', HTTP_STATUS.NOT_FOUND);
    }

    const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase() });
    if (!plan) {
      throw new AppError('Plan not found', HTTP_STATUS.NOT_FOUND);
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + Number(durationDays));

    const tokenCount = customDiscountTokens !== undefined ? Number(customDiscountTokens) : plan.discountTokens;

    let sub = await UserSubscription.findOne({ userId: targetUserId });
    if (sub) {
      sub.planId = plan._id;
      sub.planCode = plan.code;
      sub.planName = plan.name;
      sub.status = 'ACTIVE';
      sub.startDate = startDate;
      sub.expiryDate = expiryDate;
      sub.discountTokensTotal = tokenCount;
      sub.discountTokensRemaining = tokenCount;
      sub.amountPaid = 0;
      sub.activatedByAdmin = true;
      sub.activationType = 'ADMIN_MANUAL';
      sub.activatedBy = adminUserId;
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId: targetUserId,
        planId: plan._id,
        planCode: plan.code,
        planName: plan.name,
        status: 'ACTIVE',
        startDate,
        expiryDate,
        discountTokensTotal: tokenCount,
        discountTokensRemaining: tokenCount,
        amountPaid: 0,
        activatedByAdmin: true,
        activationType: 'ADMIN_MANUAL',
        activatedBy: adminUserId,
      });
    }

    return sub;
  },

  async createCoupon({ code, discountType, discountValue, validUntil, maxUses }) {
    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      throw new AppError('Coupon code already exists', HTTP_STATUS.CONFLICT);
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      validUntil: validUntil ? new Date(validUntil) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      isActive: true,
    });

    return coupon;
  },

  async getAllCoupons() {
    return await Coupon.find().sort({ createdAt: -1 });
  },

  // Free Demo Request Flow
  async requestFreeDemo(userId, { requestedPlan = '1_MONTH' }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND);
    }

    const { DemoRequest } = await import('./demoRequest.model.js');
    const { SupportNotification } = await import('../admin/models/supportNotification.model.js');

    const validPlans = ['1_MONTH', '3_MONTHS', '6_MONTHS'];
    const normPlan = validPlans.includes(requestedPlan) ? requestedPlan : '1_MONTH';

    let existingPending = await DemoRequest.findOne({ userId, status: 'PENDING' });
    if (existingPending) {
      return existingPending;
    }

    const demoReq = await DemoRequest.create({
      userId: user._id,
      userName: user.ownerName,
      userMobile: user.mobile,
      requestedPlan: normPlan,
      status: 'PENDING',
    });

    try {
      await SupportNotification.create({
        ticketId: `DEMO-${demoReq._id.toString().slice(-6)}`,
        userId: user._id,
        userName: user.ownerName,
        userMobile: user.mobile,
        subject: `New Free Demo Request (${normPlan.replace('_', ' ')})`,
        isReadByAdmin: false,
      });
    } catch (_notifErr) {}

    return demoReq;
  },

  async getDemoRequests(statusFilter) {
    const { DemoRequest } = await import('./demoRequest.model.js');
    const query = statusFilter ? { status: statusFilter } : {};
    return await DemoRequest.find(query).sort({ createdAt: -1 });
  },

  async approveDemoRequest(adminUser, requestId, { adminNotes = '' }) {
    const { DemoRequest } = await import('./demoRequest.model.js');
    const { adminService } = await import('../admin/services/admin.service.js');

    const demoReq = await DemoRequest.findById(requestId);
    if (!demoReq) {
      throw new AppError('Demo request not found', HTTP_STATUS.NOT_FOUND);
    }

    if (demoReq.status !== 'PENDING') {
      throw new AppError(`Demo request is already ${demoReq.status}`, HTTP_STATUS.BAD_REQUEST);
    }

    const demoDays = 7;
    await adminService.grantCustomDemoSubscription({
      userId: demoReq.userId,
      demoDays,
      reason: `Approved Free Demo Request (${demoReq.requestedPlan})`,
      adminUser,
    });

    demoReq.status = 'APPROVED';
    demoReq.grantedByAdminId = adminUser.id || adminUser._id;
    demoReq.grantedByAdminName = adminUser.ownerName || 'Admin';
    demoReq.grantedAt = new Date();
    demoReq.adminNotes = adminNotes;
    await demoReq.save();

    return demoReq;
  },

  async rejectDemoRequest(adminUser, requestId, { adminNotes = '' }) {
    const { DemoRequest } = await import('./demoRequest.model.js');
    const demoReq = await DemoRequest.findById(requestId);
    if (!demoReq) {
      throw new AppError('Demo request not found', HTTP_STATUS.NOT_FOUND);
    }

    demoReq.status = 'REJECTED';
    demoReq.grantedByAdminId = adminUser.id || adminUser._id;
    demoReq.grantedByAdminName = adminUser.ownerName || 'Admin';
    demoReq.adminNotes = adminNotes;
    await demoReq.save();

    return demoReq;
  },
};
