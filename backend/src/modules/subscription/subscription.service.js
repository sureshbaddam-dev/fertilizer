import { SubscriptionPlan } from './subscriptionPlan.model.js';
import { UserSubscription } from './userSubscription.model.js';
import { Coupon } from './coupon.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { razorpayService } from './razorpay.service.js';
import { SubscriptionSettings } from '../admin/models/subscriptionSettings.model.js';
import { SystemSetting } from '../admin/models/systemSetting.model.js';
import { getOrCreateSubscriptionSettings } from '../admin/services/admin.service.js';

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
   * Create Razorpay Order in Test Mode for subscription
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
   * Verify Razorpay Payment Signature & Activate Subscription
   */
  async verifyAndActivateSubscription(
    userId,
    { razorpayOrderId, razorpayPaymentId, razorpaySignature, planCode, couponCode }
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Missing Razorpay payment parameters', HTTP_STATUS.BAD_REQUEST);
    }

    const existingPaymentSub = await UserSubscription.findOne({
      $or: [{ razorpayPaymentId }, { razorpayOrderId }],
      paymentStatus: 'SUCCESS',
    });

    if (existingPaymentSub) {
      return existingPaymentSub;
    }

    const isValidSignature = razorpayService.verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      throw new AppError('Razorpay payment signature verification failed', HTTP_STATUS.BAD_REQUEST);
    }

    const config = await this.getSubscriptionConfig();
    let plan = config.plans.find((p) => p.code.toUpperCase() === String(planCode || '').toUpperCase());
    if (!plan && config.plans.length > 0) {
      plan = config.plans[0];
    }

    if (!plan) {
      throw new AppError('Subscription plan not found or disabled.', HTTP_STATUS.BAD_REQUEST);
    }

    const monthsToGrant = plan.months || (plan.code === '3_MONTHS' ? 3 : plan.code === '6_MONTHS' ? 6 : 1);
    const { finalAmount, coupon } = await this.validateCoupon(couponCode, plan.price);

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + monthsToGrant);

    let sub = await UserSubscription.findOne({ userId });
    if (sub) {
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

    // Prevent duplicate PENDING request for same user
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



    // Trigger Admin Unread Bell Notification
    try {
      await SupportNotification.create({
        ticketId: `DEMO-${demoReq._id.toString().slice(-6)}`,
        userId: user._id,
        userName: user.ownerName,
        userMobile: user.mobile,
        subject: `New Free Demo Request (${normPlan.replace('_', ' ')})`,
        isReadByAdmin: false,
      });
    } catch (_notifErr) {
      // Ignore non-fatal notification errors
    }

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

    // Determine trial duration (e.g. 7 days)
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
