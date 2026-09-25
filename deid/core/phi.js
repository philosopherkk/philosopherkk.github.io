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
 * Clinical measurement / report tokens — lines containing these must NOT be
 * flagged as institution/clinic unless a clear identifier pattern is also present.
 */
export const CLINICAL_LINE =
  /\b(MD|PSD|VFI|GHT|IOP|CCT|RNFL|GCL|ONH|AL|AXL|ACD|WTW|K1|K2|Km|EKR|SITA|ETDRS|SSI|SQI)\b|\b(dB|µm|um|mmHg|D)\b|\b(Fixation|Stimulus|Background|Strategy|Threshold|Pattern\s+Deviation|Total\s+Deviation|Visual\s+Field|Signal\s+Strength|Within\s+Normal|Outside\s+Normal|Borderline)\b|\b(Right\s+Eye|Left\s+Eye|\(OD\)|\(OS\)|\(OU\))\b|\bC\s*\/\s*D\b/i;

/**
 * Single Latin clinical tokens (OCR word boxes) that must never be auto-blanked.
 * Includes laterality and common HFA / topography abbreviations.
 */
export const CLINICAL_LATIN_TOKEN =
  /^(Right|Left|Eye|OD|OS|OU|MD|PSD|VFI|GHT|IOP|CCT|RNFL|GCL|ONH|AL|AXL|ACD|WTW|K1|K2|Km|EKR|SITA|ETDRS|SSI|SQI|dB|µm|um|mmHg|D|Fixation|Stimulus|Background|Strategy|Threshold|Pattern|Deviation|Total|Visual|Field|Signal|Strength|Within|Normal|Outside|Borderline|Limits|Monitor)$/i;

/**
 * True when token is laterality "Eye:R/L" etc., not a clinic name.
 * @param {string} t
 */
export function isLateralityEye(t) {
  return /^eye\s*[:：/\-]?[\s]*[rl]\b|^eye\s*(od|os|ou)\b|^eye$/i.test(String(t).trim());
}

/**
 * True when a line looks like clinical content that should survive Blank all.
 * @param {string} t
 */
export function isClinicalLine(t) {
  return CLINICAL_LINE.test(String(t || ""));
}

/**
 * True when a single OCR word is a Latin clinical token (Right, OD, MD, …).
 * @param {string} t
 */
export function isClinicalLatinToken(t) {
  const s = String(t || "")
    .trim()
    .replace(/^[(\[{]+|[)\]}:,.;]+$/g, "");
  if (!s) return false;
  if (CLINICAL_LATIN_TOKEN.test(s)) return true;
  // "(OD)" / "Eye:" style fragments already partially stripped
  if (/^\(?\s*(OD|OS|OU)\s*\)?$/i.test(String(t || "").trim())) return true;
  return false;
}

/**
 * High-confidence genuine Han (CJK) text — not Latin-dominant OCR garbage that
 * chi_tra sometimes invents over English clinical lines.
 * @param {string} t
 */
export function isGenuineHanText(t) {
  const s = String(t || "").trim();
  if (!s) return false;
  // Count code points with /g — CJK export has no /g so .match length would be 1 for a run.
  const han = s.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || [];
  if (han.length < 2) return false;
  const latin = s.match(/[A-Za-z]/g) || [];
  // Reject Latin-heavy misreads (e.g. fragments of "Right Eye")
  if (latin.length >= han.length) return false;
  const nonSpace = s.replace(/\s+/g, "");
  if (han.length / Math.max(1, [...nonSpace].length) < 0.55) return false;
  return true;
}

/**
 * chi_tra often emits each Han glyph as its own word. Merge same-row neighbours
 * into name runs so "陳"+"大"+"文" becomes a flaggable genuine-Han box.
 * @param {import('./types.js').Word[]} words
 * @returns {import('./types.js').Word[]}
 */
export function mergeAdjacentHanWords(words) {
  if (!words?.length) return [];
  const hanOnly = words
    .filter((w) => {
      const s = String(w.text || "").trim();
      if (!s || (w.conf ?? 0) < 70) return false;
      return /[\u3400-\u9fff\uf900-\ufaff]/.test(s);
    })
    .sort((a, b) => {
      const ya = (a.y0 + a.y1) / 2;
      const yb = (b.y0 + b.y1) / 2;
      // Same visual line → left-to-right so 陳大文 stay in reading order.
      if (Math.abs(ya - yb) > 22) return ya - yb;
      return a.x0 - b.x0;
    });

  /** @type {import('./types.js').Word[]} */
  const merged = [];
  let i = 0;
  while (i < hanOnly.length) {
    let cur = { ...hanOnly[i], text: String(hanOnly[i].text || "").trim() };
    let j = i + 1;
    while (j < hanOnly.length) {
      const nxt = hanOnly[j];
      const nh = Math.max(1, cur.y1 - cur.y0, nxt.y1 - nxt.y0);
      const sameRow = Math.abs((cur.y0 + cur.y1) / 2 - (nxt.y0 + nxt.y1) / 2) < Math.max(0.9 * nh, 20);
      const gap = nxt.x0 - cur.x1;
      if (!sameRow || gap < -nh * 0.5 || gap > nh * 2.2) break;
      cur = {
        text: cur.text + String(nxt.text || "").trim(),
        conf: Math.min(cur.conf ?? 0, nxt.conf ?? 0),
        x0: Math.min(cur.x0, nxt.x0),
        y0: Math.min(cur.y0, nxt.y0),
        x1: Math.max(cur.x1, nxt.x1),
        y1: Math.max(cur.y1, nxt.y1),
      };
      j++;
    }
    merged.push(cur);
    i = j;
  }
  return merged;
}

/**
 * True when box overlaps an English OCR word that is a clinical Latin token/line.
 * @param {[number,number,number,number]} box
 * @param {import('./types.js').Word[]} engWords
 */
export function boxOverlapsClinicalLatin(box, engWords) {
  if (!engWords || !engWords.length) return false;
  const [ax0, ay0, ax1, ay1] = box;
  for (const w of engWords) {
    if ((w.conf ?? 0) < 35) continue;
    const txt = String(w.text || "");
    if (!isClinicalLatinToken(txt) && !isClinicalLine(txt)) continue;
    const overlap =
      Math.min(ax1, w.x1) > Math.max(ax0, w.x0) &&
      Math.min(ay1, w.y1) > Math.max(ay0, w.y0);
    if (overlap) return true;
  }
  return false;
}

/**
 * Guard for chi_tra / CJK auto-blank: only high-conf genuine Han boxes that do
 * not sit on Latin clinical tokens (Right Eye, OD/OS, MD, PSD, …).
 * @param {import('./types.js').Word} w
 * @param {import('./types.js').Word[]} [engWords]
 */
export function shouldAutoBlankCjkWord(w, engWords = []) {
  if (!w || (w.conf ?? 0) < 80) return false;
  if (!isGenuineHanText(w.text)) return false;
  if (isClinicalLine(w.text)) return false;
  const p = Math.floor(0.6 * Math.max(1, (w.y1 || 0) - (w.y0 || 0)));
  const box = /** @type {[number,number,number,number]} */ ([
    w.x0 - p,
    w.y0 - p,
    w.x1 + p,
    w.y1 + p,
  ]);
  if (boxOverlapsClinicalLatin(box, engWords)) return false;
  return true;
}

/**
 * Drop auto-blank boxes that would wipe Latin clinical content.
 * @param {[number,number,number,number][]} boxes
 * @param {import('./types.js').Word[]} engWords
 */
export function filterClinicalSafeAutoBlanks(boxes, engWords) {
  if (!boxes?.length) return [];
  return boxes.filter((b) => !boxOverlapsClinicalLatin(b, engWords));
}

/**
 * Clear identifier patterns that may still justify flagging a clinical-looking line.
 * @param {string} t
 */
export function hasClearIdentifier(t) {
  const s = String(t || "");
  return (
    HK_PHONE.test(s) ||
    /\b[A-Z]{1,2}\d{6}\s*\(?[0-9A]\)?/.test(s) ||
    /\b(name|patient|hkid|dob|mrn)\b/i.test(s) ||
    INSTITUTION_ZH.test(s) ||
    /\b(clinic|hospital|centre|center)\b/i.test(s)
  );
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

    // "DEMO EYE CLINIC" style — but never "Right Eye (OD) MD …"
    if (!reason && /\bEye\b/.test(joined) && !isLateralityEye(joined)) {
      const caps = joined.split(/\s+/).filter((t) => /^[A-Z]/.test(t));
      if (caps.length >= 2) reason = "institution";
    }

    // Clinical measurement lines survive unless a clear identifier is also present
    if (reason && isClinicalLine(joined) && !hasClearIdentifier(joined)) {
      continue;
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

  // CJK name flags: merge split Han glyphs, then only genuine Han runs.
  const engForGuard = (ocrByRot[kUp] || []).filter((w) => (w.conf ?? 0) >= 35);
  for (const w of mergeAdjacentHanWords(cjkWords)) {
    if (!shouldAutoBlankCjkWord(w, engForGuard)) continue;
    const p = Math.floor(0.6 * (w.y1 - w.y0));
    flags.push({
      box: unrotateBox([w.x0 - p, w.y0 - p, w.x1 + p, w.y1 + p], kUp, W, H),
      reason: "cjk_name",
      text: w.text,
      blanked: false,
    });
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
          ({ institution: 3, signature_line: 3, phone: 3, barcode: 3, qr_finder: 3, qr_texture: 3, serial: 3, too_many_codes: 3, dense_code_region: 2, cjk_name: 2, identity_or_date: 1 }[
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
 * Detect serial-number labels/values from OCR rotations.
 * Returns flag-shaped hits (reason `serial`) with pixel boxes so the UI can
 * remap/blank them like any other safety flag.
 * @param {Record<number, import('./types.js').Word[]>} ocrByRot
 * @param {number} [W]
 * @param {number} [H]
 * @returns {import('./types.js').FlagHit[]}
 */
export function serialHits(ocrByRot, W = 0, H = 0) {
  /** @type {import('./types.js').FlagHit[]} */
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
      const labelish = SERIAL_TEXT_RX.test(t);
      if (!(lab || val || labelish)) continue;
      const pad = Math.floor(0.4 * Math.max(4, w.y1 - w.y0));
      let box = /** @type {[number,number,number,number]} */ ([
        w.x0 - pad,
        w.y0 - pad,
        w.x1 + pad,
        w.y1 + pad,
      ]);
      if (W > 0 && H > 0) {
        box = unrotateBox(box, k, W, H);
      }
      hits.push({
        box,
        reason: "serial",
        text: t,
        blanked: false,
      });
    }
  }

  // Deduplicate overlapping serial hits (prefer longer text)
  hits.sort((a, b) => (b.text || "").length - (a.text || "").length);
  /** @type {import('./types.js').FlagHit[]} */
  const out = [];
  for (const h of hits) {
    if (out.some((o) => boxesOverlapSimple(o.box, h.box))) continue;
    out.push(h);
  }
  return out;
}

/** @param {[number,number,number,number]} a @param {[number,number,number,number]} b */
function boxesOverlapSimple(a, b) {
  return Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
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
