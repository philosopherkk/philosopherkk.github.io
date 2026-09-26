import { expect, test } from 'vitest'
import { zoneLayoutFor } from './engine.ts'
import type { OcrWord } from '../ocr/types.ts'

function word(text: string, x: number, y: number, line: number): OcrWord {
  return { text, confidence: 90, box: { x, y, width: 40, height: 16 }, line, block: 0 }
}

test('zone layout is bands in pixels and does not keep line text', () => {
  const words = [
    word('Patient', 8, 10, 0),
    word('Test', 8, 80, 1),
    word('Result', 60, 80, 1),
    word('Unit', 120, 80, 1),
    word('Sodium', 8, 110, 2),
    word('140', 80, 110, 2),
    word('mmol/L', 130, 110, 2),
    word('136-145', 190, 110, 2),
    word('Note', 8, 200, 3),
  ]
  const layout = zoneLayoutFor(words, 240, 260)
  expect(layout.uncertain).toBe(false)
  expect(layout.pageWidth).toBe(240)
  expect(layout.pageHeight).toBe(260)
  expect(layout.resultsBand?.y).toBe(80)
  expect(layout.resultRows.map((row) => row.y)).toEqual([110])
  expect(JSON.stringify(layout)).not.toContain('Patient')
  expect(JSON.stringify(layout)).not.toContain('Sodium')
})
