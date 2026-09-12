/**
 * Format a date string to a readable format.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} opts
 */
export function formatDate(date, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', opts);
}

/**
 * Format a number with commas.
 * @param {number} n
 */
export function formatNumber(n) {
  if (n == null) return '0';
  return n.toLocaleString();
}

/**
 * Get initials from a full name (max 2 chars).
 * @param {string} name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Clamp a percentage between 0 and 100.
 * @param {number} value
 * @param {number} total
 */
export function toPct(value, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/**
 * Pick an avatar gradient pair by id.
 * @param {number} id
 * @param {Array} gradients
 */
export function pickGradient(id, gradients) {
  return gradients[(id || 0) % gradients.length];
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trigger a browser file download from a Blob (or axios blob response).
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Classify an Axios error into a user-friendly message with context.
 *
 * Returns a string suitable for toast.error() that tells the user
 * *why* something failed — not just "something went wrong."
 *
 * @param {Error} err         The caught error
 * @param {string} context    What was being attempted, e.g. "load students"
 * @returns {string}
 */
export function classifyApiError(err, context = 'complete this action') {
  // No response at all — network / CORS issue
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return `Request timed out while trying to ${context}. Check your connection.`;
    }
    return `Cannot reach the server. Check your internet connection and try again.`;
  }

  const status  = err.response.status;
  const code    = err.response.data?.code;
  const message = err.response.data?.message;

  // Use the server's own message when it's specific enough
  if (message && message.length < 120) {
    // Still prefix with context for clarity
    if (status >= 500) return `Server error while trying to ${context}. The team has been notified.`;
    return message;
  }

  switch (status) {
    case 400: return `Invalid request — check your input and try again.`;
    case 401: return `Your session has expired. Please log in again.`;
    case 403: return code === 'PASSWORD_CHANGE_REQUIRED'
      ? 'Please change your temporary password before continuing.'
      : `You don't have permission to ${context}.`;
    case 404: return `The requested record was not found.`;
    case 409: return `A conflict occurred — the record may already exist.`;
    case 422: return `Validation failed — check required fields.`;
    case 429: return `Too many requests. Please wait a moment before trying again.`;
    case 503: return `The server is temporarily unavailable. Try again in a few seconds.`;
    default:  return status >= 500
      ? `Server error (${status}) while trying to ${context}.`
      : `Failed to ${context} (${status}).`;
  }
}
