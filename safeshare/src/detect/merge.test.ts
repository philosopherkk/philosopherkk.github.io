import { expect, test } from 'vitest'
import { mergeAndPad, padBox, paddingFor } from './merge.ts'
import type { Detection } from './types.ts'

function detection(x: number, width: number, height: number, confidence = 0.9): Detection {
  return {
    id: `box-${x}`,
    bbox: { x, y: 0, width, height },
    category: 'hkid',
    source: 'pattern',
    confidence,
    enabled: true,
  }
}

test('padding is 4 px or 15% of text height, whichever is larger', () => {
  expect(paddingFor({ x: 0, y: 0, width: 10, height: 20 })).toBe(4)
  expect(paddingFor({ x: 0, y: 0, width: 10, height: 100 })).toBe(15)
  const padded = padBox({ x: 10, y: 20, width: 30, height: 100 })
  expect(padded).toEqual({ x: -5, y: 5, width: 60, height: 130 })
})

test('boxes that only touch are merged after padding, and distant boxes stay apart', () => {
  const touching = mergeAndPad([detection(0, 10, 20), detection(10, 10, 20, 0.4)])
  expect(touching).toHaveLength(1)
  expect(touching[0]?.bbox.x).toBe(-4)
  expect(touching[0]?.bbox.width).toBe(28)
  expect(touching[0]?.confidence).toBe(0.9)
  expect(touching[0]?.enabled).toBe(true)

  const apart = mergeAndPad([detection(0, 10, 20), detection(80, 10, 20)])
  expect(apart).toHaveLength(2)
})
