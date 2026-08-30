import { Router } from 'express';
import {
  getProducts,
  getTopSellingProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  restoreProduct,
  uploadProductImage,
  searchCloudinaryProductImages,
  getProductHistory,
  updateBatch,
} from './controllers/product.controller.js';
import { uploadProductImageMiddleware } from '../../middlewares/upload.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { requireActiveSubscription } from '../../middlewares/subscription.middleware.js';

const router = Router();

router.use(protect);
router.use(requireActiveSubscription);

router.get('/', getProducts);
router.get('/top-selling', getTopSellingProducts);
router.get('/cloudinary-images/search', searchCloudinaryProductImages);
router.post('/', createProduct);
router.post('/upload-image', uploadProductImageMiddleware.single('image'), uploadProductImage);
router.patch('/batches/:batchId', updateBatch);
router.get('/:id', getProductById);
router.get('/:id/history', getProductHistory);
router.put('/:id', updateProduct);
router.patch('/:id/deactivate', deactivateProduct);
router.patch('/:id/activate', restoreProduct);
router.delete('/:id', deactivateProduct);

export default router;

