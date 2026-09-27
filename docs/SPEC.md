# SafeShare MD — Specification v1

## 1. Overview
A mobile-first PWA for doctors in Hong Kong.
The doctor photographs or selects a lab report / clinical document. The app detects and blacks out
patient identifiers ON THE DEVICE, lets the doctor review and adjust, then shares a flattened
redacted image directly to WhatsApp/Telegram via the system share sheet.

Core promise: "Nothing leaves your phone except the redacted image you choose to share."

## 2. Core user flow
1. Home: big buttons — "Take photo", "Choose image / PDF". (Android: also receive shared images via Web Share Target.)
2. Processing: progress indicator (loading → reading text → finding identifiers). Target < 10 s per page on a mid-range phone.
3. Review: image with black boxes overlaid. Doctor can:
   - tap a box to remove it (it becomes a dashed outline, tap again to restore)
   - draw new boxes by dragging
   - pinch-zoom and pan
   - press-and-hold "Peek" to see the original under the boxes
   - see a list of detections grouped by category (Name, HKID, MRN, Phone, …)
   - switch modes (see §5.6)
4. Confirm: checkbox "I have checked that no patient identifiers are visible" (required).
5. Share: system share sheet (navigator.share with files). Fallback: download.
6. After sharing or pressing "Done": all images, text and detections are wiped from memory.

## 3. Tech stack
- Vite + React + TypeScript (strict)
- OCR: Tesseract.js v5, run in a Web Worker, with workerPath / corePath / langPath all self-hosted under /public/vendor/.
  Languages: eng (required for v1). chi_tra (Traditional Chinese) is next after v1, because Hospital Authority forms are bilingual English/Traditional Chinese. Do not bundle Malay. Start with tessdata_fast; evaluate tessdata_best if accuracy is poor.
- PDF: pdf.js (pdfjs-dist) with a self-hosted worker. Render pages to canvas. For digital PDFs, also use the embedded text (getTextContent) with positions, since it is more accurate than OCR.
- Barcodes / QR codes: native BarcodeDetector where available; fallback zxing-wasm (self-hosted).
- Faces: MediaPipe Tasks Vision Face Detector (wasm + model self-hosted).
- PWA: vite-plugin-pwa (Workbox) — precache app assets only.
- Tests: Vitest (unit), Playwright (end-to-end, including network and offline tests).
- Hosting: any static host (Cloudflare Pages / Netlify / Vercel). No server code.

## 4. Processing pipeline
1. Load
   - Images: decode with createImageBitmap(file, { imageOrientation: 'from-image' }) to respect EXIF rotation.
   - iPhone HEIC: the file input normally converts to JPEG; if decoding fails, show a clear message.
   - Downscale so the longest side is ≤ 2500 px (keep the original resolution for export only if ≤ 3000 px).
   - PDF: max 10 pages; render each at a scale giving ~2000 px width.
   - Metadata is never read or reused; output is always re-encoded from a canvas.
2. Pre-process (for OCR only, not for output): grayscale, contrast normalisation, optional deskew.
3. Text extraction: OCR → words with bounding boxes, confidence, line and block grouping.
   Map all boxes back to original image coordinates.
4. Zone detection (§5.5).
5. Detection (§5.1–5.4) → list of Detection { id, bbox, category, source, confidence, enabled }.
6. Merge overlapping boxes; add padding (4 px or 15% of text height, whichever is larger).
7. Review UI → export.

## 5. Detection rules

### 5.1 Pattern rules (regex, applied to line text, mapped back to word boxes)
Before matching, create a normalised copy of each token for digit-like tokens:
O/o→0, I/l/|→1, S→5, B→8, Z→2 (only when the token is mostly digits). Allow spaces/hyphens inside IDs.

| Category | Rule | Notes |
|---|---|---|
| Hong Kong Identity Card (HKID) | `\b[A-Z]{1,2}\d{6}\([0-9A]\)\b` | Also accept fullwidth parentheses (`（` `）`) and a missing closing parenthesis. Unbracketed form `\b[A-Z]{1,2}\d{6}[0-9A]\b` only in the header/footer or next to an ID label (so it does not collide with random codes). Also partially masked forms like `A****56(7)` and `****456(7)`. The HKID check digit only raises confidence. REDACT EVEN IF THE CHECK FAILS (OCR errors). |
| Passport | `\b[A-Z]{1,2}\d{6,9}\b` | Only when near a passport label OR in the header zone. |
| HK phone | `(?:\+852[-\s]?)?[2-9]\d{3}[-\s]?\d{4}` | 8-digit local numbers, optional +852. Unlabelled matches only in header/footer zones. Next to a phone label, redact in any zone. |
| Email | standard email regex | |
| Address | Hong Kong region or district, plus a street token | Hong Kong has no postcode. Redact a line that has a region or district (Hong Kong, Kowloon, New Territories, Central, Wan Chai, Eastern, Southern, Yau Tsim Mong, Sham Shui Po, Kowloon City, Wong Tai Sin, Kwun Tong, Kwai Tsing, Tsuen Wan, Tuen Mun, Yuen Long, North, Tai Po, Sha Tin, Sai Kung, Islands, 香港, 九龍, 新界) plus a street token (Road, Street, Rd, St, Path, Lane, 道, 街, 路, 里, 號). |
| Dates | common formats (dd/mm/yyyy, dd-MMM-yyyy, yyyy-mm-dd, dd.mm.yy) | Labelled DOB → always redact. Other dates → controlled by the setting "Redact all dates" (default OFF; collection/report dates are clinically useful). |

### 5.2 Label rules (most important for lab reports)
Find label text (case-insensitive, fuzzy match with edit distance ≤ 1 for words longer than 4 letters,
tolerate trailing ":" or "."). Redact the value to the RIGHT of the label on the same line, up to the
next known label or a large horizontal gap. If nothing is to the right, redact the line directly below.

Labels (English / Traditional Chinese):
- Name: Name, Patient, Patient Name, Pt Name, 姓名, 病人, 病人姓名
- ID: HKID, HKID No, HKIC, H.K.I.D., Identity Card, Identity Card No, ID No, I.D., I.D. No, 身份證, 身份證號碼, 身份証
- Record numbers: MRN, HN, Hospital No, Patient No, Case No, Episode, Episode No, HA No, Lab No, Lab ID, Accession, Accession No, Specimen ID, Sample ID, Ref No, Visit No, Bed, Ward, Room, 病人編號, 醫院編號, 化驗編號
- DOB: DOB, D.O.B, Date of Birth, Birth Date, 出生日期
- Contact: Tel, Tel No, Phone, Mobile, Email, 電話, 電郵
- Address: Address, 地址 (redact the value and up to 3 following lines until the next label)
- Other people (toggle, default ON): Doctor, Dr, Requested by, Referring Doctor, Ordered by, Clinician, 醫生, 主診醫生
- Organisation (toggle, default OFF): Clinic, Hospital, Hospital Authority, HA, 醫院, 診所

Age and Sex/Gender: default KEEP (clinically useful), with settings toggles. Labels include Age, Sex, Gender, 年齡, and 性別.

### 5.3 Name propagation
When a name is found via a label, take its tokens (length ≥ 3) and search every line on all pages
for the same tokens (fuzzy match, edit distance ≤ 1). Redact all matches outside the results rows.
Do the same for detected HKID numbers (they repeat in footers).

### 5.4 Visual detectors
- Barcodes and QR codes: always redact (they often encode the MRN/HKID).
- Faces: always redact (patient photos, ID card photos).
- Handwriting and signatures are hard to detect automatically in v1; the user draws boxes manually.
  Low-confidence OCR words (confidence < 40) in the header zone: redact by default (setting).

### 5.5 Zones
Split each page into Header / Results / Footer.
- The Results zone starts at the first line containing table-header words (Test, Investigation,
  Result, Unit, Units, Reference, Ref. Range, Normal Range, Flag, 檢驗項目, 結果, 單位, 參考範圍, 參考值) OR the first
  run of ≥ 2 consecutive lines that look like result rows (a word + a number + a unit or range pattern).
- The Results zone ends after the last result-like row.
- Inside Results rows: only pattern rules for HKID, email and labelled items apply.
  Numbers, units and ranges are never redacted by generic rules.
- If zones cannot be detected, treat the whole page as Header (redact more, not less) and show a warning.

### 5.6 Modes (user-selectable on the Review screen)
- Standard (default): rules above.
- Header blackout: redact the entire Header zone plus the footer, keep Results. One tap.
- Results only (strictest, allow-list): black out EVERYTHING except the Results rows.
- Manual: no automatic boxes; the user draws everything.

## 6. Review UI requirements
- Mobile-first, one-handed use; large touch targets (≥ 44 px).
- The box overlay is drawn on a canvas above the image; the redacted preview must match the export pixel-for-pixel.
- Category legend and counts ("3 names, 1 HKID, 2 barcodes").
- A banner if OCR confidence is low overall, or if no name/ID was found ("Nothing detected — please check carefully").
- The Share button is disabled until the confirmation checkbox is ticked.

## 7. Export & share
- For each page, draw the image onto a fresh canvas, then fillRect with opaque #000 for every enabled box.
- Optional footer watermark (setting, default ON): "De-identified · For clinical discussion only".
- Encode as JPEG (quality 0.9) — or PNG if the user chooses — via canvas.toBlob. This inherently strips EXIF/metadata.
- Filenames: `report-redacted-<random 6 chars>-p<n>.jpg`. Never derived from content.
- Multi-page: share all pages as multiple files in one navigator.share call; check navigator.canShare({files}) first.
- Fallback: download the files (or a zip).
- Never export a PDF in v1.
- After share/done: revoke object URLs, clear canvases, and drop references to images, OCR text and detections.

## 8. Settings (stored in localStorage — settings only, never data)
Default mode; redact doctor names (ON); redact organisation names (OFF); redact all dates (OFF);
redact age (OFF); redact sex (OFF); redact low-confidence header words (ON); watermark (ON); output format (JPEG).

## 9. Security & privacy
- Content-Security-Policy (via a meta tag AND host headers, e.g. _headers):
  `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self';
   img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none';
   form-action 'none'; frame-ancestors 'none'`
- Also: Referrer-Policy: no-referrer; Permissions-Policy allowing camera only for self.
- No cookies, no accounts, no analytics in v1.
- A Privacy page explaining in plain language how it works, and how the user can verify it (airplane-mode test).
- Disclaimer on first launch (must accept): automatic detection is not perfect; the user is responsible
  for checking the image before sharing; the app does not give medical advice.

## 10. Offline / PWA
- Installable (manifest, icons, standalone display).
- Precache the app shell, OCR worker/core/language data, pdf.js worker, and detector models on first load.
- After the first load, the full flow must work in airplane mode.
- Web Share Target (Android): accept images/PDFs shared from the gallery. The POST must be handled
  entirely inside the service worker and passed to the page; it must never reach the network.

## 11. Testing & acceptance criteria
- Unit tests for every regex and label rule, including OCR-error variants (e.g. "A88O1O1(3)").
- Synthetic report generator (Phase 6) producing fake Hong Kong Hospital Authority-style lab reports (English / Traditional Chinese) with ground truth.
- Accuracy harness: identifier recall ≥ 98% on the synthetic set in Standard mode, and 100% in Results-only
  mode; result values preserved ≥ 99%.
- Playwright tests:
  - Record all network requests during the full flow: all must be same-origin GETs for static assets;
    zero POST/PUT; zero requests after the app has loaded.
  - context.setOffline(true) after the first load → the full flow still works.
  - The exported image has no EXIF, and pixels inside the boxes are pure black.
- Manual test on real devices: Android Chrome and iPhone Safari (share to WhatsApp works).

## 12. Out of scope for v1
Accounts, cloud sync, payments, PDF export, lab-value extraction, native apps,
Malay OCR, Simplified Chinese OCR, MyKad, Singapore NRIC,
handwriting detection, any server component.
Traditional Chinese (chi_tra) is the planned next language after v1 and is not part of the v1 scaffold.
