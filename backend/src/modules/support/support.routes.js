import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { requireAdminRole } from '../admin/middlewares/admin.middleware.js';
import { uploadSupportAttachmentMiddleware } from '../../middlewares/upload.middleware.js';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  addReplyUser,
  reopenTicketUser,
  uploadAttachment,
  getAllTicketsAdmin,
  getTicketByIdAdmin,
  addReplyAdmin,
  resolveTicketAdmin,
  updateTicketStatusAdmin,
  getUnreadNotificationsAdmin,
  markNotificationReadAdmin,
} from './support.controller.js';

const router = Router();

// Attachment Upload (User/Admin protected)
router.post('/upload-attachment', protect, uploadSupportAttachmentMiddleware.single('file'), uploadAttachment);

// User endpoints (Protected by user protect middleware)
router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, getUserTickets);
router.get('/tickets/:id', protect, getTicketById);
router.post('/tickets/:id/reply', protect, addReplyUser);
router.post('/tickets/:id/reopen', protect, reopenTicketUser);

// Admin endpoints (Protected by requireAdminRole middleware)
router.get('/admin/tickets', requireAdminRole(), getAllTicketsAdmin);
router.get('/admin/tickets/:id', requireAdminRole(), getTicketByIdAdmin);
router.post('/admin/tickets/:id/reply', requireAdminRole(), addReplyAdmin);
router.post('/admin/tickets/:id/resolve', requireAdminRole(), resolveTicketAdmin);
router.patch('/admin/tickets/:id/status', requireAdminRole(), updateTicketStatusAdmin);
router.get('/admin/notifications/unread', requireAdminRole(), getUnreadNotificationsAdmin);
router.patch('/admin/notifications/:id/read', requireAdminRole(), markNotificationReadAdmin);

export default router;
