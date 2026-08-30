/**
 * Unified helper function to auto-fill product form fields & match Brand / Category / Unit master data
 * from a selected Cloudinary image asset object.
 *
 * @param {Object} asset - Cloudinary image asset containing metadata (imageUrl, productName, brand, category, unit, etc.)
 * @param {Object} masters - Available master data lists: { brands: [], categories: [], units: [] }
 * @param {Function} updateField - Form update handler (fieldName, value) => void
 * @param {Object} setUnmatched - Callbacks to set unmatched master prompts: { setUnmatchedBrand, setUnmatchedCategory, setUnmatchedUnit }
 * @param {Object} options - { currentName: '' }
 */
export function applySelectedImageMetadata(asset, masters = {}, updateField, setUnmatched = {}, options = {}) {
  if (!asset || typeof updateField !== 'function') return;

  const { brands = [], categories = [], units = [] } = masters;
  const { setUnmatchedBrand, setUnmatchedCategory, setUnmatchedUnit } = setUnmatched;

  // 1. Image URL
  const imageUrl = asset.imageUrl || asset.secureUrl || asset.secure_url || asset.url || '';
  if (imageUrl) {
    updateField('image', imageUrl);
  }

  // 2. Product Name Conflict Handling
  const metaName = (asset.productName || asset.metadata?.productName || asset.searchableName || '').trim();
  const cleanPublicId = (asset.publicId || asset.public_id || '').split('/').pop() || '';

  const isGenericOrFilename =
    !metaName ||
    metaName === 'Product Image' ||
    metaName === 'Unnamed Product Image' ||
    metaName === cleanPublicId ||
    /^(prod|product)-?\d+-\d+/i.test(metaName);

  if (!isGenericOrFilename) {
    const typedName = (options.currentName || '').trim();
    if (!typedName) {
      // Auto-fill Product Name if field is currently empty
      updateField('name', metaName);
    } else if (typedName.toLowerCase() !== metaName.toLowerCase()) {
      // If user typed a different name, only overwrite if explicitly requested
      if (options.overwriteNameConflict) {
        updateField('name', metaName);
      }
    }
  }

  const normalize = (str) => (str || '').trim().toLowerCase();

  // 3. Brand Master Matching
  const assetBrand = (asset.brand || asset.metadata?.brand || '').trim();
  if (typeof setUnmatchedBrand === 'function') {
    setUnmatchedBrand('');
  }

  if (assetBrand) {
    const matchedBrand = brands.find(
      (b) => normalize(b.name) === normalize(assetBrand) || normalize(b.companyName) === normalize(assetBrand)
    );

    if (matchedBrand) {
      updateField('brandId', matchedBrand._id || matchedBrand.id || '');
    } else {
      updateField('brandId', '');
      if (typeof setUnmatchedBrand === 'function') {
        setUnmatchedBrand(assetBrand);
      }
    }
  } else {
    updateField('brandId', '');
  }

  // 4. Category Master Matching
  const assetCategory = (asset.category || asset.metadata?.category || '').trim();
  if (typeof setUnmatchedCategory === 'function') {
    setUnmatchedCategory('');
  }

  if (assetCategory) {
    const matchedCategory = categories.find(
      (c) => normalize(c.name) === normalize(assetCategory) || normalize(c.slug) === normalize(assetCategory)
    );

    if (matchedCategory) {
      updateField('categoryId', matchedCategory._id || matchedCategory.id || '');
    } else {
      updateField('categoryId', '');
      if (typeof setUnmatchedCategory === 'function') {
        setUnmatchedCategory(assetCategory);
      }
    }
  } else {
    updateField('categoryId', '');
  }

  // 5. Unit Master Matching
  const assetUnit = (asset.unit || asset.metadata?.unit || '').trim();
  if (typeof setUnmatchedUnit === 'function') {
    setUnmatchedUnit('');
  }

  if (assetUnit) {
    const matchedUnit = units.find(
      (u) => normalize(u.name) === normalize(assetUnit) || normalize(u.shortName) === normalize(assetUnit)
    );

    if (matchedUnit) {
      updateField('unitId', matchedUnit._id || matchedUnit.id || '');
    } else {
      updateField('unitId', '');
      if (typeof setUnmatchedUnit === 'function') {
        setUnmatchedUnit(assetUnit);
      }
    }
  } else {
    updateField('unitId', '');
  }
}
