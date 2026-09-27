export type Box = { x: number; y: number; width: number; height: number }

export type TruthItem = {
  role: 'identifier' | 'result'
  category: string
  script: string
  bbox: Box
}

export type Redaction = { category: string; bbox: Box }

export type Miss = {
  id: string
  variant: string
  layout: string
  mode: string
  category: string
  script: string
  reason: 'detector' | 'no-ocr' | 'visual'
}

const MODES = ['standard', 'header-blackout', 'results-only'] as const

export function boxArea(box: Box): number {
  return Math.max(0, box.width) * Math.max(0, box.height)
}

export function intersectionArea(a: Box, b: Box): number {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return Math.max(0, right - x) * Math.max(0, bottom - y)
}

export function centerInside(box: Box, point: { x: number; y: number }): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  )
}

export function covered(target: Box, boxes: readonly Box[]): boolean {
  const area = boxArea(target)
  if (area <= 0) return false
  const point = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  for (const box of boxes) {
    if (centerInside(box, point)) return true
    if (intersectionArea(target, box) / area >= 0.5) return true
  }
  return false
}

export function wordOverlaps(target: Box, words: readonly Box[]): boolean {
  const area = boxArea(target)
  if (area <= 0) return false
  return words.some((word) => intersectionArea(target, word) / area >= 0.15)
}

export function scaleBox(box: Box, scaleX: number, scaleY: number): Box {
  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  }
}

export type ModeScore = {
  recallHits: number
  recallTotal: number
  preserved: number
  results: number
  redactionsTouchingResults: number
  redactions: number
  byCategory: Map<string, { hits: number; total: number }>
}

export function emptyModeScore(): ModeScore {
  return {
    recallHits: 0,
    recallTotal: 0,
    preserved: 0,
    results: 0,
    redactionsTouchingResults: 0,
    redactions: 0,
    byCategory: new Map(),
  }
}

function bump(map: Map<string, { hits: number; total: number }>, key: string, hit: boolean) {
  const current = map.get(key) ?? { hits: 0, total: 0 }
  current.total += 1
  if (hit) current.hits += 1
  map.set(key, current)
}

export function scorePage(
  items: readonly TruthItem[],
  redactions: readonly Redaction[],
  words: readonly Box[],
  meta: { id: string; variant: string; layout: string; mode: string },
): { score: ModeScore; misses: Miss[] } {
  const score = emptyModeScore()
  const misses: Miss[] = []
  const boxes = redactions.map((item) => item.bbox)
  const identifiers = items.filter((item) => item.role === 'identifier')
  const results = items.filter((item) => item.role === 'result')
  for (const item of identifiers) {
    const hit = covered(item.bbox, boxes)
    score.recallTotal += 1
    if (hit) score.recallHits += 1
    bump(score.byCategory, item.category, hit)
    if (item.category === 'name') bump(score.byCategory, `name:${item.script}`, hit)
    if (!hit) {
      const reason =
        item.category === 'barcode'
          ? 'visual'
          : wordOverlaps(item.bbox, words)
            ? 'detector'
            : 'no-ocr'
      misses.push({ ...meta, category: item.category, script: item.script, reason })
    }
  }
  score.results = results.length
  for (const item of results) {
    if (!covered(item.bbox, boxes)) score.preserved += 1
  }
  score.redactions = redactions.length
  for (const box of boxes) {
    if (results.some((item) => covered(item.bbox, [box]))) score.redactionsTouchingResults += 1
  }
  return { score, misses }
}

export function addScore(into: ModeScore, extra: ModeScore) {
  into.recallHits += extra.recallHits
  into.recallTotal += extra.recallTotal
  into.preserved += extra.preserved
  into.results += extra.results
  into.redactions += extra.redactions
  into.redactionsTouchingResults += extra.redactionsTouchingResults
  for (const [key, value] of extra.byCategory) {
    const current = into.byCategory.get(key) ?? { hits: 0, total: 0 }
    current.hits += value.hits
    current.total += value.total
    into.byCategory.set(key, current)
  }
}

export function rate(hits: number, total: number): number | null {
  if (total === 0) return null
  return hits / total
}

export const HARNESS_MODES = MODES

export function manualModeNote(): 'not-applicable' {
  return 'not-applicable'
}
