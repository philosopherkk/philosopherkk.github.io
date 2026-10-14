import { expect, test } from 'vitest'
import { detectZones, zoneAt } from './zones.ts'

test('a table header opens the results zone and it ends after the last result row', () => {
  const zones = detectZones([
    { words: [{ text: 'Patient' }, { text: 'Chan' }] },
    { words: [{ text: 'Test' }, { text: 'Result' }, { text: 'Unit' }, { text: 'Reference' }] },
    { words: [{ text: 'Haemoglobin' }, { text: '13.5' }, { text: 'g/dL' }, { text: '11.5-15.0' }] },
    { words: [{ text: 'Note' }] },
    { words: [{ text: 'Glucose' }, { text: '5.1' }, { text: 'mmol/L' }, { text: '3.9-6.1' }] },
    { words: [{ text: 'Footer' }] },
  ])
  expect(zones.uncertain).toBe(false)
  expect(zones.results).toEqual({ start: 1, end: 4 })
  expect(zoneAt(0, zones)).toBe('header')
  expect(zoneAt(2, zones)).toBe('results')
  expect(zoneAt(3, zones)).toBe('results')
  expect(zoneAt(5, zones)).toBe('footer')
})

test('two consecutive result rows define results without a header', () => {
  const zones = detectZones([
    { words: [{ text: 'Sodium' }, { text: '140' }, { text: 'mmol/L' }, { text: '136-145' }] },
    { words: [{ text: 'Potassium' }, { text: '4.0' }, { text: 'mmol/L' }, { text: '3.5-5.0' }] },
  ])
  expect(zones.uncertain).toBe(false)
  expect(zones.results).toEqual({ start: 0, end: 1 })
})

test('a single result row is not enough, so the page stays header', () => {
  const zones = detectZones([
    { words: [{ text: 'Sodium' }, { text: '140' }, { text: 'mmol/L' }, { text: '136-145' }] },
    { words: [{ text: 'Comment' }] },
  ])
  expect(zones.uncertain).toBe(true)
  expect(zones.results).toBeNull()
  expect(zoneAt(0, zones)).toBe('header')
})

test('traditional chinese column titles open the results zone', () => {
  const zones = detectZones([
    { words: [{ text: '檢驗項目' }, { text: '結果' }, { text: '單位' }, { text: '參考範圍' }] },
    { words: [{ text: '血紅素' }, { text: '13.5' }, { text: 'g/dL' }, { text: '11.5-15.0' }] },
  ])
  expect(zones.results?.start).toBe(0)
  expect(zones.uncertain).toBe(false)
})
