/**
 * Same-origin tesseract.js OCR provider.
 * Paths are relative to the page (/deid/).
 */
const BASE = new URL(".", import.meta.url); // /deid/ui/
const ROOT = new URL("../", BASE); // /deid/

let workerPromise = null;

function paths() {
  return {
    workerPath: new URL("../vendor/tesseract/worker.min.js", BASE).href,
    corePath: new URL("../vendor/tesseract/", BASE).href,
    langPath: new URL("../vendor/tessdata", BASE).href,
  };
}

/**
 * Ensure Tesseract global is loaded (script tag) or dynamic import of UMD is awkward —
 * we load via script in index.html. This module expects window.Tesseract.
 */
export function getTesseract() {
  if (typeof window === "undefined" || !window.Tesseract) {
    throw new Error("Tesseract global missing — load vendor/tesseract/tesseract.min.js first");
  }
  return window.Tesseract;
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
      // gzipped traineddata not used — we ship .traineddata
      gzip: false,
      workerBlobURL: false, // keep worker-src 'self' (no blob worker script from CDN)
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
      const lang = opts.lang || "eng+chi_tra";
      const psm = opts.psm ?? 11;
      // Ensure languages loaded
      try {
        await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
      } catch {
        /* ignore */
      }
      // tesseract.js accepts canvas / ImageData / bitmap
      let input = image;
      if (image && image.data && image.width && !(image instanceof ImageData === false && false)) {
        // ImageData is fine in modern tesseract
        input = image;
      }
      // Switch language if needed — worker was created with eng+chi_tra
      void lang;
      const result = await worker.recognize(input);
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

export { ROOT };
