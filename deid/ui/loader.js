/**
 * PDF / image loading via vendored pdf.js (same-origin only).
 */

let pdfjsLib = null;

export async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("../vendor/pdfjs/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "../vendor/pdfjs/pdf.worker.mjs",
    import.meta.url
  ).href;
  return pdfjsLib;
}

/**
 * Sniff file kind from magic bytes — file.type is often empty on iOS/Android.
 * @param {ArrayBuffer} buf
 * @returns {"pdf"|"jpeg"|"png"|"heic"|"unknown"}
 */
export function sniffFileKind(buf) {
  const u8 = new Uint8Array(buf);
  if (u8.length >= 5) {
    // %PDF-
    if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 && u8[4] === 0x2d) {
      return "pdf";
    }
  }
  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
    return "jpeg";
  }
  if (
    u8.length >= 8 &&
    u8[0] === 0x89 &&
    u8[1] === 0x50 &&
    u8[2] === 0x4e &&
    u8[3] === 0x47 &&
    u8[4] === 0x0d &&
    u8[5] === 0x0a &&
    u8[6] === 0x1a &&
    u8[7] === 0x0a
  ) {
    return "png";
  }
  // ISO BMFF: size(4) + 'ftyp' + brand; HEIC/HEIF brands
  if (u8.length >= 12) {
    const box = String.fromCharCode(u8[4], u8[5], u8[6], u8[7]);
    if (box === "ftyp") {
      const brand = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]).toLowerCase();
      if (
        brand === "heic" ||
        brand === "heix" ||
        brand === "heif" ||
        brand === "hevc" ||
        brand === "mif1" ||
        brand === "msf1" ||
        brand === "heim" ||
        brand === "heis"
      ) {
        return "heic";
      }
      // Also scan compatible brands in the ftyp box
      const boxSize = (u8[0] << 24) | (u8[1] << 16) | (u8[2] << 8) | u8[3];
      const end = Math.min(u8.length, boxSize > 0 ? boxSize : u8.length);
      for (let i = 8; i + 4 <= end; i += 4) {
        const b = String.fromCharCode(u8[i], u8[i + 1], u8[i + 2], u8[i + 3]).toLowerCase();
        if (b === "heic" || b === "heif" || b === "mif1" || b === "msf1" || b === "heix") {
          return "heic";
        }
      }
    }
  }
  return "unknown";
}

/**
 * @param {ArrayBuffer} buf
 * @param {number} [dpi=150]
 * @returns {Promise<ImageData[]>}
 */
export async function renderPdfPages(buf, dpi = 150) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: buf, disableFontFace: true, isEvalSupported: false }).promise;
  const pages = [];
  const scale = dpi / 72;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }
  await doc.destroy();
  return pages;
}

/**
 * Load an image File/Blob to ImageData (honours EXIF orientation via createImageBitmap).
 * HEIC is not decoded here — browsers that support it natively may still work via bitmap.
 * @param {Blob} blob
 * @returns {Promise<ImageData>}
 */
export async function loadImageBlob(blob) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(blob);
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Error code thrown when HEIC cannot be decoded (UI maps to bilingual copy).
 */
export const HEIC_UNSUPPORTED = "HEIC_UNSUPPORTED";

/**
 * @param {File} file
 * @returns {Promise<ImageData[]>}
 */
export async function loadFilePages(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  const buf = await file.arrayBuffer();
  const kind = sniffFileKind(buf);

  const isPdf =
    kind === "pdf" || type === "application/pdf" || name.endsWith(".pdf");
  if (isPdf) {
    return renderPdfPages(buf);
  }

  const isHeic =
    kind === "heic" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type.includes("heic") ||
    type.includes("heif");
  if (isHeic) {
    try {
      return [await loadImageBlob(new Blob([buf], { type: type || "image/heic" }))];
    } catch {
      const err = new Error(HEIC_UNSUPPORTED);
      err.code = HEIC_UNSUPPORTED;
      throw err;
    }
  }

  // Prefer sniffed MIME so empty file.type still decodes
  let blobType = type;
  if (kind === "jpeg") blobType = "image/jpeg";
  else if (kind === "png") blobType = "image/png";
  try {
    return [await loadImageBlob(new Blob([buf], { type: blobType || "application/octet-stream" }))];
  } catch (e) {
    if (name.endsWith(".heic") || name.endsWith(".heif")) {
      const err = new Error(HEIC_UNSUPPORTED);
      err.code = HEIC_UNSUPPORTED;
      throw err;
    }
    throw e;
  }
}
