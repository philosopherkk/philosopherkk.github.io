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
 * @param {File} file
 * @returns {Promise<ImageData[]>}
 */
export async function loadFilePages(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    return renderPdfPages(buf);
  }
  if (name.endsWith(".heic") || name.endsWith(".heif") || type.includes("heic") || type.includes("heif")) {
    // Try native decode; fail with a clear message if unsupported
    try {
      return [await loadImageBlob(file)];
    } catch {
      throw new Error("HEIC not supported in this browser — convert to JPG/PNG first");
    }
  }
  return [await loadImageBlob(file)];
}
