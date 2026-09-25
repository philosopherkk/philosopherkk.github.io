/**
 * Decode-independent QR finder-pattern detector (1:1:3:1:1).
 * Flags a code-like region even when jsQR/ZXing fail to decode.
 * Strict cross-checks avoid clinical text false positives.
 * @module core/qrfind
 */

/**
 * @typedef {{ x: number, y: number, moduleSize: number }} FinderHit
 */

/**
 * Detect QR-like regions via three finder squares.
 * @param {ImageData} imageData
 * @returns {import('./types.js').FlagHit[]}
 */
export function detectQrFinderFlags(imageData) {
  const finders = findFinderPatterns(imageData);
  if (finders.length < 3) return [];

  /** @type {import('./types.js').FlagHit[]} */
  const flags = [];
  const usedFinder = new Set();

  // Greedy: pick best triplets first (closest to ideal right-isosceles)
  /** @type {{ score: number, i: number, j: number, k: number, box: [number,number,number,number] }[]} */
  const candidates = [];
  for (let i = 0; i < finders.length; i++) {
    for (let j = i + 1; j < finders.length; j++) {
      for (let k = j + 1; k < finders.length; k++) {
        const trip = [finders[i], finders[j], finders[k]];
        const scored = scoreFinderTriplet(trip);
        if (!scored) continue;
        const box = qrBoxFromFinderTriplet(trip, imageData.width, imageData.height);
        if (!box) continue;
        const bw = box[2] - box[0];
        const bh = box[3] - box[1];
        if (bw < 60 || bh < 60) continue;
        candidates.push({ score: scored, i, j, k, box });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (usedFinder.has(c.i) || usedFinder.has(c.j) || usedFinder.has(c.k)) continue;
    usedFinder.add(c.i);
    usedFinder.add(c.j);
    usedFinder.add(c.k);
    flags.push({
      box: c.box,
      reason: "qr_finder",
      text: "qr-finder",
      blanked: false,
    });
  }
  return flags.slice(0, 6);
}

/**
 * Expand a partial/tiny QR decode box using nearby finder geometry when possible.
 * @param {ImageData} imageData
 * @param {[number, number, number, number]} box
 * @param {{x:number,y:number}[]} [points]
 * @returns {[number, number, number, number]}
 */
export function expandQrCodeBox(imageData, box, points = []) {
  const { width: W, height: H } = imageData;
  let [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;

  if (points.length >= 3) {
    const fromPts = qrBoxFromFinderTriplet(
      points.map((p) => ({
        x: p.x,
        y: p.y,
        moduleSize: Math.max(2, Math.max(w, h) / 14),
      })),
      W,
      H
    );
    if (fromPts) {
      const fw = fromPts[2] - fromPts[0];
      const fh = fromPts[3] - fromPts[1];
      if (fw >= 60 && fh >= 60) return fromPts;
    }
  }

  // Already a reasonable QR-sized near-square
  if (w >= 72 && h >= 72 && w / h > 0.7 && w / h < 1.4) {
    const pad = 16;
    return [
      Math.max(0, x0 - pad),
      Math.max(0, y0 - pad),
      Math.min(W, x1 + pad),
      Math.min(H, y1 + pad),
    ];
  }

  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const finders = findFinderPatterns(imageData);
  const near = finders
    .filter((f) => Math.hypot(f.x - cx, f.y - cy) < Math.max(160, Math.max(w, h) * 5))
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  if (near.length >= 3) {
    const fromNear = qrBoxFromFinderTriplet(near.slice(0, 3), W, H);
    if (fromNear) return fromNear;
  }

  let side = Math.max(96, Math.max(w, h) * 4);
  if (points.length >= 2) {
    let m = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        m = Math.max(m, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
    }
    side = Math.max(side, m * 1.25);
  }
  const half = side / 2;
  return [
    Math.max(0, cx - half - 12),
    Math.max(0, cy - half - 12),
    Math.min(W, cx + half + 12),
    Math.min(H, cy + half + 12),
  ];
}

/**
 * @param {FinderHit[]} trip
 * @returns {number|null} score (higher better)
 */
function scoreFinderTriplet(trip) {
  const [a, b, c] = trip;
  const dAB = Math.hypot(a.x - b.x, a.y - b.y);
  const dAC = Math.hypot(a.x - c.x, a.y - c.y);
  const dBC = Math.hypot(b.x - c.x, b.y - c.y);
  const sides = [dAB, dAC, dBC].sort((x, y) => x - y);
  const leg = (sides[0] + sides[1]) / 2;
  const hyp = sides[2];
  if (leg < 28) return null;
  if (hyp < leg * 1.15 || hyp > leg * 1.7) return null;
  const ratio = sides[0] / Math.max(1, sides[1]);
  if (ratio < 0.55) return null;
  const modOk =
    Math.max(a.moduleSize, b.moduleSize, c.moduleSize) /
      Math.min(a.moduleSize, b.moduleSize, c.moduleSize) <
    2.2;
  if (!modOk) return null;
  // Prefer hyp ≈ leg * √2
  const ideal = 1 - Math.abs(hyp / leg - Math.SQRT2) / Math.SQRT2;
  return ideal * ratio;
}

/**
 * @param {FinderHit[]} trip
 * @param {number} W
 * @param {number} H
 * @returns {[number, number, number, number]|null}
 */
export function qrBoxFromFinderTriplet(trip, W, H) {
  if (trip.length < 3) return null;
  if (!scoreFinderTriplet(trip)) return null;
  const [a, b, c] = trip;
  const mod =
    (a.moduleSize + b.moduleSize + c.moduleSize) / 3 || 3;
  const pad = mod * 4 + 14;
  const tl = identifyTopLeft(a, b, c);
  const others = [a, b, c].filter((p) => p !== tl);
  const v1 = { x: others[0].x - tl.x, y: others[0].y - tl.y };
  const v2 = { x: others[1].x - tl.x, y: others[1].y - tl.y };
  const fourth = { x: tl.x + v1.x + v2.x, y: tl.y + v1.y + v2.y };
  const xs = [a.x, b.x, c.x, fourth.x];
  const ys = [a.y, b.y, c.y, fourth.y];
  return [
    Math.max(0, Math.min(...xs) - pad),
    Math.max(0, Math.min(...ys) - pad),
    Math.min(W, Math.max(...xs) + pad),
    Math.min(H, Math.max(...ys) + pad),
  ];
}

/** @param {FinderHit} a @param {FinderHit} b @param {FinderHit} c */
function identifyTopLeft(a, b, c) {
  const score = (p, q, r) => {
    const vq = { x: q.x - p.x, y: q.y - p.y };
    const vr = { x: r.x - p.x, y: r.y - p.y };
    const nq = Math.hypot(vq.x, vq.y) || 1;
    const nr = Math.hypot(vr.x, vr.y) || 1;
    return (vq.x * vr.x + vq.y * vr.y) / (nq * nr);
  };
  const candidates = [
    { p: a, s: score(a, b, c) },
    { p: b, s: score(b, a, c) },
    { p: c, s: score(c, a, b) },
  ];
  candidates.sort((u, v) => u.s - v.s);
  return candidates[0].p;
}

/**
 * @param {ImageData} imageData
 * @returns {FinderHit[]}
 */
export function findFinderPatterns(imageData) {
  const { width: W, height: H, data } = imageData;
  if (W < 60 || H < 60) return [];

  const binary = new Uint8Array(W * H);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    binary[j] = g < 110 ? 1 : 0;
  }

  /** @type {FinderHit[]} */
  const raw = [];
  for (let y = 3; y < H - 3; y += 2) {
    let x = 0;
    while (x < W - 7) {
      // Skip white
      while (x < W && binary[y * W + x] === 0) x++;
      if (x >= W) break;
      const runStart = x;
      const runs = [];
      let expect = 1;
      let pos = x;
      while (pos < W && runs.length < 5) {
        let len = 0;
        while (pos < W && binary[y * W + pos] === expect) {
          len++;
          pos++;
        }
        if (len === 0) break;
        runs.push(len);
        expect = 1 - expect;
      }
      if (runs.length === 5 && matchFinderRatio(runs)) {
        const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
        const cx = Math.round(runStart + runs[0] + runs[1] + runs[2] / 2);
        const moduleSize = total / 7;
        if (moduleSize >= 2 && moduleSize <= 36) {
          const cross = crossCheckVertical(binary, W, H, cx, y, moduleSize);
          if (cross) raw.push(cross);
        }
      }
      // Advance into the pattern so we can find overlapping starts
      x = runStart + Math.max(1, runs[0] || 1);
    }
  }

  return mergeFinders(raw);
}

/** @param {number[]} runs */
function matchFinderRatio(runs) {
  const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
  if (total < 14) return false;
  const unit = total / 7;
  const ok = (v, n) => Math.abs(v - n * unit) <= Math.max(1.1, unit * 0.7);
  return ok(runs[0], 1) && ok(runs[1], 1) && ok(runs[2], 3) && ok(runs[3], 1) && ok(runs[4], 1);
}

/**
 * @param {Uint8Array} binary
 * @param {number} W
 * @param {number} H
 * @param {number} cx
 * @param {number} cy
 * @param {number} moduleSize
 * @returns {FinderHit|null}
 */
function crossCheckVertical(binary, W, H, cx, cy, moduleSize) {
  if (cx < 2 || cx >= W - 2) return null;
  const runs = [0, 0, 0, 0, 0];
  let y = cy;
  while (y >= 0 && binary[y * W + cx]) {
    runs[2]++;
    y--;
  }
  if (y < 0) return null;
  while (y >= 0 && !binary[y * W + cx]) {
    runs[1]++;
    y--;
  }
  if (y < 0) return null;
  while (y >= 0 && binary[y * W + cx]) {
    runs[0]++;
    y--;
  }
  y = cy + 1;
  while (y < H && binary[y * W + cx]) {
    runs[2]++;
    y++;
  }
  if (y >= H) return null;
  while (y < H && !binary[y * W + cx]) {
    runs[3]++;
    y++;
  }
  if (y >= H) return null;
  while (y < H && binary[y * W + cx]) {
    runs[4]++;
    y++;
  }
  if (!matchFinderRatio(runs)) return null;
  const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
  const ms = total / 7;
  if (Math.abs(ms - moduleSize) / moduleSize > 0.65) return null;
  const topOfPattern = cy - runs[0] - runs[1] - Math.floor(runs[2] / 2);
  const py = topOfPattern + runs[0] + runs[1] + runs[2] / 2;
  return { x: cx, y: py, moduleSize: (ms + moduleSize) / 2 };
}

/** @param {FinderHit[]} raw */
function mergeFinders(raw) {
  /** @type {FinderHit[]} */
  const out = [];
  for (const f of raw) {
    let merged = false;
    for (const o of out) {
      const dist = Math.hypot(f.x - o.x, f.y - o.y);
      if (dist < Math.max(o.moduleSize, f.moduleSize) * 2.8) {
        o.x = (o.x + f.x) / 2;
        o.y = (o.y + f.y) / 2;
        o.moduleSize = (o.moduleSize + f.moduleSize) / 2;
        merged = true;
        break;
      }
    }
    if (!merged) out.push({ ...f });
  }
  return out;
}
