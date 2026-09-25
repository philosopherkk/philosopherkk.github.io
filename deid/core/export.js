/**
 * Export helpers: flat PNG/JPEG (no EXIF) and image-only PDF (no text layer / metadata).
 * @module core/export
 */

/**
 * Encode ImageData to a Blob via canvas (PNG or JPEG). Canvas.toBlob strips EXIF.
 * @param {ImageData} imageData
 * @param {'image/png'|'image/jpeg'} [mime='image/png']
 * @param {number} [quality=0.92]
 * @returns {Promise<Blob>}
 */
export async function encodeImage(imageData, mime = "image/png", quality = 0.92) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      mime,
      mime === "image/jpeg" ? quality : undefined
    );
  });
}

/**
 * Neutral export filename: PREFIX-NNN-pN.ext (no dates).
 * @param {string} prefix
 * @param {number} fileIndex  1-based
 * @param {number} pageIndex  1-based
 * @param {string} ext  png|jpg|pdf
 * @returns {string}
 */
export function makeExportName(prefix, fileIndex, pageIndex, ext) {
  const p = String(prefix || "DEID").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "DEID";
  const n = String(fileIndex).padStart(3, "0");
  return `${p}-${n}-p${pageIndex}.${ext}`;
}

/**
 * Build a single-page PDF embedding JPEG bytes (DCTDecode). Empty Info fields.
 * @param {Uint8Array} imageBytes
 * @param {number} widthPx
 * @param {number} heightPx
 * @param {number} [dpi=150]
 * @returns {Uint8Array}
 */
export function buildPdfFromJpeg(imageBytes, widthPx, heightPx, dpi = 150) {
  return buildMultiPagePdf([{ bytes: asU8(imageBytes), width: widthPx, height: heightPx }], dpi);
}

/**
 * Multi-page image-only PDF from JPEG page blobs. No text layer; Info cleared.
 * @param {{ bytes: Uint8Array, width: number, height: number }[]} pages
 * @param {number} [dpi=150]
 * @returns {Uint8Array}
 */
export function buildMultiPagePdf(pages, dpi = 150) {
  /** @type {Uint8Array[]} */
  const parts = [];
  const offsets = [0];
  const push = (u8) => {
    parts.push(typeof u8 === "string" ? enc(u8) : u8);
  };
  const objStart = () => {
    offsets.push(lenSoFar());
  };
  const lenSoFar = () => {
    let off = 0;
    for (const p of parts) off += p.length;
    return off;
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");

  objStart();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objStart();
  push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    const pageObj = 3 + i * 3;
    const imgObj = pageObj + 1;
    const contentObj = pageObj + 2;
    const wPt = (pg.width * 72) / dpi;
    const hPt = (pg.height * 72) / dpi;
    const bytes = asU8(pg.bytes);

    objStart();
    push(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(wPt)} ${fmt(hPt)}] /Contents ${contentObj} 0 R /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> >>\nendobj\n`
    );
    objStart();
    push(
      `${imgObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`
    );
    push(bytes);
    push("\nendstream\nendobj\n");
    const content = `q\n${fmt(wPt)} 0 0 ${fmt(hPt)} 0 0 cm\n/Im0 Do\nQ\n`;
    objStart();
    push(`${contentObj} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  }

  const infoObj = 3 + pages.length * 3;
  objStart();
  push(
    `${infoObj} 0 obj\n<< /Title () /Author () /Subject () /Keywords () /Creator () /Producer () /CreationDate () /ModDate () >>\nendobj\n`
  );

  const xrefStart = lenSoFar();
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info ${infoObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  );
  return concatBytes(...parts);
}

/** @param {string} s */
function enc(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** @param {...(Uint8Array|string)} chunks */
function concatBytes(...chunks) {
  const arrs = chunks.map((c) => (typeof c === "string" ? enc(c) : c));
  let n = 0;
  for (const a of arrs) n += a.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** @param {Uint8Array|ArrayBuffer} b */
function asU8(b) {
  return b instanceof Uint8Array ? b : new Uint8Array(b);
}

/**
 * Copy a PNG/JPEG blob to the clipboard as an image (when supported).
 * @param {Blob} blob
 * @returns {Promise<void>}
 */
export async function copyImageToClipboard(blob) {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error("Clipboard image not supported");
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
