/**
 * Same-origin paths for tesseract.js and pdf.js.
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
} as const

export const tesseractWorkerOptions = {
  workerPath: vendorPaths.tesseractWorkerPath,
  corePath: vendorPaths.tesseractCorePath,
  langPath: vendorPaths.tesseractLangPath,
  cacheMethod: 'none',
  gzip: true,
} as const
