/**
 * Same-origin tesseract.js OCR provider — loads scripts/wasm/traineddata lazily on first use.
 * Honours opts.lang: separate eng and chi_tra workers (still vendored, same-origin, cached).
 */

/** @type {Promise<any>|null} */
let scriptPromise = null;
/** @type {Record<string, Promise<any>>} */
const workerPromises = Object.create(null);

function paths() {
  return {
    workerPath: new URL("../vendor/tesseract/worker.min.js", import.meta.url).href,
    corePath: new URL("../vendor/tesseract/", import.meta.url).href,
    langPath: new URL("../vendor/tessdata", import.meta.url).href,
    scriptPath: new URL("../vendor/tesseract/tesseract.min.js", import.meta.url).href,
  };
}

/** Normalize to a supported traineddata key. */
function normalizeLang(lang) {
  const s = String(lang || "eng").toLowerCase();
  if (s === "chi_tra" || s === "chi-tra" || s === "cht") return "chi_tra";
  return "eng";
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
 * @param {string} lang
 * @param {(status: string, progress: number) => void} [onProgress]
 */
async function ensureWorker(lang, onProgress) {
  const key = normalizeLang(lang);
  if (workerPromises[key]) return workerPromises[key];
  const Tesseract = await ensureTesseractScript();
  const { workerPath, corePath, langPath } = paths();
  onProgress?.(`ocr_load_${key}`, 0.02);
  workerPromises[key] = Tesseract.createWorker(key, 1, {
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
  return workerPromises[key];
}

/**
 * @param {(status: string, progress: number) => void} [onProgress]
 */
export async function createOcrProvider(onProgress) {
  // Warm the script only — workers stay lazy per lang.
  await ensureTesseractScript();

  return {
    /**
     * @param {ImageData|HTMLCanvasElement|OffscreenCanvas|ImageBitmap} image
     * @param {{ lang?: string, psm?: number }} [opts]
     * @returns {Promise<import('../core/types.js').Word[]>}
     */
    async recognize(image, opts = {}) {
      const lang = normalizeLang(opts.lang);
      const worker = await ensureWorker(lang, onProgress);
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
      const keys = Object.keys(workerPromises);
      for (const key of keys) {
        try {
          const w = await workerPromises[key];
          delete workerPromises[key];
          await w.terminate();
        } catch {
          delete workerPromises[key];
        }
      }
    },
  };
}
