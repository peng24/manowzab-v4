/**
 * Database & Security Utility Functions
 */

/**
 * Escapes special HTML characters to prevent XSS injection.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitizes a string to be safely used as a Firebase Realtime Database path key.
 * Removes forbidden characters: '.', '#', '$', '[', ']', '/'
 * @param {string} key 
 * @returns {string}
 */
export function sanitizeDbKey(key) {
  if (!key) return "invalid_key";
  const sanitized = String(key).replace(/[.#$\[\]\/]/g, "_").trim();
  return sanitized || "invalid_key";
}
