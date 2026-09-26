import { exportScaleFactor, mapBox, transformBetween } from './boxes.ts'
import { pageWords } from './group.ts'
import { prepareOcrPixels } from './preprocess.ts'
import { ocrProgressLabel, type OcrPhase } from './progress.ts'
import type { OcrRun, PageOcr } from './types.ts'
import type { LoadedDocument, LoadedPage } from '../load/types.ts'
import { OCR_LANGUAGES, tesseractWorkerOptions } from '../vendorPaths.ts'

type TesseractModule = typeof import('tesseract.js')
type OcrWorker = Awaited<ReturnType<TesseractModule['createWorker']>>

type RecognitionData = {
  blocks?: Parameters<typeof pageWords>[0]['blocks']
  words?: Parameters<typeof pageWords>[0]['words']
}

const RECOGNIZE_OUTPUT = {
  text: false,
  blocks: true,
  hocr: false,
  tsv: false,
  box: false,
  unlv: false,
  osd: false,
  pdf: false,
  imageColor: false,
  imageGrey: false,
  imageBinary: false,
  debug: false,
} as const

let workerPromise: Promise<OcrWorker> | null = null

function emptyPage(page: LoadedPage): PageOcr {
  return {
    index: page.index,
    words: [],
    exportScale: exportScaleFactor(page.display.width, page.exportBitmap?.width ?? null),
  }
}

function ocrCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('ocr-input')
  context.drawImage(bitmap, 0, 0)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  image.data.set(prepareOcrPixels(image.data))
  context.putImageData(image, 0, 0)
  return canvas
}

async function startWorker(): Promise<OcrWorker> {
  const tesseract: TesseractModule = await import('tesseract.js')
  const options = {
    workerPath: tesseractWorkerOptions.workerPath,
    corePath: tesseractWorkerOptions.corePath,
    langPath: tesseractWorkerOptions.langPath,
    cacheMethod: tesseractWorkerOptions.cacheMethod,
    gzip: tesseractWorkerOptions.gzip,
    workerBlobURL: false,
    legacyLang: false,
    legacyCore: false,
    logger: () => {},
    errorHandler: () => {},
    logging: false,
  }
  const worker = await tesseract.createWorker(OCR_LANGUAGES, tesseract.OEM.LSTM_ONLY, options)
  await worker.setParameters({
    user_defined_dpi: '300',
    tessedit_pageseg_mode: tesseract.PSM.AUTO,
  })
  return worker
}

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = startWorker().catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

async function recognizePage(worker: OcrWorker, page: LoadedPage): Promise<PageOcr> {
  const canvas = ocrCanvas(page.display)
  const result = await worker.recognize(canvas, { rotateAuto: false }, { ...RECOGNIZE_OUTPUT })
  const data = result.data as RecognitionData
  const transform = transformBetween(
    canvas.width,
    canvas.height,
    page.display.width,
    page.display.height,
  )
  return {
    index: page.index,
    words: pageWords(data).map((word) => ({ ...word, box: mapBox(word.box, transform) })),
    exportScale: exportScaleFactor(page.display.width, page.exportBitmap?.width ?? null),
  }
}

/** Drop the reader so its last image can be collected. The next page starts a new one. */
export async function releaseReader(): Promise<void> {
  const pending = workerPromise
  workerPromise = null
  if (!pending) return
  try {
    const worker = await pending
    await worker.terminate()
  } catch {
    // Already stopped.
  }
}

export async function recognizeDocument(
  document: LoadedDocument,
  onProgress: (label: string) => void,
): Promise<OcrRun> {
  const report = (phase: OcrPhase, pageIndex: number) => {
    onProgress(ocrProgressLabel(phase, pageIndex, document.pages.length))
  }
  report('loading', 0)
  let worker: OcrWorker
  try {
    worker = await getWorker()
  } catch {
    return { pages: document.pages.map(emptyPage), failed: true }
  }
  const pages: PageOcr[] = []
  let failed = false
  for (const page of document.pages) {
    report('reading', page.index)
    try {
      pages.push(await recognizePage(worker, page))
    } catch {
      failed = true
      pages.push(emptyPage(page))
    }
  }
  return { pages, failed }
}
