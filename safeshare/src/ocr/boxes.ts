/** Boxes are in pixels. Display-page space is the Review bitmap, after EXIF and downscale. */

export type Box = {
  x: number
  y: number
  width: number
  height: number
}

export type PageTransform = {
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid ${label}`)
}

export function mapBox(box: Box, transform: PageTransform): Box {
  return {
    x: box.x * transform.scaleX + transform.offsetX,
    y: box.y * transform.scaleY + transform.offsetY,
    width: box.width * transform.scaleX,
    height: box.height * transform.scaleY,
  }
}

/** Map OCR-input pixels onto the Review bitmap. Identity when preprocessing does not resize. */
export function transformBetween(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): PageTransform {
  assertPositive(sourceWidth, 'source width')
  assertPositive(sourceHeight, 'source height')
  assertPositive(targetWidth, 'target width')
  assertPositive(targetHeight, 'target height')
  return {
    scaleX: targetWidth / sourceWidth,
    scaleY: targetHeight / sourceHeight,
    offsetX: 0,
    offsetY: 0,
  }
}

/**
 * Multiply a display-page box by this to land on the export bitmap.
 * 1 when the export bitmap is absent or the same size as the display bitmap.
 */
export function exportScaleFactor(displayWidth: number, exportWidth: number | null): number {
  assertPositive(displayWidth, 'display width')
  if (exportWidth === null) return 1
  assertPositive(exportWidth, 'export width')
  return exportWidth / displayWidth
}

export function mapBoxToExport(box: Box, scale: number): Box {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('invalid scale')
  return mapBox(box, { scaleX: scale, scaleY: scale, offsetX: 0, offsetY: 0 })
}
