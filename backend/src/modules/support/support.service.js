import { SupportTicket } from './supportTicket.model.js';
import { SupportNotification } from '../admin/models/supportNotification.model.js';
import { AdminNotification } from '../admin/models/adminNotification.model.js';
import { ShopSettings } from '../settings/models/shopSettings.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';

export const supportService = {
  async createTicket(userId, { subject, description, category }) {
    const count = await SupportTicket.countDocuments();
    const ticketId = `TCK-${Date.now().toString().slice(-6)}-${(count + 1).toString().padStart(3, '0')}`;

    const ticket = await SupportTicket.create({
      ticketId,
      userId,
      subject,
      description,
      category: category || 'General',
      status: 'PENDING',
    });

    const user = await User.findById(userId).select('ownerName mobile');
    await SupportNotification.create({
      ticketId: ticket._id,
      ticketCode: ticketId,
      userName: user?.ownerName || 'User',
      userMobile: user?.mobile || '',
      subject,
      isRead: false,
    });

    return ticket;
  },

  async getUserTickets(userId) {
    const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 }).lean();
    return tickets.map((t) => ({
      ...t,
      status: t.status === 'RESOLVED' ? 'COMPLETED' : t.status,
    }));
  },

  async getTicketById(userId, ticketId) {
    const ticket = await SupportTicket.findOne({ _id: ticketId, userId });
    if (!ticket) {
      throw new AppError('Support ticket not found', HTTP_STATUS.NOT_FOUND);
    }
    return ticket;
  },

  // Admin APIs
  async getAllTickets(status) {
    const filter = {};
    if (status && status !== 'ALL') {
      const st = status.toUpperCase();
      filter.status = st === 'RESOLVED' ? 'COMPLETED' : st;
    }
    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'ownerName mobile email')
      .populate('completedBy', 'ownerName mobile')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = tickets.map((t) => t.userId?._id || t.userId).filter(Boolean);
    const shops = await ShopSettings.find({ userId: { $in: userIds } }).select('userId shopName').lean();
    const shopMap = new Map(shops.map((s) => [String(s.userId), s.shopName]));

    return tickets.map((t) => {
      const uId = String(t.userId?._id || t.userId);
      const normalizedStatus = t.status === 'RESOLVED' ? 'COMPLETED' : t.status;
      return {
        ...t,
        status: normalizedStatus,
        businessName: shopMap.get(uId) || 'N/A',
      };
    });
  },

  async updateTicketStatus(adminUserId, ticketId, { status, adminReply }) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND);
    }

    const oldStatus = ticket.status === 'RESOLVED' ? 'COMPLETED' : ticket.status;
    let inputStatus = (status || 'COMPLETED').toUpperCase();
    if (inputStatus === 'RESOLVED') inputStatus = 'COMPLETED';

    const normalizedStatus = inputStatus;
    ticket.status = normalizedStatus;
    if (adminReply !== undefined) ticket.adminReply = adminReply;

    if (normalizedStatus === 'COMPLETED') {
      ticket.resolvedAt = ticket.resolvedAt || new Date();
      ticket.resolvedBy = adminUserId;
      ticket.completedAt = new Date();
      ticket.completedBy = adminUserId;
      ticket.isReadByAdmin = true;

      await SupportNotification.updateMany({ ticketId: ticket._id }, { isRead: true });
    } else {
      ticket.completedAt = null;
      ticket.completedBy = null;
    }

    await ticket.save();

    // CREATE USER NOTIFICATION ONLY IF STATUS ACTUALLY CHANGED
    if (oldStatus !== normalizedStatus) {
      const adminUser = await User.findById(adminUserId).select('ownerName').lean();
      const adminName = adminUser?.ownerName || 'Support Admin';

      let notifTitle = '';
      let notifMsg = '';

      if (normalizedStatus === 'IN_PROGRESS') {
        notifTitle = 'Support Ticket In Progress';
        notifMsg = `Your support ticket ${ticket.ticketId} is now In Progress.`;
      } else if (normalizedStatus === 'COMPLETED') {
        notifTitle = 'Support Ticket Resolved';
        notifMsg = `Your support ticket ${ticket.ticketId} has been resolved.`;
      }

      if (notifMsg) {
        try {
          await AdminNotification.create({
            title: notifTitle,
            message: notifMsg,
            targetAudience: 'SPECIFIC_USER',
            notificationType: 'SYSTEM_ANNOUNCEMENT',
            targetUserIds: [ticket.userId],
            sentByAdminId: adminUserId,
            sentByAdminName: adminName,
            deliveredCount: 1,
          });
          console.log(`🔔 Sent ticket status notification to user ${ticket.userId}: "${notifMsg}"`);
        } catch (nErr) {
          console.error('Failed to create ticket notification:', nErr.message);
        }
      }
    }

    return ticket;
  },

  async resolveTicket(adminUserId, ticketId, { adminReply }) {
    return this.updateTicketStatus(adminUserId, ticketId, { status: 'COMPLETED', adminReply });
  },

  async getUnreadNotifications() {
    const notifications = await SupportNotification.find({ isRead: false }).sort({ createdAt: -1 });
    return notifications;
  },

  async markNotificationAsRead(notificationId) {
    await SupportNotification.findByIdAndUpdate(notificationId, { isRead: true });
    return { success: true };
  },
};
