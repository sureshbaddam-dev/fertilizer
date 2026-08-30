export function escapeRegex(string = '') {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeProductName(name = '') {
  if (!name || typeof name !== 'string') return { normalizedName: '', keywords: [] };

  // Convert to lowercase, replace punctuation/colons/hyphens/slashes with spaces
  const cleanStr = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = cleanStr.split(' ').filter((w) => w.length >= 1);
  const keywordsSet = new Set(rawTokens);

  // If numbers present (like 20:20 or 20-20), also add numeric sequence (e.g. 2020)
  const numbersOnly = name.replace(/[^0-9]/g, '');
  if (numbersOnly.length >= 2) {
    keywordsSet.add(numbersOnly);
  }

  return {
    normalizedName: cleanStr,
    keywords: Array.from(keywordsSet),
  };
}
