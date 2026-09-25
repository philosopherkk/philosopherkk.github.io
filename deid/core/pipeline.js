/**
 * Main de-identification pipeline (DOM-free core; OCR via injected provider).
 * @module core/pipeline
 */

import { detectDeviceOrGeneric } from "./detect.js";
import { uprightScore } from "./geometry.js";
import { deskewAngle, rotate90, rotateSmall } from "./deskew.js";
import { applyCrop, fillWhite, anchorShift } from "./crop.js";
import {
  collectFlags,
  serialHits,
  labelMasks,
  shouldAutoBlankCjkWord,
  filterClinicalSafeAutoBlanks,
} from "./phi.js";
import { ID_LABELS, ID_DATE_LABELS } from "./rules.js";
import { unrotateBox, rotSize } from "./geometry.js";
import { detectBarcodeFlags } from "./barcode.js";

/**
 * Convert ImageBitmap / canvas / ImageData to ImageData.
 * @param {ImageBitmap|HTMLCanvasElement|OffscreenCanvas|ImageData} src
 * @returns {ImageData}
 */
export function toImageData(src) {
  if (src && src.data && src.width && src.height && src.data instanceof Uint8ClampedArray) {
    return src;
  }
  const w = src.width;
  const h = src.height;
  const CanvasCtor = typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : null;
  if (!CanvasCtor && typeof document === "undefined") {
    throw new Error("toImageData: need OffscreenCanvas or ImageData");
  }
  const c = CanvasCtor ? new CanvasCtor(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d");
  ctx.drawImage(src, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * OCR all 4 rotations.
 * @param {import('./types.js').OcrProvider} ocr
 * @param {ImageData} imageData
 * @param {(msg: string, p?: number) => void} [onProgress]
 * @returns {Promise<Record<number, import('./types.js').Word[]>>}
 */
export async function ocrAllRotations(ocr, imageData, onProgress) {
  /** @type {Record<number, import('./types.js').Word[]>} */
  const res = {};
  for (let k = 0; k < 4; k++) {
    onProgress?.(`ocr_rot_${k * 90}`, k / 4);
    const rot = k === 0 ? imageData : rotate90(imageData, k);
    res[k] = await ocr.recognize(rot, { lang: "eng", psm: 11 });
  }
  return res;
}

/**
 * Run the full deid pipeline on one page ImageData.
 * Does NOT auto-blank safety-net flags — returns them for the UI to confirm.
 * Auto-applies device crop/erase/cut and an initial backstop blank of high-confidence PHI boxes
 * (same as deid.py step 5), then re-OCR for flags + serial check.
 *
 * @param {ImageData} page
 * @param {Object} opts
 * @param {import('./types.js').OcrProvider} opts.ocr
 * @param {string} [opts.forceDevice]
 * @param {(msg: string, p?: number) => void} [opts.onProgress]
 * @param {boolean} [opts.autoBlankBackstop=true]  Blank backstop boxes (like deid.py)
 * @returns {Promise<import('./types.js').DeidResult & { imageData: ImageData, upright: ImageData }>}
 */
export async function deidPage(page, opts) {
  const { ocr, forceDevice, onProgress, autoBlankBackstop = true } = opts;
  onProgress?.("orient", 0.05);
  const src = toImageData(page);
  const ocr0 = await ocrAllRotations(ocr, src, onProgress);
  const kUp = [0, 1, 2, 3].reduce((best, k) =>
    uprightScore(ocr0[k] || []) > uprightScore(ocr0[best] || []) ? k : best
  , 0);

  const upText = (ocr0[kUp] || [])
    .filter((w) => w.conf > 30)
    .map((w) => w.text)
    .join(" ");
  const allText = [0, 1, 2, 3]
    .flatMap((k) => (ocr0[k] || []).filter((w) => w.conf > 60).map((w) => w.text))
    .join(" ");
  const device = forceDevice || detectDeviceOrGeneric(upText) || detectDeviceOrGeneric(allText);

  onProgress?.("deskew", 0.35);
  let upright = kUp === 0 ? cloneImageData(src) : rotate90(src, kUp);
  const ang = deskewAngle(upright);
  if (Math.abs(ang) >= 0.15) {
    upright = rotateSmall(upright, ang);
  }

  onProgress?.("crop", 0.45);
  // Re-OCR upright for anchors (single pass)
  const wordsUp = await ocr.recognize(upright, { lang: "eng", psm: 11 });
  const { dy, anchor } = anchorShift(device, wordsUp, upright.width, upright.height);
  const cropped = applyCrop(upright, device, dy);

  onProgress?.("codes", 0.55);
  // Detect barcodes/QR on the pre-blank cropped image so OCR auto-blank cannot
  // erase finder modules. These regions are exclusion zones for backstop blanking.
  /** @type {import('./types.js').FlagHit[]} */
  let codeFlagsPre = [];
  try {
    codeFlagsPre = await detectBarcodeFlags(cropped.image);
  } catch {
    /* barcode optional */
  }

  onProgress?.("backstop", 0.6);
  // Backstop OCR on cropped result
  const ocrCrop = await ocrAllRotations(ocr, cropped.image, onProgress);
  const kUp2 = [0, 1, 2, 3].reduce((best, k) =>
    uprightScore(ocrCrop[k] || []) > uprightScore(ocrCrop[best] || []) ? k : best
  , 0);
  const [cw, ch] = [cropped.image.width, cropped.image.height];

  /** Eng OCR on upright crop — used to protect Latin clinical tokens from auto-blank. */
  const engWordsUp = (ocrCrop[kUp2] || []).filter((w) => (w.conf ?? 0) >= 35);

  /** @type {[number, number, number, number][]} */
  const backstopBoxes = [];
  for (const k of [0, 1, 2, 3]) {
    let words = ocrCrop[k] || [];
    const [rw, rh] = rotSize(cw, ch, k);
    if (k !== kUp2) words = words.filter((w) => w.conf >= 80);
    for (const b of labelMasks(words, rw, rh, ID_LABELS, ID_DATE_LABELS)) {
      backstopBoxes.push(unrotateBox(b, k, cw, ch));
    }
  }

  // Chinese personal-name-like runs — only genuine high-conf Han; never Latin clinical.
  let cjkWords = [];
  try {
    const upCrop = kUp2 === 0 ? cropped.image : rotate90(cropped.image, kUp2);
    cjkWords = await ocr.recognize(upCrop, { lang: "chi_tra", psm: 11 });
    for (const w of cjkWords) {
      if (!shouldAutoBlankCjkWord(w, engWordsUp)) continue;
      const p = Math.floor(0.6 * (w.y1 - w.y0));
      backstopBoxes.push(unrotateBox([w.x0 - p, w.y0 - p, w.x1 + p, w.y1 + p], kUp2, cw, ch));
    }
  } catch {
    /* chi_tra may be unavailable in some test stubs */
  }

  // Drop blanks that hit a code OR that would wipe Latin clinical tokens (Right Eye, MD…).
  const codeBoxes = codeFlagsPre.map((f) => f.box);
  const clinicalSafe = filterClinicalSafeAutoBlanks(backstopBoxes, engWordsUp);
  const safeBackstop = clinicalSafe.filter((b) => !codeBoxes.some((c) => boxesOverlap(b, c)));

  let outImage = cropped.image;
  /** @type {[number, number, number, number][]} */
  const removedRegions = [
    ...cropped.erase.map(/** @returns {[number,number,number,number]} */ (e) => [
      e[0], e[1], e[2], e[3],
    ]),
    ...safeBackstop,
  ];

  if (autoBlankBackstop && safeBackstop.length) {
    outImage = cloneImageData(cropped.image);
    fillWhite(outImage, safeBackstop);
  }

  onProgress?.("recheck", 0.85);
  // Re-OCR after blanking for flags + serial
  const ocrFinal = await ocrAllRotations(ocr, outImage, () => {});
  let cjkFinal = [];
  try {
    const kF = [0, 1, 2, 3].reduce((best, k) =>
      uprightScore(ocrFinal[k] || []) > uprightScore(ocrFinal[best] || []) ? k : best
    , 0);
    const upF = kF === 0 ? outImage : rotate90(outImage, kF);
    cjkFinal = await ocr.recognize(upF, { lang: "chi_tra", psm: 11 });
  } catch {
    /* ignore */
  }

  let flags = collectFlags(ocrFinal, outImage.width, outImage.height, cjkFinal);

  // Post-blank code pass (union with pre-blank); prefer whole code flags over
  // OCR word boxes that sit inside a code region.
  /** @type {import('./types.js').FlagHit[]} */
  let codeFlagsPost = [];
  try {
    codeFlagsPost = await detectBarcodeFlags(outImage);
  } catch {
    /* optional */
  }
  const codeFlags = mergeFlagHits([...codeFlagsPre, ...codeFlagsPost]);
  flags = flags.filter((f) => !codeFlags.some((c) => boxesOverlap(f.box, c.box)));
  for (const f of codeFlags) {
    flags.push({ ...f, box: [...f.box], blanked: false });
  }

  const serials = serialHits(ocrFinal);
  const unresolved = flags.filter((f) => !f.blanked);
  const passed = unresolved.length === 0 && serials.length === 0;

  onProgress?.("done", 1);
  return {
    device,
    image: outImage,
    imageData: outImage,
    upright,
    uprightRot: kUp * 90,
    deskew: Math.round(ang * 100) / 100,
    shift: Math.round(dy * 10000) / 10000,
    anchor,
    removedRegions,
    flags,
    serialHits: serials,
    passed,
    keep: cropped.keep,
    erase: cropped.erase,
    cuts: cropped.cuts,
  };
}

/** @param {[number,number,number,number]} a @param {[number,number,number,number]} b */
function boxesOverlap(a, b) {
  return Math.min(a[2], b[2]) > Math.max(a[0], b[0]) && Math.min(a[3], b[3]) > Math.max(a[1], b[1]);
}

/** @param {import('./types.js').FlagHit[]} flags */
function mergeFlagHits(flags) {
  if (flags.length < 2) return flags.map((f) => ({ ...f, box: [...f.box] }));
  const out = [];
  const used = new Set();
  for (let i = 0; i < flags.length; i++) {
    if (used.has(i)) continue;
    let [a, b, c, d] = flags[i].box;
    let text = flags[i].text;
    let reason = flags[i].reason;
    for (let j = i + 1; j < flags.length; j++) {
      if (used.has(j)) continue;
      if (!boxesOverlap([a, b, c, d], flags[j].box)) continue;
      used.add(j);
      const [x0, y0, x1, y1] = flags[j].box;
      a = Math.min(a, x0);
      b = Math.min(b, y0);
      c = Math.max(c, x1);
      d = Math.max(d, y1);
      if (flags[j].reason === "barcode") reason = "barcode";
      if (flags[j].reason === "qr_finder" || flags[j].reason === "qr_texture") {
        if (reason !== "barcode") reason = flags[j].reason;
      }
      if (flags[j].text && flags[j].text !== "qr" && flags[j].text !== "qr-finder" && flags[j].text !== "qr-texture") {
        text = text || flags[j].text;
      }
    }
    out.push({ box: [a, b, c, d], reason, text, blanked: false });
  }
  return out;
}

/**
 * Blank a flag region on the working image and mark it blanked.
 * @param {ImageData} imageData
 * @param {import('./types.js').FlagHit} flag
 */
export function blankFlag(imageData, flag) {
  fillWhite(imageData, [flag.box]);
  flag.blanked = true;
}

/**
 * @param {ImageData} src
 * @returns {ImageData}
 */
export function cloneImageData(src) {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}
