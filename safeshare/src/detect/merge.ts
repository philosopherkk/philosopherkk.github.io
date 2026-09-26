import type { Box } from '../ocr/boxes.ts'
import type { Detection } from './types.ts'

/** 4 px or 15% of the text height, whichever is larger. */
export function paddingFor(box: Box): number {
  return Math.max(4, box.height * 0.15)
}

export function padBox(box: Box): Box {
  const pad = paddingFor(box)
  return {
    x: box.x - pad,
    y: box.y - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function unionBox(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

function combine(a: Detection, b: Detection): Detection {
  const winner = a.confidence >= b.confidence ? a : b
  return {
    ...winner,
    bbox: unionBox(a.bbox, b.bbox),
    enabled: a.enabled || b.enabled,
    confidence: Math.max(a.confidence, b.confidence),
  }
}

/** Pad once, then merge boxes that overlap after padding. Touching edges do not overlap until padded. */
export function mergeAndPad(detections: readonly Detection[]): Detection[] {
  const padded = detections.map((detection) => ({ ...detection, bbox: padBox(detection.bbox) }))
  const used = padded.map(() => false)
  const merged: Detection[] = []
  for (let i = 0; i < padded.length; i += 1) {
    if (used[i]) continue
    used[i] = true
    let current = padded[i]
    if (!current) continue
    let grew = true
    while (grew) {
      grew = false
      for (let j = 0; j < padded.length; j += 1) {
        const other = padded[j]
        if (used[j] || !other || !overlaps(current.bbox, other.bbox)) continue
        used[j] = true
        grew = true
        current = combine(current, other)
      }
    }
    merged.push(current)
  }
  return merged
}
