import { exportScaleFactor, mapBoxToExport, type Box } from '../ocr/boxes.ts'

export type PixelSize = {
  width: number
  height: number
}

export type ExportTarget = {
  width: number
  height: number
  scale: number
  /** Export bitmap when one was kept. Otherwise the display bitmap. */
  source: 'export' | 'display'
}

/**
 * Longest side ≤ 3000 keeps an export bitmap. Larger sources were already
 * reduced to the display bitmap, so there is nothing bigger to draw.
 */
export function exportTarget(display: PixelSize, exportBitmap: PixelSize | null): ExportTarget {
  if (exportBitmap) {
    return {
      width: exportBitmap.width,
      height: exportBitmap.height,
      scale: exportScaleFactor(display.width, exportBitmap.width),
      source: 'export',
    }
  }
  return {
    width: display.width,
    height: display.height,
    scale: exportScaleFactor(display.width, null),
    source: 'display',
  }
}

export function boxesForExport(
  boxes: readonly { enabled: boolean; bbox: Box }[],
  scale: number,
): { enabled: boolean; bbox: Box }[] {
  return boxes.map((box) => ({
    enabled: box.enabled,
    bbox: mapBoxToExport(box.bbox, scale),
  }))
}
