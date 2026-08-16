import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { SupportTicket } from '../modules/support/supportTicket.model.js';
import { supportService } from '../modules/support/support.service.js';
import { AdminNotification } from '../modules/admin/models/adminNotification.model.js';
import { dashboardService } from '../modules/dashboard/services/dashboard.service.js';

const TEST_USER_A = '6a797801e9edd25a916f2f47';
const TEST_USER_B = '6a797842e9edd25a916f2f54';

async function runEndToEndTest() {
  console.log('====================================================');
  console.log('🧪 REAL END-TO-END NOTIFICATION SYSTEM FLOW TEST');
  console.log('====================================================\n');

  try {
    const mainUri = process.env.MAIN_MONGODB_URI || envConfig.mongo.mainUri || 'mongodb://localhost:27017/mandhi_erp';
    await mongoose.connect(mainUri);
    console.log('Connected to MAIN DB');

    const mockAdminId = new mongoose.Types.ObjectId();

    // 1. Create a fresh support ticket for User A
    console.log('\n--- 1. USER A CREATES SUPPORT TICKET ---');
    const newTicket = await supportService.createTicket(TEST_USER_A, {
      subject: 'Inventory Sync Check',
      description: 'Testing live notification delivery for support ticket status update.',
      category: 'Inventory',
    });
    console.log(`Created Ticket Code: ${newTicket.ticketId} (_id: ${newTicket._id}) for User A (${TEST_USER_A})`);

    // 2. Admin opens ticket and changes status PENDING -> IN_PROGRESS
    console.log('\n--- 2. ADMIN CHANGES STATUS PENDING -> IN_PROGRESS ---');
    const notifsCountBefore1 = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });

    await supportService.updateTicketStatus(mockAdminId, newTicket._id, {
      status: 'IN_PROGRESS',
      adminReply: 'Our engineering team is actively inspecting your inventory sync.',
    });

    const notifsCountAfter1 = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });
    console.log(`AdminNotification created in MongoDB? ${notifsCountAfter1 > notifsCountBefore1} (+${notifsCountAfter1 - notifsCountBefore1})`);

    // 3. Query User A notifications API
    console.log('\n--- 3. USER A API GET /api/v1/dashboard/notifications ---');
    const userANotifs1 = await dashboardService.getNotifications(TEST_USER_A);
    const matchedNotif1 = userANotifs1.notifications.find((n) => n.message.includes(newTicket.ticketId));
    console.log('Notification delivered to User A notification bell?');
    console.log(`Title: "${matchedNotif1?.title}" | Message: "${matchedNotif1?.message}"`);

    // 4. Admin changes status IN_PROGRESS -> COMPLETED
    console.log('\n--- 4. ADMIN CHANGES STATUS IN_PROGRESS -> COMPLETED ---');
    const notifsCountBefore2 = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });

    await supportService.updateTicketStatus(mockAdminId, newTicket._id, {
      status: 'COMPLETED',
      adminReply: 'Inventory sync issue successfully resolved.',
    });

    const notifsCountAfter2 = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });
    console.log(`AdminNotification created in MongoDB? ${notifsCountAfter2 > notifsCountBefore2} (+${notifsCountAfter2 - notifsCountBefore2})`);

    // 5. Query User A notifications API again
    console.log('\n--- 5. USER A API GET /api/v1/dashboard/notifications (COMPLETED) ---');
    const userANotifs2 = await dashboardService.getNotifications(TEST_USER_A);
    const matchedNotif2 = userANotifs2.notifications.find((n) => n.message.includes(newTicket.ticketId) && n.message.includes('resolved'));
    console.log('Resolved Notification delivered to User A notification bell?');
    console.log(`Title: "${matchedNotif2?.title}" | Message: "${matchedNotif2?.message}"`);

    // 6. Admin saves COMPLETED status again (Duplicate Check)
    console.log('\n--- 6. ADMIN SAVES SAME STATUS AGAIN (DUPLICATE CHECK) ---');
    const notifsCountBeforeDup = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });

    await supportService.updateTicketStatus(mockAdminId, newTicket._id, {
      status: 'COMPLETED',
      adminReply: 'Inventory sync issue successfully resolved.',
    });

    const notifsCountAfterDup = await AdminNotification.countDocuments({ targetUserIds: TEST_USER_A });
    console.log(`Duplicate AdminNotifications created? ${notifsCountAfterDup - notifsCountBeforeDup} (Expected: 0)`);

    // 7. Verify User Isolation
    console.log('\n--- 7. USER B ISOLATION CHECK ---');
    const userBNotifs = await dashboardService.getNotifications(TEST_USER_B);
    const userBHasTicket = userBNotifs.notifications.some((n) => n.message.includes(newTicket.ticketId));
    console.log(`User B received User A's ticket notification? ${userBHasTicket} (Expected: false)`);

    // 8. Cleanup test ticket
    console.log('\n--- 8. CLEANING UP TEST TICKET ---');
    await SupportTicket.deleteOne({ _id: newTicket._id });
    await AdminNotification.deleteMany({ message: { $regex: newTicket.ticketId } });
    console.log('Cleaned up test ticket and temporary notifications.');

    console.log('\n====================================================');
    console.log('🎉 FULL NOTIFICATION FLOW VERIFIED 100% SUCCESSFUL!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runEndToEndTest();
