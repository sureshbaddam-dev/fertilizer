import { cloudinary } from '../config/cloudinary.config.js';

function isRawNumericId(str = '') {
  if (!str) return true;
  const s = str.trim();
  if (/^\d{10,}/.test(s)) return true;
  if (/^(prod|product)-?\d+-\d+/i.test(s)) return true;
  return false;
}

function resolveCloudinaryDisplayName(r) {
  const context = r.context || {};
  const metadata = r.metadata || {};

  // 1. Cloudinary context custom productName / product_name
  if (context.productName && context.productName.trim() && context.productName !== 'Product Image' && context.productName !== 'Unnamed Product Image') {
    return context.productName.trim();
  }
  if (context.product_name && context.product_name.trim()) {
    return context.product_name.trim();
  }

  // 2. Cloudinary metadata productName / product_name
  if (metadata.productName && metadata.productName.trim()) {
    return metadata.productName.trim();
  }
  if (metadata.product_name && metadata.product_name.trim()) {
    return metadata.product_name.trim();
  }

  // 3. Cloudinary display_name (if not a raw numeric string)
  if (r.display_name && r.display_name.trim() && !isRawNumericId(r.display_name)) {
    return r.display_name.trim();
  }

  // 4. Cloudinary contextual metadata title/caption
  if (context.title && context.title.trim()) {
    return context.title.trim();
  }
  if (context.caption && context.caption.trim()) {
    return context.caption.trim();
  }
  if (metadata.title && metadata.title.trim()) {
    return metadata.title.trim();
  }
  if (metadata.caption && metadata.caption.trim()) {
    return metadata.caption.trim();
  }

  // 5. Original filename
  if (r.original_filename && r.original_filename.trim() && !isRawNumericId(r.original_filename)) {
    return r.original_filename.trim();
  }

  // 6. Clean public_id filename fallback
  const publicId = r.public_id || '';
  const rawFileName = publicId.split('/').pop() || '';
  const cleanTitle = rawFileName
    .replace(/^(prod|product)-?\d*-?\d*/i, '')
    .replace(/^\d{10,}/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  return cleanTitle || r.display_name || 'Unnamed Product Image';
}

async function audit() {
  try {
    const res = await cloudinary.search
      .expression('folder:fertilizer_erp/products*')
      .with_field('context')
      .with_field('metadata')
      .with_field('tags')
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    const target = res.resources.find(r => r.public_id.includes('17047486321752926459') || r.display_name === 'centrain');
    if (target) {
      console.log('🎯 Found Target Asset:', {
        public_id: target.public_id,
        display_name: target.display_name,
        context: target.context,
        resolvedDisplayName: resolveCloudinaryDisplayName(target)
      });
    }
  } catch (err) {
    console.error('Audit Error:', err);
  }
}

audit().then(() => process.exit(0)).catch(console.error);
