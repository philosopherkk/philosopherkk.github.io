import { expect, test } from 'vitest'
import { hitTest, toggleById } from './hitTest.ts'
import type { ReviewBox } from './types.ts'

function box(id: string, x: number, y: number, size = 20): ReviewBox {
  return {
    id,
    bbox: { x, y, width: size, height: size },
    category: 'name',
    enabled: true,
    origin: 'detection',
  }
}

test('hit testing returns the topmost box and ignores a miss', () => {
  const boxes = [box('under', 0, 0, 40), box('over', 10, 10, 10)]
  expect(hitTest(boxes, { x: 12, y: 12 })).toBe('over')
  expect(hitTest(boxes, { x: 2, y: 2 })).toBe('under')
  expect(hitTest(boxes, { x: 90, y: 90 })).toBeNull()
})

test('toggle flips only the chosen box', () => {
  const next = toggleById(
    [
      { id: 'a', enabled: true },
      { id: 'b', enabled: false },
    ],
    'a',
  )
  expect(next).toEqual([
    { id: 'a', enabled: false },
    { id: 'b', enabled: false },
  ])
})
