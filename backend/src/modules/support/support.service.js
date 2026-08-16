import { SupportTicket } from './supportTicket.model.js';
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

    return ticket;
  },

  async getUserTickets(userId) {
    const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
    return tickets;
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
    if (status && ['PENDING', 'RESOLVED'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }
    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'ownerName mobile')
      .sort({ createdAt: -1 });
    return tickets;
  },

  async resolveTicket(adminUserId, ticketId, { adminReply }) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND);
    }

    ticket.status = 'RESOLVED';
    ticket.adminReply = adminReply || 'Issue has been addressed and resolved.';
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = adminUserId;

    await ticket.save();
    return ticket;
  },
};
