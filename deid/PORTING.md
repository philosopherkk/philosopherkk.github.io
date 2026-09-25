# Porting deid core into OcuLens (TypeScript)

The modules under `/deid/core/` are plain ES modules with **no DOM dependencies** except `core/export.js` (`document.createElement('canvas')` / `ClipboardItem`). Everything else works on `ImageData` + an injected OCR provider.

## Modules

| Module | Role |
|---|---|
| `rules.js` | Device `CROP` windows, keywords, PHI / serial regexes, label word lists |
| `detect.js` | `detectDevice(text)` / `detectDeviceOrGeneric(text)` |
| `geometry.js` | Rotation box mapping, upright score |
| `deskew.js` | Projection-profile skew + 90° / small rotates on `ImageData` |
| `crop.js` | Anchor shift, keep/erase/cut, `applyCrop` |
| `phi.js` | Label→value masks, safety-net flags, serial check |
| `pipeline.js` | `deidPage(imageData, { ocr, forceDevice, onProgress })` |
| `export.js` | PNG/JPEG encode, image-only PDF, clipboard (browser) |

## OCR provider contract

```ts
type Word = {
  text: string;
  conf: number; // 0–100
  x0: number; y0: number; x1: number; y1: number;
  line?: [number, number, number];
};

type OcrProvider = {
  recognize(
    image: ImageData,
    opts?: { lang?: string; psm?: number }
  ): Promise<Word[]>;
};
```

In the web app, `ui/ocr.js` wraps vendored tesseract.js. In OcuLens, implement the same interface over native Vision / Tesseract.

## Typical call

```js
import { deidPage, blankFlag, encodeImage } from "./core/index.js";

const result = await deidPage(pageImageData, { ocr, onProgress });
// result.device, result.imageData, result.flags, result.serialHits, result.passed
for (const f of result.flags) blankFlag(result.imageData, f);
```

## Notes for TypeScript

1. Copy `core/*.js` and add `.d.ts` from the JSDoc typedefs in `types.js`, or convert files 1:1.
2. Keep `rules.js` data-driven — new devices are new `CROP` + `DEVICE_KEYWORDS` entries.
3. Never persist `ImageData` / blobs to disk or IndexedDB in the host app unless the user explicitly exports.
4. Privacy: OCR and crop must stay on-device; no network of image bytes.
