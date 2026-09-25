/**
 * Main de-identification pipeline (DOM-free core; OCR via injected provider).
 * @module core/pipeline
 */

import { detectDeviceOrGeneric } from "./detect.js";
import { uprightScore } from "./geometry.js";
import { deskewAngle, rotate90, rotateSmall } from "./deskew.js";
import { applyCrop, fillWhite, anchorShift } from "./crop.js";
import { collectFlags, serialHits, labelMasks } from "./phi.js";
import { ID_LABELS, ID_DATE_LABELS, CJK } from "./rules.js";
import { unrotateBox, rotSize } from "./geometry.js";

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

  onProgress?.("backstop", 0.6);
  // Backstop OCR on cropped result
  const ocrCrop = await ocrAllRotations(ocr, cropped.image, onProgress);
  const kUp2 = [0, 1, 2, 3].reduce((best, k) =>
    uprightScore(ocrCrop[k] || []) > uprightScore(ocrCrop[best] || []) ? k : best
  , 0);
  const [cw, ch] = [cropped.image.width, cropped.image.height];

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

  // Chinese personal-name-like runs
  let cjkWords = [];
  try {
    const upCrop = kUp2 === 0 ? cropped.image : rotate90(cropped.image, kUp2);
    cjkWords = await ocr.recognize(upCrop, { lang: "chi_tra", psm: 11 });
    for (const w of cjkWords) {
      const chars = (w.text.match(CJK) || []).length;
      if (chars >= 2 && w.conf >= 80) {
        const p = Math.floor(0.6 * (w.y1 - w.y0));
        backstopBoxes.push(unrotateBox([w.x0 - p, w.y0 - p, w.x1 + p, w.y1 + p], kUp2, cw, ch));
      }
    }
  } catch {
    /* chi_tra may be unavailable in some test stubs */
  }

  let outImage = cropped.image;
  /** @type {[number, number, number, number][]} */
  const removedRegions = [
    ...cropped.erase.map(/** @returns {[number,number,number,number]} */ (e) => [
      e[0], e[1], e[2], e[3],
    ]),
    ...backstopBoxes,
  ];

  if (autoBlankBackstop && backstopBoxes.length) {
    outImage = cloneImageData(cropped.image);
    fillWhite(outImage, backstopBoxes);
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

  const flags = collectFlags(ocrFinal, outImage.width, outImage.height, cjkFinal);
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
