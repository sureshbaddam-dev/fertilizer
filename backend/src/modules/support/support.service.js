import { SupportTicket } from './supportTicket.model.js';
import { SupportNotification } from '../admin/models/supportNotification.model.js';
import { AdminNotification } from '../admin/models/adminNotification.model.js';
import { ShopSettings } from '../settings/models/shopSettings.model.js';
import { User } from '../auth/user.model.js';
import { AppError } from '../../utils/appError.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';

function generateRequestId(count) {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const seq = (count + 1).toString().padStart(3, '0');
  return `REQ-${yy}${mm}${dd}-${seq}`;
}

export const supportService = {
  async createTicket(userId, { subject, description, category, priority, attachments }) {
    const count = await SupportTicket.countDocuments();
    const ticketId = generateRequestId(count);

    const user = await User.findById(userId).select('ownerName mobile');
    const ownerName = user?.ownerName || 'You';

    const initialMessage = {
      sender: 'USER',
      senderName: ownerName,
      message: description,
      attachments: attachments || [],
      createdAt: new Date(),
    };

    const ticket = await SupportTicket.create({
      ticketId,
      userId,
      subject,
      description,
      category: category || 'General',
      priority: priority || 'Medium',
      status: 'PENDING',
      attachments: attachments || [],
      messages: [initialMessage],
    });

    await SupportNotification.create({
      ticketId: ticket._id,
      ticketCode: ticketId,
      userName: ownerName,
      userMobile: user?.mobile || '',
      subject,
      isRead: false,
    });

    return ticket;
  },

  async getUserTickets(userId, statusFilter) {
    const filter = { userId };
    if (statusFilter && statusFilter !== 'ALL') {
      const st = statusFilter.toUpperCase();
      if (st === 'RESOLVED') {
        filter.status = 'COMPLETED';
      } else if (st === 'WAITING_FOR_YOU') {
        filter.status = 'WAITING_FOR_USER';
      } else {
        filter.status = st;
      }
    }

    const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 }).lean();
    return tickets.map((t) => ({
      ...t,
      status: t.status === 'RESOLVED' ? 'COMPLETED' : t.status,
    }));
  },

  async getTicketById(userId, ticketId) {
    let filter = { _id: ticketId };
    // If ticketId is a custom ticketId string like REQ-240817-001 or TCK-...
    if (typeof ticketId === 'string' && (ticketId.startsWith('REQ-') || ticketId.startsWith('TCK-'))) {
      filter = { ticketId };
    }

    if (userId) {
      filter.userId = userId;
    }

    const ticket = await SupportTicket.findOne(filter)
      .populate('userId', 'ownerName mobile email')
      .populate('completedBy', 'ownerName mobile')
      .lean();

    if (!ticket) {
      throw new AppError('Help request not found', HTTP_STATUS.NOT_FOUND);
    }

    // Attach shop/business name
    const shop = await ShopSettings.findOne({ userId: ticket.userId?._id || ticket.userId }).select('shopName').lean();
    return {
      ...ticket,
      businessName: shop?.shopName || 'N/A',
      status: ticket.status === 'RESOLVED' ? 'COMPLETED' : ticket.status,
    };
  },

  async addReply(ticketId, senderId, senderType, { message, attachments, status }) {
    let filter = { _id: ticketId };
    if (typeof ticketId === 'string' && (ticketId.startsWith('REQ-') || ticketId.startsWith('TCK-'))) {
      filter = { ticketId };
    }

    const ticket = await SupportTicket.findOne(filter);
    if (!ticket) {
      throw new AppError('Help request not found', HTTP_STATUS.NOT_FOUND);
    }

    const user = await User.findById(senderId).select('ownerName mobile').lean();
    const senderName = senderType === 'ADMIN' ? 'VEDIXA Support' : (user?.ownerName || 'You');

    const replyMsg = {
      sender: senderType,
      senderName,
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    };

    ticket.messages.push(replyMsg);

    const oldStatus = ticket.status;

    if (senderType === 'USER') {
      ticket.isReadByAdmin = false;
      if (ticket.status === 'WAITING_FOR_USER') {
        ticket.status = 'IN_PROGRESS';
      }
      // Create admin notification
      await SupportNotification.create({
        ticketId: ticket._id,
        ticketCode: ticket.ticketId,
        userName: user?.ownerName || 'User',
        userMobile: user?.mobile || '',
        subject: `New reply on ${ticket.ticketId}`,
        isRead: false,
      });
    } else if (senderType === 'ADMIN') {
      ticket.isReadByAdmin = true;
      if (status) {
        let inputStatus = status.toUpperCase();
        if (inputStatus === 'RESOLVED') inputStatus = 'COMPLETED';
        ticket.status = inputStatus;
        if (inputStatus === 'COMPLETED') {
          ticket.completedAt = new Date();
          ticket.completedBy = senderId;
          ticket.resolvedAt = ticket.resolvedAt || new Date();
          ticket.resolvedBy = senderId;
          ticket.adminReply = message;
        } else if (inputStatus === 'CLOSED') {
          ticket.closedAt = new Date();
          ticket.closedBy = senderId;
        }
      }

      // Notify User about admin reply/status change
      let notifTitle = 'New Support Reply';
      let notifMsg = `VEDIXA Support replied to request ${ticket.ticketId}: "${message.slice(0, 80)}..."`;

      if (ticket.status !== oldStatus) {
        if (ticket.status === 'IN_PROGRESS') {
          notifTitle = 'Help Request In Progress';
          notifMsg = `Your help request ${ticket.ticketId} is now In Progress.`;
        } else if (ticket.status === 'WAITING_FOR_USER') {
          notifTitle = 'Action Needed on Help Request';
          notifMsg = `Our support team is waiting for your reply on request ${ticket.ticketId}.`;
        } else if (ticket.status === 'COMPLETED') {
          notifTitle = 'Help Request Resolved';
          notifMsg = `Your help request ${ticket.ticketId} has been resolved.`;
        } else if (ticket.status === 'CLOSED') {
          notifTitle = 'Help Request Closed';
          notifMsg = `Your help request ${ticket.ticketId} has been closed.`;
        }
      }

      try {
        await AdminNotification.create({
          title: notifTitle,
          message: notifMsg,
          targetAudience: 'SPECIFIC_USER',
          notificationType: 'SYSTEM_ANNOUNCEMENT',
          targetUserIds: [ticket.userId],
          sentByAdminId: senderId,
          sentByAdminName: senderName,
          deliveredCount: 1,
        });
      } catch (nErr) {
        console.error('Failed to create ticket reply notification:', nErr.message);
      }
    }

    await ticket.save();
    return ticket;
  },

  async reopenTicket(userId, ticketId, { reason }) {
    let filter = { _id: ticketId, userId };
    if (typeof ticketId === 'string' && (ticketId.startsWith('REQ-') || ticketId.startsWith('TCK-'))) {
      filter = { ticketId, userId };
    }

    const ticket = await SupportTicket.findOne(filter);
    if (!ticket) {
      throw new AppError('Help request not found', HTTP_STATUS.NOT_FOUND);
    }

    const user = await User.findById(userId).select('ownerName mobile').lean();
    const ownerName = user?.ownerName || 'You';

    ticket.status = 'IN_PROGRESS';
    ticket.completedAt = null;
    ticket.completedBy = null;
    ticket.closedAt = null;
    ticket.closedBy = null;
    ticket.isReadByAdmin = false;

    const reopenMsg = {
      sender: 'USER',
      senderName: ownerName,
      message: reason ? `[Reopened Request]: ${reason}` : '[Reopened Request]: Issue is not fully resolved.',
      attachments: [],
      createdAt: new Date(),
    };

    ticket.messages.push(reopenMsg);
    await ticket.save();

    await SupportNotification.create({
      ticketId: ticket._id,
      ticketCode: ticket.ticketId,
      userName: ownerName,
      userMobile: user?.mobile || '',
      subject: `Request ${ticket.ticketId} reopened`,
      isRead: false,
    });

    return ticket;
  },

  // Admin APIs
  async getAllTickets({ status, priority, category, search } = {}) {
    const filter = {};
    if (status && status !== 'ALL') {
      const st = status.toUpperCase();
      if (st === 'RESOLVED') {
        filter.status = 'COMPLETED';
      } else {
        filter.status = st;
      }
    }

    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { ticketId: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'ownerName mobile email')
      .populate('completedBy', 'ownerName mobile')
      .sort({ updatedAt: -1 })
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
    let filter = { _id: ticketId };
    if (typeof ticketId === 'string' && (ticketId.startsWith('REQ-') || ticketId.startsWith('TCK-'))) {
      filter = { ticketId };
    }

    const ticket = await SupportTicket.findOne(filter);
    if (!ticket) {
      throw new AppError('Help request not found', HTTP_STATUS.NOT_FOUND);
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
    } else if (normalizedStatus === 'CLOSED') {
      ticket.closedAt = new Date();
      ticket.closedBy = adminUserId;
      ticket.isReadByAdmin = true;
    } else {
      ticket.completedAt = null;
      ticket.completedBy = null;
      ticket.closedAt = null;
      ticket.closedBy = null;
    }

    await ticket.save();

    // CREATE USER NOTIFICATION ONLY IF STATUS ACTUALLY CHANGED
    if (oldStatus !== normalizedStatus) {
      const adminUser = await User.findById(adminUserId).select('ownerName').lean();
      const adminName = adminUser?.ownerName || 'Support Admin';

      let notifTitle = '';
      let notifMsg = '';

      if (normalizedStatus === 'IN_PROGRESS') {
        notifTitle = 'Help Request In Progress';
        notifMsg = `Your help request ${ticket.ticketId} is now In Progress.`;
      } else if (normalizedStatus === 'WAITING_FOR_USER') {
        notifTitle = 'Action Needed on Help Request';
        notifMsg = `Our support team is waiting for your reply on request ${ticket.ticketId}.`;
      } else if (normalizedStatus === 'COMPLETED') {
        notifTitle = 'Help Request Resolved';
        notifMsg = `Your help request ${ticket.ticketId} has been resolved.`;
      } else if (normalizedStatus === 'CLOSED') {
        notifTitle = 'Help Request Closed';
        notifMsg = `Your help request ${ticket.ticketId} has been closed.`;
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
          console.log(`🔔 Sent request status notification to user ${ticket.userId}: "${notifMsg}"`);
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
