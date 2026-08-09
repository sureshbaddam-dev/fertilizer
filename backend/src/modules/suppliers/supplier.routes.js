import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  restoreSupplier,
  getSupplierLedger,
  recordSupplierPayment,
  deletePayment,
  restorePayment,
} from './controllers/supplier.controller.js';

const router = Router();

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplierById);
router.put('/:id', updateSupplier);
router.get('/:id/ledger', getSupplierLedger);
router.post('/:id/payments', recordSupplierPayment);
router.delete('/payments/:id', deletePayment);
router.post('/payments/:id/restore', restorePayment);
router.patch('/:id/deactivate', deactivateSupplier);
router.patch('/:id/activate', restoreSupplier);
router.delete('/:id', deactivateSupplier);

export default router;
