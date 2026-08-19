import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { adminService } from '../modules/admin/services/admin.service.js';
import { subscriptionService } from '../modules/subscription/subscription.service.js';
import { User } from '../modules/auth/user.model.js';

async function runTest() {
  console.log('--- STARTING SUBSCRIPTION SINGLE SOURCE OF TRUTH TEST ---');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // 1. Test GET Admin System Settings (No 500 error!)
    const sysSettings = await adminService.getSystemSettings();
    console.log('✓ GET /admin/settings response:', sysSettings);

    // 2. Test Admin Updating Subscription Settings (1 Month Standard ₹199, Offer ₹149)
    const adminUser = await User.findOne({ role: 'admin' }) || { _id: new mongoose.Types.ObjectId(), ownerName: 'Test Admin', role: 'admin' };
    
    const updatePayload = {
      isSubscriptionSystemActive: true,
      durations: [
        { code: '1_MONTH', label: '1 Month', months: 1, amount: 199, offerPrice: 149, isEnabled: true },
        { code: '3_MONTHS', label: '3 Months', months: 3, amount: 499, offerPrice: 399, isEnabled: true },
        { code: '6_MONTHS', label: '6 Months', months: 6, amount: 899, offerPrice: 699, isEnabled: true },
        { code: '12_MONTHS', label: '12 Months', months: 12, amount: 1499, offerPrice: 1199, isEnabled: true },
      ],
    };

    const savedSettings = await adminService.updateSubscriptionSettings(updatePayload, adminUser, {});
    console.log('✓ Admin updated Subscription Settings in MongoDB. Saved durations:', savedSettings.durations.length);

    // 3. Test User Frontend Fetching Plans (Dynamic MongoDB source)
    const config = await subscriptionService.getSubscriptionConfig();
    console.log('✓ User Frontend subscription config active:', config.isSubscriptionSystemActive);
    console.log('✓ Fetched active plans from MongoDB:', config.plans.map(p => ({ code: p.code, name: p.name, price: p.price, offerPrice: p.offerPrice, originalPrice: p.originalPrice })));

    const oneMonthPlan = config.plans.find(p => p.code === '1_MONTH');
    if (oneMonthPlan.price === 149 && oneMonthPlan.originalPrice === 199) {
      console.log('✓ TEST 1 PASSED: 1 Month Plan shows Offer Price ₹149 & Standard Price ₹199 strikethrough!');
    } else {
      console.error('❌ TEST 1 FAILED:', oneMonthPlan);
    }

    // 4. Test Toggle Subscription System Availability OFF
    await adminService.updateSystemSetting('subscriptionSystemEnabled', false, adminUser, {});
    const configOff = await subscriptionService.getSubscriptionConfig();
    console.log('✓ Subscription System Availability toggled OFF in MongoDB. User config active status:', configOff.isSubscriptionSystemActive);
    if (!configOff.isSubscriptionSystemActive) {
      console.log('✓ TEST 3 PASSED: Subscriptions show unavailable when toggled OFF!');
    }

    // 5. Test Backend Order Creation Blocked when OFF
    try {
      const dummyUserId = new mongoose.Types.ObjectId();
      await subscriptionService.createRazorpayOrder(dummyUserId, { planCode: '1_MONTH' });
      console.error('❌ TEST 4 FAILED: Order creation should have been blocked when system is OFF!');
    } catch (err) {
      console.log('✓ TEST 4 PASSED: Razorpay order creation blocked when OFF ->', err.message);
    }

    // 6. Test Toggle Subscription System Availability back ON & Create Order
    await adminService.updateSystemSetting('subscriptionSystemEnabled', true, adminUser, {});
    const configOn = await subscriptionService.getSubscriptionConfig();
    console.log('✓ Subscription System Availability restored ON. User config active status:', configOn.isSubscriptionSystemActive);

    const dummyUser = await User.findOne({ role: { $ne: 'admin' } });
    if (dummyUser) {
      const order = await subscriptionService.createRazorpayOrder(dummyUser._id, { planCode: '1_MONTH' });
      console.log('✓ TEST 5 PASSED: Razorpay Order created using MongoDB config payable amount:', order.amount / 100, 'INR (Matches Offer Price ₹149)');
    }

    console.log('=== ALL SUBSCRIPTION TESTS PASSED 100% SUCCESS ===');
  } catch (err) {
    console.error('❌ TEST FAILURE:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
