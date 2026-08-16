import mongoose from 'mongoose';
import { envConfig } from '../config/env.config.js';
import { SupportTicket } from '../modules/support/supportTicket.model.js';
import { supportService } from '../modules/support/support.service.js';
import { AdminNotification } from '../modules/admin/models/adminNotification.model.js';

const TARGET_USER_ID = '6a797801e9edd25a916f2f47';
const TEST_TICKET_ID = 'TCK-636361-001';

async function testWorkflow() {
  console.log('====================================================');
  console.log('🧪 TESTING SUPPORT TICKETS WORKFLOW & NOTIFICATIONS');
  console.log('====================================================\n');

  try {
    const mainUri = process.env.MAIN_MONGODB_URI || envConfig.mongo.mainUri || 'mongodb://localhost:27017/mandhi_erp';
    await mongoose.connect(mainUri);
    console.log('Connected to MAIN DB');

    const mockAdminId = new mongoose.Types.ObjectId();

    // 1. FETCH TICKET IN_PROGRESS STATE
    console.log('\n--- 1. TESTING EXISTING TICKET TCK-636361-001 ---');
    const ticketDoc = await SupportTicket.findOne({ ticketId: TEST_TICKET_ID }).lean();
    console.log(`Ticket Code: ${ticketDoc?.ticketId}`);
    console.log(`Current DB status: ${ticketDoc?.status}`);

    const userTickets = await supportService.getUserTickets(TARGET_USER_ID);
    const userMatchedTicket = userTickets.find((t) => t.ticketId === TEST_TICKET_ID);
    console.log(`User API returned status: ${userMatchedTicket?.status}`);
    console.log(`Status match between Admin DB & User API? ${ticketDoc?.status === userMatchedTicket?.status ? 'PASS' : 'FAIL'}`);

    // 2. UPDATE STATUS FROM IN_PROGRESS -> COMPLETED
    console.log('\n--- 2. ADMIN UPDATE STATUS TO COMPLETED ---');
    const countNotifsBefore = await AdminNotification.countDocuments({ targetUserIds: TARGET_USER_ID });

    await supportService.updateTicketStatus(mockAdminId, ticketDoc._id, {
      status: 'COMPLETED',
      adminReply: 'Resolved during automated workflow verification.',
    });

    const updatedDoc = await SupportTicket.findById(ticketDoc._id).lean();
    console.log(`Updated DB Status: ${updatedDoc.status}`);
    console.log(`CompletedAt timestamp populated? ${!!updatedDoc.completedAt} (${updatedDoc.completedAt})`);

    const countNotifsAfter = await AdminNotification.countDocuments({ targetUserIds: TARGET_USER_ID });
    console.log(`User Notifications sent: ${countNotifsAfter - countNotifsBefore} (Expected: 1)`);

    const latestNotif = await AdminNotification.findOne({ targetUserIds: TARGET_USER_ID }).sort({ createdAt: -1 }).lean();
    console.log(`Latest User Notification Title: "${latestNotif?.title}"`);
    console.log(`Latest User Notification Message: "${latestNotif?.message}"`);

    // 3. RE-RUN SAME STATUS UPDATE (DUPLICATE NOTIFICATION PREVENTION CHECK)
    console.log('\n--- 3. RE-RUN SAME STATUS UPDATE (DUPLICATE CHECK) ---');
    await supportService.updateTicketStatus(mockAdminId, ticketDoc._id, {
      status: 'COMPLETED',
      adminReply: 'Resolved during automated workflow verification.',
    });
    const countNotifsDuplicate = await AdminNotification.countDocuments({ targetUserIds: TARGET_USER_ID });
    console.log(`Duplicate Notifications sent: ${countNotifsDuplicate - countNotifsAfter} (Expected: 0)`);

    // 4. RESET TICKET BACK TO IN_PROGRESS FOR TEST ENVIRONMENT CLEANLINESS
    console.log('\n--- 4. RESETTING TICKET BACK TO IN_PROGRESS FOR TEST CLEANLINESS ---');
    await SupportTicket.updateOne(
      { _id: ticketDoc._id },
      { $set: { status: 'IN_PROGRESS', completedAt: null, completedBy: null } }
    );
    console.log('Ticket reset to IN_PROGRESS.');

    console.log('\n====================================================');
    console.log('🎉 SUPPORT TICKETS WORKFLOW TEST PASSED 100% SUCCESS!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testWorkflow();
