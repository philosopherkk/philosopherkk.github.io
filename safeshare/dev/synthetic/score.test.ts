import { expect, test } from 'vitest'
import { covered, manualModeNote, rate, scorePage, type Box } from './score.ts'

const id: Box = { x: 10, y: 10, width: 40, height: 16 }
const result: Box = { x: 10, y: 200, width: 30, height: 16 }

test('a box is covered by its centre or by half its area', () => {
  expect(covered(id, [{ x: 12, y: 8, width: 20, height: 20 }])).toBe(true)
  expect(covered(id, [{ x: 0, y: 10, width: 30, height: 20 }])).toBe(true)
  expect(covered(id, [{ x: 80, y: 80, width: 10, height: 10 }])).toBe(false)
})

test('recall, preservation, and over-redaction use boxes only', () => {
  const scored = scorePage(
    [
      { role: 'identifier', category: 'hkid', script: 'en', bbox: id },
      {
        role: 'identifier',
        category: 'name',
        script: 'zh',
        bbox: { x: 70, y: 10, width: 40, height: 16 },
      },
      { role: 'result', category: 'result', script: '', bbox: result },
    ],
    [{ category: 'hkid', bbox: { x: 8, y: 8, width: 44, height: 20 } }],
    [id],
    { id: 'r000', variant: 'clean', layout: 'classic', mode: 'standard' },
  )
  expect(scored.score.recallHits).toBe(1)
  expect(scored.score.recallTotal).toBe(2)
  expect(scored.score.preserved).toBe(1)
  expect(scored.score.redactionsTouchingResults).toBe(0)
  expect(scored.misses).toEqual([
    {
      id: 'r000',
      variant: 'clean',
      layout: 'classic',
      mode: 'standard',
      category: 'name',
      script: 'zh',
      reason: 'no-ocr',
    },
  ])
  expect(rate(98, 100)).toBeCloseTo(0.98)
  expect(manualModeNote()).toBe('not-applicable')
})
