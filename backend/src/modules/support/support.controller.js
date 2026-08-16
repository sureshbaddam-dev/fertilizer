import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { supportService } from './support.service.js';

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.user._id, req.body);
  return sendSuccess(res, 'Support ticket submitted successfully.', { ticket }, HTTP_STATUS.CREATED);
});

export const getUserTickets = asyncHandler(async (req, res) => {
  const tickets = await supportService.getUserTickets(req.user._id);
  return sendSuccess(res, 'Support tickets retrieved successfully.', { tickets }, HTTP_STATUS.OK);
});

export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketById(req.user._id, req.params.id);
  return sendSuccess(res, 'Ticket details retrieved.', { ticket }, HTTP_STATUS.OK);
});

export const getAllTicketsAdmin = asyncHandler(async (req, res) => {
  const tickets = await supportService.getAllTickets(req.query.status);
  return sendSuccess(res, 'All tickets retrieved.', { tickets }, HTTP_STATUS.OK);
});

export const resolveTicketAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.resolveTicket(req.user._id, req.params.id, req.body);
  return sendSuccess(res, 'Ticket marked as resolved.', { ticket }, HTTP_STATUS.OK);
});

export const updateTicketStatusAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.updateTicketStatus(req.user._id, req.params.id, req.body);
  return sendSuccess(res, 'Ticket status updated.', { ticket }, HTTP_STATUS.OK);
});

export const getUnreadNotificationsAdmin = asyncHandler(async (_req, res) => {
  const notifications = await supportService.getUnreadNotifications();
  return sendSuccess(res, 'Unread notifications retrieved.', { notifications }, HTTP_STATUS.OK);
});

export const markNotificationReadAdmin = asyncHandler(async (req, res) => {
  const result = await supportService.markNotificationAsRead(req.params.id);
  return sendSuccess(res, 'Notification marked as read.', result, HTTP_STATUS.OK);
});
