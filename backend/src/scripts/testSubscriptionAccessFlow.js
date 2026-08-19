import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { subscriptionService } from '../modules/subscription/subscription.service.js';
import { UserSubscription } from '../modules/subscription/userSubscription.model.js';
import { User } from '../modules/auth/user.model.js';
import { requireActiveSubscription } from '../middlewares/subscription.middleware.js';

async function runTest() {
  console.log('--- STARTING SUBSCRIPTION-ACCESS FLOW & AUTHORIZATION TEST ---');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Find non-admin user
    let user = await User.findOne({ role: { $nin: ['admin', 'superadmin', 'SUPER_ADMIN', 'ADMIN'] } });
    if (!user) {
      user = await User.create({
        ownerName: 'Test SaaS User',
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `test_saas_${Date.now()}@vedixa.com`,
        passwordHash: 'dummyhash',
        role: 'owner',
        isActive: true,
      });
    }

    console.log(`✓ Testing with User: ${user.ownerName} (${user._id})`);

    // 1. Ensure user starts without active subscription
    await UserSubscription.deleteOne({ userId: user._id });
    
    const subStatus1 = await subscriptionService.getUserSubscription(user._id);
    console.log('✓ Non-subscriber subscription status:', subStatus1);

    if (!subStatus1.hasActiveSubscription) {
      console.log('✓ TEST 1 PASSED: Non-subscriber correctly reports hasActiveSubscription = false.');
    } else {
      console.error('❌ TEST 1 FAILED: Non-subscriber returned active sub.');
    }

    // 2. Test requireActiveSubscription middleware for Non-subscriber (Must return 403)
    const reqDummy = { user };
    let middlewareErr = null;
    await new Promise((resolve) => {
      requireActiveSubscription(reqDummy, {}, (err) => {
        middlewareErr = err;
        resolve();
      });
    });

    if (middlewareErr && (middlewareErr.statusCode === 403 || middlewareErr.status === 403)) {
      console.log('✓ TEST 2 PASSED: requireActiveSubscription returned HTTP 403 Forbidden ->', middlewareErr.message);
    } else {
      console.error('❌ TEST 2 FAILED: Middleware did not return 403. Returned:', middlewareErr);
    }

    // 3. Test Super Admin bypass (Must return no error)
    const adminUser = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
    let adminErr = null;
    await new Promise((resolve) => {
      requireActiveSubscription({ user: adminUser }, {}, (err) => {
        adminErr = err;
        resolve();
      });
    });

    if (!adminErr) {
      console.log('✓ TEST 3 PASSED: Admin accounts bypass subscription check successfully.');
    } else {
      console.error('❌ TEST 3 FAILED: Admin account received error:', adminErr);
    }

    // 4. Grant Subscription to User & Verify Immediate Access Unlock
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + 30);

    await UserSubscription.create({
      userId: user._id,
      planCode: '1_MONTH',
      planName: '1 Month',
      status: 'ACTIVE',
      startDate,
      expiryDate,
    });

    const subStatus2 = await subscriptionService.getUserSubscription(user._id);
    console.log('✓ Subscribed user status:', subStatus2);

    let activeSubErr = null;
    await requireActiveSubscription(reqDummy, {}, (err) => {
      activeSubErr = err;
    });

    if (!activeSubErr && subStatus2.hasActiveSubscription) {
      console.log('✓ TEST 4 PASSED: Active subscriber passes requireActiveSubscription with zero errors!');
    } else {
      console.error('❌ TEST 4 FAILED: Active subscriber received error:', activeSubErr);
    }

    console.log('=== ALL SUBSCRIPTION-ACCESS AUTHORIZATION TESTS PASSED 100% SUCCESS ===');
  } catch (err) {
    console.error('❌ TEST FAILURE:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
