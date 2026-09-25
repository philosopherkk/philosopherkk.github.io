/**
 * Remap flag boxes after geometry ops (crop / rotate).
 * @module core/flagmap
 */

/**
 * Keep flags that still intersect the cropped image; shift into crop coords.
 * @param {import('./types.js').FlagHit[]} flags
 * @param {[number, number, number, number]} cropBox  [x0,y0,x1,y1] in pre-crop coords
 * @returns {import('./types.js').FlagHit[]}
 */
export function remapFlagsAfterCrop(flags, cropBox) {
  const [cx0, cy0, cx1, cy1] = cropBox;
  const out = [];
  for (const f of flags) {
    const [x0, y0, x1, y1] = f.box;
    const nx0 = Math.max(x0, cx0);
    const ny0 = Math.max(y0, cy0);
    const nx1 = Math.min(x1, cx1);
    const ny1 = Math.min(y1, cy1);
    if (nx1 - nx0 < 2 || ny1 - ny0 < 2) continue;
    out.push({
      ...f,
      box: [nx0 - cx0, ny0 - cy0, nx1 - cx0, ny1 - cy0],
      blanked: false,
    });
  }
  return out;
}

/**
 * Map flags after rotate90 CCW (k=1) on an image of size W×H (pre-rotate).
 * @param {import('./types.js').FlagHit[]} flags
 * @param {number} W  pre-rotate width
 * @param {number} H  pre-rotate height
 * @param {number} [k=1]
 * @returns {import('./types.js').FlagHit[]}
 */
export function remapFlagsAfterRotate90(flags, W, H, k = 1) {
  k = ((k % 4) + 4) % 4;
  if (k === 0) return flags.map((f) => ({ ...f, box: [...f.box], blanked: f.blanked }));
  return flags.map((f) => {
    const pts = corners(f.box).map(([x, y]) => rotPoint(x, y, W, H, k));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return {
      ...f,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      blanked: false,
    };
  });
}

/** @param {[number,number,number,number]} box */
function corners(box) {
  const [x0, y0, x1, y1] = box;
  return [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
}

/**
 * Rotate point CCW k*90 within W×H image → new coords.
 * @param {number} x
 * @param {number} y
 * @param {number} W
 * @param {number} H
 * @param {number} k
 */
function rotPoint(x, y, W, H, k) {
  if (k === 1) return [y, W - 1 - x];
  if (k === 2) return [W - 1 - x, H - 1 - y];
  if (k === 3) return [H - 1 - y, x];
  return [x, y];
}
