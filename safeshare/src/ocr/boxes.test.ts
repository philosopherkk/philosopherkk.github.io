import { describe, expect, test } from 'vitest'
import { exportScaleFactor, mapBox, mapBoxToExport, transformBetween } from './boxes.ts'

const sample = { x: 10, y: 20, width: 30, height: 40 }

describe('page coordinates', () => {
  test('keeps a box when the OCR image matches the review bitmap', () => {
    const transform = transformBetween(800, 600, 800, 600)
    expect(mapBox(sample, transform)).toEqual(sample)
  })

  test('scales and offsets a box onto the review bitmap', () => {
    expect(
      mapBox(sample, {
        scaleX: 2,
        scaleY: 0.5,
        offsetX: 4,
        offsetY: 1,
      }),
    ).toEqual({ x: 24, y: 11, width: 60, height: 20 })
  })

  test('builds a transform from the two image sizes', () => {
    expect(transformBetween(1000, 500, 500, 250)).toEqual({
      scaleX: 0.5,
      scaleY: 0.5,
      offsetX: 0,
      offsetY: 0,
    })
  })
})

describe('export scale', () => {
  test('uses 1 when there is no separate export bitmap', () => {
    expect(exportScaleFactor(2500, null)).toBe(1)
  })

  test('uses 1 when the export bitmap matches the review bitmap', () => {
    expect(exportScaleFactor(1800, 1800)).toBe(1)
    expect(mapBoxToExport(sample, 1)).toEqual(sample)
  })

  test('keeps a uniform scale when the export bitmap is larger', () => {
    const scale = exportScaleFactor(2500, 3000)
    expect(scale).toBeCloseTo(1.2)
    expect(mapBoxToExport(sample, scale)).toEqual({
      x: 12,
      y: 24,
      width: 36,
      height: 48,
    })
  })
})
