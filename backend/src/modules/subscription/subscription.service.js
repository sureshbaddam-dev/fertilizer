import { SubscriptionPlan } from './subscriptionPlan.model.js';
import { UserSubscription } from './userSubscription.model.js';
import { Coupon } from './coupon.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { razorpayService } from './razorpay.service.js';

export const subscriptionService = {
  async seedInitialPlans() {
    const plansData = [
      {
        code: 'STARTER',
        name: 'STARTER',
        price: 199,
        originalPrice: 299,
        billingPeriod: 'MONTHLY',
        isPopular: false,
        discountTokens: 5,
        isActive: true,
        features: [
          'Dashboard',
          'Product Management',
          'Basic Inventory',
          'Customer Management',
          'General Customers',
          'Basic Billing & Invoices',
          'GST / Tax support',
          'Supplier Management',
          'Basic Supplier Ledger',
          'Purchase Management',
          'Basic Reports',
          'Basic Support',
        ],
      },
      {
        code: 'PROFESSIONAL',
        name: 'PROFESSIONAL',
        price: 399,
        originalPrice: 499,
        billingPeriod: 'MONTHLY',
        isPopular: true,
        discountTokens: 15,
        isActive: true,
        features: [
          'Everything in Starter +',
          'Advanced Inventory',
          'FIFO / Batch-wise Stock Management',
          'Multi-batch Billing',
          'Batch-wise Selling Prices',
          'Supplier Ledger & Payments',
          'Customer Ledger',
          'Purchase Management',
          'Advanced Reports',
          'Stock Alerts',
          'Dashboard Analytics',
          'Invoice Printing / PDF',
          'WhatsApp invoice sharing',
          'Priority Support',
        ],
      },
      {
        code: 'PREMIUM',
        name: 'PREMIUM',
        price: 699,
        originalPrice: 899,
        billingPeriod: 'MONTHLY',
        isPopular: false,
        discountTokens: 30,
        isActive: true,
        features: [
          'Everything in Professional +',
          'Complete VEDIXA ERP',
          'Advanced Reports & Analytics',
          'Advanced Inventory Controls',
          'Complete Supplier & Customer Financial Tracking',
          'Advanced Billing',
          'Batch / Pricing Management',
          'Business Insights',
          'Priority Customer Support',
          'Discount / Offer benefits',
          'Higher limits',
          'Premium support',
          'Future premium SaaS features',
        ],
      },
    ];

    for (const p of plansData) {
      await SubscriptionPlan.findOneAndUpdate(
        { code: p.code },
        { $set: p },
        { upsert: true, new: true }
      );
    }
  },

  async getAllPlans() {
    await this.seedInitialPlans();
    return await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
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
   * Create Razorpay Order in Test Mode for subscription
   */
  async createRazorpayOrder(userId, { planCode, couponCode }) {
    await this.seedInitialPlans();
    const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase(), isActive: true });
    if (!plan) {
      throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
    }

    const { finalAmount, discountAmount, coupon } = await this.validateCoupon(couponCode, plan.price);

    const orderData = await razorpayService.createOrder({
      amountInRupees: finalAmount,
      receipt: `sub_${userId.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planCode: plan.code,
        couponCode: coupon ? coupon.code : '',
      },
    });

    return {
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: orderData.keyId,
      planCode: plan.code,
      planName: plan.name,
      originalPrice: plan.price,
      discountAmount,
      finalAmount,
      couponCode: coupon ? coupon.code : null,
    };
  },

  /**
   * Verify Razorpay Payment Signature & Activate Subscription (Idempotent / Duplicate Protected)
   */
  async verifyAndActivateSubscription(
    userId,
    { razorpayOrderId, razorpayPaymentId, razorpaySignature, planCode, couponCode }
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Missing Razorpay payment parameters', HTTP_STATUS.BAD_REQUEST);
    }

    // PART 8: Duplicate Payment Protection Check
    const existingPaymentSub = await UserSubscription.findOne({
      $or: [{ razorpayPaymentId }, { razorpayOrderId }],
      paymentStatus: 'SUCCESS',
    });

    if (existingPaymentSub) {
      // Idempotent return without duplicate activation or date modification
      return existingPaymentSub;
    }

    // Verify HMAC-SHA256 Signature
    const isValidSignature = razorpayService.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      throw new AppError('Razorpay payment signature verification failed', HTTP_STATUS.BAD_REQUEST);
    }

    await this.seedInitialPlans();
    const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase(), isActive: true });
    if (!plan) {
      throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
    }

    const { finalAmount, coupon } = await this.validateCoupon(couponCode, plan.price);

    const durationDays = plan.billingPeriod === 'YEARLY' ? 365 : 30;
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + durationDays);

    let sub = await UserSubscription.findOne({ userId });
    if (sub) {
      sub.planId = plan._id;
      sub.planCode = plan.code;
      sub.planName = plan.name;
      sub.status = 'ACTIVE';
      sub.startDate = startDate;
      sub.expiryDate = expiryDate;
      sub.discountTokensTotal = plan.discountTokens;
      sub.discountTokensRemaining = plan.discountTokens;
      sub.couponCode = coupon ? coupon.code : null;
      sub.amountPaid = finalAmount;
      sub.paymentStatus = 'SUCCESS';
      sub.razorpayOrderId = razorpayOrderId;
      sub.razorpayPaymentId = razorpayPaymentId;
      sub.razorpaySignature = razorpaySignature;
      sub.activatedByAdmin = false;
      sub.activationType = 'ONLINE_PAYMENT';
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId,
        planId: plan._id,
        planCode: plan.code,
        planName: plan.name,
        status: 'ACTIVE',
        startDate,
        expiryDate,
        discountTokensTotal: plan.discountTokens,
        discountTokensRemaining: plan.discountTokens,
        couponCode: coupon ? coupon.code : null,
        amountPaid: finalAmount,
        paymentStatus: 'SUCCESS',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        activatedByAdmin: false,
        activationType: 'ONLINE_PAYMENT',
      });
    }

    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }

    return sub;
  },

  async subscribeUser(userId, { planCode, couponCode }) {
    await this.seedInitialPlans();
    const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase(), isActive: true });
    if (!plan) {
      throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
    }

    const { finalAmount, coupon } = await this.validateCoupon(couponCode, plan.price);

    const durationDays = plan.billingPeriod === 'YEARLY' ? 365 : 30;
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + durationDays);

    let sub = await UserSubscription.findOne({ userId });
    if (sub) {
      sub.planId = plan._id;
      sub.planCode = plan.code;
      sub.planName = plan.name;
      sub.status = 'ACTIVE';
      sub.startDate = startDate;
      sub.expiryDate = expiryDate;
      sub.discountTokensTotal = plan.discountTokens;
      sub.discountTokensRemaining = plan.discountTokens;
      sub.couponCode = coupon ? coupon.code : null;
      sub.amountPaid = finalAmount;
      sub.paymentStatus = 'SUCCESS';
      sub.activatedByAdmin = false;
      sub.activationType = 'ONLINE_PAYMENT';
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId,
        planId: plan._id,
        planCode: plan.code,
        planName: plan.name,
        status: 'ACTIVE',
        startDate,
        expiryDate,
        discountTokensTotal: plan.discountTokens,
        discountTokensRemaining: plan.discountTokens,
        couponCode: coupon ? coupon.code : null,
        amountPaid: finalAmount,
        paymentStatus: 'SUCCESS',
        activatedByAdmin: false,
        activationType: 'ONLINE_PAYMENT',
      });
    }

    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }

    return sub;
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
};
