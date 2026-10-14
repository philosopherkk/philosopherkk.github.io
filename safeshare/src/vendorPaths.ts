/**
 * Same-origin paths for tesseract.js, pdf.js, zxing-wasm, and MediaPipe.
 * scripts/copy-vendor.mjs fills public/vendor. Do not point these at a CDN.
 *
 * When OCR is wired up, pass tesseractWorkerOptions to createWorker and set
 * pdfjs GlobalWorkerOptions.workerSrc to vendorPaths.pdfWorkerPath.
 * cacheMethod "none" skips the library's IndexedDB copy of traineddata.
 */
import { APP_BASE } from './appBase.ts'

export const vendorPaths = {
  tesseractWorkerPath: `${APP_BASE}vendor/tesseract/worker.min.js`,
  tesseractCorePath: `${APP_BASE}vendor/tesseract/core`,
  tesseractLangPath: `${APP_BASE}vendor/tesseract/lang`,
  pdfWorkerPath: `${APP_BASE}vendor/pdfjs/pdf.worker.min.mjs`,
  zxingReaderWasm: `${APP_BASE}vendor/zxing/zxing_reader.wasm`,
  mediapipeWasm: `${APP_BASE}vendor/mediapipe`,
  faceModel: `${APP_BASE}vendor/mediapipe/blaze_face_short_range.tflite`,
} as const

export const tesseractWorkerOptions = {
  workerPath: vendorPaths.tesseractWorkerPath,
  corePath: vendorPaths.tesseractCorePath,
  langPath: vendorPaths.tesseractLangPath,
  cacheMethod: 'none',
  gzip: true,
} as const

/** LSTM models loaded together. Both files are under langPath. */
export const OCR_LANGUAGES = 'chi_tra+eng'
