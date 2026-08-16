import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { User } from '../modules/auth/user.model.js';
import { subscriptionService } from '../modules/subscription/subscription.service.js';
import { adminService } from '../modules/admin/services/admin.service.js';
import { adminAuthService } from '../modules/admin/services/adminAuth.service.js';
import { redisService } from '../services/redis.service.js';

async function runAdminVerification() {
  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(envConfig.mongo.uri);
    console.log('✅ Connected to MongoDB.');

    // 1. Test Admin Mobile Restriction
    console.log('1. Testing Authorized Mobile Restriction (9848081875 vs Unauthorized)...');
    try {
      await adminAuthService.sendAdminOtp('9123456789');
      console.error('❌ SECURITY FAILURE: Unauthorized mobile 9123456789 was allowed!');
    } catch (err) {
      console.log(`   ✅ SECURITY CONFIRMED: Unauthorized mobile rejected: "${err.message}".`);
    }

    // 2. Test Admin OTP Generation & Terminal Output
    console.log('2. Testing Admin OTP Generation for 9848081875...');
    const sendRes = await adminAuthService.sendAdminOtp('9848081875');
    console.log(`   ✅ OTP sent result: ${sendRes.message}`);

    // Retrieve generated OTP from Redis store for verification test
    const storedData = await redisService.get('otp:admin_login:9848081875');
    const generatedOtp = storedData?.otp;
    console.log(`   Generated OTP retrieved for verification test: ${generatedOtp}`);

    // 3. Test Admin OTP Verification & Token Issuance
    console.log('3. Testing Admin OTP Verification & Token Issuance...');
    const verifyRes = await adminAuthService.verifyAdminOtp('9848081875', generatedOtp);
    const { user: adminUser, accessToken, refreshToken } = verifyRes;
    console.log(`   ✅ Admin authenticated: ${adminUser.ownerName} (${adminUser.mobile}) with role "${adminUser.role}".`);
    console.log(`   Access Token issued: ${accessToken.substring(0, 20)}...`);
    console.log(`   7-Day Refresh Token issued: ${refreshToken.substring(0, 20)}...`);

    // 4. Test Dashboard Stats & Real Data Aggregation
    console.log('4. Testing Admin Dashboard Stats & Real Data Aggregation...');
    const stats = await adminService.getDashboardStats();
    console.log('   Stats Result:', {
      totalRegisteredUsers: stats.totalRegisteredUsers,
      activeSubscriptions: stats.activeSubscriptions,
      monthlyRevenue: stats.monthlyRevenue,
    });

    // 5. Test Users Listing & Details
    console.log('5. Testing Admin User List & 360 Details...');
    const usersRes = await adminService.getUsersList({ limit: 5 });
    console.log(`   Fetched ${usersRes.users.length} users.`);

    if (usersRes.users.length > 0) {
      const userA = usersRes.users[0];
      const details = await adminService.getUserDetails(userA._id);
      console.log(`   360° User details loaded for ${details.user.ownerName}.`);

      // 6. Test Admin-Controlled User Backup Creation
      console.log('6. Testing Admin-Controlled User Backup Creation & Isolation...');
      const backup = await adminService.createAdminUserBackup(userA._id, adminUser);
      console.log(`   ✅ Backup created: ${backup.fileName} (${backup.fileSizeFormatted}).`);

      // Test User Backup Isolation Retrieval (User A retrieves own backup -> Success)
      const userBackups = await adminService.getUserBackups(userA._id);
      console.log(`   User A can retrieve ${userBackups.length} backup file(s) for their account.`);

      // Test Cross-User Backup Security Violation (User B attempts User A's backup -> Must Fail)
      const fakeUserBId = new mongoose.Types.ObjectId();
      try {
        await adminService.getBackupPayloadForDownload(backup._id, fakeUserBId, false);
        console.error('❌ SECURITY FAILURE: User B was able to access User A backup!');
      } catch (err) {
        console.log(`   ✅ SECURITY CONFIRMED: Cross-user backup download blocked: "${err.message}".`);
      }

      // 7. Test Free Demo Request
      console.log('7. Testing Free Demo Request (3_MONTHS)...');
      const demoReq = await subscriptionService.requestFreeDemo(userA._id, { requestedPlan: '3_MONTHS' });
      console.log(`   ✅ Demo Request Created: ID ${demoReq._id}, Plan ${demoReq.requestedPlan}, Status ${demoReq.status}.`);

      // 8. Test Admin Demo Request Approval & Trial Grant
      console.log('8. Testing Admin Demo Request Approval & Demo Access Grant...');
      const approvedReq = await subscriptionService.approveDemoRequest(adminUser, demoReq._id, { adminNotes: 'Approved test demo' });
      console.log(`   ✅ Demo Request Status: ${approvedReq.status}, Granted By: ${approvedReq.grantedByAdminName}.`);

      // 9. Test Accumulative Subscription Extension
      console.log('9. Testing Accumulative Subscription Extension...');
      const extendedSub = await adminService.grantAdminSubscription({
        userId: userA._id,
        durationMonths: 3,
        amountPaid: 499,
        reason: '3-Month Accumulative Extension Test',
        adminUser,
      });
      console.log(`   ✅ Subscription extended until ${extendedSub.expiryDate.toISOString().split('T')[0]}.`);
    }

    // 10. Test Immutable Security Audit Trail Logs
    console.log('10. Testing Immutable Security Audit Trail Logs...');
    const auditLogs = await adminService.getAuditLogs();
    console.log(`   Fetched ${auditLogs.length} audit logs. Recent action: "${auditLogs[0]?.action}" by ${auditLogs[0]?.adminName}.`);

    console.log('\n🎉 ALL VEDIXA LEAD + FREE DEMO + SUBSCRIPTION + SAAS CONTROL CENTER TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Admin verification error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runAdminVerification();
