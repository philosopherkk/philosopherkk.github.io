export type ZoneLine = {
  words: readonly { text: string }[]
}

export type ZoneMap = {
  uncertain: boolean
  results: { start: number; end: number } | null
}

const HEADER_PHRASES = [
  'ref. range',
  'normal range',
  'investigation',
  'reference',
  'units',
  'unit',
  'result',
  'test',
  'flag',
]

const HEADER_ZH = ['檢驗項目', '參考範圍', '參考值', '結果', '單位']

function joined(line: ZoneLine): string {
  return line.words.map((word) => word.text).join(' ')
}

export function isTableHeader(line: ZoneLine): boolean {
  const text = joined(line)
  if (HEADER_ZH.some((phrase) => text.includes(phrase))) return true
  const lower = text.toLowerCase()
  return HEADER_PHRASES.some((phrase) => {
    const escaped = phrase.replace(/[.]/g, '\\.')
    return new RegExp(`(?:^|[^a-z])${escaped}(?![a-z])`, 'i').test(lower)
  })
}

function isNumberToken(text: string): boolean {
  return /^[<>≤≥]?\d+(?:\.\d+)?$/.test(text.replace(/,/g, '').trim())
}

function isUnitToken(text: string): boolean {
  const token = text.trim()
  if (token === '%') return true
  if (/^[A-Za-zμµ][A-Za-zμµ0-9^]*\/[A-Za-zμµ0-9^.]+$/.test(token)) return true
  return /^(?:fL|pg|IU|U|mm|cm|g|mg|ng|mmol|umol|μmol|kPa|mmHg)$/i.test(token)
}

function isRangeToken(text: string): boolean {
  const token = text.replace(/\s/g, '')
  return /^\d+(?:\.\d+)?[-–—]\d+(?:\.\d+)?$/.test(token) || /^[<>≤≥]\d+(?:\.\d+)?$/.test(token)
}

function hasRange(line: ZoneLine): boolean {
  if (line.words.some((word) => isRangeToken(word.text) || isUnitToken(word.text))) return true
  for (let i = 0; i < line.words.length - 2; i += 1) {
    const left = line.words[i]?.text ?? ''
    const mid = line.words[i + 1]?.text ?? ''
    const right = line.words[i + 2]?.text ?? ''
    if (isNumberToken(left) && /^[-–—]$/.test(mid) && isNumberToken(right)) return true
  }
  return false
}

export function isResultLike(line: ZoneLine): boolean {
  const hasWord = line.words.some(
    (word) =>
      /[A-Za-z\u4e00-\u9fff]/.test(word.text) &&
      !isNumberToken(word.text) &&
      !isUnitToken(word.text),
  )
  const hasNumber = line.words.some((word) => isNumberToken(word.text))
  return hasWord && hasNumber && hasRange(line)
}

export function detectZones(lines: readonly ZoneLine[]): ZoneMap {
  let headerAt: number | null = null
  let runAt: number | null = null
  let lastResult = -1
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) continue
    if (headerAt === null && isTableHeader(line)) headerAt = i
    if (isResultLike(line)) {
      lastResult = i
      const next = lines[i + 1]
      if (runAt === null && next && isResultLike(next)) runAt = i
    }
  }
  const start = headerAt === null ? runAt : runAt === null ? headerAt : Math.min(headerAt, runAt)
  if (start === null) return { uncertain: true, results: null }
  const end = Math.max(start, lastResult)
  return { uncertain: false, results: { start, end } }
}

export function zoneAt(index: number, zones: ZoneMap): 'header' | 'results' | 'footer' {
  if (zones.uncertain || !zones.results) return 'header'
  if (index >= zones.results.start && index <= zones.results.end) return 'results'
  if (index > zones.results.end) return 'footer'
  return 'header'
}
