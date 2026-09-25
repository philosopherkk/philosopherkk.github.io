/**
 * Barcode / QR detection + dense high-contrast region fallback.
 * @module core/barcode
 */

/**
 * @param {ImageData} imageData
 * @returns {Promise<import('./types.js').FlagHit[]>}
 */
export async function detectBarcodeFlags(imageData) {
  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const fromApi = await detectWithBarcodeDetector(imageData);
  flags.push(...fromApi);
  if (!fromApi.length) {
    flags.push(...detectDenseHighContrastRegions(imageData));
  }
  return flags;
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
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(imageData.width, imageData.height)
        : null;
    let bitmapSource;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.putImageData(imageData, 0, 0);
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
        box: [
          bb.x - pad,
          bb.y - pad,
          bb.x + bb.width + pad,
          bb.y + bb.height + pad,
        ],
        reason: "barcode",
        text: code.rawValue || code.format || "barcode",
        blanked: false,
      });
    }
  } catch {
    /* unsupported format list / detect failure — fall through to heuristic */
  }
  return out;
}

/**
 * Flag dense high-contrast square/strip regions (QR-like / 1D barcode-like).
 * Pure ImageData — no DOM.
 * @param {ImageData} imageData
 * @returns {import('./types.js').FlagHit[]}
 */
export function detectDenseHighContrastRegions(imageData) {
  const { width: W, height: H, data } = imageData;
  if (W < 40 || H < 40) return [];

  const cell = Math.max(8, Math.floor(Math.min(W, H) / 40));
  const gw = Math.floor(W / cell);
  const gh = Math.floor(H / cell);
  const dark = new Uint8Array(gw * gh);
  const edge = new Float32Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let sum = 0;
      let n = 0;
      let transitions = 0;
      let prev = -1;
      const x0 = gx * cell;
      const y0 = gy * cell;
      for (let y = y0; y < y0 + cell && y < H; y++) {
        for (let x = x0; x < x0 + cell && x < W; x++) {
          const i = (y * W + x) * 4;
          const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
          sum += g;
          n++;
          const bin = g < 140 ? 1 : 0;
          if (prev >= 0 && bin !== prev) transitions++;
          prev = bin;
        }
      }
      const avg = sum / Math.max(1, n);
      dark[gy * gw + gx] = avg < 160 ? 1 : 0;
      edge[gy * gw + gx] = transitions / Math.max(1, n);
    }
  }

  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const seen = new Uint8Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      if (seen[idx] || edge[idx] < 0.08) continue;
      // flood fill high-edge cells
      const stack = [[gx, gy]];
      seen[idx] = 1;
      let minX = gx;
      let maxX = gx;
      let minY = gy;
      let maxY = gy;
      let count = 0;
      let edgeSum = 0;
      while (stack.length) {
        const [x, y] = stack.pop();
        count++;
        edgeSum += edge[y * gw + x];
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
          if (seen[ni] || edge[ni] < 0.08) continue;
          seen[ni] = 1;
          stack.push([nx, ny]);
        }
      }
      if (count < 6) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / Math.max(1, bh);
      const avgEdge = edgeSum / count;
      // QR-like square or barcode-like wide strip
      const square = aspect > 0.55 && aspect < 1.8 && bw >= 3 && bh >= 3 && avgEdge > 0.1;
      const strip = (aspect >= 2.5 || aspect <= 0.4) && count >= 8 && avgEdge > 0.12;
      if (!square && !strip) continue;
      const pad = cell;
      flags.push({
        box: [
          minX * cell - pad,
          minY * cell - pad,
          Math.min(W, (maxX + 1) * cell + pad),
          Math.min(H, (maxY + 1) * cell + pad),
        ],
        reason: "dense_code_region",
        blanked: false,
      });
    }
  }
  return flags.slice(0, 12);
}
