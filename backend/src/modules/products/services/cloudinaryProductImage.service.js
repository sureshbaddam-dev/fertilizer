import { cloudinary } from '../../../config/cloudinary.config.js';
import { envConfig } from '../../../config/env.config.js';
import { logger } from '../../../config/logger.config.js';

/**
 * Check if a string is a raw numeric timestamp or auto-generated ID (e.g. prod-178... or 170474...)
 */
function isRawNumericId(str = '') {
  if (!str) return true;
  const s = str.trim();
  if (/^\d{10,}/.test(s)) return true;
  if (/^(prod|product)-?\d+-\d+/i.test(s)) return true;
  return false;
}

/**
 * Resolve display name using strict fallback priority:
 * 1. Cloudinary context custom productName / product_name
 * 2. Cloudinary metadata productName / product_name
 * 3. Cloudinary display_name (if customized and not a raw numeric string)
 * 4. Cloudinary contextual metadata title / caption
 * 5. Original filename (if meaningful)
 * 6. Clean public_id filename fallback
 */
/**
 * Helper to safely extract Cloudinary context & metadata regardless of API structure (r.context.custom, r.context, r.metadata)
 */
function extractCloudinaryContext(r = {}) {
  const custom = (r.context && typeof r.context === 'object' && r.context.custom) || {};
  const rawContext = (r.context && typeof r.context === 'object') ? r.context : {};
  const metadata = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};

  const merged = {
    ...custom,
    ...rawContext,
    ...metadata,
  };
  delete merged.custom;
  return merged;
}

/**
 * Resolve display name using strict fallback priority:
 * 1. Cloudinary context custom productName / product_name
 * 2. Cloudinary metadata productName / product_name
 * 3. Cloudinary display_name (if customized and not a raw numeric string)
 * 4. Cloudinary contextual metadata title / caption
 * 5. Original filename (if meaningful)
 * 6. Clean public_id filename fallback
 */
function resolveCloudinaryDisplayName(r = {}) {
  const ctx = extractCloudinaryContext(r);

  // 1. Cloudinary context custom productName / product / product_name
  const pName = ctx.productName || ctx.product || ctx.product_name || '';
  if (pName && pName.trim() && pName !== 'Product Image' && pName !== 'Unnamed Product Image') {
    return pName.trim();
  }

  // 2. Cloudinary display_name (if customized and not a raw numeric generated ID)
  if (r.display_name && r.display_name.trim() && !isRawNumericId(r.display_name)) {
    return r.display_name.trim();
  }

  // 3. Cloudinary contextual metadata title or caption
  if (ctx.title && ctx.title.trim()) {
    return ctx.title.trim();
  }
  if (ctx.caption && ctx.caption.trim()) {
    return ctx.caption.trim();
  }

  // 4. Original filename
  if (r.original_filename && r.original_filename.trim() && !isRawNumericId(r.original_filename)) {
    return r.original_filename.trim();
  }

  // 5. Clean public_id filename fallback
  const publicId = r.public_id || '';
  const rawFileName = publicId.split('/').pop() || '';
  const cleanTitle = rawFileName
    .replace(/^(prod|product)-?\d*-?\d*/i, '')
    .replace(/^\d{10,}/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  return cleanTitle || r.display_name || 'Unnamed Product Image';
}

/**
 * Extract stable Cloudinary Public ID from URL or return raw string
 */
function extractPublicId(urlOrPublicId = '') {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return '';
  const str = urlOrPublicId.trim();
  if (str.includes('/upload/')) {
    const parts = str.split('/upload/');
    if (parts[1]) {
      const pathWithoutVersion = parts[1].replace(/^v\d+\//, '');
      return pathWithoutVersion.replace(/\.[^/.]+$/, '');
    }
  }
  return str.replace(/\.[^/.]+$/, '');
}

/**
 * Normalize Cloudinary resource into standard asset object
 */
function normalizeCloudinaryAsset(r = {}) {
  const publicId = r.public_id || '';
  const ctx = extractCloudinaryContext(r);
  const displayName = resolveCloudinaryDisplayName(r);

  const rawPName = ctx.productName || ctx.product || ctx.product_name || ctx.title || '';
  const productName = rawPName && !isRawNumericId(rawPName) ? rawPName.trim() : '';

  const brand = (ctx.brand || ctx.brandName || ctx.brand_name || '').trim();
  const category = (ctx.category || ctx.categoryName || ctx.category_name || '').trim();
  const unit = (ctx.unit || ctx.unitName || ctx.unit_name || '').trim();
  const sha256 = (ctx.sha256 || '').trim();

  return {
    _id: publicId,
    id: publicId,
    publicId,
    cloudinaryPublicId: publicId,
    imageUrl: r.secure_url || r.url,
    secureUrl: r.secure_url || r.url,
    thumbnailUrl: r.secure_url || r.url,
    displayName: displayName || productName || 'Product Image',
    searchableName: productName || displayName || 'Product Image',
    productName: productName || (displayName !== publicId ? displayName : ''),
    brand,
    category,
    unit,
    formula: (ctx.formula || '').trim(),
    sha256,
    hasMetadata: Boolean(productName || brand || category || unit),
    createdAt: r.created_at || new Date().toISOString(),
    context: ctx,
  };
}

export const cloudinaryProductImageService = {
  /**
   * Search Cloudinary `fertilizer_erp/products` folder directly
   * Cloudinary is the primary source of truth for Shared Product Images.
   */
  async searchLibrary({ query = '', brand = '', category = '', page = 1, limit = 24 }) {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));

    if (!envConfig.cloudinary.cloudName || !envConfig.cloudinary.apiKey || !envConfig.cloudinary.apiSecret) {
      logger.warn('Cloudinary credentials missing for image search');
      return { images: [], total: 0, page: 1, limit: limitNum, totalPages: 1 };
    }

    try {
      const expressions = ['folder:fertilizer_erp/products*'];

      const trimmedQuery = (query || '').trim();
      if (trimmedQuery) {
        // Sanitize query string for Cloudinary search expression
        const cleanQuery = trimmedQuery.replace(/[^\w\s:-]/g, '').trim();
        if (cleanQuery) {
          expressions.push(cleanQuery);
        }
      }

      const trimmedBrand = (brand || '').trim();
      if (trimmedBrand) {
        expressions.push(`context.brand:${trimmedBrand}`);
      }

      const trimmedCategory = (category || '').trim();
      if (trimmedCategory) {
        expressions.push(`context.category:${trimmedCategory}`);
      }

      const finalExpression = expressions.join(' AND ');

      const searchRes = await cloudinary.search
        .expression(finalExpression)
        .with_field('context')
        .with_field('metadata')
        .with_field('tags')
        .sort_by('created_at', 'desc')
        .max_results(limitNum)
        .execute();

      const resources = searchRes.resources || [];
      const total = searchRes.total_count || resources.length;

      const images = resources.map(normalizeCloudinaryAsset);

      return {
        images,
        total,
        page: 1,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      };
    } catch (err) {
      logger.error('Error searching Cloudinary product images:', err);
      return { images: [], total: 0, page: 1, limit: limitNum, totalPages: 1 };
    }
  },

  /**
   * Fast targeted lookup in Cloudinary for an exact binary duplicate using SHA-256 context metadata.
   */
  async findExactDuplicateBySha256(sha256Hash) {
    if (!sha256Hash || !envConfig.cloudinary.cloudName) return null;

    try {
      const searchRes = await cloudinary.search
        .expression(`folder:fertilizer_erp/products* AND context.sha256:${sha256Hash}`)
        .with_field('context')
        .with_field('metadata')
        .max_results(1)
        .execute();

      const resources = searchRes.resources || [];
      if (resources.length > 0) {
        const match = resources[0];
        const normalized = normalizeCloudinaryAsset(match);
        return {
          public_id: match.public_id,
          secure_url: match.secure_url || match.url,
          url: match.secure_url || match.url,
          display_name: normalized.displayName,
          context: match.context || {},
          asset: normalized,
        };
      }
      return null;
    } catch (err) {
      logger.warn('Error querying Cloudinary for exact SHA-256 duplicate:', err.message);
      return null;
    }
  },

  /**
   * Register or update context metadata on a Cloudinary product image asset
   */
  async registerImage({ imageUrl, cloudinaryPublicId, searchableName, brand = '', category = '', unit = '', sha256 = '' }) {
    return await this.enrichImageLibraryRecord({
      imageUrl,
      cloudinaryPublicId,
      searchableName,
      brand,
      category,
      unit,
      sha256,
    });
  },

  /**
   * Update Cloudinary asset context metadata (productName, brand, category, unit, sha256)
   * Updates existing Cloudinary asset in place without creating duplicate assets.
   */
  async enrichImageLibraryRecord({ imageUrl, cloudinaryPublicId, searchableName, brand = '', category = '', unit = '', sha256 = '' }) {
    const publicId = extractPublicId(cloudinaryPublicId || imageUrl);
    if (!publicId) return null;

    const contextObj = {};
    if (searchableName && searchableName.trim()) contextObj.productName = searchableName.trim();
    if (brand && brand.trim()) contextObj.brand = brand.trim();
    if (category && category.trim()) contextObj.category = category.trim();
    if (unit && unit.trim()) contextObj.unit = unit.trim();
    if (sha256 && sha256.trim()) contextObj.sha256 = sha256.trim();

    const ctxStr = Object.entries(contextObj)
      .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, ' ')}`)
      .join('|');

    if (!ctxStr) return null;

    try {
      await cloudinary.uploader.add_context(ctxStr, [publicId]);
      logger.info(`✅ Cloudinary Asset Context Updated (${publicId}): ${ctxStr}`);
      return { publicId, context: contextObj };
    } catch (err) {
      logger.warn(`Failed to update Cloudinary asset context (${publicId}):`, err.message);
      return null;
    }
  },
};
