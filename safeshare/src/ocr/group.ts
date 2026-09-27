import type { Box } from './boxes.ts'

export type PositionedWord = {
  text: string
  confidence: number
  box: Box
}

export type GroupedWord = PositionedWord & {
  line: number
  block: number
}

export type RawBox = {
  x0: number
  y0: number
  x1: number
  y1: number
}

export type RawWord = {
  text?: string
  confidence?: number
  bbox?: RawBox
}

export type RawLine = {
  words?: readonly RawWord[]
}

export type RawParagraph = {
  lines?: readonly RawLine[]
}

export type RawBlock = {
  paragraphs?: readonly RawParagraph[]
}

const LINE_CENTER_RATIO = 0.55
const BLOCK_GAP_RATIO = 0.8

function centerY(box: Box): number {
  return box.y + box.height / 2
}

function placedWord(word: RawWord): PositionedWord | null {
  const text = word.text ?? ''
  if (text.trim().length === 0) return null
  const bbox = word.bbox
  if (!bbox) return null
  const { x0, y0, x1, y1 } = bbox
  if (![x0, y0, x1, y1].every((value) => Number.isFinite(value))) return null
  const width = x1 - x0
  const height = y1 - y0
  if (width < 0 || height < 0) return null
  let confidence = typeof word.confidence === 'number' ? word.confidence : 0
  if (!Number.isFinite(confidence)) confidence = 0
  if (confidence < 0) confidence = 0
  if (confidence > 100) confidence = 100
  return { text, confidence, box: { x: x0, y: y0, width, height } }
}

/** Geometry grouping for a flat word list. Line, then block, from top to bottom. */
export function groupWords(words: readonly PositionedWord[]): GroupedWord[] {
  const sorted = [...words].sort((a, b) => {
    const dy = centerY(a.box) - centerY(b.box)
    if (Math.abs(dy) > 0.5) return dy
    return a.box.x - b.box.x
  })

  const lines: PositionedWord[][] = []
  for (const word of sorted) {
    const line = lines[lines.length - 1]
    const anchor = line?.[0]
    if (!line || !anchor) {
      lines.push([word])
      continue
    }
    const limit = LINE_CENTER_RATIO * Math.max(anchor.box.height, word.box.height)
    if (Math.abs(centerY(word.box) - centerY(anchor.box)) <= limit) line.push(word)
    else lines.push([word])
  }

  for (const line of lines) line.sort((a, b) => a.box.x - b.box.x)

  const grouped: GroupedWord[] = []
  let block = 0
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      const previous = lines[lineIndex - 1] ?? []
      const previousBottom = Math.max(...previous.map((word) => word.box.y + word.box.height))
      const top = Math.min(...line.map((word) => word.box.y))
      const previousHeight = Math.max(...previous.map((word) => word.box.height))
      if (top - previousBottom > BLOCK_GAP_RATIO * previousHeight) block += 1
    }
    for (const word of line) grouped.push({ ...word, line: lineIndex, block })
  })
  return grouped
}

/** Keep Tesseract's block and line order. Ids are dense and start at 0. */
export function wordsFromBlocks(blocks: readonly RawBlock[] | null | undefined): GroupedWord[] {
  if (!blocks || blocks.length === 0) return []
  const words: GroupedWord[] = []
  let blockId = 0
  let lineId = 0
  for (const block of blocks) {
    let blockHasWord = false
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        let lineHasWord = false
        for (const word of line.words ?? []) {
          const placed = placedWord(word)
          if (!placed) continue
          words.push({ ...placed, line: lineId, block: blockId })
          lineHasWord = true
          blockHasWord = true
        }
        if (lineHasWord) lineId += 1
      }
    }
    if (blockHasWord) blockId += 1
  }
  return words
}

export function pageWords(input: {
  blocks?: readonly RawBlock[] | null
  words?: readonly RawWord[] | null
}): GroupedWord[] {
  if (input.blocks && input.blocks.length > 0) return wordsFromBlocks(input.blocks)
  const flat: PositionedWord[] = []
  for (const word of input.words ?? []) {
    const placed = placedWord(word)
    if (placed) flat.push(placed)
  }
  return groupWords(flat)
}
