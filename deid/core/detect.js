/**
 * Device / layout detection from OCR text.
 * @module core/detect
 */

import { DEVICE_KEYWORDS, CROP } from "./rules.js";

/**
 * Score each device by distinct whole-phrase keyword hits; return best key (or null).
 * @param {string} text
 * @returns {string|null}
 */
export function detectDevice(text) {
  const t = ` ${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  /** @type {Record<string, number>} */
  const scores = {};
  for (const [d, kws] of Object.entries(DEVICE_KEYWORDS)) {
    scores[d] = kws.reduce((n, kw) => (t.includes(` ${kw} `) ? n + 1 : n), 0);
  }
  if ((scores.topcon_letter || 0) >= 2 && (scores.topcon || 0) >= 1) {
    return "topcon_letter";
  }
  let best = null;
  let bestScore = 0;
  for (const [d, s] of Object.entries(scores)) {
    if (s > bestScore) {
      best = d;
      bestScore = s;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Detect device or fall back to generic.
 * @param {string} text
 * @returns {string}
 */
export function detectDeviceOrGeneric(text) {
  const d = detectDevice(text);
  if (d && CROP[d]) return d;
  return "generic";
}
