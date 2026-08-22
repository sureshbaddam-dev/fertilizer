import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../common/apiResponse.js';
import { HTTP_STATUS } from '../../common/httpStatuses.js';
import { supportService } from './support.service.js';

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.user._id, req.body);
  return sendSuccess(res, 'Help request submitted successfully.', { ticket }, HTTP_STATUS.CREATED);
});

export const getUserTickets = asyncHandler(async (req, res) => {
  const tickets = await supportService.getUserTickets(req.user._id, req.query.status);
  return sendSuccess(res, 'Help requests retrieved successfully.', { tickets }, HTTP_STATUS.OK);
});

export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketById(req.user._id, req.params.id);
  return sendSuccess(res, 'Request details retrieved.', { ticket }, HTTP_STATUS.OK);
});

export const addReplyUser = asyncHandler(async (req, res) => {
  const ticket = await supportService.addReply(req.params.id, req.user._id, 'USER', req.body);
  return sendSuccess(res, 'Reply added successfully.', { ticket }, HTTP_STATUS.OK);
});

export const reopenTicketUser = asyncHandler(async (req, res) => {
  const ticket = await supportService.reopenTicket(req.user._id, req.params.id, req.body);
  return sendSuccess(res, 'Help request reopened successfully.', { ticket }, HTTP_STATUS.OK);
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No attachment file uploaded' });
  }
  const fileUrl = req.file.path || req.file.secure_url || req.file.url || `/uploads/support/${req.file.filename}`;
  return sendSuccess(res, 'Attachment uploaded successfully.', { url: fileUrl }, HTTP_STATUS.OK);
});

// Admin Controllers
export const getAllTicketsAdmin = asyncHandler(async (req, res) => {
  const tickets = await supportService.getAllTickets({
    status: req.query.status,
    priority: req.query.priority,
    category: req.query.category,
    search: req.query.search,
  });
  return sendSuccess(res, 'All tickets retrieved.', { tickets }, HTTP_STATUS.OK);
});

export const getTicketByIdAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketById(null, req.params.id);
  return sendSuccess(res, 'Request details retrieved.', { ticket }, HTTP_STATUS.OK);
});

export const addReplyAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.addReply(req.params.id, req.user._id, 'ADMIN', req.body);
  return sendSuccess(res, 'Admin reply sent successfully.', { ticket }, HTTP_STATUS.OK);
});

export const resolveTicketAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.resolveTicket(req.user._id, req.params.id, req.body);
  return sendSuccess(res, 'Request marked as resolved.', { ticket }, HTTP_STATUS.OK);
});

export const updateTicketStatusAdmin = asyncHandler(async (req, res) => {
  const ticket = await supportService.updateTicketStatus(req.user._id, req.params.id, req.body);
  return sendSuccess(res, 'Request status updated.', { ticket }, HTTP_STATUS.OK);
});

export const getUnreadNotificationsAdmin = asyncHandler(async (_req, res) => {
  const notifications = await supportService.getUnreadNotifications();
  return sendSuccess(res, 'Unread notifications retrieved.', { notifications }, HTTP_STATUS.OK);
});

export const markNotificationReadAdmin = asyncHandler(async (req, res) => {
  const result = await supportService.markNotificationAsRead(req.params.id);
  return sendSuccess(res, 'Notification marked as read.', result, HTTP_STATUS.OK);
});
