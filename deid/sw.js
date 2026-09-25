/* Offline cache: shell only on install. OCR/wasm/traineddata = cache-first on first use. */
const SHELL_CACHE = "deid-shell-v7";
const OCR_CACHE = "deid-ocr-v1";

/** First-visit shell — no OCR wasm / traineddata / pdf.js. */
const SHELL_PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./icon.svg",
  "./ui/ocr.js",
  "./ui/loader.js",
  "./ui/history.js",
  "./ui/i18n.js",
  "./core/index.js",
  "./core/types.js",
  "./core/rules.js",
  "./core/detect.js",
  "./core/geometry.js",
  "./core/deskew.js",
  "./core/crop.js",
  "./core/phi.js",
  "./core/pipeline.js",
  "./core/export.js",
  "./core/barcode.js",
  "./core/qrfind.js",
  "./core/flagmap.js",
];

const OCR_RE =
  /\/deid\/vendor\/(tesseract|tessdata|jsqr|zxing)\//i;
const PDF_RE = /\/deid\/vendor\/pdfjs\//i;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  const keep = new Set([SHELL_CACHE, OCR_CACHE]);
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok && new URL(request.url).pathname.startsWith("/deid/")) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw new Error("offline and uncached");
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;
  if (!url.pathname.startsWith("/deid/")) return;

  if (OCR_RE.test(url.pathname) || PDF_RE.test(url.pathname)) {
    // Heavy assets: fetch once, then serve from versioned OCR cache
    e.respondWith(cacheFirst(e.request, OCR_CACHE));
    return;
  }

  e.respondWith(networkFirst(e.request, SHELL_CACHE));
});
