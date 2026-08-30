import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { uploadToCloudinaryStream } from '../utils/cloudinary.utils.js';
import { cloudinaryProductImageService } from '../modules/products/services/cloudinaryProductImage.service.js';
import { HTTP_STATUS } from '../common/httpStatuses.js';

// Restrict formats strictly to JPG, JPEG, PNG, WEBP (SVG disabled for production security)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const extMatch = allowedTypes.test(ext);
  const mimeMatch = allowedTypes.test(file.mimetype);

  if (extMatch && mimeMatch) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed. SVG is disabled for security.'), false);
  }
};

const memoryStorage = multer.memoryStorage();

const createCloudinaryUploadMiddleware = (folder, prefix) => {
  const upload = multer({
    storage: memoryStorage,
    limits: { fileSize: 3 * 1024 * 1024 }, // Strict 3 MB Limit
    fileFilter,
  });

  return {
    single: (fieldName) => {
      const multerSingle = upload.single(fieldName);
      return (req, res, next) => {
        multerSingle(req, res, async (err) => {
          if (err) return next(err);
          if (!req.file) return next();

          try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            const fileSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
            req.file.sha256 = fileSha256;

            const isForceUpload = req.query.forceUpload === 'true' || req.body.forceUpload === 'true';

            // Exact Duplicate Check for Product Images
            if (folder === 'products' && !isForceUpload) {
              const existingAsset = await cloudinaryProductImageService.findExactDuplicateBySha256(fileSha256);
              if (existingAsset) {
                const asset = existingAsset.asset || {};
                const ctx = asset.context || existingAsset.context || {};

                const pName = asset.productName || ctx.productName || ctx.product || ctx.product_name || '';
                const brandName = asset.brand || ctx.brand || ctx.brandName || ctx.brand_name || '';
                const categoryName = asset.category || ctx.category || ctx.categoryName || ctx.category_name || '';
                const unitName = asset.unit || ctx.unit || ctx.unitName || ctx.unit_name || '';
                const sha256Val = asset.sha256 || ctx.sha256 || fileSha256;

                return res.status(HTTP_STATUS.CONFLICT).json({
                  success: false,
                  code: 'EXACT_DUPLICATE_IMAGE',
                  isExactDuplicate: true,
                  isDuplicate: true,
                  message: 'This exact image already exists in the product image library.',
                  existingAsset: {
                    imageUrl: existingAsset.secure_url || asset.secureUrl,
                    productName: pName,
                    brand: brandName,
                    category: categoryName,
                    unit: unitName,
                    sha256: sha256Val,
                  },
                  asset: {
                    imageUrl: existingAsset.secure_url || asset.secureUrl,
                    productName: pName,
                    brand: brandName,
                    category: categoryName,
                    unit: unitName,
                    sha256: sha256Val,
                  },
                  duplicate: {
                    imageUrl: existingAsset.secure_url || asset.secureUrl,
                    secureUrl: existingAsset.secure_url || asset.secureUrl,
                    url: existingAsset.secure_url || asset.secureUrl,
                    displayName: asset.displayName || pName || '',
                    createdAt: asset.createdAt || new Date().toISOString(),
                    productName: pName,
                    brand: brandName,
                    category: categoryName,
                    unit: unitName,
                    sha256: sha256Val,
                  },
                });
              }
            }

            const uniqueFilename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

            const uploadContext = { sha256: fileSha256 };
            const reqPName = (req.body?.productName || req.body?.searchableName || '').trim();
            const reqBrand = (req.body?.brand || '').trim();
            const reqCat = (req.body?.category || '').trim();
            const reqUnit = (req.body?.unit || '').trim();

            if (reqPName) uploadContext.productName = reqPName;
            if (reqBrand) uploadContext.brand = reqBrand;
            if (reqCat) uploadContext.category = reqCat;
            if (reqUnit) uploadContext.unit = reqUnit;

            const result = await uploadToCloudinaryStream(req.file.buffer, folder, uniqueFilename, {
              context: uploadContext,
            });

            // Populate file object with Cloudinary properties
            req.file.path = result.secure_url || result.url;
            req.file.url = result.secure_url || result.url;
            req.file.secure_url = result.secure_url || result.url;
            req.file.filename = result.public_id || uniqueFilename;
            req.file.public_id = result.public_id || null;

            next();
          } catch (uploadErr) {
            next(uploadErr);
          }
        });
      };
    },
  };
};

export const uploadBrandLogoMiddleware = createCloudinaryUploadMiddleware('brands', 'brand');
export const uploadProductImageMiddleware = createCloudinaryUploadMiddleware('products', 'prod');
export const uploadSupportAttachmentMiddleware = createCloudinaryUploadMiddleware('support', 'req');
export const uploadShopImageMiddleware = createCloudinaryUploadMiddleware('shops', 'shop');
