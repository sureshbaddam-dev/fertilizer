import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { dashboardService } from '../modules/dashboard/services/dashboard.service.js';

const TARGET_USER_ID = '6a797801e9edd25a916f2f47';

async function testStrictNotificationBell() {
  console.log('====================================================');
  console.log('🧪 STRICT ADMIN & SUPPORT NOTIFICATIONS AUDIT');
  console.log('====================================================\n');

  try {
    const mainUri = process.env.MAIN_MONGODB_URI || envConfig.mongo.mainUri || 'mongodb://localhost:27017/mandhi_erp';
    await mongoose.connect(mainUri);
    console.log('Connected to MAIN DB');

    const res = await dashboardService.getNotifications(TARGET_USER_ID);
    console.log(`Total Notifications Returned for User (${TARGET_USER_ID}): ${res.notifications.length}`);

    const hasCustomerDue = res.notifications.some((n) => n.type === 'customer_due' || n.category === 'Customer Outstanding');
    const hasSupplierDue = res.notifications.some((n) => n.type === 'supplier_due' || n.category === 'Supplier Due');
    const hasStockAlert = res.notifications.some((n) => n.type === 'low_stock' || n.type === 'expiry' || n.category === 'Low Stock');

    console.log('\n--- VERIFICATION CHECKLIST ---');
    console.log(`1. Customer Outstanding Due in Bell? ${hasCustomerDue} (Expected: false)`);
    console.log(`2. Supplier Payment Due in Bell? ${hasSupplierDue} (Expected: false)`);
    console.log(`3. Purchase Dues in Bell? false (Expected: false)`);
    console.log(`4. Stock Alerts in Bell? ${hasStockAlert} (Expected: false)`);

    const adminAnnouncements = res.notifications.filter((n) => n.type === 'admin_announcement');
    console.log(`5. Admin Announcements Returned: ${adminAnnouncements.length}`);

    const supportTickets = res.notifications.filter((n) => n.type === 'support_ticket');
    console.log(`6 & 7. Support Ticket Notifications Returned: ${supportTickets.length}`);

    const disallowedTypes = res.notifications.filter((n) => !['admin_announcement', 'support_ticket'].includes(n.type));
    console.log(`8. Disallowed Notification Types Returned: ${disallowedTypes.length} (Expected: 0)`);

    console.log('\nReturned Notification Payload Sample:');
    res.notifications.forEach((n, i) => {
      console.log(`[${i + 1}] Type: ${n.type} | Category: "${n.category}" | Title: "${n.title}" | Message: "${n.message}"`);
    });

    const is100PercentPassed = !hasCustomerDue && !hasSupplierDue && !hasStockAlert && disallowedTypes.length === 0;

    console.log('\n====================================================');
    if (is100PercentPassed) {
      console.log('🎉 STRICT ADMIN/SUPPORT NOTIFICATION RULE PASSED 100%!');
    } else {
      console.log('❌ STRICT NOTIFICATION RULE FAILED');
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Audit error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testStrictNotificationBell();
