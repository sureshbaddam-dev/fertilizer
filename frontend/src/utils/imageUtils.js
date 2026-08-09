import ureaBagImg from '../assets/urea_bag.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const SERVER_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Resolves full accessible URL for product/master images.
 * Handles relative backend paths (/uploads/...), default asset paths (/assets/...),
 * base64 data URLs, and external HTTP URLs.
 */
export function getImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    return ureaBagImg;
  }

  const trimmed = imagePath.trim();

  // 1. External URLs or Base64 Data URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // 2. Uploaded files stored in Backend /uploads directory
  if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${SERVER_URL}${cleanPath}`;
  }

  // 3. Default asset paths
  if (trimmed.includes('urea_bag.png') || trimmed.startsWith('/assets/')) {
    return ureaBagImg;
  }

  // 4. Default relative paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `${SERVER_URL}/${trimmed}`;
}
