import { vendorPaths } from '../vendorPaths.ts'
import { LoadFailure, fileKind, extensionOf } from './classify.ts'
import { pdfPageCountBlock, pdfRenderScale, rasterPlan } from './limits.ts'
import { releasePages } from './release.ts'
import { pageTextFromItems, type PdfTextItemLike } from './textPosition.ts'
import type { LoadedDocument, LoadedPage } from './types.ts'

async function scaleBitmap(
  source: ImageBitmap,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  if (source.width === width && source.height === height) return source
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new LoadFailure('image-decode')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, width, height)
  return createImageBitmap(canvas)
}

async function bitmapsForSource(
  source: ImageBitmap,
  failure: 'image-decode' | 'pdf-decode',
): Promise<Pick<LoadedPage, 'display' | 'exportBitmap'>> {
  let plan
  try {
    plan = rasterPlan(source.width, source.height)
  } catch {
    source.close()
    throw new LoadFailure(failure)
  }
  try {
    const display = await scaleBitmap(source, plan.display.width, plan.display.height)
    if (plan.keepExport) return { display, exportBitmap: source }
    if (display !== source) source.close()
    return { display, exportBitmap: null }
  } catch (error) {
    source.close()
    if (error instanceof LoadFailure) throw error
    throw new LoadFailure(failure)
  }
}

async function loadImage(file: File): Promise<LoadedDocument> {
  let source: ImageBitmap
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new LoadFailure('image-decode')
  }
  const bitmaps = await bitmapsForSource(source, 'image-decode')
  return {
    kind: 'image',
    pages: [{ index: 0, text: [], ...bitmaps }],
  }
}

function textItems(items: readonly unknown[]): PdfTextItemLike[] {
  const result: PdfTextItemLike[] = []
  for (const item of items) {
    if (typeof item !== 'object' || item === null || !('str' in item)) continue
    const record = item as {
      str?: unknown
      width?: unknown
      height?: unknown
      transform?: unknown
    }
    if (typeof record.str !== 'string') continue
    if (typeof record.width !== 'number' || typeof record.height !== 'number') continue
    if (!Array.isArray(record.transform)) continue
    result.push({
      str: record.str,
      width: record.width,
      height: record.height,
      transform: record.transform as readonly number[],
    })
  }
  return result
}

async function loadPdf(file: File): Promise<LoadedDocument> {
  const pdfjs = await import('pdfjs-dist')
  if (pdfjs.GlobalWorkerOptions.workerSrc !== vendorPaths.pdfWorkerPath) {
    pdfjs.GlobalWorkerOptions.workerSrc = vendorPaths.pdfWorkerPath
  }
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({
    data,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    useWasm: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  })
  const pages: LoadedPage[] = []
  try {
    const pdf = await task.promise
    const blocked = pdfPageCountBlock(pdf.numPages)
    if (blocked) throw new LoadFailure(blocked)
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number)
      try {
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: pdfRenderScale(base.width) })
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(viewport.width))
        canvas.height = Math.max(1, Math.round(viewport.height))
        await page.render({ canvas, viewport }).promise
        const content = await page.getTextContent()
        const text = pageTextFromItems(textItems(content.items))
        const source = await createImageBitmap(canvas)
        const bitmaps = await bitmapsForSource(source, 'pdf-decode')
        pages.push({ index: number - 1, text, ...bitmaps })
      } finally {
        try {
          page.cleanup()
        } catch {
          // The page proxy can already be destroyed.
        }
      }
    }
    return { kind: 'pdf', pages }
  } catch (error) {
    releasePages(pages)
    if (error instanceof LoadFailure) throw error
    throw new LoadFailure('pdf-decode')
  } finally {
    try {
      await task.destroy()
    } catch {
      // Already destroyed, or the worker never started.
    }
  }
}

export async function loadSelectedFile(file: File): Promise<LoadedDocument> {
  const kind = fileKind({ mimeType: file.type, extension: extensionOf(file.name) })
  if (kind === 'unsupported') throw new LoadFailure('unsupported')
  if (kind === 'image') return loadImage(file)
  return loadPdf(file)
}
