/**
 * Same-origin tesseract.js OCR provider.
 * Paths are relative to the page (/deid/).
 */

let workerPromise = null;

function paths() {
  return {
    workerPath: new URL("../vendor/tesseract/worker.min.js", import.meta.url).href,
    corePath: new URL("../vendor/tesseract/", import.meta.url).href,
    langPath: new URL("../vendor/tessdata", import.meta.url).href,
  };
}

/**
 * Ensure Tesseract global is loaded (script tag in index.html).
 */
export function getTesseract() {
  if (typeof window === "undefined" || !window.Tesseract) {
    throw new Error("Tesseract global missing — load vendor/tesseract/tesseract.min.js first");
  }
  return window.Tesseract;
}

/**
 * Convert ImageData / bitmap / canvas to an HTMLCanvasElement (tesseract.js reads canvas reliably).
 * @param {ImageData|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} image
 * @returns {HTMLCanvasElement}
 */
export function toCanvas(image) {
  if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) {
    return image;
  }
  let w;
  let h;
  const canvas = document.createElement("canvas");
  if (image && image.data && typeof image.width === "number" && !(image instanceof ImageBitmap)) {
    w = image.width;
    h = image.height;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").putImageData(image, 0, 0);
    return canvas;
  }
  w = image.width;
  h = image.height;
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

/**
 * @param {(status: string, progress: number) => void} [onProgress]
 */
export async function createOcrProvider(onProgress) {
  const Tesseract = getTesseract();
  const { workerPath, corePath, langPath } = paths();

  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("eng+chi_tra", 1, {
      workerPath,
      corePath,
      langPath,
      gzip: false,
      workerBlobURL: false,
      logger: (m) => {
        if (m && typeof m.progress === "number") {
          onProgress?.(m.status || "ocr", m.progress);
        }
      },
    });
  }
  const worker = await workerPromise;

  return {
    /**
     * @param {ImageData|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} image
     * @param {{ lang?: string, psm?: number }} [opts]
     * @returns {Promise<import('../core/types.js').Word[]>}
     */
    async recognize(image, opts = {}) {
      const psm = opts.psm ?? 11;
      try {
        await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
      } catch {
        /* ignore */
      }
      const canvas = toCanvas(image);
      // Prefer PNG blob — most reliable input for tesseract.js worker
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });
      const result = await worker.recognize(blob);
      const words = [];
      const data = result?.data;
      if (data?.words) {
        for (const w of data.words) {
          const t = (w.text || "").trim();
          if (!t) continue;
          const b = w.bbox || {};
          words.push({
            text: t,
            conf: typeof w.confidence === "number" ? w.confidence : 0,
            x0: b.x0 ?? 0,
            y0: b.y0 ?? 0,
            x1: b.x1 ?? 0,
            y1: b.y1 ?? 0,
            line: [0, 0, 0],
          });
        }
      }
      return words;
    },
    async terminate() {
      if (workerPromise) {
        const w = await workerPromise;
        workerPromise = null;
        await w.terminate();
      }
    },
  };
}
