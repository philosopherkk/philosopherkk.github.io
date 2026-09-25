# Third-party licenses (vendored for same-origin / offline use)

Full upstream license texts ship beside the binaries:

| Package | License file(s) |
|---------|-----------------|
| **pdf.js** (Mozilla) | [`pdfjs/LICENSE`](./pdfjs/LICENSE) (Apache-2.0) |
| **tesseract.js** | [`tesseract/tesseract.js.LICENSE.md`](./tesseract/tesseract.js.LICENSE.md) (Apache-2.0) |
| **tesseract.js** (webpack sidecar) | [`tesseract/tesseract.min.js.LICENSE.txt`](./tesseract/tesseract.min.js.LICENSE.txt), [`tesseract/worker.min.js.LICENSE.txt`](./tesseract/worker.min.js.LICENSE.txt) |
| **tesseract.js-core** | [`tesseract/tesseract.js-core.LICENSE`](./tesseract/tesseract.js-core.LICENSE) (Apache-2.0) |
| **jsQR** | [`jsqr/LICENSE`](./jsqr/LICENSE) (Apache-2.0) |
| **@zxing/library** (UMD) | [`zxing/LICENSE`](./zxing/LICENSE) (Apache-2.0) |
| **tessdata_fast** (eng, chi_tra) | Apache-2.0 — https://github.com/tesseract-ocr/tessdata_fast |

Upstream projects:

- pdf.js — https://github.com/mozilla/pdf.js
- tesseract.js — https://github.com/naptha/tesseract.js
- tesseract.js-core — https://github.com/naptha/tesseract.js-core (`.wasm.js` builds only; sidecar `.wasm` binaries are unused and not shipped)
- jsQR — https://github.com/cozmo/jsQR
- @zxing/library — https://github.com/zxing-js/library

CDN fallback URLs inside the minified tesseract bundles were patched out so a
misconfiguration cannot reach jsDelivr. Paths are always set to `/deid/vendor/…`.

OCR/wasm/traineddata/jsQR/ZXing are **not** precached by the service worker shell.
They load on first use and are stored in the versioned `deid-ocr-v1` cache (cache-first).
