import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directories exist
const brandUploadDir = path.join(__dirname, '../../uploads/brands');
if (!fs.existsSync(brandUploadDir)) {
  fs.mkdirSync(brandUploadDir, { recursive: true });
}

const productUploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(productUploadDir)) {
  fs.mkdirSync(productUploadDir, { recursive: true });
}

const brandStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, brandUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `brand-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg\+xml|svg/;
  const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeMatch = allowedTypes.test(file.mimetype);

  if (extMatch && mimeMatch) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, WEBP, and SVG image files are allowed!'), false);
  }
};

export const uploadBrandLogoMiddleware = multer({
  storage: brandStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
  fileFilter,
});

export const uploadProductImageMiddleware = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
  fileFilter,
});

