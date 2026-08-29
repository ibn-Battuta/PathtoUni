// Verbatim quotation. A model (or parser) may propose a string; code decides if it is real.
// No match → the field is unverified. Never guessed, never silently dropped.

export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the literal substring of `haystack` that matches `needle`,
 * allowing only whitespace to differ. Exact match is preferred.
 * Returns null if the words do not appear in order in the capture.
 */
export function findVerbatim(haystack, needle) {
  if (needle == null) return null;
  const n = String(needle).trim();
  if (!n) return null;
  if (haystack.includes(n)) return n;
  const parts = n.split(/\s+/).filter(Boolean).map(escapeRe);
  if (parts.length === 0) return null;
  const re = new RegExp(parts.join('\\s+'));
  const m = haystack.match(re);
  return m ? m[0] : null;
}

/** True when `quote` occurs literally in the capture (no whitespace folding). */
export function isLiteralSubstring(haystack, quote) {
  return typeof quote === 'string' && quote.length > 0 && haystack.includes(quote);
}

/**
 * Attach a verbatim quote to a proposed field.
 * If the proposal cannot be found in the capture, mark unverified — do not invent a quote.
 */
export function verifyQuote(captureText, proposed, extra = {}) {
  const quote = findVerbatim(captureText, proposed);
  if (!quote) {
    return { verification: 'unverified', quote: null, proposed, ...extra };
  }
  return { verification: 'verified', quote, ...extra };
}
