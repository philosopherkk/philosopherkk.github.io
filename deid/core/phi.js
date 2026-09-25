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

/** Institution / clinic words (EN). Bare laterality Eye:R is excluded separately. */
export const INSTITUTION_EN =
  /\b(clinic|hospital|centre|center|medical|ophthalmic|limited|ltd)\b|\beye\s+(clinic|centre|center|hospital|institute|care)\b/i;

/** Chinese institution / clinic tokens. */
export const INSTITUTION_ZH = /醫院|診所|中心|眼科|醫務/;

/** Signature / staff lines that often remain after a generic crop. */
export const SIGNATURE_LINE =
  /\b(signature|signed|physician|doctor|operator|technician)\b|\bdr\.?\b|簽名/i;

/** HK phone: +852 / 8-digit starting 2–9, optional separators. */
export const HK_PHONE =
  /(?:\+?852[-\s]?)?(?:\(?\+?852\)?[-\s]?)?[2-9]\d{3}[-\s]?\d{4}\b/;

/**
 * True when token is laterality "Eye:R/L" etc., not a clinic name.
 * @param {string} t
 */
export function isLateralityEye(t) {
  return /^eye\s*[:：/\-]?[\s]*[rl]\b|^eye\s*(od|os|ou)\b|^eye$/i.test(String(t).trim());
}

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
    if (isIdentToken(w.text) || HK_PHONE.test(w.text) || (CJK.test(w.text) && w.conf >= 60)) {
      const pad = Math.floor(0.5 * (h < 3 * th ? Math.max(th, h) : th));
      boxes.push([w.x0 - pad, w.y0 - pad, w.x1 + pad, w.y1 + pad]);
    }
  }
  return boxes;
}

/**
 * Group words into visual lines and flag clinic / signature / phone lines.
 * @param {import('./types.js').Word[]} words
 * @param {number} W
 * @param {number} H
 * @returns {import('./types.js').FlagHit[]}
 */
export function lineSafetyFlags(words, W, H) {
  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const good = (words || []).filter((w) => w.conf >= 40);
  if (!good.length) return flags;

  const hs = good.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const th = Math.max(10, hs[Math.floor(hs.length / 2)] || 16);

  /** @type {import('./types.js').Word[][]} */
  const lines = [];
  const used = new Set();
  const sorted = [...good].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  for (const w of sorted) {
    if (used.has(w)) continue;
    const line = [w];
    used.add(w);
    const cy = (w.y0 + w.y1) / 2;
    for (const v of sorted) {
      if (used.has(v)) continue;
      const cv = (v.y0 + v.y1) / 2;
      if (Math.abs(cv - cy) < 0.7 * Math.max(w.y1 - w.y0, v.y1 - v.y0, th * 0.8)) {
        line.push(v);
        used.add(v);
      }
    }
    line.sort((a, b) => a.x0 - b.x0);
    lines.push(line);
  }

  for (const line of lines) {
    const text = line.map((w) => w.text).join(" ");
    const joined = text.replace(/\s+/g, " ").trim();
    if (!joined) continue;

    let reason = null;
    if (INSTITUTION_ZH.test(joined)) reason = "institution";
    else if (INSTITUTION_EN.test(joined) && !isLateralityEye(joined)) reason = "institution";
    else if (SIGNATURE_LINE.test(joined)) reason = "signature_line";
    else if (HK_PHONE.test(joined)) reason = "phone";

    if (!reason && /\bEye\b/.test(joined) && !isLateralityEye(joined)) {
      const caps = joined.split(/\s+/).filter((t) => /^[A-Z]/.test(t));
      if (caps.length >= 2) reason = "institution";
    }

    if (!reason) continue;
    const pad = Math.floor(0.5 * th);
    const x0 = Math.min(...line.map((w) => w.x0)) - pad;
    const y0 = Math.min(...line.map((w) => w.y0)) - pad;
    const x1 = Math.max(...line.map((w) => w.x1)) + pad;
    const y1 = Math.max(...line.map((w) => w.y1)) + pad;
    flags.push({
      box: [Math.max(0, x0), Math.max(0, y0), Math.min(W, x1), Math.min(H, y1)],
      reason,
      text: joined,
      blanked: false,
    });
  }
  return flags;
}

/**
 * Build flag hits from OCR across 4 rotations (for UI safety net — does not auto-blank).
 * @param {Record<number, import('./types.js').Word[]>} ocrByRot
 * @param {number} W
 * @param {number} H
 * @param {import('./types.js').Word[]} [cjkWords]
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
      flags.push({ box: unrotateBox(b, k, W, H), reason: "identity_or_date", blanked: false });
    }
    for (const f of lineSafetyFlags(words, rw, rh)) {
      flags.push({ ...f, box: unrotateBox(f.box, k, W, H) });
    }
  }

  for (const w of cjkWords) {
    const chars = w.text.match(CJK) || [];
    if (chars.length >= 2 && w.conf >= 80) {
      const p = Math.floor(0.6 * (w.y1 - w.y0));
      flags.push({
        box: unrotateBox([w.x0 - p, w.y0 - p, w.x1 + p, w.y1 + p], kUp, W, H),
        reason: "cjk_name",
        text: w.text,
        blanked: false,
      });
    }
  }
  const [urw, urh] = rotSize(W, H, kUp);
  for (const f of lineSafetyFlags(cjkWords, urw, urh)) {
    flags.push({ ...f, box: unrotateBox(f.box, kUp, W, H) });
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
        Math.abs((a + c) / 2 - (x0 + x1) / 2) < 40 &&
        Math.abs((b + d) / 2 - (y0 + y1) / 2) < 40;
      if (overlap || near) {
        used.add(j);
        a = Math.min(a, x0);
        b = Math.min(b, y0);
        c = Math.max(c, x1);
        d = Math.max(d, y1);
        if (flags[j].text) text = (text ? text + " " : "") + flags[j].text;
        // Prefer specific safety reasons over generic identity_or_date
        const rank = (r) =>
          ({ institution: 3, signature_line: 3, phone: 3, barcode: 3, dense_code_region: 2, cjk_name: 2, identity_or_date: 1 }[
            r
          ] || 0);
        if (rank(flags[j].reason) > rank(reason)) reason = flags[j].reason;
      }
    }
    out.push({ box: [a, b, c, d], reason, text, blanked: false });
  }
  return out;
}

/**
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
      const lab = SERIAL_LABEL_RX.test(t) && (k === kUp || !/^sn$/i.test(t));
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
 * @param {string} text
 * @param {string[]} identifiers
 * @returns {string[]}
 */
export function remainingIdentifiers(text, identifiers) {
  const upper = text.toUpperCase();
  return identifiers.filter((id) => upper.includes(String(id).toUpperCase()));
}

export { isIdentToken, WHITELIST, RX, CJK, ID_LABELS, ID_DATE_LABELS };
