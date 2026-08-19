import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
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

router.use(protect);

// Attachment Upload
router.post('/upload-attachment', uploadSupportAttachmentMiddleware.single('file'), uploadAttachment);

// User endpoints
router.post('/tickets', createTicket);
router.get('/tickets', getUserTickets);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/reply', addReplyUser);
router.post('/tickets/:id/reopen', reopenTicketUser);

// Admin endpoints
router.get('/admin/tickets', getAllTicketsAdmin);
router.get('/admin/tickets/:id', getTicketByIdAdmin);
router.post('/admin/tickets/:id/reply', addReplyAdmin);
router.post('/admin/tickets/:id/resolve', resolveTicketAdmin);
router.patch('/admin/tickets/:id/status', updateTicketStatusAdmin);
router.get('/admin/notifications/unread', getUnreadNotificationsAdmin);
router.patch('/admin/notifications/:id/read', markNotificationReadAdmin);

export default router;
