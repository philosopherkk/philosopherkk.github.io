import { paintRedactions } from '../review/paint.ts'
import type { Box } from '../ocr/boxes.ts'
import { WATERMARK_TEXT } from './names.ts'
import { boxesForExport } from './target.ts'

export function watermarkBand(imageWidth: number, enabled: boolean): number {
  if (!enabled) return 0
  return Math.max(44, Math.round(imageWidth * 0.045))
}

type ExportContext = CanvasRenderingContext2D

/** Draw the page, then the same opaque black fill the Review preview uses. */
export function paintExport(
  context: ExportContext,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  boxes: readonly { enabled: boolean; bbox: Box }[],
  scale: number,
  watermark: boolean,
): void {
  const band = watermarkBand(imageWidth, watermark)
  const width = Math.max(1, Math.round(imageWidth))
  const height = Math.max(1, Math.round(imageHeight))
  context.canvas.width = width
  context.canvas.height = height + band
  context.globalAlpha = 1
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height + band)
  context.drawImage(image, 0, 0, width, height)
  paintRedactions(context, boxesForExport(boxes, scale))
  if (!watermark) return
  context.globalAlpha = 1
  context.fillStyle = '#142126'
  context.fillRect(0, height, width, band)
  context.fillStyle = '#ffffff'
  context.font = `${Math.max(16, Math.round(band * 0.4))}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(WATERMARK_TEXT, width / 2, height + band / 2)
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d')
  if (context) context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.width = 0
  canvas.height = 0
}
