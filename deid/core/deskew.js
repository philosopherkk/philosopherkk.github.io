/**
 * Deskew via projection-profile (ported from deid.py deskew_angle).
 * Works on ImageData in memory — no DOM required if OffscreenCanvas is available.
 * @module core/deskew
 */

/**
 * Estimate skew angle in degrees (positive = CCW in canvas rotate convention after convert).
 * Matches PIL rotate convention used in deid.py (positive angle rotates CCW visually in PIL).
 * @param {ImageData} imageData
 * @param {number} [maxDeg=3]
 * @param {number} [step=0.2]
 * @returns {number}
 */
export function deskewAngle(imageData, maxDeg = 3, step = 0.2) {
  const scale = 1000 / Math.max(imageData.width, imageData.height);
  const w = Math.max(1, Math.floor(imageData.width * scale));
  const h = Math.max(1, Math.floor(imageData.height * scale));
  const gray = downsampleGray(imageData, w, h);
  const binary = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < 160 ? 1 : 0;

  let best = -1;
  let bestA = 0;
  for (let a = -maxDeg; a <= maxDeg + 1e-9; a += step) {
    const rotated = rotateBinaryNearest(binary, w, h, a);
    const prof = new Float64Array(rotated.h);
    for (let y = 0; y < rotated.h; y++) {
      let s = 0;
      const row = y * rotated.w;
      for (let x = 0; x < rotated.w; x++) s += rotated.data[row + x];
      prof[y] = s;
    }
    let sc = 0;
    for (let y = 1; y < rotated.h; y++) {
      const d = prof[y] - prof[y - 1];
      sc += d * d;
    }
    if (sc > best) {
      best = sc;
      bestA = a;
    }
  }
  return bestA;
}

/**
 * @param {ImageData} src
 * @param {number} w
 * @param {number} h
 * @returns {Uint8Array}
 */
function downsampleGray(src, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y + 0.5) * src.height / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x + 0.5) * src.width / w));
      const i = (sy * src.width + sx) * 4;
      out[y * w + x] = (src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114) | 0;
    }
  }
  return out;
}

/**
 * Rotate binary mask by `deg` degrees (PIL-like, fill 0 = white/background).
 * @param {Uint8Array} data
 * @param {number} w
 * @param {number} h
 * @param {number} deg
 */
function rotateBinaryNearest(data, w, h, deg) {
  const rad = (-deg * Math.PI) / 180; // PIL rotate is CCW; sample inverse
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = Math.round(cx + dx * cos - dy * sin);
      const sy = Math.round(cy + dx * sin + dy * cos);
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        out[y * w + x] = data[sy * w + sx];
      }
    }
  }
  return { data: out, w, h };
}

/**
 * Rotate ImageData by k*90° CCW.
 * @param {ImageData} src
 * @param {number} k  0..3
 * @returns {ImageData}
 */
export function rotate90(src, k) {
  k = ((k % 4) + 4) % 4;
  if (k === 0) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }
  const W = src.width;
  const H = src.height;
  const dw = k % 2 === 0 ? W : H;
  const dh = k % 2 === 0 ? H : W;
  const out = new ImageData(dw, dh);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let nx;
      let ny;
      if (k === 1) {
        nx = y;
        ny = W - 1 - x;
      } else if (k === 2) {
        nx = W - 1 - x;
        ny = H - 1 - y;
      } else {
        nx = H - 1 - y;
        ny = x;
      }
      const si = (y * W + x) * 4;
      const di = (ny * dw + nx) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

/**
 * Rotate ImageData by a small angle (degrees, PIL CCW) with white fill.
 * Uses bilinear for quality; falls back to nearest if canvas unavailable.
 * @param {ImageData} src
 * @param {number} deg
 * @returns {ImageData}
 */
export function rotateSmall(src, deg) {
  if (Math.abs(deg) < 0.05) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }
  // Prefer OffscreenCanvas when available (worker / modern browsers)
  const CanvasCtor = typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : null;
  if (CanvasCtor) {
    const c = new CanvasCtor(src.width, src.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.putImageData(src, 0, 0);
    const out = new CanvasCtor(src.width, src.height);
    const octx = out.getContext("2d");
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, src.width, src.height);
    octx.translate(src.width / 2, src.height / 2);
    octx.rotate((-deg * Math.PI) / 180); // canvas CW positive; PIL is CCW
    octx.drawImage(c, -src.width / 2, -src.height / 2);
    return octx.getImageData(0, 0, src.width, src.height);
  }
  // Pure JS nearest-neighbour fallback
  const rad = (-deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = (src.width - 1) / 2;
  const cy = (src.height - 1) / 2;
  const out = new ImageData(src.width, src.height);
  out.data.fill(255);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = Math.round(cx + dx * cos - dy * sin);
      const sy = Math.round(cy + dx * sin + dy * cos);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (y * src.width + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}
