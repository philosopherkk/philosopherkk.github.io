/**
 * Rotation / box helpers (ported from deid.py).
 * @module core/geometry
 */

/**
 * Map a box from an image rotated k*90° CCW back to the original W×H frame.
 * @param {[number, number, number, number]} box
 * @param {number} k  0..3
 * @param {number} W
 * @param {number} H
 * @returns {[number, number, number, number]}
 */
export function unrotateBox(box, k, W, H) {
  const [x0, y0, x1, y1] = box;
  const pts = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
  const out = [];
  for (const [x, y] of pts) {
    let ox;
    let oy;
    if (k === 0) {
      ox = x;
      oy = y;
    } else if (k === 1) {
      ox = W - y;
      oy = x;
    } else if (k === 2) {
      ox = W - x;
      oy = H - y;
    } else {
      ox = y;
      oy = H - x;
    }
    out.push([ox, oy]);
  }
  const xs = out.map((p) => p[0]);
  const ys = out.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/**
 * @param {number} W
 * @param {number} H
 * @param {number} k
 * @returns {[number, number]}
 */
export function rotSize(W, H, k) {
  return k % 2 === 0 ? [W, H] : [H, W];
}

/**
 * Clamp a box to image bounds.
 * @param {[number, number, number, number]} box
 * @param {number} W
 * @param {number} H
 * @returns {[number, number, number, number]|null}
 */
export function clampBox(box, W, H) {
  const a = Math.max(0, Math.min(W, box[0]));
  const b = Math.max(0, Math.min(H, box[1]));
  const c = Math.max(0, Math.min(W, box[2]));
  const d = Math.max(0, Math.min(H, box[3]));
  if (c <= a || d <= b) return null;
  return [a, b, c, d];
}

/**
 * Score uprightness: count high-confidence alphabetic words.
 * @param {import('./types.js').Word[]} words
 * @returns {number}
 */
export function uprightScore(words) {
  let n = 0;
  for (const w of words) {
    if (w.conf > 75 && w.text.replace(/[^A-Za-z]/g, "").length >= 3) n += 1;
  }
  return n;
}
