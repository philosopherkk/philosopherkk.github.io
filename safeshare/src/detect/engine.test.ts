import { expect, test } from 'vitest'
import { detectText } from './engine.ts'
import type { Detection, DetectionCategory } from './types.ts'
import type { Box } from '../ocr/boxes.ts'
import type { OcrWord } from '../ocr/types.ts'
import { DEFAULT_SETTINGS, type Settings } from '../settings.ts'

function word(text: string, x: number, y: number, line: number, confidence = 95): OcrWord {
  return {
    text,
    confidence,
    box: { x, y, width: Math.max(16, text.length * 10), height: 18 },
    line,
    block: 0,
  }
}

function row(parts: readonly string[], line: number, confidence = 95): OcrWord[] {
  let x = 12
  return parts.map((text) => {
    const made = word(text, x, line * 40, line, confidence)
    x += made.box.width + 8
    return made
  })
}

function page(rows: readonly (readonly string[])[]): OcrWord[] {
  return rows.flatMap((parts, line) => row(parts, line))
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function covered(
  detections: readonly Detection[],
  target: OcrWord,
  category?: DetectionCategory,
): boolean {
  return detections.some(
    (detection) =>
      detection.enabled &&
      intersects(detection.bbox, target.box) &&
      (category === undefined || detection.category === category),
  )
}

function run(rows: readonly (readonly string[])[], settings: Settings = DEFAULT_SETTINGS) {
  const words = page(rows)
  const [result] = detectText([words], settings)
  return { words, result: result ?? { detections: [], zonesUncertain: true } }
}

function find(words: readonly OcrWord[], text: string): OcrWord {
  const found = words.find((item) => item.text === text)
  if (!found) throw new Error(`missing word ${text}`)
  return found
}

test('hkid ocr errors, masks, fullwidth parentheses, and a failed check digit still redact', () => {
  const { words, result } = run([
    ['HKID', 'A88O1O1(3)'],
    ['Ref', 'A123456(9)'],
    ['Masked', 'A****56(7)', '****456(7)'],
    ['Card', 'A123456（3）', 'A123456(3'],
  ])
  const passed = result.detections.find((detection) =>
    covered([detection], find(words, 'A88O1O1(3)'), 'hkid'),
  )
  const failed = result.detections.find((detection) =>
    covered([detection], find(words, 'A123456(9)'), 'hkid'),
  )
  expect(passed?.confidence).toBeGreaterThan(0.9)
  expect(failed?.enabled).toBe(true)
  expect(failed?.confidence).toBeLessThan(passed?.confidence ?? 0)
  expect(covered(result.detections, find(words, 'A****56(7)'), 'hkid')).toBe(true)
  expect(covered(result.detections, find(words, '****456(7)'), 'hkid')).toBe(true)
  expect(covered(result.detections, find(words, 'A123456（3）'), 'hkid')).toBe(true)
  expect(covered(result.detections, find(words, 'A123456(3'), 'hkid')).toBe(true)
})

test('unbracketed hkid is kept inside results unless it sits beside an id label', () => {
  const { words, result } = run([
    ['Patient', 'Ada'],
    ['Test', 'Result', 'Unit'],
    ['Code', 'A1234567', 'g/dL', '1-2'],
    ['HKID', 'B1234567', 'mmol/L', '1-2'],
    ['Sodium', '140', 'mmol/L', '136-145'],
  ])
  expect(result.zonesUncertain).toBe(false)
  expect(covered(result.detections, find(words, 'A1234567'))).toBe(false)
  expect(covered(result.detections, find(words, 'B1234567'), 'hkid')).toBe(true)
})

test('fuzzy english and traditional chinese labels redact the value, age and sex stay', () => {
  const { words, result } = run([
    ['Patint', 'Name', 'Chan'],
    ['身份證號瑪', 'C123456(9)'],
    ['出生日期', '01/02/1990'],
    ['電話', '2123-4567'],
    ['地址', '12', 'Sample', 'Street'],
    ['Wan', 'Chai'],
    ['Age', '40'],
    ['性別', 'F'],
    ['醫院', 'Example'],
    ['醫生', 'Mira'],
  ])
  expect(covered(result.detections, find(words, 'Chan'), 'name')).toBe(true)
  expect(covered(result.detections, find(words, 'C123456(9)'), 'hkid')).toBe(true)
  expect(covered(result.detections, find(words, '01/02/1990'), 'date')).toBe(true)
  expect(covered(result.detections, find(words, '2123-4567'), 'phone')).toBe(true)
  expect(covered(result.detections, find(words, 'Sample'), 'address')).toBe(true)
  expect(covered(result.detections, find(words, 'Wan'), 'address')).toBe(true)
  expect(covered(result.detections, find(words, 'Chai'), 'address')).toBe(true)
  expect(covered(result.detections, find(words, '40'))).toBe(false)
  expect(covered(result.detections, find(words, 'F'))).toBe(false)
  expect(covered(result.detections, find(words, 'Example'))).toBe(false)
  expect(covered(result.detections, find(words, 'Mira'), 'other-person')).toBe(true)
})

test('a four-letter label does not fuzzy-match, and address needs a district plus a street token', () => {
  const { words, result } = run([
    ['Nane', 'Chan'],
    ['Addres', '9', 'Queen', 'Road', 'Central'],
  ])
  expect(covered(result.detections, find(words, 'Chan'))).toBe(false)
  expect(covered(result.detections, find(words, 'Queen'), 'address')).toBe(true)
})

test('name and hkid tokens propagate outside results rows only', () => {
  const { words, result } = run([
    ['Name', 'Chan', 'Tai', 'Man'],
    ['HKID', 'A123456(3)'],
    ['Test', 'Result', 'Unit', 'Reference'],
    ['Chan', '1.0', 'g/dL', '0-2'],
    ['Glucose', '5.1', 'mmol/L', '3.9-6.1', 'A12345G3'],
    ['Seen', 'Cham'],
    ['Copy', 'A12345G3'],
  ])
  expect(covered(result.detections, find(words, 'Chan'), 'name')).toBe(true)
  const resultChan = words.filter((item) => item.text === 'Chan')[1]
  if (!resultChan) throw new Error('missing result chan')
  expect(covered(result.detections, resultChan)).toBe(false)
  expect(covered(result.detections, find(words, 'Cham'), 'name')).toBe(true)
  const buried = words.filter((item) => item.text === 'A12345G3')[0]
  const footer = words.filter((item) => item.text === 'A12345G3')[1]
  if (!buried || !footer) throw new Error('missing hkid copies')
  expect(covered(result.detections, buried)).toBe(false)
  expect(covered(result.detections, footer, 'hkid')).toBe(true)
  expect(covered(result.detections, find(words, '5.1'))).toBe(false)
  expect(covered(result.detections, find(words, 'mmol/L'))).toBe(false)
  expect(covered(result.detections, find(words, '3.9-6.1'))).toBe(false)
})

test('result values, units, and reference ranges are not redacted', () => {
  const { words, result } = run(
    [
      ['Patient', 'Ada', 'Lok'],
      ['Tel', '9123-4567'],
      ['Test', 'Result', 'Unit', 'Ref.', 'Range'],
      ['Haemoglobin', '13.5', 'g/dL', '11.5-15.0'],
      ['Collected', '02-Jan-2024'],
      ['Platelets', '250', 'x10^9/L', '150-400'],
      ['Note', 'ada@example.com', '1.0', 'g/dL', '0-1'],
    ],
    { ...DEFAULT_SETTINGS, redactAllDates: true },
  )
  expect(result.zonesUncertain).toBe(false)
  for (const text of [
    '13.5',
    'g/dL',
    '11.5-15.0',
    '250',
    'x10^9/L',
    '150-400',
    '1.0',
    '02-Jan-2024',
  ]) {
    expect(covered(result.detections, find(words, text)), text).toBe(false)
  }
  expect(covered(result.detections, find(words, 'ada@example.com'), 'email')).toBe(true)
  expect(covered(result.detections, find(words, '9123-4567'), 'phone')).toBe(true)
  expect(covered(result.detections, find(words, 'Ada'), 'name')).toBe(true)
})

test('passport stays in the header or beside its label, and an unlabelled phone stays out of results', () => {
  const { words, result } = run([
    ['Passport', 'K12345678'],
    ['Test', 'Result', 'Unit'],
    ['Code', '21234567', 'g/dL', '1-9'],
    ['Sodium', '140', 'mmol/L', '136-145'],
    ['File', 'K12345678'],
  ])
  const headerPassport = words.filter((item) => item.text === 'K12345678')[0]
  const footerPassport = words.filter((item) => item.text === 'K12345678')[1]
  if (!headerPassport || !footerPassport) throw new Error('missing passport')
  expect(covered(result.detections, headerPassport, 'passport')).toBe(true)
  expect(covered(result.detections, footerPassport)).toBe(false)
  expect(covered(result.detections, find(words, '21234567'))).toBe(false)
})

test('when zones cannot be detected the page is treated as header', () => {
  const { words, result } = run([['Call', '2123-4567', 'today']])
  expect(result.zonesUncertain).toBe(true)
  expect(covered(result.detections, find(words, '2123-4567'), 'phone')).toBe(true)
})

test('low-confidence header words redact by default and the setting can turn that off', () => {
  const lines = [
    ['Scribble'],
    ['Test', 'Result', 'Unit'],
    ['Sodium', '140', 'mmol/L', '136-145'],
    ['Potassium', '4.0', 'mmol/L', '3.5-5.0'],
    ['Blur'],
  ]
  const words = page(lines)
  const header = words[0]
  const footer = words.at(-1)
  if (!header || !footer) throw new Error('missing words')
  header.confidence = 39
  footer.confidence = 10
  const on = detectText([words], DEFAULT_SETTINGS)[0]
  expect(covered(on?.detections ?? [], header, 'low-confidence')).toBe(true)
  expect(covered(on?.detections ?? [], footer, 'low-confidence')).toBe(false)

  const borderline = page(lines)
  const clear = borderline[0]
  if (!clear) throw new Error('missing word')
  clear.confidence = 40
  const edge = detectText([borderline], DEFAULT_SETTINGS)[0]
  expect(covered(edge?.detections ?? [], clear, 'low-confidence')).toBe(false)

  const quietWords = page(lines)
  const quiet = quietWords[0]
  if (!quiet) throw new Error('missing word')
  quiet.confidence = 39
  const off = detectText([quietWords], {
    ...DEFAULT_SETTINGS,
    redactLowConfidenceHeaderWords: false,
  })[0]
  expect(covered(off?.detections ?? [], quiet)).toBe(false)
})

test('other dates follow the redact-all-dates setting and labelled dob does not', () => {
  const rows = [['DOB'], ['15-Mar-1980'], ['Report', '2024-05-01']] as const
  const kept = run(rows)
  const redacted = run(rows, { ...DEFAULT_SETTINGS, redactAllDates: true })
  expect(covered(kept.result.detections, find(kept.words, '15-Mar-1980'), 'date')).toBe(true)
  expect(covered(kept.result.detections, find(kept.words, '2024-05-01'))).toBe(false)
  expect(covered(redacted.result.detections, find(redacted.words, '2024-05-01'), 'date')).toBe(true)
})

test('an address line is a district plus a street token, and st inside a word is not a street', () => {
  const { words, result } = run([
    ['Flat', '4', 'Sample', 'Street', '香港'],
    ['Contest', 'Central'],
    ['Central', 'St'],
  ])
  expect(covered(result.detections, find(words, 'Sample'), 'address')).toBe(true)
  expect(covered(result.detections, find(words, '香港'), 'address')).toBe(true)
  expect(covered(result.detections, find(words, 'Contest'))).toBe(false)
  expect(covered(result.detections, find(words, 'St'), 'address')).toBe(true)
})
