import { expect, test } from 'vitest'
import { boxesForExport, exportTarget } from './target.ts'

const box = { x: 10, y: 20, width: 30, height: 40 }

test('a kept export bitmap is the drawing surface and scales review boxes onto it', () => {
  const target = exportTarget({ width: 2500, height: 1600 }, { width: 3000, height: 1920 })
  expect(target.source).toBe('export')
  expect(target.width).toBe(3000)
  expect(target.height).toBe(1920)
  expect(target.scale).toBeCloseTo(1.2)
  expect(boxesForExport([{ enabled: true, bbox: box }], target.scale)[0]?.bbox).toEqual({
    x: 12,
    y: 24,
    width: 36,
    height: 48,
  })
})

test('without an export bitmap the display bitmap is used at scale 1', () => {
  const target = exportTarget({ width: 2500, height: 1600 }, null)
  expect(target).toMatchObject({ width: 2500, height: 1600, scale: 1, source: 'display' })
  expect(boxesForExport([{ enabled: true, bbox: box }], target.scale)[0]?.bbox).toEqual(box)
})
