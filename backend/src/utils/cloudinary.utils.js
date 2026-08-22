import { cloudinary } from '../config/cloudinary.config.js';
import { envConfig } from '../config/env.config.js';
import { logger } from '../config/logger.config.js';
import fs from 'fs';
import path from 'path';

/**
 * Extracts Cloudinary public_id from a full Cloudinary URL.
 * Handles folder paths and ignores version strings (e.g. v1234567890).
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);

    // Remove optional version segment (e.g., v1724123456/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // Remove file extension
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
    }

    return pathAfterUpload;
  } catch (err) {
    logger.warn('Failed to extract public_id from Cloudinary URL:', err);
    return null;
  }
};

/**
 * Deletes an image from Cloudinary given its URL or public_id.
 */
export const deleteFromCloudinary = async (urlOrPublicId) => {
  if (!urlOrPublicId) return false;

  const publicId = urlOrPublicId.startsWith('http')
    ? extractPublicIdFromUrl(urlOrPublicId)
    : urlOrPublicId;

  if (!publicId) return false;

  if (!envConfig.cloudinary.cloudName) {
    logger.info(`[Cloudinary Dry Run] Would delete publicId: ${publicId}`);
    return true;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary image deleted successfully (${publicId}):`, result);
    return result?.result === 'ok';
  } catch (err) {
    logger.error(`Cloudinary deletion failed for publicId (${publicId}):`, err);
    return false;
  }
};

/**
 * Uploads a file buffer directly to Cloudinary.
 * If Cloudinary credentials are missing, falls back to writing to backend/uploads.
 */
export const uploadToCloudinaryStream = (fileBuffer, folder = 'general', filename = null) => {
  return new Promise((resolve, reject) => {
    // Fallback to local disk if Cloudinary environment variables are missing
    if (!envConfig.cloudinary.cloudName || !envConfig.cloudinary.apiKey || !envConfig.cloudinary.apiSecret) {
      try {
        const targetDir = path.join(process.cwd(), 'uploads', folder);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const safeName = filename || `${folder}-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
        const filePath = path.join(targetDir, safeName);
        fs.writeFileSync(filePath, fileBuffer);
        const relativeUrl = `/uploads/${folder}/${safeName}`;
        return resolve({
          url: relativeUrl,
          secure_url: relativeUrl,
          public_id: relativeUrl,
        });
      } catch (err) {
        return reject(err);
      }
    }

    // Cloudinary Stream Upload
    const cleanFilename = filename ? filename.replace(/\.[^/.]+$/, '') : `${folder}-${Date.now()}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `fertilizer_erp/${folder}`,
        public_id: cleanFilename,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary stream upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};
