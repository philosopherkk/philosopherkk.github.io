import type { Detection, ZoneBand, ZoneLayout } from '../detect/types.ts'
import type { ReviewBox, ReviewCategory, ReviewMode } from './types.ts'

const NAME_OR_ID = new Set(['name', 'hkid', 'record-number', 'passport'])

const COUNT_ORDER: readonly ReviewCategory[] = [
  'name',
  'hkid',
  'record-number',
  'passport',
  'phone',
  'email',
  'address',
  'date',
  'other-person',
  'organisation',
  'age',
  'sex',
  'low-confidence',
  'barcode',
  'face',
  'header',
  'footer',
  'gap',
  'drawn',
]

const COUNT_LABELS: Record<ReviewCategory, readonly [string, string]> = {
  name: ['name', 'names'],
  hkid: ['HKID', 'HKIDs'],
  'record-number': ['record number', 'record numbers'],
  passport: ['passport', 'passports'],
  phone: ['phone', 'phones'],
  email: ['email', 'emails'],
  address: ['address', 'addresses'],
  date: ['date', 'dates'],
  'other-person': ['other person', 'other people'],
  organisation: ['organisation', 'organisations'],
  age: ['age', 'ages'],
  sex: ['sex', 'sexes'],
  'low-confidence': ['unclear word', 'unclear words'],
  barcode: ['barcode', 'barcodes'],
  face: ['face', 'faces'],
  header: ['header', 'headers'],
  footer: ['footer', 'footers'],
  gap: ['gap', 'gaps'],
  drawn: ['drawn box', 'drawn boxes'],
}

export function lowOverallConfidence(words: readonly { confidence: number }[]): boolean {
  if (words.length === 0) return true
  const total = words.reduce((sum, word) => sum + word.confidence, 0)
  return total / words.length < 60
}

/** True when automatic detection did not find a name or an identity number. */
export function missingNameOrId(detections: readonly { category: string }[]): boolean {
  return !detections.some((detection) => NAME_OR_ID.has(detection.category))
}

export function formatCategoryCounts(
  boxes: readonly { category: ReviewCategory; enabled: boolean }[],
): string {
  const counts = new Map<ReviewCategory, number>()
  for (const box of boxes) {
    if (!box.enabled) continue
    counts.set(box.category, (counts.get(box.category) ?? 0) + 1)
  }
  const parts: string[] = []
  for (const category of COUNT_ORDER) {
    const count = counts.get(category) ?? 0
    if (count === 0) continue
    const labels = COUNT_LABELS[category]
    parts.push(`${count} ${count === 1 ? labels[0] : labels[1]}`)
  }
  return parts.length > 0 ? parts.join(', ') : 'No boxes covering the page.'
}

function zoneBox(
  layout: ZoneLayout,
  y: number,
  height: number,
  id: string,
  category: ReviewCategory,
  disabled: ReadonlySet<string>,
): ReviewBox | null {
  if (height < 1 || layout.pageWidth < 1) return null
  return {
    id,
    bbox: { x: 0, y, width: layout.pageWidth, height },
    category,
    enabled: !disabled.has(id),
    origin: 'zone',
  }
}

function mergeBands(rows: readonly ZoneBand[]): ZoneBand[] {
  const sorted = rows
    .filter((row) => row.height > 0)
    .map((row) => ({ y: row.y, height: row.height }))
    .sort((a, b) => a.y - b.y)
  const merged: ZoneBand[] = []
  for (const row of sorted) {
    const previous = merged[merged.length - 1]
    if (!previous || row.y > previous.y + previous.height) merged.push({ ...row })
    else previous.height = Math.max(previous.height, row.y + row.height - previous.y)
  }
  return merged
}

function headerBlackout(layout: ZoneLayout, disabled: ReadonlySet<string>): ReviewBox[] {
  if (layout.uncertain || !layout.resultsBand) {
    const cover = zoneBox(layout, 0, layout.pageHeight, 'zone-header', 'header', disabled)
    return cover ? [cover] : []
  }
  const { y, height } = layout.resultsBand
  const boxes: ReviewBox[] = []
  const header = zoneBox(layout, 0, y, 'zone-header', 'header', disabled)
  const footer = zoneBox(
    layout,
    y + height,
    layout.pageHeight - (y + height),
    'zone-footer',
    'footer',
    disabled,
  )
  if (header) boxes.push(header)
  if (footer) boxes.push(footer)
  return boxes
}

function resultsOnly(layout: ZoneLayout, disabled: ReadonlySet<string>): ReviewBox[] {
  if (layout.uncertain) {
    const cover = zoneBox(layout, 0, layout.pageHeight, 'zone-header', 'header', disabled)
    return cover ? [cover] : []
  }
  const rows = mergeBands(layout.resultRows)
  const cuts: ZoneBand[] = []
  let cursor = 0
  for (const row of rows) {
    const top = Math.max(0, row.y)
    const bottom = Math.min(layout.pageHeight, row.y + row.height)
    if (top > cursor + 0.5) cuts.push({ y: cursor, height: top - cursor })
    cursor = Math.max(cursor, bottom)
  }
  if (layout.pageHeight - cursor > 0.5) cuts.push({ y: cursor, height: layout.pageHeight - cursor })
  return cuts.flatMap((cut, index) => {
    const box = zoneBox(layout, cut.y, cut.height, `zone-gap-${index}`, 'gap', disabled)
    return box ? [box] : []
  })
}

function fromDetection(detection: Detection): ReviewBox {
  return {
    id: detection.id,
    bbox: detection.bbox,
    category: detection.category,
    enabled: detection.enabled,
    origin: 'detection',
  }
}

/**
 * Boxes shown for the selected mode.
 * Drawn boxes stay in every mode. Standard detections stay out of the other modes.
 */
export function boxesForMode(
  mode: ReviewMode,
  detections: readonly Detection[],
  drawn: readonly ReviewBox[],
  layout: ZoneLayout,
  disabledZoneIds: ReadonlySet<string>,
): ReviewBox[] {
  const extra = drawn.map((box) => ({ ...box, origin: 'drawn' as const }))
  if (mode === 'manual') return extra
  if (mode === 'header-blackout') return [...headerBlackout(layout, disabledZoneIds), ...extra]
  if (mode === 'results-only') return [...resultsOnly(layout, disabledZoneIds), ...extra]
  return [...detections.map(fromDetection), ...extra]
}
