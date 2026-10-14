import { detectDocument } from '../../src/detect/run.ts'
import { recognizeDocument } from '../../src/ocr/recognize.ts'
import { boxesForMode } from '../../src/review/modes.ts'
import { DEFAULT_SETTINGS } from '../../src/settings.ts'
import { REPORT_STYLE } from './report.ts'
import { HARNESS_MODES } from './score.ts'

type Box = { x: number; y: number; width: number; height: number }

type Measured = {
  width: number
  height: number
  items: { role: 'identifier' | 'result'; category: string; script: string; bbox: Box }[]
}

type Analysis = {
  width: number
  height: number
  uncertain: boolean
  words: Box[]
  modes: Record<string, { category: string; bbox: Box }[]>
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value))
}

function mount(html: string) {
  let style = document.getElementById('synthetic-style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'synthetic-style'
    style.textContent = REPORT_STYLE
    document.head.append(style)
  }
  const host = document.getElementById('host')
  if (!host) return
  host.innerHTML = html
}

function phoneNoise(options: { rotate: number; blur: number; noise: number; seed: number }) {
  const page = document.getElementById('page')
  const frame = document.getElementById('frame')
  if (!page || !frame) return
  page.style.transformOrigin = 'center center'
  page.style.transform = `rotate(${options.rotate}deg)`
  page.style.filter = `blur(${options.blur}px)`
  const canvas = document.createElement('canvas')
  canvas.id = 'noise'
  const rect = frame.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(rect.width))
  canvas.height = Math.max(1, Math.round(rect.height))
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
  frame.append(canvas)
  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  let state = options.seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  for (let index = 0; index < image.data.length; index += 4) {
    if (next() > options.noise) continue
    const shade = next() < 0.5 ? 24 : 230
    image.data[index] = clamp(shade)
    image.data[index + 1] = clamp(shade)
    image.data[index + 2] = clamp(shade)
    image.data[index + 3] = 96
  }
  context.putImageData(image, 0, 0)
}

function measure(): Measured {
  const frame = document.getElementById('frame')
  if (!frame) return { width: 0, height: 0, items: [] }
  const host = frame.getBoundingClientRect()
  const items: Measured['items'] = []
  for (const node of frame.querySelectorAll('[data-role]')) {
    const role = node.getAttribute('data-role')
    const category = node.getAttribute('data-category') ?? ''
    const script = node.getAttribute('data-script') ?? ''
    if (role !== 'identifier' && role !== 'result') continue
    const rect = node.getBoundingClientRect()
    items.push({
      role,
      category,
      script,
      bbox: {
        x: rect.left - host.left,
        y: rect.top - host.top,
        width: rect.width,
        height: rect.height,
      },
    })
  }
  return { width: host.width, height: host.height, items }
}

async function analyse(base64: string): Promise<Analysis> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const loaded = {
    kind: 'image' as const,
    pages: [{ index: 0, display: bitmap, exportBitmap: null, text: [] }],
  }
  try {
    const ocr = await recognizeDocument(loaded, () => {})
    const found = await detectDocument(loaded, ocr.pages, DEFAULT_SETTINGS)
    const page = found[0]
    const words = (ocr.pages[0]?.words ?? []).map((word) => word.box)
    const modes: Analysis['modes'] = {}
    for (const mode of HARNESS_MODES) {
      modes[mode] = page
        ? boxesForMode(mode, page.detections, [], page.layout, new Set()).flatMap((box) =>
            box.enabled ? [{ category: box.category, bbox: box.bbox }] : [],
          )
        : []
    }
    return {
      width: bitmap.width,
      height: bitmap.height,
      uncertain: page?.layout.uncertain ?? true,
      words,
      modes,
    }
  } finally {
    bitmap.close()
  }
}

declare global {
  interface Window {
    __ready?: boolean
  }
}

window.__ready = true
Object.assign(window, { mount, phoneNoise, measure, analyse })

export type { Analysis, Measured }
