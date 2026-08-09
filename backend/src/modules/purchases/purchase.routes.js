import { Router } from 'express';
import { getPurchases, getPurchaseById, createPurchase, deletePurchase, restorePurchase, getDeletedPurchases } from './controllers/purchase.controller.js';
import { purchaseReturnController } from './controllers/purchaseReturn.controller.js';

const router = Router();

// Supplier Return Routes
router.get('/supplier-return/purchase-history', purchaseReturnController.getPurchaseHistoryForReturn);
router.post('/supplier-return', purchaseReturnController.processSupplierReturn);
router.get('/supplier-return', purchaseReturnController.getAllReturns);

// Standard & Soft-Delete Purchase Routes
router.get('/', getPurchases);
router.get('/deleted', getDeletedPurchases);
router.post('/', createPurchase);
router.get('/:id', getPurchaseById);
router.delete('/:id', deletePurchase);
router.post('/:id/restore', restorePurchase);

export default router;
