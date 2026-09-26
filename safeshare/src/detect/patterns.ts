import { hkidConfidence, splitHkid } from './hkid.ts'
import type { LabelKind } from './labels.ts'
import { normaliseToken } from './normalise.ts'
import type { DetectionDraft } from './types.ts'
import type { OcrWord } from '../ocr/types.ts'
import type { Settings } from '../settings.ts'
import type { ZoneName } from './types.ts'

type Span = { start: number; end: number; word: OcrWord }

export type PatternLine = {
  words: readonly OcrWord[]
  zone: ZoneName
  labelKinds: readonly LabelKind[]
}

export type PatternResult = {
  drafts: DetectionDraft[]
  hkids: string[]
}

const HKID_BRACKET =
  /(?<![A-Z0-9])[A-Z]{1,2}[ \t-]?\d{6}[ \t-]?[（(][ \t-]?[0-9A](?:[)）](?![A-Z0-9])|(?![)）A-Z0-9]))/g
const HKID_MASKED =
  /(?<![A-Z0-9*])(?:[A-Z]{1,2})?\*{2,}\d{2,6}[ \t-]?[（(][ \t-]?[0-9A](?:[)）](?![A-Z0-9])|(?![)）A-Z0-9]))/g
const HKID_PLAIN = /(?<![A-Z0-9])[A-Z]{1,2}[ \t-]?\d{6}[ \t-]?[0-9A](?![A-Z0-9(（])/g
const PASSPORT = /(?<![A-Z0-9])[A-Z]{1,2}[ \t-]?\d{6,9}(?![A-Z0-9])/g
const PHONE = /(?<!\d)(?:\+852[-\s]?)?[2-9]\d{3}[-\s]?\d{4}(?!\d)/g
const EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9])/g
const DATES = [
  /(?<!\d)\d{1,2}\/\d{1,2}\/\d{4}(?!\d)/g,
  /(?<!\d)\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}(?!\d)/gi,
  /(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g,
  /(?<!\d)\d{1,2}\.\d{1,2}\.\d{2}(?!\d)/g,
]

const DISTRICTS = [
  'new territories',
  'yau tsim mong',
  'sham shui po',
  'kowloon city',
  'wong tai sin',
  'kwun tong',
  'kwai tsing',
  'tsuen wan',
  'tuen mun',
  'yuen long',
  'tai po',
  'sha tin',
  'sai kung',
  'hong kong',
  'kowloon',
  'central',
  'eastern',
  'southern',
  'islands',
  'north',
  '香港',
  '九龍',
  '新界',
]

function upperAscii(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    out += code >= 97 && code <= 122 ? String.fromCharCode(code - 32) : ch
  }
  return out
}

export function lineIndexText(words: readonly OcrWord[]): {
  text: string
  raw: string
  spans: Span[]
} {
  let text = ''
  let raw = ''
  const spans: Span[] = []
  for (const word of words) {
    if (text.length > 0) {
      text += ' '
      raw += ' '
    }
    const start = text.length
    const mapped = normaliseToken(word.text)
    text += mapped
    raw += word.text
    spans.push({ start, end: text.length, word })
  }
  return { text, raw, spans }
}

function wordsFor(spans: readonly Span[], start: number, end: number): OcrWord[] {
  const chosen: OcrWord[] = []
  for (const span of spans) {
    if (span.end > start && span.start < end && !chosen.includes(span.word)) chosen.push(span.word)
  }
  return chosen
}

function unionWords(words: readonly OcrWord[]): DetectionDraft['bbox'] | null {
  if (words.length === 0) return null
  let x = Infinity
  let y = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const word of words) {
    x = Math.min(x, word.box.x)
    y = Math.min(y, word.box.y)
    right = Math.max(right, word.box.x + word.box.width)
    bottom = Math.max(bottom, word.box.y + word.box.height)
  }
  if (!Number.isFinite(x) || right <= x || bottom <= y) return null
  return { x, y, width: right - x, height: bottom - y }
}

function draftFrom(
  words: readonly OcrWord[],
  category: DetectionDraft['category'],
  confidence: number,
): DetectionDraft | null {
  const bbox = unionWords(words)
  if (!bbox) return null
  return { bbox, category, source: 'pattern', confidence, enabled: true }
}

function occupied(
  ranges: readonly { start: number; end: number }[],
  start: number,
  end: number,
): boolean {
  return ranges.some((range) => range.end > start && range.start < end)
}

function hasDistrict(text: string): boolean {
  const lower = text.toLowerCase()
  return DISTRICTS.some((district) => {
    if (/[\u4e00-\u9fff]/.test(district)) return text.includes(district)
    return new RegExp(`(?:^|[^a-z])${district}(?![a-z])`, 'i').test(lower)
  })
}

function hasStreet(text: string): boolean {
  if (/(?<![A-Za-z0-9])(?:Road|Street|Rd|St|Path|Lane)(?![A-Za-z])/i.test(text)) return true
  return /[道街路里號]/.test(text)
}

export function findPatterns(
  line: PatternLine,
  nearby: readonly LabelKind[],
  settings: Settings,
): PatternResult {
  const indexed = lineIndexText(line.words)
  const upper = upperAscii(indexed.text)
  const raw = indexed.raw
  const drafts: DetectionDraft[] = []
  const hkids: string[] = []
  const taken: { start: number; end: number }[] = []
  const near = (kind: LabelKind) => line.labelKinds.includes(kind) || nearby.includes(kind)
  const outsideResults = line.zone !== 'results'

  const addMatch = (
    match: RegExpMatchArray,
    category: DetectionDraft['category'],
    confidence: number,
    hkid: string | null,
  ) => {
    const start = match.index ?? 0
    const end = start + match[0].length
    if (occupied(taken, start, end)) return
    const box = draftFrom(wordsFor(indexed.spans, start, end), category, confidence)
    if (!box) return
    drafts.push(box)
    taken.push({ start, end })
    if (hkid) hkids.push(hkid)
  }

  for (const match of upper.matchAll(HKID_BRACKET)) {
    const parts = splitHkid(match[0])
    const confidence = parts ? hkidConfidence(parts.body, parts.check) : 0.62
    const compact = parts ? `${parts.body}${parts.check}` : null
    addMatch(match, 'hkid', confidence, compact)
  }
  for (const match of upper.matchAll(HKID_MASKED)) addMatch(match, 'hkid', 0.8, null)

  const plainAllowed = (outsideResults || near('id')) && !near('passport')
  if (plainAllowed) {
    for (const match of upper.matchAll(HKID_PLAIN)) {
      const parts = splitHkid(match[0])
      const confidence = parts ? hkidConfidence(parts.body, parts.check) : 0.62
      const compact = parts ? `${parts.body}${parts.check}` : null
      addMatch(match, 'hkid', confidence, compact)
    }
  }

  const passportAllowed = line.zone === 'header' || near('passport')
  if (passportAllowed) {
    for (const match of upper.matchAll(PASSPORT)) addMatch(match, 'passport', 0.9, null)
  }

  for (const match of raw.matchAll(EMAIL)) addMatch(match, 'email', 0.9, null)

  const phoneAllowed = outsideResults || near('phone')
  if (phoneAllowed) {
    for (const match of indexed.text.matchAll(PHONE)) addMatch(match, 'phone', 0.9, null)
  }

  const datesAllowed =
    line.labelKinds.includes('dob') || (settings.redactAllDates && outsideResults)
  if (datesAllowed) {
    for (const expression of DATES) {
      expression.lastIndex = 0
      for (const match of raw.matchAll(expression)) addMatch(match, 'date', 0.9, null)
      expression.lastIndex = 0
      for (const match of indexed.text.matchAll(expression)) addMatch(match, 'date', 0.9, null)
    }
  }

  if (outsideResults && hasDistrict(raw) && hasStreet(raw)) {
    const box = draftFrom(line.words, 'address', 0.85)
    if (box) drafts.push(box)
  }

  return { drafts, hkids }
}
