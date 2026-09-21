// backend/services/phoneUtils.js

const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || '237';

/**
 * Normalize a phone number to E.164 WITHOUT the leading + (for WhatsApp API).
 * Examples:
 *   "677123456"        → "237677123456"
 *   "+237 677 123 456" → "237677123456"
 *   "237677123456"     → "237677123456"
 *   "(237) 677-1234"   → "2376771234"
 */
function normalizePhone(raw, countryCode = DEFAULT_COUNTRY_CODE) {
  if (!raw) return null;
  let cleaned = String(raw).replace(/[^\d+]/g, '');

  // Strip leading + if present
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);

  // If it already starts with the country code, assume it's complete
  if (cleaned.startsWith(countryCode) && cleaned.length >= countryCode.length + 7) {
    return cleaned;
  }

  // If it's a local number (7-10 digits), prepend country code
  if (cleaned.length >= 7 && cleaned.length <= 10) {
    return countryCode + cleaned.replace(/^0+/, ''); // strip leading 0s
  }

  return cleaned; // fallback: return as-is
}

/**
 * Format for display: "+237 677 123 456"
 */
function formatPhoneForDisplay(normalized) {
  if (!normalized) return '';
  const cc = DEFAULT_COUNTRY_CODE;
  if (normalized.startsWith(cc)) {
    const rest = normalized.slice(cc.length);
    return `+${cc} ${rest.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3')}`;
  }
  return '+' + normalized;
}

module.exports = { normalizePhone, formatPhoneForDisplay };