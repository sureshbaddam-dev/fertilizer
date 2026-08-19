import { Router } from 'express';
import { salesInvoiceController } from '../controllers/salesInvoice.controller.js';

import { protect } from '../../../middlewares/auth.middleware.js';
import { requireActiveSubscription } from '../../../middlewares/subscription.middleware.js';

const router = Router();

router.use(protect);
router.use(requireActiveSubscription);

router.get('/', salesInvoiceController.getInvoices);
router.post('/preview', salesInvoiceController.previewInvoice);
router.get('/:id', salesInvoiceController.getInvoiceById);
router.post('/', salesInvoiceController.createInvoice);
router.put('/:id', salesInvoiceController.updateInvoice);
router.delete('/:id', salesInvoiceController.deleteInvoice);

export default router;
