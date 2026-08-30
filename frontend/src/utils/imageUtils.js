import ureaBagImg from '../assets/urea_bag.webp';
import { getApiBaseUrl } from '../services/apiClient';

const API_BASE_URL = getApiBaseUrl();
export const SERVER_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Normalizes any image URL (Cloudinary, Google, local backend upload, or data URL).
 * - Absolute URLs (https://, http://, data:) are returned directly.
 * - Relative URLs (/uploads/..., uploads/...) are prefixed with the backend SERVER_URL.
 * - Empty or invalid paths return an empty string.
 */
export function normalizeImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    return '';
  }

  const trimmed = imagePath.trim();

  // 1. Absolute URLs or Data URIs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // 2. Protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // 3. Backend uploads folder
  if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${SERVER_URL}${cleanPath}`;
  }

  // 4. Other relative paths (avoid static asset paths)
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  const cleanRel = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${SERVER_URL}${cleanRel}`;
}

/**
 * Normalizes an authenticated user object to ensure ONE consistent
 * `profileImage` field, plus normalized ID and profile completion flag.
 */
export function normalizeUser(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') {
    return null;
  }

  // Extract raw image from all possible backend/OAuth variants
  const rawImage =
    rawUser.profileImage ||
    rawUser.profilePicUrl ||
    rawUser.picture ||
    rawUser.avatar ||
    rawUser.image ||
    rawUser.photo ||
    rawUser.profileImageUrl ||
    '';

  const normalizedProfileImage = normalizeImageUrl(rawImage);

  const isProfileComplete = Boolean(
    rawUser.isProfileComplete ||
      (rawUser.ownerName &&
        rawUser.ownerName !== 'Pending Setup' &&
        rawUser.mobile &&
        !String(rawUser.mobile).startsWith('pending_'))
  );

  return {
    ...rawUser,
    id: rawUser.id || rawUser._id,
    _id: rawUser._id || rawUser.id,
    profileImage: normalizedProfileImage,
    profilePicUrl: normalizedProfileImage, // keep for backward compatibility
    isProfileComplete,
  };
}

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
  if (trimmed.includes('urea_bag') || trimmed.startsWith('/assets/')) {
    return ureaBagImg;
  }

  // 4. Default relative paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `${SERVER_URL}/${trimmed}`;
}
