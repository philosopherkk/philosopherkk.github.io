/**
 * Barcode / QR detection: BarcodeDetector → jsQR → ZXing → strict dense heuristic.
 * Decoders are lazy-loaded from same-origin /deid/vendor/ (no CDN).
 * @module core/barcode
 */

let jsQRPromise = null;
let zxingPromise = null;

/**
 * @param {ImageData} imageData
 * @returns {Promise<import('./types.js').FlagHit[]>}
 */
export async function detectBarcodeFlags(imageData) {
  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];

  const fromApi = await detectWithBarcodeDetector(imageData);
  flags.push(...fromApi);

  const fromJsQR = await detectWithJsQR(imageData);
  flags.push(...fromJsQR);

  const fromZxing = await detectWithZxing(imageData);
  flags.push(...fromZxing);

  // Only use dense heuristic if no decoder found anything
  if (!flags.length) {
    flags.push(...detectDenseHighContrastRegions(imageData));
  }

  return mergeCodeFlags(flags);
}

/**
 * Lazy-load vendored jsQR (UMD → window.jsQR).
 * @returns {Promise<Function|null>}
 */
export async function loadJsQR() {
  if (typeof globalThis.jsQR === "function") return globalThis.jsQR;
  if (jsQRPromise) return jsQRPromise;
  jsQRPromise = (async () => {
    if (typeof document === "undefined") return null;
    await loadScript(new URL("../vendor/jsqr/jsQR.js", import.meta.url).href);
    return typeof globalThis.jsQR === "function" ? globalThis.jsQR : null;
  })();
  return jsQRPromise;
}

/**
 * Lazy-load vendored ZXing UMD (ZXing / ZXingLib globals vary by build).
 */
async function loadZxing() {
  if (zxingPromise) return zxingPromise;
  zxingPromise = (async () => {
    if (typeof document === "undefined") return null;
    if (globalThis.ZXing) return globalThis.ZXing;
    await loadScript(new URL("../vendor/zxing/zxing.min.js", import.meta.url).href);
    return globalThis.ZXing || globalThis.ZXingLib || null;
  })();
  return zxingPromise;
}

/** @param {string} src */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if (existing.dataset.loaded === "1") resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<import('./types.js').FlagHit[]>}
 */
async function detectWithJsQR(imageData) {
  /** @type {import('./types.js').FlagHit[]} */
  const out = [];
  try {
    const jsQR = await loadJsQR();
    if (!jsQR) return out;
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (!code || !code.location) return out;
    const loc = code.location;
    const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x];
    const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y];
    const pad = 12;
    out.push({
      box: [
        Math.max(0, Math.min(...xs) - pad),
        Math.max(0, Math.min(...ys) - pad),
        Math.min(imageData.width, Math.max(...xs) + pad),
        Math.min(imageData.height, Math.max(...ys) + pad),
      ],
      reason: "barcode",
      text: code.data || "qr",
      blanked: false,
    });
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<import('./types.js').FlagHit[]>}
 */
async function detectWithZxing(imageData) {
  /** @type {import('./types.js').FlagHit[]} */
  const out = [];
  try {
    const ZXing = await loadZxing();
    if (!ZXing) return out;
    const {
      BrowserMultiFormatReader,
      HTMLCanvasElementLuminanceSource,
      BinaryBitmap,
      HybridBinarizer,
      MultiFormatReader,
      DecodeHintType,
      BarcodeFormat,
      RGBLuminanceSource,
    } = ZXing;

    // Prefer pure ImageData path (no DOM canvas dependency beyond what we have)
    if (RGBLuminanceSource && MultiFormatReader && HybridBinarizer && BinaryBitmap) {
      const luminances = new Uint8ClampedArray(imageData.width * imageData.height);
      for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
        luminances[j] =
          (imageData.data[i] * 0.299 + imageData.data[i + 1] * 0.587 + imageData.data[i + 2] * 0.114) | 0;
      }
      const source = new RGBLuminanceSource(luminances, imageData.width, imageData.height);
      const bitmap = new BinaryBitmap(new HybridBinarizer(source));
      const hints = new Map();
      if (DecodeHintType && BarcodeFormat) {
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.ITF,
          BarcodeFormat.PDF_417,
          BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
      }
      const reader = new MultiFormatReader();
      if (hints.size) reader.setHints(hints);
      try {
        const result = reader.decode(bitmap);
        const points = result.getResultPoints?.() || [];
        const pad = 12;
        let x0 = 0;
        let y0 = 0;
        let x1 = imageData.width;
        let y1 = imageData.height;
        if (points.length) {
          const xs = points.map((p) => p.getX());
          const ys = points.map((p) => p.getY());
          x0 = Math.max(0, Math.min(...xs) - pad);
          y0 = Math.max(0, Math.min(...ys) - pad);
          x1 = Math.min(imageData.width, Math.max(...xs) + pad);
          y1 = Math.min(imageData.height, Math.max(...ys) + pad);
        }
        out.push({
          box: [x0, y0, x1, y1],
          reason: "barcode",
          text: result.getText?.() || "code",
          blanked: false,
        });
      } catch {
        /* not found */
      }
      return out;
    }

    // Fallback: BrowserMultiFormatReader + canvas
    if (BrowserMultiFormatReader && typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromCanvas(canvas);
      if (result) {
        const points = result.getResultPoints?.() || [];
        const pad = 12;
        let box = [0, 0, imageData.width, imageData.height];
        if (points.length) {
          const xs = points.map((p) => p.getX());
          const ys = points.map((p) => p.getY());
          box = [
            Math.max(0, Math.min(...xs) - pad),
            Math.max(0, Math.min(...ys) - pad),
            Math.min(imageData.width, Math.max(...xs) + pad),
            Math.min(imageData.height, Math.max(...ys) + pad),
          ];
        }
        out.push({
          box,
          reason: "barcode",
          text: result.getText?.() || "code",
          blanked: false,
        });
      }
      void HTMLCanvasElementLuminanceSource;
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<import('./types.js').FlagHit[]>}
 */
async function detectWithBarcodeDetector(imageData) {
  /** @type {import('./types.js').FlagHit[]} */
  const out = [];
  if (typeof BarcodeDetector === "undefined") return out;
  try {
    const formats = [
      "qr_code",
      "aztec",
      "data_matrix",
      "pdf417",
      "code_128",
      "code_39",
      "ean_13",
      "ean_8",
      "upc_a",
      "upc_e",
    ];
    let detector;
    try {
      detector = new BarcodeDetector({ formats });
    } catch {
      detector = new BarcodeDetector();
    }
    let bitmapSource;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      bitmapSource = canvas;
    } else if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = imageData.width;
      c.height = imageData.height;
      c.getContext("2d").putImageData(imageData, 0, 0);
      bitmapSource = c;
    } else {
      return out;
    }
    const codes = await detector.detect(bitmapSource);
    for (const code of codes || []) {
      const bb = code.boundingBox;
      if (!bb) continue;
      const pad = 8;
      out.push({
        box: [bb.x - pad, bb.y - pad, bb.x + bb.width + pad, bb.y + bb.height + pad],
        reason: "barcode",
        text: code.rawValue || code.format || "barcode",
        blanked: false,
      });
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * Strict dense-region heuristic — last resort only. Rejects typical text blocks.
 * Requires near-square (QR-like) with very high bidirectional edge density,
 * or a thin high-frequency strip with near-binary intensity (1D-like).
 * @param {ImageData} imageData
 * @returns {import('./types.js').FlagHit[]}
 */
export function detectDenseHighContrastRegions(imageData) {
  const { width: W, height: H, data } = imageData;
  if (W < 80 || H < 80) return [];

  const cell = Math.max(10, Math.floor(Math.min(W, H) / 32));
  const gw = Math.floor(W / cell);
  const gh = Math.floor(H / cell);
  const edgeH = new Float32Array(gw * gh);
  const edgeV = new Float32Array(gw * gh);
  const binaryFrac = new Float32Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let eh = 0;
      let ev = 0;
      let n = 0;
      let extreme = 0;
      const x0 = gx * cell;
      const y0 = gy * cell;
      for (let y = y0; y < y0 + cell && y < H; y++) {
        for (let x = x0; x < x0 + cell && x < W; x++) {
          const i = (y * W + x) * 4;
          const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
          if (g < 40 || g > 220) extreme++;
          n++;
          if (x + 1 < W && x + 1 < x0 + cell) {
            const i2 = (y * W + x + 1) * 4;
            const g2 = (data[i2] * 0.299 + data[i2 + 1] * 0.587 + data[i2 + 2] * 0.114) | 0;
            if ((g < 128) !== (g2 < 128)) eh++;
          }
          if (y + 1 < H && y + 1 < y0 + cell) {
            const i2 = ((y + 1) * W + x) * 4;
            const g2 = (data[i2] * 0.299 + data[i2 + 1] * 0.587 + data[i2 + 2] * 0.114) | 0;
            if ((g < 128) !== (g2 < 128)) ev++;
          }
        }
      }
      const idx = gy * gw + gx;
      edgeH[idx] = eh / Math.max(1, n);
      edgeV[idx] = ev / Math.max(1, n);
      binaryFrac[idx] = extreme / Math.max(1, n);
    }
  }

  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const seen = new Uint8Array(gw * gh);
  // QR-like only: strong edges in BOTH directions + mostly binary pixels.
  // (1D strips are handled by ZXing / BarcodeDetector — strip heuristic false-positives on text.)
  const isHot = (i) => edgeH[i] > 0.22 && edgeV[i] > 0.22 && binaryFrac[i] > 0.65;

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      if (seen[idx] || !isHot(idx)) continue;
      const stack = [[gx, gy]];
      seen[idx] = 1;
      let minX = gx;
      let maxX = gx;
      let minY = gy;
      let maxY = gy;
      let count = 0;
      let binSum = 0;
      while (stack.length) {
        const [x, y] = stack.pop();
        count++;
        binSum += binaryFrac[y * gw + x];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (seen[ni] || !isHot(ni)) continue;
          seen[ni] = 1;
          stack.push([nx, ny]);
        }
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / Math.max(1, bh);
      const pxW = bw * cell;
      const pxH = bh * cell;
      // QR: sizable near-square, high binary fraction, not a thin text band
      if (count < 16 || aspect < 0.75 || aspect > 1.35) continue;
      if (pxW < 80 || pxH < 80) continue;
      if (binSum / count < 0.7) continue;
      const pad = cell;
      flags.push({
        box: [
          Math.max(0, minX * cell - pad),
          Math.max(0, minY * cell - pad),
          Math.min(W, (maxX + 1) * cell + pad),
          Math.min(H, (maxY + 1) * cell + pad),
        ],
        reason: "dense_code_region",
        blanked: false,
      });
    }
  }
  return flags.slice(0, 8);
}

/** @param {import('./types.js').FlagHit[]} flags */
function mergeCodeFlags(flags) {
  if (flags.length < 2) return flags;
  const out = [];
  const used = new Set();
  for (let i = 0; i < flags.length; i++) {
    if (used.has(i)) continue;
    let [a, b, c, d] = flags[i].box;
    let text = flags[i].text;
    let reason = flags[i].reason === "barcode" ? "barcode" : flags[i].reason;
    for (let j = i + 1; j < flags.length; j++) {
      if (used.has(j)) continue;
      const [x0, y0, x1, y1] = flags[j].box;
      const overlap = Math.min(c, x1) > Math.max(a, x0) && Math.min(d, y1) > Math.max(b, y0);
      if (!overlap) continue;
      used.add(j);
      a = Math.min(a, x0);
      b = Math.min(b, y0);
      c = Math.max(c, x1);
      d = Math.max(d, y1);
      if (flags[j].reason === "barcode") reason = "barcode";
      if (flags[j].text) text = text || flags[j].text;
    }
    out.push({ box: [a, b, c, d], reason, text, blanked: false });
  }
  return out;
}

/**
 * Decode any QR/barcode left in ImageData (for export verification tests).
 * @param {ImageData} imageData
 * @returns {Promise<string[]>}
 */
export async function decodeAnyCodes(imageData) {
  const found = [];
  try {
    const jsQR = await loadJsQR();
    if (jsQR) {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code?.data) found.push(code.data);
    }
  } catch {
    /* ignore */
  }
  const flags = await detectBarcodeFlags(imageData);
  for (const f of flags) {
    if (f.text && f.reason === "barcode") found.push(f.text);
  }
  return [...new Set(found)];
}
