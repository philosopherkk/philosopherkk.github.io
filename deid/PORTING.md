# Porting deid core into OcuLens (TypeScript)

The modules under `/deid/core/` are plain ES modules. Most work on `ImageData` plus an injected OCR provider. Several modules still assume a browser-like host (see **DOM & globals** below).

## Modules

| Module | Role |
|---|---|
| `rules.js` | Device `CROP` windows, keywords, PHI / serial regexes, label word lists |
| `detect.js` | `detectDevice(text)` / `detectDeviceOrGeneric(text)` |
| `geometry.js` | Rotation box mapping, upright score |
| `deskew.js` | Projection-profile skew + 90° / small rotates on `ImageData` (needs global `ImageData`) |
| `crop.js` | Anchor shift, keep/erase/cut, `applyCrop`, `fillWhite` (needs global `ImageData`) |
| `phi.js` | Label→value masks, safety-net flags, clinical-term guards, `serialHits` → `{text,box,reason:'serial'}` |
| `barcode.js` | BarcodeDetector / jsQR / ZXing / dense heuristic; inject via `setBarcodeDecoders` |
| `qrfind.js` | Decode-independent QR finder + 1-finder/dense + finder-less texture |
| `flagmap.js` | `remapFlagsAfterCrop` / `remapFlagsAfterRotate90` |
| `pipeline.js` | `deidPage(imageData, opts)` |
| `export.js` | PNG/JPEG encode, image-only PDF, clipboard (browser DOM) |
| `types.js` | Shared JSDoc typedefs (`Word`, `FlagHit`, `DeidResult`, …) |
| `index.js` | Public re-exports |

Vendored decoders (same-origin, lazy): `deid/vendor/jsqr/`, `deid/vendor/zxing/`. OCR: `deid/vendor/tesseract/` + `deid/vendor/tessdata/` (`eng`, `chi_tra`).

## DOM & globals (honest)

| Need | Where |
|---|---|
| Global `ImageData` constructor | `crop.js`, `deskew.js`, `pipeline.js`, `ui/history.js` |
| `document.createElement('script')` | `barcode.js` lazy-loads jsQR/ZXing **unless** you call `setBarcodeDecoders({ jsQR, ZXing })` |
| `BarcodeDetector` (optional) | `barcode.js` — skipped when missing |
| `OffscreenCanvas` / canvas 2D | `pipeline.toImageData`, `export.js`, `ui/ocr.js` |
| `ClipboardItem` / `navigator.clipboard` | `export.copyImageToClipboard` only |

Without a DOM, barcode script loading silently returns `null` and those decoders are skipped; finder / texture / dense paths still run. Prefer `setBarcodeDecoders` in OcuLens / Node.

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
    opts?: { lang?: "eng" | "chi_tra"; psm?: number }
  ): Promise<Word[]>;
};
```

- `ui/ocr.js` honours `opts.lang`: separate lazy **eng** and **chi_tra** workers (vendored, same-origin, cache-first).
- Pipeline uses `eng` for orientation / labels / serial, and `chi_tra` for Han name backstop.
- Auto-blank only high-confidence **genuine Han** boxes that do **not** overlap Latin clinical tokens (`Right Eye`, `OD`/`OS`, `MD`, `PSD`, …).

## `deidPage` options & result

```ts
deidPage(page: ImageData, {
  ocr: OcrProvider;
  forceDevice?: string;
  onProgress?: (msg: string, p?: number) => void;
  autoBlankBackstop?: boolean; // default true — blank high-conf PHI boxes like deid.py
});
```

Result fields (among others):

| Field | Meaning |
|---|---|
| `device` | Detected layout key |
| `image` / `imageData` | Working (cropped / auto-blanked) image |
| `upright` | Oriented page before crop |
| `uprightRot` | 0 / 90 / 180 / 270 |
| `deskew` | Small deskew degrees |
| `shift` / `anchor` | Anchor dy fraction + label |
| `keep` / `erase` / `cuts` | Applied crop windows |
| `removedRegions` | Erase + backstop boxes applied |
| `flags` | Unresolved safety flags (see reasons) |
| `serialHits` | Text list of serial flag texts (also present as `flags` with `reason:'serial'`) |
| `passed` | No unresolved flags |

### Flag `reason` values

`identity_or_date`, `institution`, `signature_line`, `phone`, `cjk_name`, `serial`, `barcode`, `qr_finder`, `qr_texture`, `dense_code_region`, `too_many_codes`.

## Typical host flow (match the web app)

```js
import {
  deidPage,
  blankFlag,
  encodeImage,
  decodeAnyCodes,
  detectBarcodeFlags,
  remapFlagsAfterCrop,
  remapFlagsAfterRotate90,
  serialHits,
  setBarcodeDecoders, // optional in native hosts
} from "./core/index.js";

const result = await deidPage(pageImageData, { ocr, onProgress });
let flags = result.flags.map((f) => ({ ...f, box: [...f.box] }));
// … user blanks …
for (const f of flags) if (!f.blanked) blankFlag(result.imageData, f);

// After crop / rotate: remap, then re-detect codes; after crop also re-run serialHits
flags = remapFlagsAfterRotate90(flags, prevW, prevH, 1);
// flags = remapFlagsAfterCrop(flags, cropBox);
const codes = await detectBarcodeFlags(working);
// merge non-overlapping codes into flags; on crop, serialHits({0: engWords}, W, H)

// Before Approve: block if any flag unblanked OR decodeAnyCodes still finds payload
const leftover = await decodeAnyCodes(working);
if (leftover.length || flags.some((f) => !f.blanked)) { /* refuse Approve */ }
```

## Notes for TypeScript

1. Copy `core/*.js` and add `.d.ts` from the JSDoc typedefs in `types.js`, or convert files 1:1.
2. Keep `rules.js` data-driven — new devices are new `CROP` + `DEVICE_KEYWORDS` entries.
3. Never persist `ImageData` / blobs to disk or IndexedDB in the host app unless the user explicitly exports.
4. Privacy: OCR and crop must stay on-device; no network of image bytes.
