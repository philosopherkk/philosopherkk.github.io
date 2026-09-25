/**
 * PHI / identity label masking — ported from deid.py label_masks / is_ident_token.
 * @module core/phi
 */

import {
  LABELS,
  DATE_LABELS,
  BELOW,
  STOP,
  ID_LABELS,
  ID_DATE_LABELS,
  RX,
  CJK,
  WHITELIST,
  SERIAL_LABEL_RX,
  SERIAL_TEXT_RX,
  SERIAL_VALUE_RX,
  norm,
  isIdentToken,
} from "./rules.js";
import { unrotateBox, rotSize, uprightScore } from "./geometry.js";

/**
 * Masks for label→value and regex hits (in the words' coordinate frame).
 * @param {import('./types.js').Word[]} words
 * @param {number} W
 * @param {number} H
 * @param {Set<string>} [labels]
 * @param {Set<string>} [dateLabels]
 * @returns {[number, number, number, number][]}
 */
export function labelMasks(words, W, H, labels = LABELS, dateLabels = DATE_LABELS) {
  /** @type {[number, number, number, number][]} */
  const boxes = [];
  if (!words || !words.length) return boxes;

  const hs = words.filter((w) => w.conf > 50).map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const th = Math.max(12, hs.length ? hs[Math.floor(hs.length / 2)] : 20);
  const good = words.filter((w) => w.conf >= 30);

  const sameRow = (a, b) => {
    const ca = (a.y0 + a.y1) / 2;
    const cb = (b.y0 + b.y1) / 2;
    return Math.abs(ca - cb) < 0.7 * Math.max(a.y1 - a.y0, b.y1 - b.y0, th * 0.8);
  };

  for (let i = 0; i < good.length; i++) {
    const w = good[i];
    const n = norm(w.text);
    const nxt = good
      .filter((v) => v !== w && sameRow(w, v) && v.x0 - w.x1 >= 0 && v.x0 - w.x1 < 2.5 * th)
      .sort((a, b) => a.x0 - b.x0);
    const comb = n + (nxt.length ? norm(nxt[0].text) : "");
    const isLab = labels.has(n) || labels.has(comb) || dateLabels.has(n) || dateLabels.has(comb);
    if (!isLab || !n.length) continue;

    let reach = labels.has(n) || labels.has(comb) ? 22 * th : 14 * th;
    reach = Math.min(reach, 0.45 * W);
    const right = good
      .filter((v) => v !== w && sameRow(w, v) && v.x0 >= w.x1 - 2 && v.x0 - w.x1 < reach)
      .sort((a, b) => a.x0 - b.x0);

    let xEnd = w.x1;
    let last = w;
    for (const v of right) {
      if (v.x0 - last.x1 > 4.5 * th) break;
      if (STOP.has(norm(v.text))) break;
      xEnd = v.x1;
      last = v;
    }
    const pad = Math.floor(0.6 * th);
    if (xEnd > w.x1) {
      boxes.push([w.x0 - pad, w.y0 - pad, xEnd + 3 * pad, w.y1 + pad]);
    } else if (BELOW.has(comb) || BELOW.has(n)) {
      boxes.push([
        w.x0 - 2 * pad,
        w.y1,
        Math.max(w.x1, w.x0 + 8 * th) + 2 * pad,
        w.y1 + Math.floor(2.6 * th),
      ]);
    } else {
      boxes.push([w.x1, w.y0 - pad, w.x1 + Math.min(8 * th, 0.2 * W), w.y1 + pad]);
    }
  }

  for (const w of words) {
    if (w.conf < 20) continue;
    const h = w.y1 - w.y0;
    if (h > 2.5 * th && /^[\d\s]+$/.test(w.text)) continue;
    if (isIdentToken(w.text) || (CJK.test(w.text) && w.conf >= 60)) {
      const pad = Math.floor(0.5 * (h < 3 * th ? Math.max(th, h) : th));
      boxes.push([w.x0 - pad, w.y0 - pad, w.x1 + pad, w.y1 + pad]);
    }
  }
  return boxes;
}

/**
 * Build flag hits from OCR across 4 rotations (for UI safety net — does not auto-blank).
 * @param {Record<number, import('./types.js').Word[]>} ocrByRot  k -> words in rotated coords
 * @param {number} W  Original width
 * @param {number} H  Original height
 * @param {import('./types.js').Word[]} [cjkWords]  Optional Chinese OCR on upright image
 * @returns {import('./types.js').FlagHit[]}
 */
export function collectFlags(ocrByRot, W, H, cjkWords = []) {
  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const keys = Object.keys(ocrByRot).map(Number);
  const kUp = keys.reduce((best, k) =>
    uprightScore(ocrByRot[k] || []) > uprightScore(ocrByRot[best] || []) ? k : best
  , keys[0] || 0);

  for (const k of keys) {
    let words = ocrByRot[k] || [];
    const [rw, rh] = rotSize(W, H, k);
    if (k !== kUp) words = words.filter((w) => w.conf >= 80);
    for (const b of labelMasks(words, rw, rh, ID_LABELS, ID_DATE_LABELS)) {
      const box = unrotateBox(b, k, W, H);
      flags.push({ box, reason: "identity_or_date", blanked: false });
    }
  }

  for (const w of cjkWords) {
    const chars = w.text.match(CJK) || [];
    if (chars.length >= 2 && w.conf >= 80) {
      const p = Math.floor(0.6 * (w.y1 - w.y0));
      const box = unrotateBox([w.x0 - p, w.y0 - p, w.x1 + p, w.y1 + p], kUp, W, H);
      flags.push({ box, reason: "cjk_name", text: w.text, blanked: false });
    }
  }

  return mergeNearbyFlags(flags);
}

/**
 * @param {import('./types.js').FlagHit[]} flags
 * @returns {import('./types.js').FlagHit[]}
 */
function mergeNearbyFlags(flags) {
  if (flags.length < 2) return flags;
  const out = [];
  const used = new Set();
  for (let i = 0; i < flags.length; i++) {
    if (used.has(i)) continue;
    let [a, b, c, d] = flags[i].box;
    let reason = flags[i].reason;
    let text = flags[i].text;
    for (let j = i + 1; j < flags.length; j++) {
      if (used.has(j)) continue;
      const [x0, y0, x1, y1] = flags[j].box;
      const overlap =
        Math.min(c, x1) > Math.max(a, x0) && Math.min(d, y1) > Math.max(b, y0);
      const near =
        Math.abs(((a + c) / 2) - ((x0 + x1) / 2)) < 40 &&
        Math.abs(((b + d) / 2) - ((y0 + y1) / 2)) < 40;
      if (overlap || near) {
        used.add(j);
        a = Math.min(a, x0);
        b = Math.min(b, y0);
        c = Math.max(c, x1);
        d = Math.max(d, y1);
        if (flags[j].text) text = (text ? text + " " : "") + flags[j].text;
      }
    }
    out.push({ box: [a, b, c, d], reason, text, blanked: false });
  }
  return out;
}

/**
 * Post-crop serial check — return list of 'rot:token' hits.
 * @param {Record<number, import('./types.js').Word[]>} ocrByRot
 * @returns {string[]}
 */
export function serialHits(ocrByRot) {
  /** @type {string[]} */
  const hits = [];
  const keys = Object.keys(ocrByRot).map(Number);
  if (!keys.length) return hits;
  const kUp = keys.reduce((best, k) =>
    uprightScore(ocrByRot[k] || []) > uprightScore(ocrByRot[best] || []) ? k : best
  , keys[0]);

  for (const k of keys) {
    const thr = k === kUp ? 30 : 80;
    const good = (ocrByRot[k] || []).filter((w) => w.conf >= thr);
    for (const w of good) {
      const t = w.text.replace(/^[\s;,]+|[\s;,]+$/g, "");
      const lab =
        SERIAL_LABEL_RX.test(t) && (k === kUp || !/^sn$/i.test(t));
      const val =
        w.conf >= (k === kUp ? 60 : 80) && SERIAL_VALUE_RX.some((r) => r.test(t));
      if (lab || val) hits.push(`${k * 90}:${t}`);
    }
    const joined = good.map((w) => w.text).join(" ");
    let m;
    const rx = new RegExp(SERIAL_TEXT_RX.source, "gi");
    while ((m = rx.exec(joined))) {
      hits.push(`${k * 90}:${m[0]}`);
    }
  }
  return [...new Set(hits)].sort();
}

/**
 * Test whether a string still contains any of the given fake identifiers.
 * Used by automated tests (not for production auto-pass).
 * @param {string} text
 * @param {string[]} identifiers
 * @returns {string[]}  Identifiers still found
 */
export function remainingIdentifiers(text, identifiers) {
  const upper = text.toUpperCase();
  return identifiers.filter((id) => upper.includes(String(id).toUpperCase()));
}

export { isIdentToken, WHITELIST, RX, CJK, ID_LABELS, ID_DATE_LABELS };
