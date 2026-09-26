import type { Box } from '../ocr/boxes.ts'
import { exportFileName, exportMime, JPEG_QUALITY, type ExportFormat } from './names.ts'
import { paintExport, releaseCanvas } from './paintExport.ts'

export type ShareRequest = {
  pages: ExportPage[]
  format: ExportFormat
  watermark: boolean
}

export type ExportPage = {
  bitmap: CanvasImageSource
  width: number
  height: number
  scale: number
  pageNumber: number
  boxes: readonly { enabled: boolean; bbox: Box }[]
}

export async function encodeCanvas(canvas: HTMLCanvasElement, format: ExportFormat): Promise<Blob> {
  const mime = exportMime(format)
  const blob = await new Promise<Blob | null>((resolve) => {
    if (format === 'jpeg') canvas.toBlob(resolve, mime, JPEG_QUALITY)
    else canvas.toBlob(resolve, mime)
  })
  if (!blob) throw new Error('export-encode')
  return blob
}

export async function renderExportFiles(
  pages: readonly ExportPage[],
  token: string,
  format: ExportFormat,
  watermark: boolean,
): Promise<File[]> {
  const files: File[] = []
  for (const page of pages) {
    const canvas = document.createElement('canvas')
    try {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('export-encode')
      paintExport(context, page.bitmap, page.width, page.height, page.boxes, page.scale, watermark)
      const blob = await encodeCanvas(canvas, format)
      files.push(
        new File([blob], exportFileName(page.pageNumber, token, format), {
          type: exportMime(format),
        }),
      )
    } finally {
      releaseCanvas(canvas)
    }
  }
  return files
}

/** Browser download. Returns the object URL so the caller can revoke it on Done. */
export function saveDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  return url
}
