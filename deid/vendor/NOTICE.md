# Third-party licenses (vendored for same-origin / offline use)

- **pdf.js** (Mozilla) — Apache-2.0 — https://github.com/mozilla/pdf.js
- **tesseract.js** — Apache-2.0 — https://github.com/naptha/tesseract.js
- **tesseract.js-core** — Apache-2.0 — https://github.com/naptha/tesseract.js-core
  (`.wasm.js` builds only; sidecar `.wasm` binaries are unused and not shipped)
- **tessdata_fast** (eng, chi_tra) — Apache-2.0 — https://github.com/tesseract-ocr/tessdata_fast

CDN fallback URLs inside the minified tesseract bundles were patched out so a
misconfiguration cannot reach jsDelivr. Paths are always set to `/deid/vendor/…`.

OCR/wasm/traineddata are **not** precached by the service worker. They load on
first OCR use and are stored in the versioned `deid-ocr-v1` cache (cache-first).
