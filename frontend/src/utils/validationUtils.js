/**
 * GSTIN Regex Pattern: 15 alphanumeric characters standard GST format in India.
 * Format: 2 digits state code + 5 chars PAN + 4 digits PAN + 1 char PAN + 1 entity code + 'Z' + 1 check digit.
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

/**
 * Validates an optional GSTIN / Tax Registration number.
 * Returns true if empty/whitespace (optional behavior) or matches standard GSTIN format.
 *
 * @param {string} [gst] - GST number string to validate
 * @returns {boolean}
 */
export function validateGstNumber(gst) {
  if (!gst || !gst.trim()) return true;
  return GSTIN_REGEX.test(gst.trim());
}
