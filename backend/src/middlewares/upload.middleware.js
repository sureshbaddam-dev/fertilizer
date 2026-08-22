import multer from 'multer';
import path from 'path';
import { uploadToCloudinaryStream } from '../utils/cloudinary.utils.js';

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
            const uniqueFilename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const result = await uploadToCloudinaryStream(req.file.buffer, folder, uniqueFilename);

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
