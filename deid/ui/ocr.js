/**
 * Same-origin tesseract.js OCR provider — loads scripts/wasm/traineddata lazily on first use.
 */

let workerPromise = null;
let scriptPromise = null;

function paths() {
  return {
    workerPath: new URL("../vendor/tesseract/worker.min.js", import.meta.url).href,
    corePath: new URL("../vendor/tesseract/", import.meta.url).href,
    langPath: new URL("../vendor/tessdata", import.meta.url).href,
    scriptPath: new URL("../vendor/tesseract/tesseract.min.js", import.meta.url).href,
  };
}

/** Load tesseract.min.js once (not on first page paint). */
function ensureTesseractScript() {
  if (typeof window !== "undefined" && window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = paths().scriptPath;
    s.async = true;
    s.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error("Tesseract global missing after script load"));
    };
    s.onerror = () => reject(new Error("Failed to load tesseract.min.js"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Convert ImageData / bitmap / canvas to an HTMLCanvasElement.
 * @param {ImageData|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} image
 * @returns {HTMLCanvasElement}
 */
export function toCanvas(image) {
  if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) {
    return image;
  }
  const canvas = document.createElement("canvas");
  if (image && image.data && typeof image.width === "number" && !(image instanceof ImageBitmap)) {
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").putImageData(image, 0, 0);
    return canvas;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

/**
 * @param {(status: string, progress: number) => void} [onProgress]
 */
export async function createOcrProvider(onProgress) {
  const Tesseract = await ensureTesseractScript();
  const { workerPath, corePath, langPath } = paths();

  if (!workerPromise) {
    onProgress?.("ocr_load", 0.02);
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
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });
      const result = await worker.recognize(blob);
      /** @type {import('../core/types.js').Word[]} */
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
