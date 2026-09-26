import {
  categoryForLabel,
  labelRedactionEnabled,
  labelsInWords,
  type LabelHit,
  type LabelKind,
} from './labels.ts'
import { findPatterns } from './patterns.ts'
import { nameTokensFrom, propagateTokens } from './propagate.ts'
import { stamp, type DetectionDraft, type PageDetection, type ZoneName } from './types.ts'
import { detectZones, zoneAt } from './zones.ts'
import type { OcrWord } from '../ocr/types.ts'
import type { Settings } from '../settings.ts'

type PreparedLine = {
  index: number
  words: OcrWord[]
  labels: LabelHit[]
  zone: ZoneName
}

type PreparedPage = {
  lines: PreparedLine[]
  uncertain: boolean
}

function explodeWord(word: OcrWord): OcrWord[] {
  const parts = word.text.split(/[:：]/)
  if (parts.length < 2) return [word]
  const pieces = parts.map((part) => part.trim()).filter((part) => part.length > 0)
  if (pieces.length <= 1) {
    const only = pieces[0]
    return only ? [{ ...word, text: only }] : [word]
  }
  const numeric = (value: string) => /^\d+(?:\.\d+)?$/.test(value)
  if (pieces.every(numeric)) return [word]
  const width = word.box.width / pieces.length
  return pieces.map((text, index) => ({
    ...word,
    text,
    box: { ...word.box, x: word.box.x + width * index, width },
  }))
}

function prepare(words: readonly OcrWord[]): PreparedPage {
  const expanded = words.flatMap(explodeWord)
  const byLine = new Map<number, OcrWord[]>()
  for (const word of expanded) {
    const group = byLine.get(word.line) ?? []
    group.push(word)
    byLine.set(word.line, group)
  }
  const rough = [...byLine.entries()].map(([id, group]) => {
    const sorted = group.slice().sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y)
    const top = Math.min(...sorted.map((word) => word.box.y))
    return { id, words: sorted, top }
  })
  rough.sort((a, b) => a.top - b.top || a.id - b.id)
  const zones = detectZones(rough)
  const lines: PreparedLine[] = rough.map((line, index) => ({
    index,
    words: line.words,
    labels: labelsInWords(line.words.map((word) => word.text)),
    zone: zoneAt(index, zones),
  }))
  return { lines, uncertain: zones.uncertain }
}

function gapLimit(word: OcrWord): number {
  return Math.max(48, word.box.height * 3)
}

function valueWords(
  lines: readonly PreparedLine[],
  line: PreparedLine,
  label: LabelHit,
): OcrWord[] {
  const anchor = line.words[label.end - 1]
  if (!anchor) return []
  const limit = gapLimit(anchor)
  const collected: OcrWord[] = []
  let cursor = anchor.box.x + anchor.box.width
  for (let i = label.end; i < line.words.length; i += 1) {
    if (line.labels.some((item) => item.start === i)) break
    const word = line.words[i]
    if (!word) continue
    if (word.box.x - cursor > limit) break
    collected.push(word)
    cursor = word.box.x + word.box.width
  }
  const following = label.kind === 'address' ? 3 : collected.length === 0 ? 1 : 0
  for (let offset = 1; offset <= following; offset += 1) {
    const next = lines[line.index + offset]
    if (!next) break
    let stopped = false
    for (let i = 0; i < next.words.length; i += 1) {
      if (next.labels.some((item) => item.start === i)) {
        stopped = true
        break
      }
      const word = next.words[i]
      if (word) collected.push(word)
    }
    if (stopped) break
  }
  return collected
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

function kindsOf(line: PreparedLine | undefined): LabelKind[] {
  if (!line) return []
  return line.labels.map((label) => label.kind)
}

function lowConfidence(page: PreparedPage, settings: Settings): DetectionDraft[] {
  if (!settings.redactLowConfidenceHeaderWords) return []
  const drafts: DetectionDraft[] = []
  for (const line of page.lines) {
    if (line.zone !== 'header') continue
    for (const word of line.words) {
      if (word.confidence >= 40) continue
      if (word.text.trim().length === 0) continue
      drafts.push({
        bbox: word.box,
        category: 'low-confidence',
        source: 'low-confidence',
        confidence: 0.5,
        enabled: true,
      })
    }
  }
  return drafts
}

type PageDrafts = {
  items: DetectionDraft[]
  names: string[]
  hkids: string[]
}

function collect(page: PreparedPage, settings: Settings): PageDrafts {
  const items: DetectionDraft[] = []
  const names: string[] = []
  const hkids: string[] = []
  for (const line of page.lines) {
    const nearby = kindsOf(page.lines[line.index - 1])
    const patterns = findPatterns(
      { words: line.words, zone: line.zone, labelKinds: kindsOf(line) },
      nearby,
      settings,
    )
    items.push(...patterns.drafts)
    hkids.push(...patterns.hkids)
    for (const label of line.labels) {
      if (!labelRedactionEnabled(label.kind, settings)) continue
      const words = valueWords(page.lines, line, label)
      const bbox = unionWords(words)
      if (!bbox) continue
      items.push({
        bbox,
        category: categoryForLabel(label.kind),
        source: 'label',
        confidence: 0.85,
        enabled: true,
      })
      if (label.kind === 'name') names.push(...nameTokensFrom(words))
    }
  }
  return { items, names, hkids }
}

/** Text rules only. Boxes are unpadded so tests can see which words were selected. */
export function detectText(
  pages: readonly (readonly OcrWord[])[],
  settings: Settings,
): PageDetection[] {
  const prepared = pages.map((words) => prepare(words))
  const collected = prepared.map((page) => collect(page, settings))
  const names = collected.flatMap((page) => page.names)
  const hkids = collected.flatMap((page) => page.hkids)
  return prepared.map((page, index) => {
    const found = collected[index]
    const propagated = propagateTokens(
      page.lines.flatMap((line) => line.words.map((word) => ({ word, zone: line.zone }))),
      names,
      hkids,
    )
    const drafts = [...(found?.items ?? []), ...propagated, ...lowConfidence(page, settings)]
    return { detections: stamp(drafts, index), zonesUncertain: page.uncertain }
  })
}
