/* Offline cache for app shell only — never caches user uploads. */
const CACHE = "deid-shell-v1";
const PRECACHE = [
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
  "./vendor/tesseract/tesseract.min.js",
  "./vendor/tesseract/worker.min.js",
  "./vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./vendor/tesseract/tesseract-core-simd-lstm.wasm",
  "./vendor/tesseract/tesseract-core-lstm.wasm.js",
  "./vendor/tesseract/tesseract-core-lstm.wasm",
  "./vendor/tessdata/eng.traineddata",
  "./vendor/tessdata/chi_tra.traineddata",
  "./vendor/pdfjs/pdf.mjs",
  "./vendor/pdfjs/pdf.worker.mjs",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin
  if (e.request.method !== "GET") return;
  // Network-first for shell so deploys update; cache fallback for offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        // Only cache same-origin app assets, never opaque or POST bodies
        if (res.ok && url.pathname.startsWith("/deid/")) {
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
