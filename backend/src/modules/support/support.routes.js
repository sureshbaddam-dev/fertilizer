import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  getAllTicketsAdmin,
  resolveTicketAdmin,
  updateTicketStatusAdmin,
  getUnreadNotificationsAdmin,
  markNotificationReadAdmin,
} from './support.controller.js';

const router = Router();

router.use(protect);

// User endpoints
router.post('/tickets', createTicket);
router.get('/tickets', getUserTickets);
router.get('/tickets/:id', getTicketById);

// Admin endpoints
router.get('/admin/tickets', getAllTicketsAdmin);
router.post('/admin/tickets/:id/resolve', resolveTicketAdmin);
router.patch('/admin/tickets/:id/status', updateTicketStatusAdmin);
router.get('/admin/notifications/unread', getUnreadNotificationsAdmin);
router.patch('/admin/notifications/:id/read', markNotificationReadAdmin);

export default router;
