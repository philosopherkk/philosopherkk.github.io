import type { DetectionDraft } from './types.ts'
import { vendorPaths } from '../vendorPaths.ts'

type BarcodePoint = { x: number; y: number }
type BarcodePosition = {
  topLeft: BarcodePoint
  topRight: BarcodePoint
  bottomLeft: BarcodePoint
  bottomRight: BarcodePoint
}

type NativeBarcode = {
  boundingBox?: { x: number; y: number; width: number; height: number }
  format?: string
}

type NativeDetector = {
  detect: (source: ImageBitmap) => Promise<NativeBarcode[]>
}

let originGuardInstalled = false
let zxingReady: Promise<void> | null = null
let faceReady: Promise<{
  detect: (image: ImageBitmap) => { detections: FaceHit[] }
} | null> | null = null

type FaceHit = {
  boundingBox?: { originX: number; originY: number; width: number; height: number }
  categories?: { score?: number }[]
}

function installSameOriginGuard(): void {
  if (originGuardInstalled) return
  originGuardInstalled = true
  const root = globalThis
  const current = root.fetch
  if (typeof current !== 'function') return
  const bound = current.bind(root)
  root.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const base = root.location?.href ?? 'http://localhost/'
    let target: URL
    try {
      target = new URL(raw, base)
    } catch {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    const origin = root.location?.origin
    if (origin && target.origin !== origin) return Promise.reject(new TypeError('Failed to fetch'))
    return bound(input, init)
  }
}

function boxFromPoints(position: BarcodePosition): DetectionDraft['bbox'] | null {
  const xs = [
    position.topLeft.x,
    position.topRight.x,
    position.bottomLeft.x,
    position.bottomRight.x,
  ]
  const ys = [
    position.topLeft.y,
    position.topRight.y,
    position.bottomLeft.y,
    position.bottomRight.y,
  ]
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const width = Math.max(...xs) - x
  const height = Math.max(...ys) - y
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

async function nativeBarcodes(bitmap: ImageBitmap): Promise<DetectionDraft[] | null> {
  const ctor = (
    globalThis as unknown as {
      BarcodeDetector?: new () => NativeDetector
    }
  ).BarcodeDetector
  if (!ctor) return null
  try {
    const detector = new ctor()
    const codes = await detector.detect(bitmap)
    const drafts: DetectionDraft[] = []
    for (const code of codes) {
      const box = code.boundingBox
      if (!box || code.format === 'none' || box.width <= 0 || box.height <= 0) continue
      drafts.push({
        bbox: { x: box.x, y: box.y, width: box.width, height: box.height },
        category: 'barcode',
        source: 'visual',
        confidence: 0.9,
        enabled: true,
      })
    }
    return drafts
  } catch {
    return null
  }
}

async function ensureZxing(): Promise<typeof import('zxing-wasm/reader')> {
  const mod = await import('zxing-wasm/reader')
  if (!zxingReady) {
    zxingReady = mod
      .prepareZXingModule({
        overrides: { locateFile: () => vendorPaths.zxingReaderWasm },
        fireImmediately: true,
      })
      .then(() => undefined)
  }
  await zxingReady
  return mod
}

async function zxingBarcodes(bitmap: ImageBitmap): Promise<DetectionDraft[]> {
  const mod = await ensureZxing()
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  context.drawImage(bitmap, 0, 0)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const results = await mod.readBarcodes(image, { tryHarder: true })
  const drafts: DetectionDraft[] = []
  for (const result of results) {
    if (!result.isValid || result.format === 'None') continue
    const bbox = boxFromPoints(result.position)
    if (!bbox) continue
    drafts.push({ bbox, category: 'barcode', source: 'visual', confidence: 0.9, enabled: true })
  }
  return drafts
}

async function ensureFace(): Promise<{
  detect: (image: ImageBitmap) => { detections: FaceHit[] }
} | null> {
  if (!faceReady) {
    faceReady = import('@mediapipe/tasks-vision')
      .then(async (vision) => {
        const fileset = await vision.FilesetResolver.forVisionTasks(vendorPaths.mediapipeWasm)
        return vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: vendorPaths.faceModel, delegate: 'CPU' },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.5,
        })
      })
      .catch(() => null)
  }
  return faceReady
}

async function detectFaces(bitmap: ImageBitmap): Promise<DetectionDraft[]> {
  const detector = await ensureFace()
  if (!detector) return []
  const found = detector.detect(bitmap)
  const drafts: DetectionDraft[] = []
  for (const face of found.detections) {
    const box = face.boundingBox
    if (!box || box.width <= 0 || box.height <= 0) continue
    const score = face.categories?.[0]?.score
    drafts.push({
      bbox: { x: box.originX, y: box.originY, width: box.width, height: box.height },
      category: 'face',
      source: 'visual',
      confidence: typeof score === 'number' ? score : 0.9,
      enabled: true,
    })
  }
  return drafts
}

/** Barcodes, QR codes, and faces. Decoded payload text is never stored. */
export async function detectVisual(bitmap: ImageBitmap): Promise<DetectionDraft[]> {
  installSameOriginGuard()
  const drafts: DetectionDraft[] = []
  try {
    const native = await nativeBarcodes(bitmap)
    const barcodes = native ?? (await zxingBarcodes(bitmap))
    drafts.push(...barcodes)
  } catch {
    // A visual miss must not drop the text detections already found.
  }
  try {
    drafts.push(...(await detectFaces(bitmap)))
  } catch {
    // Keep text detections when the face model cannot start.
  }
  return drafts
}
