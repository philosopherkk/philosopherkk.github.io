/** SPEC §4 step 1. Sizes are in pixels after EXIF orientation or PDF rendering. */

export const DISPLAY_MAX_SIDE = 2500
export const EXPORT_MAX_SIDE = 3000
export const PDF_MAX_PAGES = 10
export const PDF_TARGET_WIDTH = 2000

export type PixelSize = {
  width: number
  height: number
}

export type RasterPlan = {
  /** Bitmap shown and held for later on-device processing. Longest side ≤ 2500. */
  display: PixelSize
  /**
   * When true, also keep the source bitmap for export.
   * Source longest side is ≤ 3000. When false, do not keep a larger export bitmap.
   */
  keepExport: boolean
}

function assertPositive(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('invalid dimensions')
  }
}

/** Longest side at most DISPLAY_MAX_SIDE. Smaller images stay at their own size. */
export function displaySize(width: number, height: number): PixelSize {
  assertPositive(width, height)
  const longest = Math.max(width, height)
  if (longest <= DISPLAY_MAX_SIDE) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = DISPLAY_MAX_SIDE / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function shouldKeepExportBitmap(width: number, height: number): boolean {
  assertPositive(width, height)
  return Math.max(width, height) <= EXPORT_MAX_SIDE
}

export function rasterPlan(width: number, height: number): RasterPlan {
  return {
    display: displaySize(width, height),
    keepExport: shouldKeepExportBitmap(width, height),
  }
}

/** Scale that makes the rendered page about PDF_TARGET_WIDTH pixels wide. */
export function pdfRenderScale(pageWidth: number): number {
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) {
    throw new Error('invalid page width')
  }
  return PDF_TARGET_WIDTH / pageWidth
}

export function renderedPdfSize(pageWidth: number, pageHeight: number): PixelSize {
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error('invalid page height')
  }
  const scale = pdfRenderScale(pageWidth)
  return {
    width: Math.max(1, Math.round(pageWidth * scale)),
    height: Math.max(1, Math.round(pageHeight * scale)),
  }
}

export type PdfPagePlan = RasterPlan & {
  /** Canvas size at ~2000 px width, before the display/export split. */
  rendered: PixelSize
}

export function pdfPagePlan(pageWidth: number, pageHeight: number): PdfPagePlan {
  const rendered = renderedPdfSize(pageWidth, pageHeight)
  return { rendered, ...rasterPlan(rendered.width, rendered.height) }
}

/** Null when the document may be loaded. */
export function pdfPageCountBlock(pageCount: number): 'too-many-pages' | 'pdf-decode' | null {
  if (!Number.isInteger(pageCount) || pageCount < 1) return 'pdf-decode'
  if (pageCount > PDF_MAX_PAGES) return 'too-many-pages'
  return null
}
