import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';

const router = Router();

router.get('/', customerController.getCustomers);
router.get('/general', customerController.getGeneralCustomers);
router.get('/suggestions', customerController.getSuggestions);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.post('/:id/payments', customerController.recordPayment);
router.put('/payments/:paymentId', customerController.updatePayment);
router.delete('/payments/:paymentId', customerController.deletePayment);

router.post('/:id/notes', customerController.addNote);
router.put('/:id/notes/:noteId', customerController.updateNote);
router.delete('/:id/notes/:noteId', customerController.deleteNote);

router.post('/:id/documents', customerController.addDocument);
router.delete('/:id/documents/:docId', customerController.deleteDocument);

router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

export default router;
