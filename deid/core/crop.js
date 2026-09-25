/**
 * Crop / erase / cut geometry for a detected device layout.
 * @module core/crop
 */

import { CROP, MAX_SHIFT } from "./rules.js";

/**
 * Anchor-based vertical shift (fraction of page height).
 * @param {string} device
 * @param {import('./types.js').Word[]} words
 * @param {number} rw
 * @param {number} rh
 * @returns {{ dy: number, anchor: string|null }}
 */
export function anchorShift(device, words, rw, rh) {
  const spec = CROP[device];
  if (!spec || !spec.anchors) return { dy: 0, anchor: null };
  for (const a of spec.anchors) {
    const [xa, xb] = a.xRange;
    const [ya, yb] = a.yRange;
    const c = words.filter(
      (w) =>
        w.conf >= 70 &&
        a.prefixes.some((k) => w.text.toLowerCase().startsWith(k)) &&
        w.x0 >= xa * rw &&
        w.x0 <= xb * rw &&
        w.y0 >= ya * rh &&
        w.y0 <= yb * rh
    );
    if (c.length) {
      const w = c.reduce((m, x) => (x.y0 < m.y0 ? x : m));
      const dy = w.y0 / rh - a.expectedY0;
      if (Math.abs(dy) <= MAX_SHIFT) return { dy, anchor: a.prefixes[0] };
    }
  }
  return { dy: 0, anchor: null };
}

/**
 * Compute pixel keep / erase / cut for a device on an upright page.
 * @param {string} device
 * @param {number} rw
 * @param {number} rh
 * @param {number} dy
 * @returns {{ keep: [number,number,number,number], erase: [number,number,number,number][], cuts: [number,number][] }}
 */
export function computeCropWindows(device, rw, rh, dy = 0) {
  const spec = CROP[device] || CROP.generic;
  const [x0, y0, x1, y1] = spec.keep;
  /** @type {[number, number, number, number]} */
  const keep = [
    Math.floor(x0 * rw),
    Math.floor(Math.max(0, y0 + dy) * rh),
    Math.floor(x1 * rw),
    Math.floor(Math.min(1, y1 + dy) * rh),
  ];
  const erase = (spec.erase || []).map(
    /** @returns {[number, number, number, number]} */
    ([a, b, c, d]) => [a * rw, (b + dy) * rh, c * rw, (d + dy) * rh]
  );
  const cuts = (spec.cut || []).map(
    /** @returns {[number, number]} */
    ([b, d]) => [Math.floor((b + dy) * rh), Math.floor((d + dy) * rh)]
  );
  return { keep, erase, cuts };
}

/**
 * Fill rectangles white on ImageData (mutates).
 * @param {ImageData} imageData
 * @param {[number, number, number, number][]} boxes
 */
export function fillWhite(imageData, boxes) {
  const { width: W, height: H, data } = imageData;
  for (const box of boxes) {
    const a = Math.max(0, Math.floor(box[0]));
    const b = Math.max(0, Math.floor(box[1]));
    const c = Math.min(W, Math.ceil(box[2]));
    const d = Math.min(H, Math.ceil(box[3]));
    for (let y = b; y < d; y++) {
      let i = (y * W + a) * 4;
      for (let x = a; x < c; x++) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
        i += 4;
      }
    }
  }
}

/**
 * Crop ImageData to a keep window.
 * @param {ImageData} src
 * @param {[number, number, number, number]} keep
 * @returns {ImageData}
 */
export function cropImageData(src, keep) {
  const [x0, y0, x1, y1] = [
    Math.max(0, Math.floor(keep[0])),
    Math.max(0, Math.floor(keep[1])),
    Math.min(src.width, Math.ceil(keep[2])),
    Math.min(src.height, Math.ceil(keep[3])),
  ];
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const srcOff = ((y0 + y) * src.width + x0) * 4;
    const dstOff = y * w * 4;
    out.data.set(src.data.subarray(srcOff, srcOff + w * 4), dstOff);
  }
  return out;
}

/**
 * Remove full-width horizontal bands and join remaining rows.
 * @param {ImageData} src
 * @param {[number, number][]} bands  Absolute y0,y1 in src
 * @returns {ImageData}
 */
export function cutRows(src, bands) {
  const keep = new Uint8Array(src.height);
  keep.fill(1);
  for (const [y0, y1] of bands) {
    const a = Math.max(0, Math.floor(y0));
    const b = Math.min(src.height, Math.ceil(y1));
    for (let y = a; y < b; y++) keep[y] = 0;
  }
  const rows = [];
  for (let y = 0; y < src.height; y++) if (keep[y]) rows.push(y);
  const h = Math.max(1, rows.length);
  const out = new ImageData(src.width, h);
  for (let i = 0; i < rows.length; i++) {
    const srcOff = rows[i] * src.width * 4;
    out.data.set(src.data.subarray(srcOff, srcOff + src.width * 4), i * src.width * 4);
  }
  return out;
}

/**
 * Apply device crop: erase → crop keep → cut bands.
 * @param {ImageData} upright
 * @param {string} device
 * @param {number} dy
 * @returns {{ image: ImageData, keep: [number,number,number,number], erase: [number,number,number,number][], cuts: [number,number][] }}
 */
export function applyCrop(upright, device, dy = 0) {
  const { keep, erase, cuts } = computeCropWindows(device, upright.width, upright.height, dy);
  const copy = new ImageData(new Uint8ClampedArray(upright.data), upright.width, upright.height);
  fillWhite(copy, erase);
  let out = cropImageData(copy, keep);
  if (cuts.length) {
    out = cutRows(
      out,
      cuts.map(([b, d]) => [b - keep[1], d - keep[1]])
    );
  }
  return { image: out, keep, erase, cuts };
}
