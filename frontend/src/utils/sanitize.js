// backend/utils/sanitize.js

/**
 * Convert any integer-like input to a real integer or null.
 * Empty strings, undefined, and non-numeric strings all become null.
 */
function toIntOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  const str = String(value).trim();
  if (str === '') return null;
  const n = Number(str);
  return Number.isInteger(n) ? n : null;
}

function toStrOrNull(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

function toIntArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(toIntOrNull).filter((v) => v !== null);
}

module.exports = { toIntOrNull, toStrOrNull, toIntArray };